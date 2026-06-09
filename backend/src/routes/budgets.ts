import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const upsertBudgetSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  categoryId: z.string().min(1, 'Category is required'),
});

// GET /api/budgets?month=&year=
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year || month < 1 || month > 12) {
      res.status(400).json({ error: 'Valid month (1-12) and year are required' });
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId, month, year },
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true, icon: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate spent amount for each budget's category in the given month/year
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spentResult = await prisma.transaction.aggregate({
          where: {
            userId: req.userId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        const spent = Number(spentResult._sum.amount ?? 0);
        const budgetAmount = Number(budget.amount);

        return {
          id: budget.id,
          amount: budgetAmount,
          month: budget.month,
          year: budget.year,
          userId: budget.userId,
          categoryId: budget.categoryId,
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt,
          category: budget.category,
          spent,
          remaining: budgetAmount - spent,
          percentUsed: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
        };
      })
    );

    res.json({ budgets: budgetsWithSpent, month, year });
  } catch (err) {
    console.error('Get budgets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/budgets — upsert budget for category+month+year
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = upsertBudgetSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { amount, month, year, categoryId } = validation.data;

    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.userId },
    });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Upsert: update if exists, create if not
    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: req.userId!,
          categoryId,
          month,
          year,
        },
      },
      update: { amount },
      create: {
        amount,
        month,
        year,
        userId: req.userId!,
        categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, type: true, color: true, icon: true },
        },
      },
    });

    res.status(201).json({
      budget: {
        ...budget,
        amount: Number(budget.amount),
      },
    });
  } catch (err) {
    console.error('Upsert budget error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.budget.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Budget not found' });
      return;
    }

    await prisma.budget.delete({ where: { id } });

    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    console.error('Delete budget error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
