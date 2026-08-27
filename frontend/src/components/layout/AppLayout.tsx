import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { GlobalSearchModal } from './GlobalSearchModal';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { IMeeting } from '../../types';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendar';
import { Bell, Calendar, ExternalLink, X, Download } from 'lucide-react';

interface AppLayoutProps {
  currentPage: string;
  onNavigate: (page: string, entityId?: string) => void;
  children: React.ReactNode;
  onQuickAdd: (type: 'client' | 'meeting' | 'followup' | 'task' | 'opportunity') => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
  onQuickAdd
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { permission, requestBrowserPermission } = useNotifications();
  const [urgentMeeting, setUrgentMeeting] = useState<IMeeting | null>(null);
  const [dismissedMeetingId, setDismissedMeetingId] = useState<string | null>(null);

  useEffect(() => {
    const checkUpcoming = async () => {
      try {
        const meetings = await api.getMeetings();
        const now = new Date().getTime();
        const twoHoursLater = now + 2 * 60 * 60 * 1000;

        const nextUpcoming = meetings.find(m => {
          if (m.status !== 'SCHEDULED' || !m.startTime) return false;
          const start = new Date(m.startTime).getTime();
          return start >= (now - 15 * 60 * 1000) && start <= twoHoursLater;
        });

        setUrgentMeeting(nextUpcoming || null);
      } catch (e) {}
    };

    checkUpcoming();
    const timer = setInterval(checkUpcoming, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Notification Permission Prompt */}
        {permission === 'default' && (
          <div className="bg-gradient-to-r from-brand-600 to-sky-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <Bell className="w-4 h-4 animate-bounce text-amber-300" />
              <span>Turn on <strong>Instant Desktop Meeting Alarms</strong> to get alerted on screen before every meeting.</span>
            </div>
            <button
              onClick={requestBrowserPermission}
              className="px-3 py-1 bg-white text-brand-700 font-bold rounded-lg hover:bg-slate-100 transition-all text-xs shadow-xs"
            >
              Enable Instant Alarms 🔔
            </button>
          </div>
        )}

        {/* Live Urgent Meeting Alert Bar */}
        {urgentMeeting && urgentMeeting.id !== dismissedMeetingId && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs flex items-center justify-between font-semibold shadow-sm shrink-0 border-b border-amber-600 animate-in slide-in-from-top">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
              </span>
              <span>
                <strong>UPCOMING MEETING:</strong> {urgentMeeting.title} with {urgentMeeting.client?.company?.name || 'Client'} ({new Date(urgentMeeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getGoogleCalendarUrl(urgentMeeting)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-slate-950 text-amber-300 rounded-md text-[11px] font-bold hover:bg-slate-800 flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" /> Sync Google Cal
              </a>
              <button
                onClick={() => downloadIcsFile(urgentMeeting)}
                className="px-2.5 py-1 bg-amber-400 text-slate-950 border border-amber-600 rounded-md text-[11px] font-bold hover:bg-amber-300 flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Phone .ics
              </button>
              {urgentMeeting.meetingLink && (
                <a
                  href={urgentMeeting.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-bold hover:bg-emerald-500 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Join Call
                </a>
              )}
              <button
                onClick={() => setDismissedMeetingId(urgentMeeting.id)}
                className="p-1 text-slate-950 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <TopNav
          onOpenSearch={() => setSearchOpen(true)}
          onQuickAdd={onQuickAdd}
          onOpenAI={() => setAiOpen(true)}
          onNavigate={onNavigate}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Modal (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectEntity={(type, id) => {
          if (type === 'client') onNavigate('clients', id);
          else if (type === 'meeting') onNavigate('meetings');
          else if (type === 'followup') onNavigate('followups');
          else if (type === 'opportunity') onNavigate('pipeline');
        }}
      />

      {/* AI Assistant Copilot Drawer */}
      <AIAssistantDrawer
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
};

