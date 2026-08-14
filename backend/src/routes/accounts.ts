import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const accountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH']),
  balance: z.number().default(0),
  color: z.string().min(1),
  icon: z.string().min(1),
});

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const [income, expense] = await Promise.all([
          prisma.transaction.aggregate({
            where: { accountId: account.id, type: 'INCOME', date: { lte: now } },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: account.id, type: 'EXPENSE', date: { lte: now } },
            _sum: { amount: true },
          }),
        ]);
        const currentBalance = account.balance + (income._sum.amount || 0) - (expense._sum.amount || 0);
        return { ...account, currentBalance };
      })
    );

    return res.json({ accounts: accountsWithBalance });
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = accountSchema.parse(req.body);
    const account = await prisma.account.create({
      data: { ...data, userId: req.userId! },
    });
    return res.status(201).json({ account });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = accountSchema.partial().parse(req.body);

    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const account = await prisma.account.update({
      where: { id: req.params.id },
      data,
    });
    return res.json({ account });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const txCount = await prisma.transaction.count({ where: { accountId: req.params.id } });
    if (txCount > 0) {
      return res.status(409).json({ error: 'Não é possível excluir uma conta com transações. Exclua as transações primeiro.' });
    }

    await prisma.account.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  })
);

export default router;
