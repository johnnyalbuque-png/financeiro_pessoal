import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;

const createTransactionSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.enum(TRANSACTION_TYPES),
  date: z.string().min(1, 'Data é obrigatória'),
  notes: z.string().max(500).optional(),
  accountId: z.string().min(1, 'Conta é obrigatória'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
});

const updateTransactionSchema = z.object({
  description: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  date: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
});

function getBalanceDelta(amount: number, type: string): number {
  return type === 'INCOME' ? amount : -amount;
}

// GET /api/transactions/summary
router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year || month < 1 || month > 12) {
      res.status(400).json({ error: 'Mês (1-12) e ano válidos são obrigatórios' });
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId, date: { gte: startDate, lte: endDate } },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      else totalExpense += tx.amount;
    }

    res.json({ totalIncome, totalExpense, balance: totalIncome - totalExpense, month, year });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/transactions
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year, type, categoryId, accountId } = req.query;

    const where: Record<string, unknown> = { userId: req.userId };

    if (month && year) {
      const m = parseInt(month as string);
      const y = parseInt(year as string);
      if (m < 1 || m > 12) {
        res.status(400).json({ error: 'Mês deve estar entre 1 e 12' });
        return;
      }
      where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59, 999) };
    }

    if (type === 'INCOME' || type === 'EXPENSE') where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, type: true, color: true, icon: true } },
        category: { select: { id: true, name: true, type: true, color: true, icon: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ transactions });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/transactions
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = createTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { description, amount, type, date, notes, accountId, categoryId } = validation.data;

    const account = await prisma.account.findFirst({ where: { id: accountId, userId: req.userId } });
    if (!account) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    const category = await prisma.category.findFirst({ where: { id: categoryId, userId: req.userId } });
    if (!category) {
      res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }

    const balanceDelta = getBalanceDelta(amount, type);

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          description,
          amount,
          type,
          date: new Date(date),
          notes,
          userId: req.userId!,
          accountId,
          categoryId,
        },
        include: {
          account: { select: { id: true, name: true, type: true, color: true, icon: true } },
          category: { select: { id: true, name: true, type: true, color: true, icon: true } },
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceDelta } },
      }),
    ]);

    res.status(201).json({ transaction });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: 'Transação não encontrada' });
      return;
    }

    const validation = updateTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const data = validation.data;

    const oldDelta = getBalanceDelta(existing.amount, existing.type);
    const newAmount = data.amount ?? existing.amount;
    const newType = data.type ?? existing.type;
    const newDelta = getBalanceDelta(newAmount, newType);
    const balanceAdjustment = newDelta - oldDelta;
    const newAccountId = data.accountId ?? existing.accountId;
    const accountChanged = newAccountId !== existing.accountId;

    if (data.accountId) {
      const account = await prisma.account.findFirst({ where: { id: data.accountId, userId: req.userId } });
      if (!account) {
        res.status(404).json({ error: 'Conta não encontrada' });
        return;
      }
    }

    if (data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: req.userId } });
      if (!category) {
        res.status(404).json({ error: 'Categoria não encontrada' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

    let transaction;
    if (accountChanged) {
      [transaction] = await prisma.$transaction([
        prisma.transaction.update({
          where: { id },
          data: updateData,
          include: {
            account: { select: { id: true, name: true, type: true, color: true, icon: true } },
            category: { select: { id: true, name: true, type: true, color: true, icon: true } },
          },
        }),
        prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: -oldDelta } } }),
        prisma.account.update({ where: { id: newAccountId }, data: { balance: { increment: newDelta } } }),
      ]);
    } else {
      [transaction] = await prisma.$transaction([
        prisma.transaction.update({
          where: { id },
          data: updateData,
          include: {
            account: { select: { id: true, name: true, type: true, color: true, icon: true } },
            category: { select: { id: true, name: true, type: true, color: true, icon: true } },
          },
        }),
        prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: balanceAdjustment } } }),
      ]);
    }

    res.json({ transaction });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: 'Transação não encontrada' });
      return;
    }

    const balanceDelta = getBalanceDelta(existing.amount, existing.type);

    await prisma.$transaction([
      prisma.transaction.delete({ where: { id } }),
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: -balanceDelta } } }),
    ]);

    res.json({ message: 'Transação excluída com sucesso' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
