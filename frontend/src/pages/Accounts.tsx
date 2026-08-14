import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Landmark } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { Account } from '../types';
import { AccountModal } from '../components/AccountModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/format';
import { getIcon } from '../lib/icons';

export function Accounts() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data.accounts);
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
        await api.put(`/accounts/${editing.id}`, formData);
        showToast('Conta atualizada com sucesso');
      } else {
        await api.post('/accounts', formData);
        showToast('Conta criada com sucesso');
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
      await api.delete(`/accounts/${deleting.id}`);
      showToast('Conta excluída com sucesso');
      setDeleting(null);
      load();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie suas contas e carteiras</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-700 transition"
        >
          <Plus size={18} />
          Nova conta
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Landmark className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">Você ainda não tem nenhuma conta cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = getIcon(account.icon);
            return (
              <div key={account.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${account.color}20`, color: account.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(account);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleting(account)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="font-medium text-slate-900 mt-3">{account.name}</p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    account.currentBalance < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <AccountModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        account={editing}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="Excluir conta"
        message={`Tem certeza que deseja excluir a conta "${deleting?.name}"?`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
