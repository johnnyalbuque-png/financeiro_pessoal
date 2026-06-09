import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { TransactionType } from '@prisma/client';

const router = Router();
router.use(authMiddleware);

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.nativeEnum(TransactionType),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g. #FF0000)'),
  icon: z.string().min(1, 'Icon is required'),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().min(1).optional(),
});

// GET /api/categories
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query;

    const where: { userId: string; type?: TransactionType } = {
      userId: req.userId!,
    };

    if (type === 'INCOME' || type === 'EXPENSE') {
      where.type = type as TransactionType;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
      data: {
        ...validation.data,
        userId: req.userId!,
      },
    });

    res.status(201).json({ category });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const validation = updateCategorySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data: validation.data,
    });

    res.json({ category });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      res.status(409).json({
        error: `Cannot delete category with existing transactions. This category has ${transactionCount} transaction(s).`,
      });
      return;
    }

    const budgetCount = await prisma.budget.count({
      where: { categoryId: id },
    });

    if (budgetCount > 0) {
      res.status(409).json({
        error: `Cannot delete category with existing budgets. This category has ${budgetCount} budget(s).`,
      });
      return;
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
