import React, { useState } from 'react';
import { IMeeting, IFollowup, ITask } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckSquare } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { Badge } from '../common/Badge';
import { clsx } from 'clsx';

interface CalendarViewProps {
  meetings: IMeeting[];
  followups: IFollowup[];
  tasks: ITask[];
  onSelectEvent: (type: 'meeting' | 'followup' | 'task', id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  meetings,
  followups,
  tasks,
  onSelectEvent
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1 text-slate-500 hover:text-slate-900 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1 text-slate-500 hover:text-slate-900 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mr-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Meetings</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Follow-ups</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Tasks</span>
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'month' ? 'agenda' : 'month')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
          >
            {viewMode === 'month' ? 'Agenda View' : 'Month Grid'}
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' ? (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-px mb-2 text-center text-xs font-semibold text-slate-400 uppercase">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => {
              const dayMeetings = meetings.filter((m) => isSameDay(new Date(m.startTime), day));
              const dayFollowups = followups.filter((f) => isSameDay(new Date(f.dueDate), day));
              const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
              const isCurrent = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={clsx(
                    'min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-colors',
                    isCurrent
                      ? 'border-brand-500/60 bg-brand-50/20 dark:bg-brand-950/20'
                      : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={clsx('text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center', isCurrent ? 'bg-brand-600 text-white' : 'text-slate-700 dark:text-slate-300')}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                    {dayMeetings.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onSelectEvent('meeting', m.id)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200 truncate cursor-pointer hover:opacity-80"
                      >
                        {format(new Date(m.startTime), 'HH:mm')} {m.title}
                      </div>
                    ))}
                    {dayFollowups.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => onSelectEvent('followup', f.id)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 truncate cursor-pointer hover:opacity-80"
                      >
                        FU: {f.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
          {meetings.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectEvent('meeting', m.id)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                  {format(new Date(m.startTime), 'dd MMM')}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{m.title}</h4>
                  <p className="text-xs text-slate-500">{m.client?.company?.name} &bull; {format(new Date(m.startTime), 'hh:mm a')}</p>
                </div>
              </div>
              <Badge variant="info">{m.meetingType}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
