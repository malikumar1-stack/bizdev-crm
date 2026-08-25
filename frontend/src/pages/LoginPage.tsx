import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Building2, Shield, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/30">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            BizDev CRM
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise Business Development & Meeting Follow-up System
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg" icon={<ArrowRight className="w-4 h-4" />}>
            Sign In
          </Button>
        </form>

        {/* Security Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Enterprise 256-bit Encrypted Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
