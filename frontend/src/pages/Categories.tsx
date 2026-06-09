import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react'
import { useCategories } from '../hooks/useApi'
import { Category, TransactionType } from '../types'
import CategoryModal from '../components/CategoryModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import api from '../lib/api'

const Categories = () => {
  const { data: categories, loading, refetch } = useCategories()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [defaultType, setDefaultType] = useState<TransactionType>(TransactionType.EXPENSE)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { toasts, removeToast, success, error: toastError } = useToast()

  const incomeCategories = (categories ?? []).filter((c) => c.type === TransactionType.INCOME)
  const expenseCategories = (categories ?? []).filter((c) => c.type === TransactionType.EXPENSE)

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setModalOpen(true)
  }

  const handleDelete = (category: Category) => {
    setDeletingCategory(category)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingCategory) return
    setDeleteLoading(true)
    try {
      await api.delete(`/categories/${deletingCategory.id}`)
      success('Categoria excluída com sucesso!')
      refetch()
      setDeleteDialogOpen(false)
      setDeletingCategory(null)
    } catch {
      toastError('Erro ao excluir categoria. Verifique se não há transações vinculadas.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleOpenNew = (type: TransactionType) => {
    setEditingCategory(null)
    setDefaultType(type)
    setModalOpen(true)
  }

  const CategoryCard = ({ category }: { category: Category }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow group">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold"
        style={{ backgroundColor: category.color }}
      >
        {category.icon ? (
          <span className="text-lg">{category.icon}</span>
        ) : (
          <span className="text-sm">{category.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800">{category.name}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleEdit(category)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleDelete(category)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  const SectionHeader = ({
    title,
    count,
    type,
    color,
  }: {
    title: string
    count: number
    type: TransactionType
    color: string
  }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <span
          className="badge text-white"
          style={{ backgroundColor: color }}
        >
          {count}
        </span>
      </div>
      <button
        onClick={() => handleOpenNew(type)}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categorias</h2>
          <p className="text-sm text-gray-500">
            {(categories ?? []).length} categorias no total
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div className="card">
            <SectionHeader
              title="Receitas"
              count={incomeCategories.length}
              type={TransactionType.INCOME}
              color="#22c55e"
            />
            {incomeCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Tag className="w-10 h-10 mb-2 text-gray-300" />
                <p className="text-sm">Nenhuma categoria de receita</p>
                <button
                  onClick={() => handleOpenNew(TransactionType.INCOME)}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Criar categoria
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {incomeCategories.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            )}
          </div>

          {/* Expense Categories */}
          <div className="card">
            <SectionHeader
              title="Despesas"
              count={expenseCategories.length}
              type={TransactionType.EXPENSE}
              color="#ef4444"
            />
            {expenseCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Tag className="w-10 h-10 mb-2 text-gray-300" />
                <p className="text-sm">Nenhuma categoria de despesa</p>
                <button
                  onClick={() => handleOpenNew(TransactionType.EXPENSE)}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Criar categoria
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingCategory(null)
        }}
        onSuccess={refetch}
        category={editingCategory}
        defaultType={defaultType}
        onToast={(type, msg) => (type === 'success' ? success(msg) : toastError(msg))}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeletingCategory(null)
        }}
        onConfirm={confirmDelete}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${deletingCategory?.name}"? As transações vinculadas podem ser afetadas.`}
        loading={deleteLoading}
      />
    </div>
  )
}

export default Categories
