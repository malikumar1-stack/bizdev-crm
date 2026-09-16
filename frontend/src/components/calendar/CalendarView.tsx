import React, { useState } from 'react';
import { IMeeting, IFollowup, ITask } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckSquare, Download } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { Badge } from '../common/Badge';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendar';
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

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              viewMode === 'month'
                ? "bg-brand-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              viewMode === 'agenda'
                ? "bg-brand-500 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            Agenda
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="p-2 sm:p-4 overflow-x-auto">
          <div className="min-w-[600px] sm:min-w-0 grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-slate-50 dark:bg-slate-900 p-2 font-bold text-center text-slate-500">
                {d}
              </div>
            ))}

            {daysInMonth.map((day) => {
              const dayMeetings = meetings.filter((m) => isSameDay(new Date(m.startTime), day));
              const dayFollowups = followups.filter((f) => isSameDay(new Date(f.dueDate), day));

              return (
                <div
                  key={day.toISOString()}
                  className={clsx(
                    "min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 bg-white dark:bg-slate-900 flex flex-col justify-between transition-colors",
                    isToday(day) && "bg-brand-50/40 dark:bg-brand-950/20"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={clsx(
                        "w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold",
                        isToday(day)
                          ? "bg-brand-500 text-white"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
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
        /* Agenda View with 1-Click Calendar Sync */
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
          {meetings.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectEvent('meeting', m.id)}
              className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {format(new Date(m.startTime), 'dd MMM')}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.title}</h4>
                  <p className="text-xs text-slate-500 truncate">{m.client?.company?.name} &bull; {format(new Date(m.startTime), 'hh:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getGoogleCalendarUrl(m)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 hover:bg-brand-100 border border-brand-200 dark:border-brand-900 flex items-center gap-1"
                  title="Add to Google Calendar with automatic alerts"
                >
                  📅 Google Cal
                </a>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); downloadIcsFile(m); }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1"
                  title="Download .ics for iPhone & Android Calendar"
                >
                  <Download className="w-3 h-3" /> Phone .ics
                </button>
                <Badge variant="info">{m.meetingType}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
