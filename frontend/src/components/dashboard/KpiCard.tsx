import React from 'react';
import { clsx } from 'clsx';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'brand' | 'amber' | 'emerald' | 'rose' | 'purple' | 'sky';
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, variant = 'brand', onClick }) => {
  const iconBg = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400'
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md',
        onClick ? 'cursor-pointer hover:border-brand-500/50' : ''
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', iconBg[variant])}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
