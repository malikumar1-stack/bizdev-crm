import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IMeeting, IMeetingReminder } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PostMeetingDrawer } from '../components/meetings/PostMeetingDrawer';
import { Calendar, Plus, MessageSquare, AlertCircle, CheckCircle2, Clock, User, Building, Trash2 } from 'lucide-react';
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

  const handleDeleteMeeting = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will cancel its scheduled WhatsApp reminders.`)) {
      return;
    }
    try {
      setMeetings(prev => prev.filter(m => m.id !== id));
      await api.deleteMeeting(id);
    } catch (err) {
      console.error('Failed to delete meeting:', err);
      fetchMeetings();
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter]);

  const renderReminderPill = (meeting: IMeeting) => {
    const reminders = meeting.reminders || [];
    const waReminders = reminders.filter(r => r.channel === 'WHATSAPP');

    const failedWa = waReminders.find(r => r.status === 'FAILED');
    if (failedWa) {
      return (
        <span 
          title={`WhatsApp dispatch failed: ${failedWa.errorMessage || 'Provider rejection'}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
        >
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span>⚠️ Reminder Failed: {failedWa.errorMessage?.slice(0, 30) || 'API error'}</span>
        </span>
      );
    }

    const r24 = waReminders.find(r => r.reminderType === '24H');
    const r1 = waReminders.find(r => r.reminderType === '1H');

    return (
      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
        <span className={`px-1.5 py-0.5 rounded border ${
          meeting.reminded24h || r24?.status === 'SENT'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        }`}>
          24h: {meeting.reminded24h || r24?.status === 'SENT' ? '✓ Sent' : (r24?.status || 'Scheduled')}
        </span>
        <span className={`px-1.5 py-0.5 rounded border ${
          meeting.reminded1h || r1?.status === 'SENT'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        }`}>
          1h: {meeting.reminded1h || r1?.status === 'SENT' ? '✓ Sent' : (r1?.status || 'Scheduled')}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Meetings & Client Engagements</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            JS Investments Business Development Schedule &bull; Automated 24h/1h WhatsApp Reminders (PKT)
          </p>
        </div>
        <Button onClick={onOpenSchedule} icon={<Plus className="w-4 h-4" />}>
          Schedule Meeting
        </Button>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white"
          >
            <option value="">All Meeting Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meetings.map((m) => (
          <div
            key={m.id}
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{m.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#002D62] dark:text-amber-400" />
                  <strong className="text-slate-800 dark:text-slate-200">{m.client?.company?.name}</strong>
                  {m.client?.primaryContact?.name && (
                    <span className="text-slate-400">({m.client.primaryContact.name})</span>
                  )}
                </p>
              </div>
              <Badge variant={m.status === 'COMPLETED' ? 'success' : 'info'}>{m.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Date & Time (PKT)</span>
                <span className="font-bold text-slate-900 dark:text-white">{format(new Date(m.startTime), 'dd MMM yyyy, hh:mm a')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Format & BD Manager</span>
                <span className="font-bold truncate block">{m.meetingType} &bull; {m.assignedUser?.name || 'Unassigned'}</span>
              </div>
            </div>

            {/* Reminder Status Info */}
            <div className="p-2.5 rounded-xl bg-[#002D62]/5 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                WhatsApp Reminders:
              </span>
              {renderReminderPill(m)}
            </div>

            {m.agenda && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                <strong>Agenda:</strong> {m.agenda}
              </p>
            )}

            {m.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-2.5 rounded-xl">
                <strong>Outcome:</strong> {m.outcome} &bull; <em>"{m.notes}"</em>
              </p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const phone = (m.assignedUser?.whatsappNumber || m.assignedUser?.phone || m.client?.primaryContact?.whatsapp || m.client?.primaryContact?.phone || '').replace(/\D/g, '');
                    const formattedTime = format(new Date(m.startTime), 'dd MMM yyyy, hh:mm a');
                    const msg = `*JS Investments Meeting Reminder*\n\n*Client:* ${m.client?.company?.name || 'Client'}\n*Contact:* ${m.client?.primaryContact?.name || 'Stakeholder'}\n*Date & Time:* ${formattedTime} PKT\n*Format:* ${m.meetingType}\n*Location:* ${m.location || m.meetingLink || 'Office'}\n*Agenda:* ${m.agenda || 'Business Development Discussion'}\n\nPlease review client notes prior to the meeting.`;
                    window.open(`https://wa.me/${phone || ''}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Briefing</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMeeting(m.id, m.title)}
                  title="Delete Meeting"
                  className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

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
