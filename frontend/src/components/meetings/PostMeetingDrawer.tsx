import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Button } from '../common/Button';
import { Sparkles, Calendar, Clock, CheckSquare, ArrowRight, User } from 'lucide-react';
import { IMeeting, MeetingOutcome, FollowupType, Priority, MeetingType } from '../../types';
import { api } from '../../services/api';

interface PostMeetingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: IMeeting | null;
  onCompleted: () => void;
}

export const PostMeetingDrawer: React.FC<PostMeetingDrawerProps> = ({
  isOpen,
  onClose,
  meeting,
  onCompleted
}) => {
  const [outcome, setOutcome] = useState<MeetingOutcome>('POSITIVE');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('16:00');
  const [nextFollowupType, setNextFollowupType] = useState<FollowupType>('PROPOSAL');
  const [nextFollowupPriority, setNextFollowupPriority] = useState<Priority>('HIGH');
  
  const [nextMeetingDate, setNextMeetingDate] = useState('');
  const [nextMeetingStartTime, setNextMeetingStartTime] = useState('11:00');
  const [nextMeetingType, setNextMeetingType] = useState<MeetingType>('ONLINE');
  const [nextMeetingTitle, setNextMeetingTitle] = useState('');
  
  const [createTask, setCreateTask] = useState(true);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  if (!meeting) return null;

  const handleAiSummarize = async () => {
    if (!notes.trim()) return;
    setSummarizing(true);
    try {
      const summaryRes = await api.summarizeNotes(notes, meeting.client?.company?.name);
      if (summaryRes.actionItems && summaryRes.actionItems.length > 0) {
        setNextAction(summaryRes.actionItems[0]);
      }
      if (summaryRes.recommendedFollowupDays) {
        const d = new Date();
        d.setDate(d.getDate() + summaryRes.recommendedFollowupDays);
        setNextFollowupDate(d.toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('AI summary failed:', err);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert('Please enter meeting notes before completing');
      return;
    }

    setLoading(true);
    try {
      await api.completeMeetingWorkflow(meeting.id, {
        meetingId: meeting.id,
        outcome,
        notes,
        nextAction,
        nextFollowupDate: nextFollowupDate || undefined,
        nextFollowupTime: nextFollowupDate ? nextFollowupTime : undefined,
        nextFollowupType,
        nextFollowupPriority,
        nextMeetingDate: nextMeetingDate || undefined,
        nextMeetingStartTime: nextMeetingDate ? nextMeetingStartTime : undefined,
        nextMeetingType,
        nextMeetingTitle: nextMeetingTitle || undefined,
        createTask
      });

      onCompleted();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to complete post-meeting workflow');
    } finally {
      setLoading(false);
    }
  };

  const outcomes: { id: MeetingOutcome; label: string; desc: string; color: string }[] = [
    { id: 'POSITIVE', label: 'Positive', desc: 'High interest, advancing to next step', color: 'border-emerald-500 bg-emerald-50/40 text-emerald-800' },
    { id: 'PROPOSAL_REQUESTED', label: 'Proposal Requested', desc: 'Formal proposal or pricing requested', color: 'border-brand-500 bg-brand-50/40 text-brand-800' },
    { id: 'FURTHER_DISCUSSION_REQUIRED', label: 'Further Discussion', desc: 'Requires another internal or technical sync', color: 'border-amber-500 bg-amber-50/40 text-amber-800' },
    { id: 'NEUTRAL', label: 'Neutral', desc: 'Exploratory, no commitment yet', color: 'border-slate-400 bg-slate-50 text-slate-800' },
    { id: 'CLOSED', label: 'Closed / Won', desc: 'Partnership or deal successfully closed', color: 'border-purple-500 bg-purple-50/40 text-purple-800' },
    { id: 'NEGATIVE', label: 'Negative / Lost', desc: 'Not a fit or rejected', color: 'border-rose-500 bg-rose-50/40 text-rose-800' }
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Post-Meeting Outcome & Next Steps"
      subtitle={`Record discussion and auto-schedule next reminders for ${meeting.client?.company?.name || 'Client'}`}
      width="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pb-12">
        {/* 1. Meeting Outcome */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
            1. Meeting Outcome <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {outcomes.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setOutcome(o.id)}
                className={`p-3 rounded-xl border text-left transition-all ${outcome === o.id ? o.color + ' ring-2 ring-brand-500 font-semibold shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'}`}
              >
                <p className="text-xs font-bold">{o.label}</p>
                <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">{o.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Meeting Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-900 dark:text-white">
              2. Meeting Notes & Minutes <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleAiSummarize}
              disabled={summarizing || !notes.trim()}
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {summarizing ? 'Analyzing...' : 'AI Extract Action Items'}
            </button>
          </div>
          <textarea
            rows={4}
            required
            placeholder="Key discussion points, customer feedback, agreed deliverables, objections raised..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
        </div>

        {/* 3. Next Action */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
            3. Agreed Next Action Item
          </label>
          <input
            type="text"
            placeholder="e.g. Send revised enterprise pricing proposal and SLA documentation"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="createTaskCheck"
              checked={createTask}
              onChange={(e) => setCreateTask(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="createTaskCheck" className="text-xs text-slate-600 dark:text-slate-400">
              Also create an open Task for this action on the Client profile
            </label>
          </div>
        </div>

        {/* 4. Automated Next Follow-up Provisioning */}
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Schedule Next Follow-up & Reminder</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Follow-up Type</label>
              <select
                value={nextFollowupType}
                onChange={(e) => setNextFollowupType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="PROPOSAL">Proposal Follow-up</option>
                <option value="EMAIL">Email Check-in</option>
                <option value="CALL">Call Client</option>
                <option value="DOCUMENT">Send Documents</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Priority</label>
              <select
                value={nextFollowupPriority}
                onChange={(e) => setNextFollowupPriority(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. Automated Next Meeting Provisioning */}
        <div className="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-sky-600" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Schedule Next Meeting (Optional)</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Next Meeting Date</label>
              <input
                type="date"
                value={nextMeetingDate}
                onChange={(e) => setNextMeetingDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Start Time</label>
              <input
                type="time"
                value={nextMeetingStartTime}
                onChange={(e) => setNextMeetingStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Meeting Format</label>
              <select
                value={nextMeetingType}
                onChange={(e) => setNextMeetingType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="VIDEO_CONFERENCE">Video Conference</option>
                <option value="ONLINE">Online Meeting</option>
                <option value="PHYSICAL">Physical / On-site</option>
                <option value="PHONE">Phone Call</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} icon={<ArrowRight className="w-4 h-4" />}>
            Save & Schedule Automations
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
