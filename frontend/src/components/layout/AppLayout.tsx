import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { GlobalSearchModal } from './GlobalSearchModal';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { IMeeting } from '../../types';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendar';
import {
  Bell,
  Calendar,
  ExternalLink,
  X,
  Download,
  LayoutDashboard,
  Users,
  TrendingUp,
  Bot,
  Menu
} from 'lucide-react';
import { clsx } from 'clsx';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const bottomNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
    { id: 'ai', label: 'AI Copilot', icon: Bot },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar: Persistent on desktop, slide-out drawer on mobile */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Notification Permission Prompt */}
        {permission === 'default' && (
          <div className="bg-gradient-to-r from-brand-600 to-sky-600 text-white px-3 sm:px-4 py-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <Bell className="w-4 h-4 animate-bounce text-amber-300 shrink-0" />
              <span>Turn on <strong>Instant Desktop Meeting Alarms</strong> to get alerted on screen before every meeting.</span>
            </div>
            <button
              onClick={requestBrowserPermission}
              className="px-3 py-1 bg-white text-brand-700 font-bold rounded-lg hover:bg-slate-100 transition-all text-xs shadow-xs shrink-0 self-end sm:self-auto"
            >
              Enable Instant Alarms 🔔
            </button>
          </div>
        )}

        {/* Live Urgent Meeting Alert Bar */}
        {urgentMeeting && urgentMeeting.id !== dismissedMeetingId && (
          <div className="bg-amber-500 text-slate-950 px-3 sm:px-4 py-2.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-semibold shadow-sm shrink-0 border-b border-amber-600 animate-in slide-in-from-top">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
              </span>
              <span className="truncate">
                <strong>UPCOMING:</strong> {urgentMeeting.title} with {urgentMeeting.client?.company?.name || 'Client'} ({new Date(urgentMeeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
              <a
                href={getGoogleCalendarUrl(urgentMeeting)}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 bg-slate-950 text-amber-300 rounded-md text-[10px] sm:text-[11px] font-bold hover:bg-slate-800 flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" /> Google Cal
              </a>
              <button
                onClick={() => downloadIcsFile(urgentMeeting)}
                className="px-2 py-1 bg-amber-400 text-slate-950 border border-amber-600 rounded-md text-[10px] sm:text-[11px] font-bold hover:bg-amber-300 flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> .ics
              </button>
              {urgentMeeting.meetingLink && (
                <a
                  href={urgentMeeting.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-emerald-600 text-white rounded-md text-[10px] sm:text-[11px] font-bold hover:bg-emerald-500 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Join
                </a>
              )}
              <button
                onClick={() => setDismissedMeetingId(urgentMeeting.id)}
                className="p-1 text-slate-950 hover:text-slate-800 rounded-md"
                aria-label="Dismiss alert"
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
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Sticky Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around md:hidden shadow-xl safe-area-inset-bottom">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all',
                isActive
                  ? 'text-brand-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div className={clsx(
                'p-1 rounded-lg transition-colors',
                isActive ? 'bg-brand-500/20 text-brand-400' : ''
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
        {/* More/Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
        >
          <div className="p-1 rounded-lg">
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

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

