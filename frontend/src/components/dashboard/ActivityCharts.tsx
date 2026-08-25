import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Card } from '../common/Card';

interface ActivityChartsProps {
  chartData: {
    weeklyMeetings: { name: string; count: number; completed: number }[];
    pipelineDistribution: { stage: string; value: number; count: number }[];
    clientGrowth: { month: string; clients: number }[];
    followupCompletion: { name: string; completed: number; pending: number; overdue: number }[];
  };
}

const COLORS = ['#0c8ee9', '#38bdf8', '#818cf8', '#a855f7', '#f59e0b', '#10b981', '#ef4444'];

export const ActivityCharts: React.FC<ActivityChartsProps> = ({ chartData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Meeting Cadence */}
      <Card title="Meeting Velocity & Completion" subtitle="Scheduled vs Completed meetings per week">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.weeklyMeetings}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="count" fill="#0c8ee9" name="Total Scheduled" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Opportunity Pipeline by Stage */}
      <Card title="Opportunity Pipeline Value ($ USD)" subtitle="Value distribution across sales stages">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.pipelineDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(val) => `$${(val / 1000)}k`} />
              <YAxis dataKey="stage" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={80} />
              <Tooltip
                formatter={(val: number) => [`$${val.toLocaleString()}`, 'Value']}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
              />
              <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]}>
                {chartData.pipelineDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
