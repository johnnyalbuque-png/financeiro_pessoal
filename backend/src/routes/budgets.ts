import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const budgetSchema = z.object({
  amount: z.number().positive('Valor deve ser maior que zero'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  categoryId: z.string().min(1),
});

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId, month, year },
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const spentResult = await prisma.transaction.aggregate({
          where: {
            userId: req.userId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: { gte: start, lt: end },
          },
          _sum: { amount: true },
        });
        return { ...budget, spent: spentResult._sum.amount || 0 };
      })
    );

    return res.json({ budgets: budgetsWithSpent });
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = budgetSchema.parse(req.body);

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId: req.userId },
    });
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: req.userId!,
          categoryId: data.categoryId,
          month: data.month,
          year: data.year,
        },
      },
      update: { amount: data.amount },
      create: { ...data, userId: req.userId! },
      include: { category: true },
    });

    return res.status(201).json({ budget });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const existing = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    await prisma.budget.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  })
);

export default router;
