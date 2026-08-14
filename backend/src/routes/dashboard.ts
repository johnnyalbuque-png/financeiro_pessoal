import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get(
  '/summary',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [accounts, incomeResult, expenseResult, categories, recentTransactions] = await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.category.findMany({ where: { userId, type: 'EXPENSE' } }),
      prisma.transaction.findMany({
        where: { userId },
        include: { account: true, category: true },
        orderBy: { date: 'desc' },
        take: 8,
      }),
    ]);

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

    const totalBalance = accountsWithBalance.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const totalIncome = incomeResult._sum.amount || 0;
    const totalExpense = expenseResult._sum.amount || 0;

    const expensesByCategory = await Promise.all(
      categories.map(async (category) => {
        const result = await prisma.transaction.aggregate({
          where: { userId, categoryId: category.id, type: 'EXPENSE', date: { gte: start, lt: end } },
          _sum: { amount: true },
        });
        return {
          categoryId: category.id,
          name: category.name,
          color: category.color,
          total: result._sum.amount || 0,
        };
      })
    );

    const monthlyEvolution = [];
    for (let i = 5; i >= 0; i--) {
      const refDate = new Date(year, month - 1 - i, 1);
      const refStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      const refEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);

      const [income, expense] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, type: 'INCOME', date: { gte: refStart, lt: refEnd } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: 'EXPENSE', date: { gte: refStart, lt: refEnd } },
          _sum: { amount: true },
        }),
      ]);

      monthlyEvolution.push({
        label: refStart.toLocaleDateString('pt-BR', { month: 'short' }),
        month: refStart.getMonth() + 1,
        year: refStart.getFullYear(),
        income: income._sum.amount || 0,
        expense: expense._sum.amount || 0,
      });
    }

    return res.json({
      totalBalance,
      totalIncome,
      totalExpense,
      accounts: accountsWithBalance,
      expensesByCategory: expensesByCategory.filter((c) => c.total > 0).sort((a, b) => b.total - a.total),
      monthlyEvolution,
      recentTransactions,
    });
  })
);

export default router;
