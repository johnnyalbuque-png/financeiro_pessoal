import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Search, Filter } from 'lucide-react'
import { useTransactions } from '../hooks/useApi'
import { useAccounts, useCategories } from '../hooks/useApi'
import { formatCurrency, formatDate, monthNames } from '../lib/utils'
import { Transaction, TransactionType } from '../types'
import TransactionModal from '../components/TransactionModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import api from '../lib/api'
import clsx from 'clsx'

const Transactions = () => {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<number>(0)
  const [accountFilter, setAccountFilter] = useState<number>(0)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { toasts, removeToast, success, error: toastError } = useToast()

  const { data: transactions, loading, refetch } = useTransactions({
    month,
    year,
    type: typeFilter,
    categoryId: categoryFilter || undefined,
    accountId: accountFilter || undefined,
  })

  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()

  const filtered = (transactions ?? []).filter((tx) => {
    if (!search) return true
    return tx.description.toLowerCase().includes(search.toLowerCase())
  })

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx)
    setModalOpen(true)
  }

  const handleDelete = (tx: Transaction) => {
    setDeletingTransaction(tx)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingTransaction) return
    setDeleteLoading(true)
    try {
      await api.delete(`/transactions/${deletingTransaction.id}`)
      success('Transação excluída com sucesso!')
      refetch()
      setDeleteDialogOpen(false)
      setDeletingTransaction(null)
    } catch {
      toastError('Erro ao excluir transação')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenNew = () => {
    setEditingTransaction(null)
    setModalOpen(true)
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="space-y-4">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Transações</h2>
          <p className="text-sm text-gray-500">{filtered.length} transações encontradas</p>
        </div>
        <button onClick={handleOpenNew} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Month */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="input-field text-sm"
          >
            {monthNames.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input-field text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'ALL')}
            className="input-field text-sm"
          >
            <option value="ALL">Todos os tipos</option>
            <option value={TransactionType.INCOME}>Receitas</option>
            <option value={TransactionType.EXPENSE}>Despesas</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(Number(e.target.value))}
            className="input-field text-sm"
          >
            <option value={0}>Todas as categorias</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Account */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(Number(e.target.value))}
            className="input-field text-sm"
          >
            <option value={0}>Todas as contas</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="font-medium">Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Ajuste os filtros ou crie uma nova transação</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Data</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Descrição</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Categoria</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Conta</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Valor</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                      {tx.notes && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{tx.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {tx.category && (
                        <span
                          className="badge text-white text-xs"
                          style={{ backgroundColor: tx.category.color }}
                        >
                          {tx.category.icon && <span className="mr-1">{tx.category.icon}</span>}
                          {tx.category.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {tx.account?.color && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tx.account.color }}
                          />
                        )}
                        <span className="text-sm text-gray-600">{tx.account?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={clsx(
                          'text-sm font-semibold',
                          tx.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600',
                        )}
                      >
                        {tx.type === TransactionType.INCOME ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingTransaction(null)
        }}
        onSuccess={refetch}
        transaction={editingTransaction}
        categories={categories ?? []}
        accounts={accounts ?? []}
        onToast={(type, msg) => (type === 'success' ? success(msg) : toastError(msg))}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeletingTransaction(null)
        }}
        onConfirm={confirmDelete}
        title="Excluir Transação"
        message={`Tem certeza que deseja excluir "${deletingTransaction?.description}"? Esta ação não pode ser desfeita.`}
        loading={deleteLoading}
      />
    </div>
  )
}

export default Transactions
