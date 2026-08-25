import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Bell, Sparkles, Check, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../common/Button';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface TopNavProps {
  onOpenSearch: () => void;
  onQuickAdd: (type: 'client' | 'meeting' | 'followup' | 'task' | 'opportunity') => void;
  onOpenAI: () => void;
  onNavigate: (page: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenSearch, onQuickAdd, onOpenAI, onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Global Search Bar Trigger (Ctrl + K) */}
      <div className="flex-1 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-sm transition-all border border-slate-200/60 dark:border-slate-700"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search clients, meetings, follow-ups...</span>
          </div>
          <kbd className="px-2 py-0.5 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-xs text-slate-500">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* AI Assistant Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAI}
          icon={<Sparkles className="w-4 h-4 text-amber-500" />}
          className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
        >
          AI Assistant
        </Button>

        {/* Quick Add Menu */}
        <div className="relative" ref={addRef}>
          <Button
            size="sm"
            onClick={() => setShowAddMenu(!showAddMenu)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create
          </Button>

          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { onQuickAdd('meeting'); setShowAddMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium"
              >
                <Calendar className="w-4 h-4 text-brand-500" /> New Meeting
              </button>
              <button
                onClick={() => { onQuickAdd('followup'); setShowAddMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium"
              >
                <Clock className="w-4 h-4 text-amber-500" /> New Follow-up
              </button>
              <button
                onClick={() => { onQuickAdd('client'); setShowAddMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium"
              >
                <Plus className="w-4 h-4 text-emerald-500" /> New Client
              </button>
              <button
                onClick={() => { onQuickAdd('task'); setShowAddMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium"
              >
                <Check className="w-4 h-4 text-purple-500" /> New Task
              </button>
              <button
                onClick={() => { onQuickAdd('opportunity'); setShowAddMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium"
              >
                <Plus className="w-4 h-4 text-sky-500" /> New Opportunity
              </button>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-40 animate-in fade-in duration-150">
              <div className="px-4 pb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h4>
                  <p className="text-xs text-slate-500">{unreadCount} unread reminder{unreadCount !== 1 ? 's' : ''}</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new reminders or alerts
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={clsx(
                        'p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex gap-3 items-start',
                        !n.read ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''
                      )}
                    >
                      <div className="mt-0.5 text-brand-500 shrink-0">
                        {n.type === 'MEETING_REMINDER' ? <Calendar className="w-4 h-4 text-brand-500" /> :
                         n.type === 'OVERDUE_ALERT' ? <AlertCircle className="w-4 h-4 text-rose-500" /> :
                         <Clock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={clsx('text-xs font-medium text-slate-900 dark:text-white', !n.read ? 'font-semibold' : '')}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
