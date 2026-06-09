import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  type: z.enum(TRANSACTION_TYPES),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use hex, ex: #FF0000)'),
  icon: z.string().min(1, 'Ícone é obrigatório'),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().min(1).optional(),
});

// GET /api/categories
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query;

    const where: { userId: string; type?: string } = { userId: req.userId! };

    if (type === 'INCOME' || type === 'EXPENSE') {
      where.type = type;
    }

    const categories = await prisma.category.findMany({ where, orderBy: { name: 'asc' } });

    res.json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/categories
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = createCategorySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const category = await prisma.category.create({
      data: { ...validation.data, userId: req.userId! },
    });

    res.status(201).json({ category });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }

    const validation = updateCategorySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const category = await prisma.category.update({ where: { id }, data: validation.data });

    res.json({ category });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }

    const transactionCount = await prisma.transaction.count({ where: { categoryId: id } });
    if (transactionCount > 0) {
      res.status(409).json({
        error: `Não é possível excluir categoria com transações. Esta categoria possui ${transactionCount} transação(ões).`,
      });
      return;
    }

    const budgetCount = await prisma.budget.count({ where: { categoryId: id } });
    if (budgetCount > 0) {
      res.status(409).json({
        error: `Não é possível excluir categoria com orçamentos. Esta categoria possui ${budgetCount} orçamento(s).`,
      });
      return;
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
