import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../services/api';

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      setLoading(true);
      api.getUserById(userId)
        .then((res) => setData(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [userId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={data ? data.name : 'Team Member Profile'}
      subtitle={data ? `${data.role.replace('_', ' ')} • ${data.status}` : ''}
      size="xl"
    >
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading user profile & workload...</div>
      ) : data ? (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Assigned Clients</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{data.assignedClients?.length || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Scheduled Meetings</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{data.assignedMeetings?.length || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Pending Follow-ups</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{data.assignedFollowups?.length || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Open Tasks</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{data.assignedTasks?.length || 0}</div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              Contact & Notification Routes
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Login Email:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{data.email}</span>
              </div>
              <div>
                <span className="text-slate-400">Notification Email:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{data.notificationEmail || data.email}</span>
              </div>
              <div>
                <span className="text-slate-400">WhatsApp:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{data.whatsappNumber || data.whatsapp || 'Not set'}</span>
              </div>
              <div>
                <span className="text-slate-400">Phone:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{data.phone || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Assigned Clients */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              Assigned Client Accounts ({data.assignedClients?.length || 0})
            </h4>
            <div className="space-y-2">
              {data.assignedClients && data.assignedClients.length > 0 ? (
                data.assignedClients.map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{c.company?.name}</span>
                      <span className="text-slate-400 ml-2">({c.primaryContact?.name || 'Contact'})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600 dark:bg-brand-950/50">
                      {c.relationshipStatus}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-2">No active clients assigned</div>
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              Upcoming Scheduled Meetings ({data.assignedMeetings?.length || 0})
            </h4>
            <div className="space-y-2">
              {data.assignedMeetings && data.assignedMeetings.length > 0 ? (
                data.assignedMeetings.map((m: any) => (
                  <div key={m.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{m.title}</div>
                      <div className="text-slate-400 text-[11px]">
                        {m.client?.company?.name} &bull; {new Date(m.startTime).toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                      {m.meetingType}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-2">No upcoming meetings scheduled</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};
