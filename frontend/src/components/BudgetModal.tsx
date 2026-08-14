import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { Budget, Category } from '../types';
import { getIcon } from '../lib/icons';

const schema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  amount: z.coerce.number().positive('Informe um valor maior que zero'),
});

type FormData = z.infer<typeof schema>;

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  categories: Category[];
  budget?: Budget | null;
}

export function BudgetModal({ isOpen, onClose, onSubmit, categories, budget }: BudgetModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: budget ? { categoryId: budget.categoryId, amount: budget.amount } : { categoryId: '', amount: 0 },
  });

  async function handleFormSubmit(data: FormData) {
    await onSubmit(data);
    reset();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={budget ? 'Editar orçamento' : 'Novo orçamento'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Categoria</label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <select
                {...field}
                disabled={!!budget}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.categoryId && <p className="text-xs text-red-600 mt-1">{errors.categoryId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Valor do orçamento (mensal)</label>
          <input
            type="number"
            step="0.01"
            {...register('amount')}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="0,00"
          />
          {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
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
