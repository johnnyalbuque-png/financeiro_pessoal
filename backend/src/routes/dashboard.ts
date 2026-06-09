import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/dashboard?month=&year=
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
    const userId = req.userId!;

    // Run all independent queries in parallel
    const [
      incomeResult,
      expenseResult,
      accounts,
      recentTransactions,
      expenseByCategoryRaw,
      budgets,
    ] = await Promise.all([
      // Total income for current month
      prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),

      // Total expense for current month
      prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),

      // All accounts (for total balance)
      prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true, type: true, balance: true, color: true, icon: true },
      }),

      // Last 5 transactions
      prisma.transaction.findMany({
        where: { userId },
        include: {
          account: { select: { id: true, name: true, type: true, color: true, icon: true } },
          category: { select: { id: true, name: true, type: true, color: true, icon: true } },
        },
        orderBy: { date: 'desc' },
        take: 5,
      }),

      // Expense by category for the month
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { userId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),

      // Budgets for the month
      prisma.budget.findMany({
        where: { userId, month, year },
        include: {
          category: {
            select: { id: true, name: true, type: true, color: true, icon: true },
          },
        },
      }),
    ]);

    const totalIncome = Number(incomeResult._sum.amount ?? 0);
    const totalExpense = Number(expenseResult._sum.amount ?? 0);
    const netBalance = totalIncome - totalExpense;
    const accountsBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // Enrich expense by category with category info
    const categoryIds = expenseByCategoryRaw.map((e) => e.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true, icon: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const expenseByCategory = expenseByCategoryRaw.map((e) => ({
      categoryId: e.categoryId,
      category: categoryMap.get(e.categoryId) ?? null,
      total: Number(e._sum.amount ?? 0),
    }));

    // Monthly evolution: last 6 months (including current)
    const monthlyEvolution: Array<{
      month: number;
      year: number;
      income: number;
      expense: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      // Calculate the month offset
      let m = month - i;
      let y = year;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }

      const mStart = new Date(y, m - 1, 1);
      const mEnd = new Date(y, m, 0, 23, 59, 59, 999);

      const [mIncome, mExpense] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, type: 'INCOME', date: { gte: mStart, lte: mEnd } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: 'EXPENSE', date: { gte: mStart, lte: mEnd } },
          _sum: { amount: true },
        }),
      ]);

      monthlyEvolution.push({
        month: m,
        year: y,
        income: Number(mIncome._sum.amount ?? 0),
        expense: Number(mExpense._sum.amount ?? 0),
      });
    }

    // Budget summary: budgets with actual spending
    const budgetSummary = await Promise.all(
      budgets.map(async (budget) => {
        const spentResult = await prisma.transaction.aggregate({
          where: {
            userId,
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
          categoryId: budget.categoryId,
          category: budget.category,
          budgeted: budgetAmount,
          spent,
          remaining: budgetAmount - spent,
          percentUsed: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
        };
      })
    );

    res.json({
      totalIncome,
      totalExpense,
      netBalance,
      accountsBalance,
      recentTransactions: recentTransactions.map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
      })),
      expenseByCategory,
      monthlyEvolution,
      budgetSummary,
      month,
      year,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
