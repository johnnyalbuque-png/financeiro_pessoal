import { AccountType, TransactionType } from '../types'

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export const accountTypeLabels: Record<AccountType, string> = {
  [AccountType.CHECKING]: 'Conta Corrente',
  [AccountType.SAVINGS]: 'Poupança',
  [AccountType.CREDIT_CARD]: 'Cartão de Crédito',
  [AccountType.INVESTMENT]: 'Investimento',
  [AccountType.CASH]: 'Dinheiro',
}

export const transactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'Receita',
  [TransactionType.EXPENSE]: 'Despesa',
}

export const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const getCurrentMonthYear = () => {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

export const getProgressTextColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-red-600'
  if (percentage >= 70) return 'text-yellow-600'
  return 'text-green-600'
}

export const presetColors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#64748b', '#78716c', '#84cc16', '#a855f7', '#f43f5e',
]
