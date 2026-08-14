import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Repeat, Layers, Receipt } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { Account, Category, Transaction } from '../types';
import { TransactionModal, TransactionSubmitData } from '../components/TransactionModal';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { formatCurrency, formatDate } from '../lib/format';
import { getIcon } from '../lib/icons';

export function Transactions() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/accounts'),
        api.get('/categories'),
      ]);
      setTransactions(txRes.data.transactions);
      setAccounts(accRes.data.accounts);
      setCategories(catRes.data.categories);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter && tx.type !== typeFilter) return false;
      if (accountFilter && tx.accountId !== accountFilter) return false;
      if (categoryFilter && tx.categoryId !== categoryFilter) return false;
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, typeFilter, accountFilter, categoryFilter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = formatDate(tx.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries());
  }, [filtered]);

  async function handleSubmit(data: TransactionSubmitData) {
    try {
      if (editing) {
        await api.put(`/transactions/${editing.id}`, {
          description: data.description,
          amount: data.amount,
          type: data.type,
          date: data.date,
          accountId: data.accountId,
          categoryId: data.categoryId,
          notes: data.notes,
        });
        showToast('Transação atualizada com sucesso');
      } else {
        await api.post('/transactions', data);
        showToast('Transação criada com sucesso');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  }

  async function handleDelete(scope: 'single' | 'future' | 'all') {
    if (!deleting) return;
    try {
      await api.delete(`/transactions/${deleting.id}`, { params: { scope } });
      showToast('Transação excluída com sucesso');
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
          <h1 className="text-2xl font-bold text-slate-900">Transações</h1>
          <p className="text-slate-500 text-sm mt-0.5">Todas as suas receitas e despesas</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-700 transition"
        >
          <Plus size={18} />
          Nova transação
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todos os tipos</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </select>
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Receipt className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500">Nenhuma transação encontrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, txs]) => (
            <div key={date} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {date}
              </div>
              <div className="divide-y divide-slate-100">
                {txs.map((tx) => {
                  const Icon = getIcon(tx.category.icon);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-5 py-3 group">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${tx.category.color}20`, color: tx.category.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                          {tx.seriesType === 'RECURRING' && <Repeat size={13} className="text-slate-400 shrink-0" />}
                          {tx.seriesType === 'INSTALLMENT' && (
                            <span className="flex items-center gap-0.5 text-xs text-slate-400 shrink-0">
                              <Layers size={13} />
                              {tx.installmentNumber}/{tx.installmentTotal}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {tx.category.name} · {tx.account.name}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold shrink-0 ${
                          tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditing(tx);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleting(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        accounts={accounts}
        categories={categories}
        transaction={editing}
      />

      {deleting && deleting.seriesId ? (
        <DeleteSeriesDialog
          transaction={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : (
        <ConfirmDialog
          isOpen={!!deleting}
          title="Excluir transação"
          message={`Tem certeza que deseja excluir "${deleting?.description}"?`}
          confirmLabel="Excluir"
          onConfirm={() => handleDelete('single')}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function DeleteSeriesDialog({
  transaction,
  onCancel,
  onConfirm,
}: {
  transaction: Transaction;
  onCancel: () => void;
  onConfirm: (scope: 'single' | 'future' | 'all') => void;
}) {
  const label = transaction.seriesType === 'INSTALLMENT' ? 'parcelamento' : 'recorrência';
  return (
    <Modal isOpen onClose={onCancel} title="Excluir transação">
      <p className="text-sm text-slate-500 mb-4">
        Esta transação faz parte de um {label}. O que você deseja excluir?
      </p>
      <div className="space-y-2">
        <button
          onClick={() => onConfirm('single')}
          className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition text-sm font-medium text-slate-700"
        >
          Apenas esta transação
        </button>
        <button
          onClick={() => onConfirm('future')}
          className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition text-sm font-medium text-slate-700"
        >
          Esta e as futuras
        </button>
        <button
          onClick={() => onConfirm('all')}
          className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:border-red-500 hover:bg-red-50 transition text-sm font-medium text-red-700"
        >
          Todas as transações do {label}
        </button>
      </div>
      <button onClick={onCancel} className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700">
        Cancelar
      </button>
    </Modal>
  );
}
