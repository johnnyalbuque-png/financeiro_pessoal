import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import api from '../lib/api'
import { Transaction, TransactionType, Category, Account } from '../types'
import clsx from 'clsx'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  type: z.nativeEnum(TransactionType),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1, 'Data é obrigatória'),
  categoryId: z.coerce.number().min(1, 'Selecione uma categoria'),
  accountId: z.coerce.number().min(1, 'Selecione uma conta'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  transaction?: Transaction | null
  categories: Category[]
  accounts: Account[]
  onToast: (type: 'success' | 'error', message: string) => void
}

const TransactionModal = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  categories,
  accounts,
  onToast,
}: TransactionModalProps) => {
  const isEdit = !!transaction

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
    },
  })

  const selectedType = watch('type')

  const filteredCategories = categories.filter((c) => c.type === selectedType)

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        reset({
          description: transaction.description,
          type: transaction.type,
          amount: transaction.amount,
          date: transaction.date.split('T')[0],
          categoryId: transaction.categoryId,
          accountId: transaction.accountId,
          notes: transaction.notes || '',
        })
      } else {
        reset({
          description: '',
          type: TransactionType.EXPENSE,
          amount: undefined,
          date: new Date().toISOString().split('T')[0],
          categoryId: 0,
          accountId: 0,
          notes: '',
        })
      }
    }
  }, [isOpen, transaction, reset])

  // Reset category when type changes
  useEffect(() => {
    setValue('categoryId', 0)
  }, [selectedType, setValue])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await api.put(`/transactions/${transaction.id}`, data)
        onToast('success', 'Transação atualizada com sucesso!')
      } else {
        await api.post('/transactions', data)
        onToast('success', 'Transação criada com sucesso!')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      onToast('error', e?.response?.data?.message || 'Erro ao salvar transação')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Transação' : 'Nova Transação'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Type Toggle */}
        <div>
          <label className="label">Tipo</label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => field.onChange(TransactionType.EXPENSE)}
                  className={clsx(
                    'flex-1 py-2.5 text-sm font-medium transition-colors',
                    field.value === TransactionType.EXPENSE
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50',
                  )}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange(TransactionType.INCOME)}
                  className={clsx(
                    'flex-1 py-2.5 text-sm font-medium transition-colors',
                    field.value === TransactionType.INCOME
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50',
                  )}
                >
                  Receita
                </button>
              </div>
            )}
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Descrição</label>
          <input
            type="text"
            placeholder="Ex: Supermercado, Salário..."
            className={clsx('input-field', errors.description && 'border-red-300')}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="label">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            className={clsx('input-field', errors.amount && 'border-red-300')}
            {...register('amount')}
          />
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="label">Data</label>
          <input
            type="date"
            className={clsx('input-field', errors.date && 'border-red-300')}
            {...register('date')}
          />
          {errors.date && (
            <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="label">Categoria</label>
          <select
            className={clsx('input-field', errors.categoryId && 'border-red-300')}
            {...register('categoryId')}
          >
            <option value={0}>Selecione uma categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}{c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Account */}
        <div>
          <label className="label">Conta</label>
          <select
            className={clsx('input-field', errors.accountId && 'border-red-300')}
            {...register('accountId')}
          >
            <option value={0}>Selecione uma conta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.accountId && (
            <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">Observações (opcional)</label>
          <textarea
            rows={2}
            placeholder="Alguma observação sobre esta transação..."
            className="input-field resize-none"
            {...register('notes')}
          />
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
              'Criar Transação'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TransactionModal
