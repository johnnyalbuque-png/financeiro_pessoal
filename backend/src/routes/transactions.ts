import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateInstallmentDates, generateSeriesDates, RecurrenceInterval } from '../utils/recurrence';

const router = Router();
router.use(authMiddleware);

const baseTransactionSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string().min(1, 'Data é obrigatória'),
  notes: z.string().optional().nullable(),
  accountId: z.string().min(1, 'Conta é obrigatória'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  isRecurring: z.boolean().optional().default(false),
  recurrenceInterval: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  recurrenceCount: z.number().int().min(2).max(60).optional(),
  isInstallment: z.boolean().optional().default(false),
  installmentTotal: z.number().int().min(2).max(60).optional(),
}).refine((data) => !(data.isRecurring && data.isInstallment), {
  message: 'Escolha recorrência ou parcelamento, não os dois',
});

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const { accountId, categoryId, type, startDate, endDate, search } = req.query;

    const where: Record<string, unknown> = { userId: req.userId };
    if (accountId) where.accountId = String(accountId);
    if (categoryId) where.categoryId = String(categoryId);
    if (type) where.type = String(type);
    if (search) where.description = { contains: String(search) };
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(String(startDate));
      if (endDate) dateFilter.lte = new Date(String(endDate));
      where.date = dateFilter;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { account: true, category: true },
      orderBy: { date: 'desc' },
    });

    return res.json({ transactions });
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = baseTransactionSchema.parse(req.body);
    const userId = req.userId!;

    const [account, category] = await Promise.all([
      prisma.account.findFirst({ where: { id: data.accountId, userId } }),
      prisma.category.findFirst({ where: { id: data.categoryId, userId } }),
    ]);
    if (!account) return res.status(404).json({ error: 'Conta não encontrada' });
    if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });

    const startDate = new Date(data.date);
    const commonData = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      notes: data.notes || null,
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
    };

    if (data.isInstallment && data.installmentTotal) {
      const seriesId = randomUUID();
      const dates = generateInstallmentDates(startDate, data.installmentTotal);
      const created = await prisma.$transaction(
        dates.map((date, index) =>
          prisma.transaction.create({
            data: {
              ...commonData,
              date,
              seriesId,
              seriesType: 'INSTALLMENT',
              installmentNumber: index + 1,
              installmentTotal: data.installmentTotal,
            },
          })
        )
      );
      return res.status(201).json({ transactions: created });
    }

    if (data.isRecurring && data.recurrenceInterval && data.recurrenceCount) {
      const seriesId = randomUUID();
      const dates = generateSeriesDates(startDate, data.recurrenceInterval as RecurrenceInterval, data.recurrenceCount);
      const created = await prisma.$transaction(
        dates.map((date) =>
          prisma.transaction.create({
            data: {
              ...commonData,
              date,
              seriesId,
              seriesType: 'RECURRING',
              recurrenceInterval: data.recurrenceInterval,
            },
          })
        )
      );
      return res.status(201).json({ transactions: created });
    }

    const transaction = await prisma.transaction.create({
      data: { ...commonData, date: startDate },
      include: { account: true, category: true },
    });
    return res.status(201).json({ transactions: [transaction] });
  })
);

const updateTransactionSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
});

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = updateTransactionSchema.parse(req.body);

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Transação não encontrada' });

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { account: true, category: true },
    });

    return res.json({ transaction });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const scope = String(req.query.scope || 'single');

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Transação não encontrada' });

    if (scope === 'single' || !existing.seriesId) {
      await prisma.transaction.delete({ where: { id: req.params.id } });
      return res.status(204).send();
    }

    if (scope === 'future') {
      await prisma.transaction.deleteMany({
        where: { seriesId: existing.seriesId, userId: req.userId, date: { gte: existing.date } },
      });
      return res.status(204).send();
    }

    if (scope === 'all') {
      await prisma.transaction.deleteMany({
        where: { seriesId: existing.seriesId, userId: req.userId },
      });
      return res.status(204).send();
    }

    return res.status(400).json({ error: 'Escopo inválido' });
  })
);

export default router;
