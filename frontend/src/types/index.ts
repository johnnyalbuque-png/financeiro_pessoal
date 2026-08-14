export interface User {
  id: string;
  name: string;
  email: string;
}

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currentBalance: number;
  color: string;
  icon: string;
}

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export type SeriesType = 'RECURRING' | 'INSTALLMENT';
export type RecurrenceInterval = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: CategoryType;
  date: string;
  notes?: string | null;
  accountId: string;
  categoryId: string;
  account: Account;
  category: Category;
  seriesId?: string | null;
  seriesType?: SeriesType | null;
  recurrenceInterval?: RecurrenceInterval | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
}

export interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  category: Category;
  spent: number;
}

export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  accounts: Account[];
  expensesByCategory: { categoryId: string; name: string; color: string; total: number }[];
  monthlyEvolution: { label: string; month: number; year: number; income: number; expense: number }[];
  recentTransactions: Transaction[];
}
