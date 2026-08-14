import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../lib/format';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: 'brand' | 'emerald' | 'red' | 'slate';
}

const TONES: Record<StatCardProps['tone'], string> = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

export function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={clsx('h-9 w-9 rounded-xl flex items-center justify-center', TONES[tone])}>
          <Icon size={18} />
        </div>
      </div>
      <p className={clsx('text-2xl font-bold mt-3', value < 0 ? 'text-red-600' : 'text-slate-900')}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
