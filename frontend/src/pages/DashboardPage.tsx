import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IDashboardMetrics, IMeeting, IFollowup } from '../types';
import { KpiCard } from '../components/dashboard/KpiCard';
import { ActivityCharts } from '../components/dashboard/ActivityCharts';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostMeetingDrawer } from '../components/meetings/PostMeetingDrawer';
import {
  Users,
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Phone,
  Video,
  Check
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardPageProps {
  onNavigate: (page: string, entityId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<IDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingMeeting, setCompletingMeeting] = useState<IMeeting | null>(null);

  const fetchMetrics = async () => {
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleCompleteFollowup = async (id: string) => {
    try {
      await api.completeFollowup(id);
      fetchMetrics();
    } catch (err) {
      console.error('Failed to complete followup:', err);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Loading CRM dashboard & analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Overdue Items Alert Banner */}
      {(metrics.overdueFollowups > 0 || metrics.overdueItems.tasks.length > 0) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Action Required: {metrics.overdueFollowups} Overdue Follow-up{metrics.overdueFollowups !== 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                Ensure timely client communication to maintain healthy relationship scores.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('followups')}
            className="border-amber-300 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
          >
            Review Overdue
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Clients"
          value={metrics.totalClients}
          subtitle={`${metrics.activeClients} Active Relationships`}
          icon={<Users className="w-5 h-5" />}
          variant="brand"
          onClick={() => onNavigate('clients')}
        />
        <KpiCard
          title="Meetings Tomorrow"
          value={metrics.meetingsTomorrow}
          subtitle={`${metrics.meetingsToday} Scheduled for Today`}
          icon={<Calendar className="w-5 h-5" />}
          variant="sky"
          onClick={() => onNavigate('meetings')}
        />
        <KpiCard
          title="Overdue Follow-ups"
          value={metrics.overdueFollowups}
          subtitle={`${metrics.followupsDueThisWeek} Due This Week`}
          icon={<Clock className="w-5 h-5" />}
          variant="rose"
          onClick={() => onNavigate('followups')}
        />
        <KpiCard
          title="Active Pipeline"
          value={`$${(metrics.totalPipelineValue / 1000).toFixed(0)}k`}
          subtitle={`${metrics.openOpportunities} Deals (${metrics.winRate}% Win Rate)`}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="emerald"
          onClick={() => onNavigate('pipeline')}
        />
      </div>

      {/* Core Operational Section: Upcoming Meetings & Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings Card */}
        <Card
          title="Upcoming Meetings"
          subtitle="Scheduled client discussions and automated reminders"
          action={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('meetings')}>
              View All
            </Button>
          }
        >
          <div className="space-y-3">
            {metrics.upcomingMeetings.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No upcoming meetings scheduled</p>
            ) : (
              metrics.upcomingMeetings.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-bold text-xs flex flex-col items-center justify-center shrink-0">
                      <span>{format(new Date(m.startTime), 'dd')}</span>
                      <span className="text-[10px] uppercase font-semibold">{format(new Date(m.startTime), 'MMM')}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{m.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {m.client?.company?.name} &bull; {format(new Date(m.startTime), 'hh:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCompletingMeeting(m)}
                    >
                      Post-Meeting
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Today's Follow-ups Checklist Card */}
        <Card
          title="Today's Follow-ups"
          subtitle="Action items and relationship touchpoints"
          action={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('followups')}>
              View All
            </Button>
          }
        >
          <div className="space-y-2.5">
            {metrics.todayFollowups.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">All follow-ups for today completed!</p>
            ) : (
              metrics.todayFollowups.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleCompleteFollowup(f.id)}
                      className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white text-transparent flex items-center justify-center transition-colors shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{f.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {f.client?.company?.name} &bull; Due: {f.dueTime || '17:00'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={f.priority === 'HIGH' || f.priority === 'URGENT' ? 'danger' : 'info'} size="sm">
                    {f.followupType}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Activity Charts */}
      <ActivityCharts chartData={metrics.chartData} />

      {/* Post-Meeting Workflow Drawer */}
      <PostMeetingDrawer
        isOpen={!!completingMeeting}
        onClose={() => setCompletingMeeting(null)}
        meeting={completingMeeting}
        onCompleted={fetchMetrics}
      />
    </div>
  );
};
