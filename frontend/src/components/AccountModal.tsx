import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import { Modal } from './Modal';
import { Account } from '../types';
import { ACCOUNT_ICON_NAMES, CATEGORY_COLORS, getIcon } from '../lib/icons';

const schema = z.object({
  name: z.string().min(1, 'Informe um nome'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH']),
  balance: z.coerce.number(),
  color: z.string().min(1),
  icon: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

const TYPE_LABELS: Record<FormData['type'], string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CREDIT_CARD: 'Cartão de crédito',
  INVESTMENT: 'Investimentos',
  CASH: 'Dinheiro em espécie',
};

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  account?: Account | null;
}

export function AccountModal({ isOpen, onClose, onSubmit, account }: AccountModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: account
      ? { name: account.name, type: account.type, balance: account.balance, color: account.color, icon: account.icon }
      : { name: '', type: 'CHECKING', balance: 0, color: CATEGORY_COLORS[6], icon: 'Landmark' },
  });

  async function handleFormSubmit(data: FormData) {
    await onSubmit(data);
    reset();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={account ? 'Editar conta' : 'Nova conta'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
          <input
            {...register('name')}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ex: Nubank, Carteira..."
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
          <select
            {...register('type')}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Saldo inicial</label>
          <input
            type="number"
            step="0.01"
            {...register('balance')}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="0,00"
          />
          {errors.balance && <p className="text-xs text-red-600 mt-1">{errors.balance.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Ícone</label>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_ICON_NAMES.map((name) => {
                  const Icon = getIcon(name);
                  return (
                    <button
                      type="button"
                      key={name}
                      onClick={() => field.onChange(name)}
                      className={clsx(
                        'h-10 w-10 rounded-xl flex items-center justify-center border transition',
                        field.value === name ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      )}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Cor</label>
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => field.onChange(color)}
                    className={clsx(
                      'h-8 w-8 rounded-full border-2 transition',
                      field.value === color ? 'border-slate-900 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 text-white font-medium py-2.5 hover:bg-brand-700 transition disabled:opacity-60"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </Modal>
  );
}
