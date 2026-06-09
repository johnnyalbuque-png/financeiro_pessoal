import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useDashboard } from '../hooks/useApi'
import { formatCurrency, monthNames, getProgressColor, getProgressTextColor } from '../lib/utils'
import { TransactionType } from '../types'
import clsx from 'clsx'

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  subtitle?: string
}) => (
  <div className="card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={clsx('text-2xl font-bold mt-1', color)}>{formatCurrency(value)}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div
        className={clsx(
          'w-11 h-11 rounded-xl flex items-center justify-center',
          color === 'text-green-600'
            ? 'bg-green-100'
            : color === 'text-red-600'
              ? 'bg-red-100'
              : color === 'text-primary-600'
                ? 'bg-primary-100'
                : 'bg-violet-100',
        )}
      >
        <Icon
          className={clsx(
            'w-5 h-5',
            color === 'text-green-600'
              ? 'text-green-600'
              : color === 'text-red-600'
                ? 'text-red-600'
                : color === 'text-primary-600'
                  ? 'text-primary-600'
                  : 'text-violet-600',
          )}
        />
      </div>
    </div>
  </div>
)

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const Dashboard = () => {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data, loading, error } = useDashboard(month, year)

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const chartData = (data?.monthlyData ?? []).map((d) => ({
    name: d.month,
    Receitas: d.income,
    Despesas: d.expense,
  }))

  const pieData = (data?.expensesByCategory ?? []).map((c) => ({
    name: c.categoryName,
    value: c.total,
    color: c.color,
  }))

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-1">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Receitas do Mês"
          value={data?.totalIncome ?? 0}
          icon={TrendingUp}
          color="text-green-600"
          subtitle={`${monthNames[month - 1]} ${year}`}
        />
        <StatCard
          title="Despesas do Mês"
          value={data?.totalExpense ?? 0}
          icon={TrendingDown}
          color="text-red-600"
          subtitle={`${monthNames[month - 1]} ${year}`}
        />
        <StatCard
          title="Saldo Mensal"
          value={data?.monthlyBalance ?? 0}
          icon={DollarSign}
          color="text-primary-600"
          subtitle="Receitas - Despesas"
        />
        <StatCard
          title="Saldo Total"
          value={data?.totalBalance ?? 0}
          icon={Wallet}
          color="text-violet-600"
          subtitle="Todas as contas"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Receitas x Despesas (6 meses)
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Despesas por Categoria</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              Nenhuma despesa neste mês
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Transações Recentes</h2>
          {(data?.recentTransactions ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Nenhuma transação encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {(data?.recentTransactions ?? []).slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${tx.category?.color}20` }}
                  >
                    <span className="text-sm">{tx.category?.icon || '💰'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.category?.name}</p>
                  </div>
                  <span
                    className={clsx(
                      'text-sm font-semibold flex-shrink-0',
                      tx.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {tx.type === TransactionType.INCOME ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Progress */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Orçamentos</h2>
          {(data?.budgets ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Nenhum orçamento configurado
            </p>
          ) : (
            <div className="space-y-4">
              {(data?.budgets ?? []).slice(0, 5).map((budget) => {
                const percentage = budget.amount > 0
                  ? Math.min((budget.spent / budget.amount) * 100, 100)
                  : 0
                return (
                  <div key={budget.id}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-gray-700">{budget.category?.name}</span>
                      <span className={getProgressTextColor(percentage)}>
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          getProgressColor(percentage),
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {percentage.toFixed(0)}% utilizado
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
