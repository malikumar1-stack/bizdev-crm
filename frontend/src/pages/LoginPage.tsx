import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { JSILogo } from '../components/common/JSILogo';
import { Shield, Lock, Mail, ArrowRight, Building } from 'lucide-react';

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
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001A3A] via-[#002D62] to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <JSILogo size="lg" variant="icon" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            JS investments
          </h2>
          <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Business Development CRM
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Internal Authorized System &bull; Meeting Follow-Up Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900 flex items-center gap-2">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white"
                placeholder="name@jsil.com"
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
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            loading={loading} 
            className="w-full mt-2 bg-[#002D62] hover:bg-[#001f44] text-white font-bold" 
            size="lg" 
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to BD Portal
          </Button>
        </form>

        {/* Security Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Authorized JS Investments Personnel Only &bull; 256-bit SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
