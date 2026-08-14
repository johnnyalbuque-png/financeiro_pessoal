import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hashedPassword },
    });

    const defaultCategories = [
      { name: 'Salário', type: 'INCOME', color: '#22c55e', icon: 'Wallet' },
      { name: 'Outras Receitas', type: 'INCOME', color: '#10b981', icon: 'PlusCircle' },
      { name: 'Alimentação', type: 'EXPENSE', color: '#f97316', icon: 'UtensilsCrossed' },
      { name: 'Transporte', type: 'EXPENSE', color: '#3b82f6', icon: 'Car' },
      { name: 'Moradia', type: 'EXPENSE', color: '#8b5cf6', icon: 'Home' },
      { name: 'Saúde', type: 'EXPENSE', color: '#ef4444', icon: 'HeartPulse' },
      { name: 'Lazer', type: 'EXPENSE', color: '#ec4899', icon: 'PartyPopper' },
      { name: 'Educação', type: 'EXPENSE', color: '#06b6d4', icon: 'GraduationCap' },
      { name: 'Compras', type: 'EXPENSE', color: '#eab308', icon: 'ShoppingBag' },
      { name: 'Outros', type: 'EXPENSE', color: '#64748b', icon: 'MoreHorizontal' },
    ];

    await prisma.category.createMany({
      data: defaultCategories.map((c) => ({ ...c, userId: user.id })),
    });

    const token = signToken({ userId: user.id });

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = signToken({ userId: user.id });

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  })
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({ user });
  })
);

export default router;
