import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();
router.use(authMiddleware);

const createTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255),
  amount: z.number().positive('Amount must be positive'),
  type: z.nativeEnum(TransactionType),
  date: z.string().datetime({ message: 'Invalid date format, use ISO 8601' }),
  notes: z.string().max(500).optional(),
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().min(1, 'Category is required'),
});

const updateTransactionSchema = z.object({
  description: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).nullable().optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
});

function serializeTransaction(tx: Record<string, unknown>) {
  return {
    ...tx,
    amount: Number(tx.amount),
  };
}

function getBalanceDelta(amount: number, type: TransactionType): number {
  return type === 'INCOME' ? amount : -amount;
}

// GET /api/transactions/summary
router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year || month < 1 || month > 12) {
      res.status(400).json({ error: 'Valid month (1-12) and year are required' });
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') totalIncome += amount;
      else totalExpense += amount;
    }

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      month,
      year,
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
        res.status(400).json({ error: 'Month must be between 1 and 12' });
        return;
      }
      where.date = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59, 999),
      };
    }

    if (type === 'INCOME' || type === 'EXPENSE') {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (accountId) {
      where.accountId = accountId;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, type: true, color: true, icon: true } },
        category: { select: { id: true, name: true, type: true, color: true, icon: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json({
      transactions: transactions.map((tx) =>
        serializeTransaction(tx as unknown as Record<string, unknown>)
      ),
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
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

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: req.userId },
    });
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.userId },
    });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
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
        data: {
          balance: {
            increment: balanceDelta,
          },
        },
      }),
    ]);

    res.status(201).json({
      transaction: serializeTransaction(transaction as unknown as Record<string, unknown>),
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const validation = updateTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const data = validation.data;

    // Compute old balance delta (what we need to reverse)
    const oldAmount = Number(existing.amount as Decimal);
    const oldType = existing.type;
    const oldDelta = getBalanceDelta(oldAmount, oldType);

    // New values
    const newAmount = data.amount ?? oldAmount;
    const newType = data.type ?? oldType;
    const newDelta = getBalanceDelta(newAmount, newType);
    const balanceAdjustment = newDelta - oldDelta;

    // If accountId is changing, handle separately
    const newAccountId = data.accountId ?? existing.accountId;
    const accountChanged = newAccountId !== existing.accountId;

    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, userId: req.userId },
      });
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
    }

    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, userId: req.userId },
      });
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
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
      // Reverse old account balance, apply new delta to new account
      [transaction] = await prisma.$transaction([
        prisma.transaction.update({
          where: { id },
          data: updateData,
          include: {
            account: { select: { id: true, name: true, type: true, color: true, icon: true } },
            category: { select: { id: true, name: true, type: true, color: true, icon: true } },
          },
        }),
        prisma.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: -oldDelta } },
        }),
        prisma.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newDelta } },
        }),
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
        prisma.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: balanceAdjustment } },
        }),
      ]);
    }

    res.json({
      transaction: serializeTransaction(transaction as unknown as Record<string, unknown>),
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const balanceDelta = getBalanceDelta(Number(existing.amount as Decimal), existing.type);

    await prisma.$transaction([
      prisma.transaction.delete({ where: { id } }),
      prisma.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: -balanceDelta } },
      }),
    ]);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
