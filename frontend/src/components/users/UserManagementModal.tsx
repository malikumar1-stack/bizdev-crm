import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IUser, UserRole, UserStatus } from '../../types';
import { api } from '../../services/api';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: IUser | null;
  onSaved: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('BD_EXECUTIVE');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setEmail(userToEdit.email || '');
      setPassword('');
      setRole(userToEdit.role || 'BD_EXECUTIVE');
      setStatus(userToEdit.status || (userToEdit.active ? 'ACTIVE' : 'INACTIVE'));
      setPhone(userToEdit.phone || '');
      setWhatsapp(userToEdit.whatsappNumber || userToEdit.whatsapp || '');
      setNotificationEmail(userToEdit.notificationEmail || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('BD_EXECUTIVE');
      setStatus('ACTIVE');
      setPhone('');
      setWhatsapp('');
      setNotificationEmail('');
    }
    setError('');
  }, [userToEdit, isOpen]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const randomPass = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setPassword(randomPass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required');
      return;
    }
    if (!userToEdit && !password.trim()) {
      setError('Temporary password is required for new users');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (userToEdit) {
        await api.updateUser(userToEdit.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          status,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          whatsappNumber: whatsapp.trim() || null,
          notificationEmail: notificationEmail.trim() ? notificationEmail.trim().toLowerCase() : null
        });
      } else {
        await api.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role,
          status,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          whatsappNumber: whatsapp.trim() || null,
          notificationEmail: notificationEmail.trim() ? notificationEmail.trim().toLowerCase() : null
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userToEdit ? 'Edit Team Member' : 'Create New CRM User'}
      subtitle={userToEdit ? `Update access & contact info for ${userToEdit.name}` : 'Grant role-based access and configure notification channels'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ahmed Malik"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Login Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="ahmed@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {!userToEdit && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                Temporary Password <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Generate Secure Password
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Enter or generate temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-mono font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              User Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            >
              <option value="ADMIN">Admin (Full Control)</option>
              <option value="MANAGER">Manager (Team & Records)</option>
              <option value="BD_EXECUTIVE">BD Executive (Own Clients & Deals)</option>
              <option value="VIEWER">Viewer (Read-Only)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Account Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase mb-2">
            Notification Delivery Channels
          </h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Notification Email (Optional)
              </label>
              <input
                type="email"
                placeholder="Defaults to login email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                placeholder="+923001234567"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save User</Button>
        </div>
      </form>
    </Modal>
  );
};
