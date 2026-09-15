import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Clock,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Bot,
  Settings,
  UserCircle,
  LogOut,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { JSILogo } from '../common/JSILogo';
import { clsx } from 'clsx';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'followups', label: 'Follow-ups', icon: Clock },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'profile', label: 'My Profile', icon: UserCircle },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center border-b border-slate-800">
        <JSILogo size="md" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Core CRM</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              )}
            >
              <Icon className={clsx('w-5 h-5', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-brand-700 text-white font-semibold flex items-center justify-center text-sm uppercase shrink-0 border border-brand-500/40">
              {user?.name?.slice(0, 2) || 'BD'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
