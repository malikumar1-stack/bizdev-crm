import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IMeeting } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PostMeetingDrawer } from '../components/meetings/PostMeetingDrawer';
import { Calendar, Plus, Search, Video, Phone, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface MeetingsPageProps {
  onOpenSchedule: () => void;
}

export const MeetingsPage: React.FC<MeetingsPageProps> = ({ onOpenSchedule }) => {
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [completingMeeting, setCompletingMeeting] = useState<IMeeting | null>(null);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const data = await api.getMeetings(params);
      setMeetings(data);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Meetings & Engagements</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track upcoming discussions, automated 24h/1h reminders, and execute post-meeting workflows
          </p>
        </div>
        <Button onClick={onOpenSchedule} icon={<Plus className="w-4 h-4" />}>
          Schedule Meeting
        </Button>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
        >
          <option value="">All Meeting Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meetings.map((m) => (
          <div
            key={m.id}
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Client: <strong className="text-slate-800 dark:text-slate-200">{m.client?.company?.name}</strong>
                </p>
              </div>
              <Badge variant={m.status === 'COMPLETED' ? 'success' : 'info'}>{m.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Date & Time</span>
                <span className="font-bold">{format(new Date(m.startTime), 'dd MMM yyyy, hh:mm a')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Format / Location</span>
                <span className="font-bold">{m.meetingType}</span>
              </div>
            </div>

            {m.agenda && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                <strong>Agenda:</strong> {m.agenda}
              </p>
            )}

            {m.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 p-2.5 rounded-xl">
                <strong>Outcome:</strong> {m.outcome} &bull; <em>"{m.notes}"</em>
              </p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              {m.status === 'SCHEDULED' && (
                <Button size="sm" onClick={() => setCompletingMeeting(m)}>
                  Complete & Next Steps
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <PostMeetingDrawer
        isOpen={!!completingMeeting}
        onClose={() => setCompletingMeeting(null)}
        meeting={completingMeeting}
        onCompleted={fetchMeetings}
      />
    </div>
  );
};
