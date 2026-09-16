import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IDashboardMetrics, IUser, IClient } from '../types';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, CheckCircle2, Download, Award } from 'lucide-react';
import { Button } from '../components/common/Button';

export const ReportsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<IDashboardMetrics | null>(null);
  const [clients, setClients] = useState<IClient[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      try {
        const [m, c, u] = await Promise.all([
          api.getDashboardMetrics(),
          api.getClients(),
          api.getUsers().catch(() => [])
        ]);
        setMetrics(m);
        setClients(c);
        setUsers(u);
      } catch (err) {
        console.error('Failed to load report metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, []);

  if (loading || !metrics) {
    return <div className="py-20 text-center text-xs text-slate-400">Compiling executive reports & BI analytics...</div>;
  }

  const exportReport = () => {
    window.open(`${api.baseUrl || ''}/api/import-export/export?format=csv`, '_blank');
  };

  const pipelineStages = metrics.chartData?.pipelineDistribution || [];

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            Executive Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500">Business development conversion funnel, pipeline velocity, and team performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportReport} icon={<Download className="w-4 h-4" />} className="text-xs shrink-0 self-start sm:self-auto">
          Export Report (CSV)
        </Button>
      </div>

      {/* Top High-Level Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pipeline</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ${(metrics.totalPipelineValue / 1000).toFixed(1)}k
          </h3>
          <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">
            {metrics.openOpportunities} Deals
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Win Rate</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.winRate}%
          </h3>
          <p className="text-xs text-slate-400 mt-1 truncate">Proposal to Closed</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Accounts</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.totalClients}
          </h3>
          <p className="text-xs text-brand-500 font-semibold mt-1 truncate">
            {metrics.activeClients} Active
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue Tasks</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.overdueFollowups}
          </h3>
          <p className="text-xs text-rose-500 font-semibold mt-1 truncate">Action required</p>
        </div>
      </div>

      {/* Stage Breakdown & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            Opportunity Pipeline by Stage
          </h4>
          <div className="space-y-3">
            {pipelineStages.map((s) => (
              <div key={s.stage} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{s.stage.replace('_', ' ')}</span>
                  <span className="text-slate-900 dark:text-white font-bold">${((s.value || 0) / 1000).toFixed(1)}k ({s.count || 0} deals)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.totalPipelineValue > 0 ? ((s.value || 0) / metrics.totalPipelineValue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Relationship Status Distribution */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" />
            Client Account Stages
          </h4>
          <div className="space-y-3">
            {['LEAD', 'MEETING_SCHEDULED', 'FOLLOWUP_REQUIRED', 'NEGOTIATION', 'ACTIVE_CLIENT'].map((statusKey) => {
              const count = clients.filter(c => c.relationshipStatus === statusKey).length;
              return (
                <div key={statusKey} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{statusKey.replace('_', ' ')}</span>
                    <span className="text-slate-900 dark:text-white font-bold">{count} accounts</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${clients.length > 0 ? (count / clients.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Business Development Team Portfolio Breakdown
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Team Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Accounts</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {users.map((u) => {
                const assignedCount = clients.filter(c => c.assignedUserId === u.id).length;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{u.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400">{assignedCount} Clients</td>
                    <td className="py-3.5 px-4 text-slate-500">{u.email} &bull; {u.phone || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
