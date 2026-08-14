import {
  Wallet,
  PlusCircle,
  UtensilsCrossed,
  Car,
  Home,
  HeartPulse,
  PartyPopper,
  GraduationCap,
  ShoppingBag,
  MoreHorizontal,
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Banknote,
  Plane,
  Gift,
  Dumbbell,
  Baby,
  Dog,
  Smartphone,
  Shirt,
  Coffee,
  Fuel,
  Film,
  Briefcase,
  LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  PlusCircle,
  UtensilsCrossed,
  Car,
  Home,
  HeartPulse,
  PartyPopper,
  GraduationCap,
  ShoppingBag,
  MoreHorizontal,
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Banknote,
  Plane,
  Gift,
  Dumbbell,
  Baby,
  Dog,
  Smartphone,
  Shirt,
  Coffee,
  Fuel,
  Film,
  Briefcase,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || MoreHorizontal;
}

export const ACCOUNT_ICON_NAMES = ['Landmark', 'PiggyBank', 'CreditCard', 'Wallet', 'Banknote', 'TrendingUp'];

export const CATEGORY_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#0f172a',
];
