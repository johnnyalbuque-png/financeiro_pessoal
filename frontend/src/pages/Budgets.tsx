import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Target, ChevronLeft, ChevronRight } from 'lucide-react'
import { useBudgets, useCategories } from '../hooks/useApi'
import { formatCurrency, monthNames, getProgressColor, getProgressTextColor } from '../lib/utils'
import { Budget } from '../types'
import BudgetModal from '../components/BudgetModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import api from '../lib/api'
import clsx from 'clsx'

const Budgets = () => {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { toasts, removeToast, success, error: toastError } = useToast()
  const { data: budgets, loading, refetch } = useBudgets(month, year)
  const { data: categories } = useCategories()

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

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setModalOpen(true)
  }

  const handleDelete = (budget: Budget) => {
    setDeletingBudget(budget)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingBudget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/budgets/${deletingBudget.id}`)
      success('Orçamento excluído com sucesso!')
      refetch()
      setDeleteDialogOpen(false)
      setDeletingBudget(null)
    } catch {
      toastError('Erro ao excluir orçamento')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenNew = () => {
    setEditingBudget(null)
    setModalOpen(true)
  }

  const totalBudgeted = (budgets ?? []).reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = (budgets ?? []).reduce((sum, b) => sum + b.spent, 0)
  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Orçamentos</h2>
          <p className="text-sm text-gray-500">{(budgets ?? []).length} orçamentos configurados</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Definir Orçamento
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-1 w-fit">
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

      {/* Summary Card */}
      {(budgets ?? []).length > 0 && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Resumo do Mês</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-400">Orçado</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(totalBudgeted)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Gasto</p>
                  <p className={clsx('text-lg font-bold', getProgressTextColor(overallPercentage))}>
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Restante</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(Math.max(totalBudgeted - totalSpent, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Progresso geral</span>
                <span className={getProgressTextColor(overallPercentage)}>
                  {overallPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-500', getProgressColor(overallPercentage))}
                  style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (budgets ?? []).length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 text-gray-400">
          <Target className="w-12 h-12 mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">Nenhum orçamento configurado</p>
          <p className="text-sm mt-1">Defina limites para suas categorias de despesa</p>
          <button onClick={handleOpenNew} className="mt-4 btn-primary text-sm">
            Definir Orçamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(budgets ?? []).map((budget) => {
            const percentage =
              budget.amount > 0
                ? Math.min((budget.spent / budget.amount) * 100, 100)
                : 0
            const remaining = Math.max(budget.amount - budget.spent, 0)
            const isOver = budget.spent > budget.amount

            return (
              <div key={budget.id} className="card group hover:shadow-md transition-shadow">
                {/* Category header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: budget.category?.color ?? '#6366f1' }}
                    >
                      {budget.category?.icon ? (
                        <span className="text-lg">{budget.category.icon}</span>
                      ) : (
                        <span className="text-sm font-semibold">
                          {budget.category?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{budget.category?.name}</p>
                      <p className="text-xs text-gray-400">
                        {String(month).padStart(2, '0')}/{year}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">
                      {formatCurrency(budget.spent)} gasto
                    </span>
                    <span className={clsx('font-medium', getProgressTextColor(percentage))}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        getProgressColor(percentage),
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Amount info */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Limite: <span className="font-semibold text-gray-700">{formatCurrency(budget.amount)}</span>
                  </span>
                  {isOver ? (
                    <span className="text-red-600 font-semibold">
                      Excedido em {formatCurrency(budget.spent - budget.amount)}
                    </span>
                  ) : (
                    <span>
                      Restante: <span className="font-semibold text-green-600">{formatCurrency(remaining)}</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <BudgetModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingBudget(null)
        }}
        onSuccess={refetch}
        budget={editingBudget}
        categories={categories ?? []}
        month={month}
        year={year}
        onToast={(type, msg) => (type === 'success' ? success(msg) : toastError(msg))}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeletingBudget(null)
        }}
        onConfirm={confirmDelete}
        title="Excluir Orçamento"
        message={`Tem certeza que deseja excluir o orçamento de "${deletingBudget?.category?.name}"?`}
        loading={deleteLoading}
      />
    </div>
  )
}

export default Budgets
