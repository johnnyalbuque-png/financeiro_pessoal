import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import { Modal } from './Modal';
import { Category } from '../types';
import { CATEGORY_COLORS, ICON_NAMES, getIcon } from '../lib/icons';

const schema = z.object({
  name: z.string().min(1, 'Informe um nome'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().min(1),
  icon: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  category?: Category | null;
}

export function CategoryModal({ isOpen, onClose, onSubmit, category }: CategoryModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: category
      ? { name: category.name, type: category.type, color: category.color, icon: category.icon }
      : { name: '', type: 'EXPENSE', color: CATEGORY_COLORS[0], icon: 'MoreHorizontal' },
  });

  async function handleFormSubmit(data: FormData) {
    await onSubmit(data);
    reset();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Editar categoria' : 'Nova categoria'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
          <input
            {...register('name')}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ex: Alimentação, Salário..."
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
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
                    field.value === 'EXPENSE'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500'
                  )}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange('INCOME')}
                  className={clsx(
                    'py-2.5 rounded-xl text-sm font-medium border transition',
                    field.value === 'INCOME'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500'
                  )}
                >
                  Receita
                </button>
              </div>
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Ícone</label>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {ICON_NAMES.map((name) => {
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
