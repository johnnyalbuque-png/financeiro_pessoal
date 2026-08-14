import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { Category } from '../types';
import { CategoryModal } from '../components/CategoryModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { getIcon } from '../lib/icons';

export function Categories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(data.categories);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(formData: any) {
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, formData);
        showToast('Categoria atualizada com sucesso');
      } else {
        await api.post('/categories', formData);
        showToast('Categoria criada com sucesso');
      }
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
      await api.delete(`/categories/${deleting.id}`);
      showToast('Categoria excluída com sucesso');
      setDeleting(null);
      load();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setDeleting(null);
    }
  }

  const income = categories.filter((c) => c.type === 'INCOME');
  const expense = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>
          <p className="text-slate-500 text-sm mt-0.5">Organize suas receitas e despesas</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-700 transition"
        >
          <Plus size={18} />
          Nova categoria
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Tags className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">Você ainda não tem nenhuma categoria cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryGroup
            title="Receitas"
            items={income}
            onEdit={(c) => {
              setEditing(c);
              setModalOpen(true);
            }}
            onDelete={setDeleting}
          />
          <CategoryGroup
            title="Despesas"
            items={expense}
            onEdit={(c) => {
              setEditing(c);
              setModalOpen(true);
            }}
            onDelete={setDeleting}
          />
        </div>
      )}

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        category={editing}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="Excluir categoria"
        message={`Tem certeza que deseja excluir a categoria "${deleting?.name}"?`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function CategoryGroup({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 px-5 py-6 text-center">Nenhuma categoria</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((category) => {
            const Icon = getIcon(category.icon);
            return (
              <div key={category.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  <Icon size={16} />
                </div>
                <span className="text-sm font-medium text-slate-800 flex-1">{category.name}</span>
                <button
                  onClick={() => onEdit(category)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(category)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
