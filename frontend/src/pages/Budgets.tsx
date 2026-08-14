import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, PiggyBank } from 'lucide-react';
import clsx from 'clsx';
import { api, getErrorMessage } from '../lib/api';
import { Budget, Category } from '../types';
import { BudgetModal } from '../components/BudgetModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/format';
import { getIcon } from '../lib/icons';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function Budgets() {
  const { showToast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        api.get('/budgets', { params: { month, year } }),
        api.get('/categories'),
      ]);
      setBudgets(budgetsRes.data.budgets);
      setCategories(categoriesRes.data.categories.filter((c: Category) => c.type === 'EXPENSE'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [month, year]);

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  async function handleSubmit(formData: { categoryId: string; amount: number }) {
    try {
      await api.post('/budgets', { ...formData, month, year });
      showToast('Orçamento salvo com sucesso');
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await api.delete(`/budgets/${deleting.id}`);
      showToast('Orçamento excluído com sucesso');
      setDeleting(null);
      load();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setDeleting(null);
    }
  }

  const availableCategories = categories.filter(
    (c) => editing || !budgets.some((b) => b.categoryId === c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Defina limites de gastos por categoria</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-700 w-32 text-center">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-700 transition"
          >
            <Plus size={18} />
            Novo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <PiggyBank className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">Nenhum orçamento definido para este mês.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((budget) => {
            const Icon = getIcon(budget.category.icon);
            const percent = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
            const over = budget.spent > budget.amount;
            return (
              <div key={budget.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${budget.category.color}20`, color: budget.category.color }}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="font-medium text-slate-800">{budget.category.name}</span>
                  </div>
                  <button
                    onClick={() => setDeleting(budget)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-brand-500')}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className={clsx('font-medium', over ? 'text-red-600' : 'text-slate-700')}>
                    {formatCurrency(budget.spent)}
                  </span>
                  <span className="text-slate-400">de {formatCurrency(budget.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        categories={availableCategories}
        budget={editing}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="Excluir orçamento"
        message={`Tem certeza que deseja excluir o orçamento de "${deleting?.category.name}"?`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
