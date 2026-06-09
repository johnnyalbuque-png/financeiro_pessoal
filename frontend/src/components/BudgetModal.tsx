import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import api from '../lib/api'
import { Budget, Category, TransactionType } from '../types'
import clsx from 'clsx'

const schema = z.object({
  categoryId: z.coerce.number().min(1, 'Selecione uma categoria'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
})

type FormData = z.infer<typeof schema>

interface BudgetModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  budget?: Budget | null
  categories: Category[]
  month: number
  year: number
  onToast: (type: 'success' | 'error', message: string) => void
}

const BudgetModal = ({
  isOpen,
  onClose,
  onSuccess,
  budget,
  categories,
  month,
  year,
  onToast,
}: BudgetModalProps) => {
  const isEdit = !!budget

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: 0,
      amount: undefined,
    },
  })

  const expenseCategories = categories.filter((c) => c.type === TransactionType.EXPENSE)

  useEffect(() => {
    if (isOpen) {
      if (budget) {
        reset({
          categoryId: budget.categoryId,
          amount: budget.amount,
        })
      } else {
        reset({
          categoryId: 0,
          amount: undefined,
        })
      }
    }
  }, [isOpen, budget, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await api.put(`/budgets/${budget.id}`, { amount: data.amount })
        onToast('success', 'Orçamento atualizado com sucesso!')
      } else {
        await api.post('/budgets', { ...data, month, year })
        onToast('success', 'Orçamento definido com sucesso!')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      onToast('error', e?.response?.data?.message || 'Erro ao salvar orçamento')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Orçamento' : 'Definir Orçamento'}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Category */}
        <div>
          <label className="label">Categoria de Despesa</label>
          <select
            className={clsx('input-field', errors.categoryId && 'border-red-300')}
            disabled={isEdit}
            {...register('categoryId')}
          >
            <option value={0}>Selecione uma categoria</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}{c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="label">Limite Mensal (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ex: 500,00"
            className={clsx('input-field', errors.amount && 'border-red-300')}
            {...register('amount')}
          />
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Orçamento para {String(month).padStart(2, '0')}/{year}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : isEdit ? (
              'Atualizar'
            ) : (
              'Definir Orçamento'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default BudgetModal
