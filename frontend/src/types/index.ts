export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  INVESTMENT = 'INVESTMENT',
  CASH = 'CASH',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

export interface Account {
  id: number
  name: string
  type: AccountType
  balance: number
  color: string
  icon?: string
  userId: number
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  type: TransactionType
  color: string
  icon?: string
  userId: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: number
  description: string
  type: TransactionType
  amount: number
  date: string
  notes?: string
  categoryId: number
  accountId: number
  userId: number
  category: Category
  account: Account
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: number
  amount: number
  month: number
  year: number
  spent: number
  categoryId: number
  userId: number
  category: Category
  createdAt: string
  updatedAt: string
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

export interface CategoryExpense {
  categoryId: number
  categoryName: string
  color: string
  total: number
}

export interface DashboardData {
  totalIncome: number
  totalExpense: number
  monthlyBalance: number
  totalBalance: number
  monthlyData: MonthlyData[]
  expensesByCategory: CategoryExpense[]
  recentTransactions: Transaction[]
  budgets: Budget[]
}

export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TransactionFilters {
  month?: number
  year?: number
  type?: TransactionType | 'ALL'
  categoryId?: number
  accountId?: number
  page?: number
  limit?: number
}

export interface AuthResponse {
  token: string
  user: User
}
