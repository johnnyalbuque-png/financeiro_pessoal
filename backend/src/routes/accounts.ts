import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AccountType } from '@prisma/client';

const router = Router();
router.use(authMiddleware);

const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.nativeEnum(AccountType),
  balance: z.number({ required_error: 'Balance is required' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g. #FF0000)'),
  icon: z.string().min(1, 'Icon is required'),
});

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(AccountType).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().min(1).optional(),
});

function serializeAccount(account: Record<string, unknown>) {
  return {
    ...account,
    balance: Number(account.balance),
  };
}

// GET /api/accounts
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    res.json({
      accounts: accounts.map(serializeAccount),
      totalBalance,
    });
  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/accounts
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = createAccountSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { name, type, balance, color, icon } = validation.data;

    const account = await prisma.account.create({
      data: {
        name,
        type,
        balance,
        color,
        icon,
        userId: req.userId!,
      },
    });

    res.status(201).json({ account: serializeAccount(account as unknown as Record<string, unknown>) });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const validation = updateAccountSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const account = await prisma.account.update({
      where: { id },
      data: validation.data,
    });

    res.json({ account: serializeAccount(account as unknown as Record<string, unknown>) });
  } catch (err) {
    console.error('Update account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const transactionCount = await prisma.transaction.count({
      where: { accountId: id },
    });

    if (transactionCount > 0) {
      res.status(409).json({
        error: `Cannot delete account with existing transactions. This account has ${transactionCount} transaction(s).`,
      });
      return;
    }

    await prisma.account.delete({ where: { id } });

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
