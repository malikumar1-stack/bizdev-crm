import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IUser } from '../../types';
import { api } from '../../services/api';

interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUser | null;
  usersList: IUser[];
  onDeactivated: () => void;
}

export const DeactivateUserModal: React.FC<DeactivateUserModalProps> = ({
  isOpen,
  onClose,
  user,
  usersList,
  onDeactivated
}) => {
  const [reassign, setReassign] = useState(true);
  const [reassignToUserId, setReassignToUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const eligibleUsers = usersList.filter(
    (u) => u.id !== user?.id && u.status === 'ACTIVE' && u.active
  );

  const handleDeactivate = async () => {
    if (!user) return;
    if (reassign && !reassignToUserId && eligibleUsers.length > 0) {
      setError('Please select a manager to receive reassigned clients');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.deactivateUser(
        user.id,
        reassign && reassignToUserId ? reassignToUserId : undefined
      );
      onDeactivated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deactivate Team Member"
      subtitle={user ? `Disable CRM access for ${user.name}` : ''}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl text-xs border border-amber-200 dark:border-amber-900 leading-relaxed">
          <strong>Notice:</strong> Deactivating this user will revoke their login access immediately. Their historical meeting notes, logs, and audit entries will remain intact.
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
            Workload & Client Reassignment
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="reassignChoice"
                checked={reassign}
                onChange={() => setReassign(true)}
                className="text-brand-600 focus:ring-brand-500"
              />
              Reassign active clients, scheduled meetings, and follow-ups to another team member
            </label>

            {reassign && (
              <div className="pl-6 pt-1">
                <select
                  value={reassignToUserId}
                  onChange={(e) => setReassignToUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                >
                  <option value="">-- Choose Target Manager/Executive --</option>
                  {eligibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer pt-1">
              <input
                type="radio"
                name="reassignChoice"
                checked={!reassign}
                onChange={() => setReassign(false)}
                className="text-brand-600 focus:ring-brand-500"
              />
              Keep existing assignments (can be manually reassigned later)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={handleDeactivate}>
            Deactivate User
          </Button>
        </div>
      </div>
    </Modal>
  );
};
