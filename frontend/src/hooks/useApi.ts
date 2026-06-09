import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import {
  Account,
  Category,
  Transaction,
  DashboardData,
  Budget,
  TransactionFilters,
} from '../types'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function useApiData<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => {
    setTrigger((t) => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchFn()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || err.message || 'Erro ao carregar dados')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...deps])

  return { data, loading, error, refetch }
}

export const useAccounts = (): UseApiResult<Account[]> => {
  return useApiData<Account[]>(async () => {
    const res = await api.get<Account[]>('/accounts')
    return res.data
  })
}

export const useCategories = (): UseApiResult<Category[]> => {
  return useApiData<Category[]>(async () => {
    const res = await api.get<Category[]>('/categories')
    return res.data
  })
}

export const useTransactions = (filters: TransactionFilters = {}): UseApiResult<Transaction[]> => {
  const { month, year, type, categoryId, accountId } = filters
  return useApiData<Transaction[]>(
    async () => {
      const params: Record<string, string | number> = {}
      if (month) params.month = month
      if (year) params.year = year
      if (type && type !== 'ALL') params.type = type
      if (categoryId) params.categoryId = categoryId
      if (accountId) params.accountId = accountId
      const res = await api.get<Transaction[]>('/transactions', { params })
      return res.data
    },
    [month, year, type, categoryId, accountId],
  )
}

export const useDashboard = (month: number, year: number): UseApiResult<DashboardData> => {
  return useApiData<DashboardData>(
    async () => {
      const res = await api.get<DashboardData>('/dashboard', { params: { month, year } })
      return res.data
    },
    [month, year],
  )
}

export const useBudgets = (month: number, year: number): UseApiResult<Budget[]> => {
  return useApiData<Budget[]>(
    async () => {
      const res = await api.get<Budget[]>('/budgets', { params: { month, year } })
      return res.data
    },
    [month, year],
  )
}
