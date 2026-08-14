import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../lib/api';
import { DashboardSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { formatCurrency, formatDate } from '../lib/format';
import { getIcon } from '../lib/icons';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/dashboard/summary', { params: { month, year } })
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
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

  const netBalance = useMemo(() => {
    if (!summary) return 0;
    return summary.totalIncome - summary.totalExpense;
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm self-start">
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
      </div>

      {loading || !summary ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Saldo total" value={summary.totalBalance} icon={Wallet} tone="brand" />
            <StatCard label="Receitas do mês" value={summary.totalIncome} icon={TrendingUp} tone="emerald" />
            <StatCard label="Despesas do mês" value={summary.totalExpense} icon={TrendingDown} tone="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-4">Despesas por categoria</h2>
              {summary.expensesByCategory.length === 0 ? (
                <EmptyState message="Nenhuma despesa neste mês" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={summary.expensesByCategory}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {summary.expensesByCategory.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {summary.expensesByCategory.map((cat) => (
                      <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-600 truncate">{cat.name}</span>
                        </div>
                        <span className="font-medium text-slate-900 shrink-0">{formatCurrency(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-4">Evolução mensal</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => v.replace('.', '')} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Últimas transações</h2>
              <span
                className={`text-sm font-medium ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {netBalance >= 0 ? '+' : ''}
                {formatCurrency(netBalance)} no mês
              </span>
            </div>
            {summary.recentTransactions.length === 0 ? (
              <div className="p-5">
                <EmptyState message="Nenhuma transação registrada ainda" />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.recentTransactions.map((tx) => {
                  const Icon = getIcon(tx.category.icon);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${tx.category.color}20`, color: tx.category.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                        <p className="text-xs text-slate-500">
                          {tx.category.name} · {tx.account.name} · {formatDate(tx.date)}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Receipt className="text-slate-300 mb-2" size={32} />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
