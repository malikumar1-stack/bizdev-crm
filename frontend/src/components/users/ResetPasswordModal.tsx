import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IUser } from '../../types';
import { api } from '../../services/api';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUser | null;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [customPassword, setCustomPassword] = useState('');
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (mode === 'MANUAL' && !customPassword.trim()) {
      setError('Please enter a temporary password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.resetUserPassword(
        user.id,
        mode === 'MANUAL' ? customPassword.trim() : undefined
      );
      setResultPassword(res.temporaryPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (resultPassword) {
      navigator.clipboard.writeText(resultPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setResultPassword(null);
    setCustomPassword('');
    setError('');
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset User Password"
      subtitle={user ? `Administrative password reset for ${user.name} (${user.email})` : ''}
    >
      {resultPassword ? (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Password Successfully Reset
          </h4>
          <p className="text-xs text-slate-500">
            Share this temporary password with <strong>{user?.name}</strong>. They will be prompted to change it upon next login.
          </p>

          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white select-all">
              {resultPassword}
            </span>
            <Button size="sm" variant="outline" onClick={copyToClipboard}>
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>

          <div className="pt-2">
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
              Reset Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('AUTO')}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  mode === 'AUTO'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-bold">Option A: Auto-Generate</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Secure 10-character random password</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('MANUAL')}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  mode === 'MANUAL'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-bold">Option B: Enter Custom</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Specify a custom temporary password</div>
              </button>
            </div>
          </div>

          {mode === 'MANUAL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Custom Temporary Password
              </label>
              <input
                type="text"
                required
                placeholder="Enter temporary password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Confirm Password Reset
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
