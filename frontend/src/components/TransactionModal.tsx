import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import { Modal } from './Modal';
import { Account, Category, Transaction } from '../types';
import { toInputDate } from '../lib/format';

const schema = z
  .object({
    description: z.string().min(1, 'Informe uma descrição'),
    amount: z.coerce.number().positive('Valor deve ser maior que zero'),
    type: z.enum(['INCOME', 'EXPENSE']),
    date: z.string().min(1, 'Informe a data'),
    accountId: z.string().min(1, 'Selecione uma conta'),
    categoryId: z.string().min(1, 'Selecione uma categoria'),
    notes: z.string().optional(),
    mode: z.enum(['single', 'recurring', 'installment']),
    recurrenceInterval: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
    recurrenceCount: z.coerce.number().int().min(2).max(60).optional(),
    installmentTotal: z.coerce.number().int().min(2).max(60).optional(),
  })
  .refine((data) => data.mode !== 'recurring' || (data.recurrenceInterval && data.recurrenceCount), {
    message: 'Informe a frequência e quantas vezes deve se repetir',
    path: ['recurrenceCount'],
  })
  .refine((data) => data.mode !== 'installment' || data.installmentTotal, {
    message: 'Informe o número de parcelas',
    path: ['installmentTotal'],
  });

type FormData = z.infer<typeof schema>;

export interface TransactionSubmitData {
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  accountId: string;
  categoryId: string;
  notes?: string;
  isRecurring: boolean;
  recurrenceInterval?: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrenceCount?: number;
  isInstallment: boolean;
  installmentTotal?: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionSubmitData) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction | null;
}

const RECURRENCE_LABELS: Record<string, string> = {
  WEEKLY: 'Semanalmente',
  MONTHLY: 'Mensalmente',
  YEARLY: 'Anualmente',
};

export function TransactionModal({ isOpen, onClose, onSubmit, accounts, categories, transaction }: TransactionModalProps) {
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
    values: transaction
      ? {
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          date: toInputDate(transaction.date),
          accountId: transaction.accountId,
          categoryId: transaction.categoryId,
          notes: transaction.notes || '',
          mode: 'single',
          recurrenceInterval: 'MONTHLY',
          recurrenceCount: 12,
          installmentTotal: 2,
        }
      : {
          description: '',
          amount: 0,
          type: 'EXPENSE',
          date: toInputDate(new Date()),
          accountId: accounts[0]?.id || '',
          categoryId: '',
          notes: '',
          mode: 'single',
          recurrenceInterval: 'MONTHLY',
          recurrenceCount: 12,
          installmentTotal: 2,
        },
  });

  const type = watch('type');
  const mode = watch('mode');
  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!transaction) {
      setValue('categoryId', '');
    }
  }, [type]);

  async function handleFormSubmit(data: FormData) {
    const payload: TransactionSubmitData = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      date: data.date,
      accountId: data.accountId,
      categoryId: data.categoryId,
      notes: data.notes,
      isRecurring: data.mode === 'recurring',
      recurrenceInterval: data.mode === 'recurring' ? data.recurrenceInterval : undefined,
      recurrenceCount: data.mode === 'recurring' ? data.recurrenceCount : undefined,
      isInstallment: data.mode === 'installment',
      installmentTotal: data.mode === 'installment' ? data.installmentTotal : undefined,
    };
    await onSubmit(payload);
    reset();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transaction ? 'Editar transação' : 'Nova transação'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => field.onChange('EXPENSE')}
                className={clsx(
                  'py-2.5 rounded-xl text-sm font-medium border transition',
                  field.value === 'EXPENSE' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'
                )}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => field.onChange('INCOME')}
                className={clsx(
                  'py-2.5 rounded-xl text-sm font-medium border transition',
                  field.value === 'INCOME' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'
                )}
              >
                Receita
              </button>
            </div>
          )}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
          <input
            {...register('description')}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ex: Supermercado, Salário..."
          />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {watch('mode') === 'installment' ? 'Valor da parcela' : 'Valor'}
            </label>
            <input
              type="number"
              step="0.01"
              {...register('amount')}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="0,00"
            />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
            <input
              type="date"
              {...register('date')}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
            <select
              {...register('accountId')}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Selecione...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.accountId && <p className="text-xs text-red-600 mt-1">{errors.accountId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select
              {...register('categoryId')}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Selecione...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-red-600 mt-1">{errors.categoryId.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Observações (opcional)</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {!transaction && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Repetição</label>
            <Controller
              control={control}
              name="mode"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange('single')}
                    className={clsx(
                      'py-2 rounded-xl text-xs font-medium border transition',
                      field.value === 'single' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                    )}
                  >
                    Única
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('recurring')}
                    className={clsx(
                      'py-2 rounded-xl text-xs font-medium border transition',
                      field.value === 'recurring' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                    )}
                  >
                    Recorrente
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('installment')}
                    className={clsx(
                      'py-2 rounded-xl text-xs font-medium border transition',
                      field.value === 'installment' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                    )}
                  >
                    Parcelada
                  </button>
                </div>
              )}
            />

            {mode === 'recurring' && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Frequência</label>
                  <select
                    {...register('recurrenceInterval')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Quantas vezes</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    {...register('recurrenceCount')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {errors.recurrenceCount && <p className="text-xs text-red-600 mt-1">{errors.recurrenceCount.message}</p>}
                </div>
              </div>
            )}

            {mode === 'installment' && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">Número de parcelas</label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  {...register('installmentTotal')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.installmentTotal && <p className="text-xs text-red-600 mt-1">{errors.installmentTotal.message}</p>}
              </div>
            )}
          </div>
        )}

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
