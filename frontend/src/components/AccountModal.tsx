import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import api from '../lib/api'
import { Account, AccountType } from '../types'
import { accountTypeLabels, presetColors } from '../lib/utils'
import clsx from 'clsx'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.nativeEnum(AccountType),
  balance: z.coerce.number(),
  color: z.string().min(1, 'Selecione uma cor'),
  icon: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  account?: Account | null
  onToast: (type: 'success' | 'error', message: string) => void
}

const AccountModal = ({
  isOpen,
  onClose,
  onSuccess,
  account,
  onToast,
}: AccountModalProps) => {
  const isEdit = !!account

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
      type: AccountType.CHECKING,
      balance: 0,
      color: presetColors[0],
    },
  })

  const selectedColor = watch('color')

  useEffect(() => {
    if (isOpen) {
      if (account) {
        reset({
          name: account.name,
          type: account.type,
          balance: account.balance,
          color: account.color,
          icon: account.icon || '',
        })
      } else {
        reset({
          name: '',
          type: AccountType.CHECKING,
          balance: 0,
          color: presetColors[0],
          icon: '',
        })
      }
    }
  }, [isOpen, account, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await api.put(`/accounts/${account.id}`, data)
        onToast('success', 'Conta atualizada com sucesso!')
      } else {
        await api.post('/accounts', data)
        onToast('success', 'Conta criada com sucesso!')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      onToast('error', e?.response?.data?.message || 'Erro ao salvar conta')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Conta' : 'Nova Conta'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="label">Nome da Conta</label>
          <input
            type="text"
            placeholder="Ex: Nubank, Bradesco, Carteira..."
            className={clsx('input-field', errors.name && 'border-red-300')}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="label">Tipo de Conta</label>
          <select
            className={clsx('input-field', errors.type && 'border-red-300')}
            {...register('type')}
          >
            {Object.values(AccountType).map((type) => (
              <option key={type} value={type}>
                {accountTypeLabels[type]}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>
          )}
        </div>

        {/* Balance */}
        <div>
          <label className="label">
            {isEdit ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            className={clsx('input-field', errors.balance && 'border-red-300')}
            {...register('balance')}
          />
          {errors.balance && (
            <p className="text-red-500 text-xs mt-1">{errors.balance.message}</p>
          )}
        </div>

        {/* Icon */}
        <div>
          <label className="label">Ícone (opcional — use um emoji)</label>
          <input
            type="text"
            placeholder="Ex: 💳 🏦 💰"
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
                      selectedColor === color
                        ? 'border-gray-800 scale-110'
                        : 'border-transparent',
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
          <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: selectedColor }}
            >
              {watch('icon') || watch('name')?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {watch('name') || 'Nome da conta'}
              </p>
              <p className="text-xs text-gray-500">
                {accountTypeLabels[watch('type') as AccountType] || 'Tipo'}
              </p>
            </div>
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
              'Criar Conta'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AccountModal
