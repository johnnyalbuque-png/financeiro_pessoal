import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Wallet } from 'lucide-react'
import { useAccounts } from '../hooks/useApi'
import { formatCurrency, accountTypeLabels } from '../lib/utils'
import { Account } from '../types'
import AccountModal from '../components/AccountModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import api from '../lib/api'

const Accounts = () => {
  const { data: accounts, loading, refetch } = useAccounts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { toasts, removeToast, success, error: toastError } = useToast()

  const totalBalance = (accounts ?? []).reduce((sum, a) => sum + a.balance, 0)

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setModalOpen(true)
  }

  const handleDelete = (account: Account) => {
    setDeletingAccount(account)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingAccount) return
    setDeleteLoading(true)
    try {
      await api.delete(`/accounts/${deletingAccount.id}`)
      success('Conta excluída com sucesso!')
      refetch()
      setDeleteDialogOpen(false)
      setDeletingAccount(null)
    } catch {
      toastError('Erro ao excluir conta. Verifique se não há transações vinculadas.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenNew = () => {
    setEditingAccount(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contas</h2>
          <p className="text-sm text-gray-500">{(accounts ?? []).length} contas cadastradas</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      {/* Total Balance Card */}
      <div className="card bg-gradient-to-r from-primary-600 to-violet-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium">Saldo Total</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
            <p className="text-primary-200 text-xs mt-1">Soma de todas as contas</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (accounts ?? []).length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 text-gray-400">
          <Wallet className="w-12 h-12 mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">Nenhuma conta cadastrada</p>
          <p className="text-sm mt-1">Clique em "Nova Conta" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(accounts ?? []).map((account) => (
            <div
              key={account.id}
              className="card relative overflow-hidden group hover:shadow-md transition-shadow"
            >
              {/* Color stripe */}
              <div
                className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                style={{ backgroundColor: account.color }}
              />

              <div className="pl-3">
                {/* Icon and actions */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.icon || account.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(account)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Account info */}
                <p className="font-semibold text-gray-900 truncate">{account.name}</p>
                <p className="text-xs text-gray-500 mb-3">{accountTypeLabels[account.type]}</p>

                {/* Balance */}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Saldo</p>
                  <p
                    className={`text-lg font-bold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}
                  >
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AccountModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingAccount(null)
        }}
        onSuccess={refetch}
        account={editingAccount}
        onToast={(type, msg) => (type === 'success' ? success(msg) : toastError(msg))}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeletingAccount(null)
        }}
        onConfirm={confirmDelete}
        title="Excluir Conta"
        message={`Tem certeza que deseja excluir a conta "${deletingAccount?.name}"? Esta ação não pode ser desfeita.`}
        loading={deleteLoading}
      />
    </div>
  )
}

export default Accounts
