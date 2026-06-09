import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import api from '../lib/api'
import { Category, TransactionType } from '../types'
import { presetColors } from '../lib/utils'
import clsx from 'clsx'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.nativeEnum(TransactionType),
  color: z.string().min(1, 'Selecione uma cor'),
  icon: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category?: Category | null
  defaultType?: TransactionType
  onToast: (type: 'success' | 'error', message: string) => void
}

const CategoryModal = ({
  isOpen,
  onClose,
  onSuccess,
  category,
  defaultType = TransactionType.EXPENSE,
  onToast,
}: CategoryModalProps) => {
  const isEdit = !!category

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      color: presetColors[0],
    },
  })

  const selectedColor = watch('color')

  useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon || '',
        })
      } else {
        reset({
          name: '',
          type: defaultType,
          color: presetColors[0],
          icon: '',
        })
      }
    }
  }, [isOpen, category, defaultType, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await api.put(`/categories/${category.id}`, data)
        onToast('success', 'Categoria atualizada com sucesso!')
      } else {
        await api.post('/categories', data)
        onToast('success', 'Categoria criada com sucesso!')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      onToast('error', e?.response?.data?.message || 'Erro ao salvar categoria')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Categoria' : 'Nova Categoria'}
      size="sm"
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

        {/* Name */}
        <div>
          <label className="label">Nome</label>
          <input
            type="text"
            placeholder="Ex: Alimentação, Transporte, Salário..."
            className={clsx('input-field', errors.name && 'border-red-300')}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Icon */}
        <div>
          <label className="label">Ícone (opcional — use um emoji)</label>
          <input
            type="text"
            placeholder="Ex: 🍔 🚗 💼"
            className="input-field"
            maxLength={4}
            {...register('icon')}
          />
        </div>

        {/* Color */}
        <div>
          <label className="label">Cor</label>
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => field.onChange(color)}
                    className={clsx(
                      'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                      selectedColor === color ? 'border-gray-800 scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          />
          {errors.color && (
            <p className="text-red-500 text-xs mt-1">{errors.color.message}</p>
          )}

          {/* Preview */}
          <div className="mt-3 flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: selectedColor }}
            >
              {watch('icon') && <span>{watch('icon')}</span>}
              <span>{watch('name') || 'Categoria'}</span>
            </span>
          </div>
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
              'Criar Categoria'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CategoryModal
