import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().min(1),
  icon: z.string().min(1),
});

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
    });
    return res.json({ categories });
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: { ...data, userId: req.userId! },
    });
    return res.status(201).json({ category });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = categorySchema.partial().parse(req.body);

    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });
    return res.json({ category });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const txCount = await prisma.transaction.count({ where: { categoryId: req.params.id } });
    if (txCount > 0) {
      return res.status(409).json({ error: 'Não é possível excluir uma categoria com transações. Exclua as transações primeiro.' });
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  })
);

export default router;
