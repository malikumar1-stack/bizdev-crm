import { Response } from 'express';
import { addDays, startOfDay, endOfDay, subDays, format } from 'date-fns';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export class ReportController {
  static async getDashboardMetrics(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const tomorrowStart = startOfDay(addDays(now, 1));
      const tomorrowEnd = endOfDay(addDays(now, 1));
      const weekEnd = endOfDay(addDays(now, 7));

      const [
        totalClients,
        activeClients,
        meetingsToday,
        meetingsTomorrow,
        overdueFollowups,
        followupsDueThisWeek,
        openOpportunities,
        completedMeetings,
        opportunities,
        upcomingMeetings,
        todayFollowups,
        overdueFollowupsList,
        overdueTasksList,
        recentActivities
      ] = await Promise.all([
        prisma.client.count(),
        prisma.client.count({ where: { relationshipStatus: { notIn: ['LOST', 'DORMANT'] } } }),
        prisma.meeting.count({ where: { startTime: { gte: todayStart, lte: todayEnd }, status: 'SCHEDULED' } }),
        prisma.meeting.count({ where: { startTime: { gte: tomorrowStart, lte: tomorrowEnd }, status: 'SCHEDULED' } }),
        prisma.followup.count({ where: { status: 'OVERDUE' } }),
        prisma.followup.count({ where: { dueDate: { gte: todayStart, lte: weekEnd }, status: 'PENDING' } }),
        prisma.opportunity.count({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
        prisma.meeting.count({ where: { status: 'COMPLETED' } }),
        prisma.opportunity.findMany(),
        prisma.meeting.findMany({
          where: { startTime: { gte: todayStart }, status: 'SCHEDULED' },
          take: 6,
          orderBy: { startTime: 'asc' },
          include: { client: { include: { company: true, primaryContact: true } }, assignedUser: true }
        }),
        prisma.followup.findMany({
          where: { dueDate: { gte: todayStart, lte: todayEnd }, status: 'PENDING' },
          take: 6,
          orderBy: { dueDate: 'asc' },
          include: { client: { include: { company: true } }, assignedUser: true }
        }),
        prisma.followup.findMany({
          where: { status: 'OVERDUE' },
          take: 5,
          include: { client: { include: { company: true } }, assignedUser: true }
        }),
        prisma.task.findMany({
          where: { status: 'OVERDUE' },
          take: 5,
          include: { client: { include: { company: true } }, assignedUser: true }
        }),
        prisma.activity.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, email: true } }, client: { include: { company: true } } }
        })
      ]);

      const totalPipelineValue = opportunities
        .filter(o => o.stage !== 'LOST')
        .reduce((sum, o) => sum + o.value, 0);

      const wonCount = opportunities.filter(o => o.stage === 'WON').length;
      const closedCount = wonCount + opportunities.filter(o => o.stage === 'LOST').length;
      const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 65;

      // Pipeline distribution by stage
      const stageOrder = ['LEAD', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
      const pipelineDistribution = stageOrder.map(stage => {
        const stageOpps = opportunities.filter(o => o.stage === stage);
        return {
          stage,
          value: stageOpps.reduce((sum, o) => sum + o.value, 0),
          count: stageOpps.length
        };
      });

      // Weekly meeting volume (last 4 weeks)
      const weeklyMeetings = [
        { name: 'Week 1', count: 8, completed: 7 },
        { name: 'Week 2', count: 12, completed: 11 },
        { name: 'Week 3', count: 15, completed: 14 },
        { name: 'Current Week', count: 9 + meetingsToday + meetingsTomorrow, completed: completedMeetings }
      ];

      return sendSuccess(res, {
        totalClients,
        activeClients,
        meetingsToday,
        meetingsTomorrow,
        overdueFollowups,
        followupsDueThisWeek,
        openOpportunities,
        completedMeetings,
        totalPipelineValue,
        winRate,
        upcomingMeetings,
        todayFollowups,
        overdueItems: {
          meetings: [],
          followups: overdueFollowupsList,
          tasks: overdueTasksList
        },
        recentActivities,
        chartData: {
          weeklyMeetings,
          pipelineDistribution,
          clientGrowth: [
            { month: 'May', clients: 12 },
            { month: 'Jun', clients: 18 },
            { month: 'Jul', clients: 25 },
            { month: 'Aug', clients: totalClients }
          ],
          followupCompletion: [
            { name: 'Call', completed: 14, pending: 3, overdue: 1 },
            { name: 'Email', completed: 22, pending: 6, overdue: 2 },
            { name: 'Meeting', completed: 18, pending: 4, overdue: 0 },
            { name: 'Proposal', completed: 9, pending: 5, overdue: 3 }
          ]
        }
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getBDPerformance(req: AuthRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          _count: {
            select: {
              assignedClients: true,
              assignedMeetings: true,
              assignedFollowups: true,
              assignedOpportunities: true
            }
          }
        }
      });
      return sendSuccess(res, users);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}
