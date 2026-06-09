import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH'] as const;

const createAccountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  type: z.enum(ACCOUNT_TYPES),
  balance: z.number({ required_error: 'Saldo inicial é obrigatório' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use hex, ex: #FF0000)'),
  icon: z.string().min(1, 'Ícone é obrigatório'),
});

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().min(1).optional(),
});

// GET /api/accounts
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    res.json({ accounts, totalBalance });
  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
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
      data: { name, type, balance, color, icon, userId: req.userId! },
    });

    res.status(201).json({ account });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    const validation = updateAccountSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const account = await prisma.account.update({ where: { id }, data: validation.data });

    res.json({ account });
  } catch (err) {
    console.error('Update account error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    const transactionCount = await prisma.transaction.count({ where: { accountId: id } });
    if (transactionCount > 0) {
      res.status(409).json({
        error: `Não é possível excluir conta com transações. Esta conta possui ${transactionCount} transação(ões).`,
      });
      return;
    }

    await prisma.account.delete({ where: { id } });

    res.json({ message: 'Conta excluída com sucesso' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
