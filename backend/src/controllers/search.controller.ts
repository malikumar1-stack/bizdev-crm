import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export class SearchController {
  static async globalSearch(req: AuthRequest, res: Response) {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return sendSuccess(res, { clients: [], meetings: [], followups: [], tasks: [], opportunities: [] });
      }

      const query = q.trim();

      const [clients, meetings, followups, tasks, opportunities] = await Promise.all([
        prisma.client.findMany({
          where: {
            OR: [
              { customClientId: { contains: query } },
              { company: { name: { contains: query } } },
              { primaryContact: { name: { contains: query } } }
            ]
          },
          take: 5,
          include: { company: true, primaryContact: true }
        }),
        prisma.meeting.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { agenda: { contains: query } },
              { client: { company: { name: { contains: query } } } }
            ]
          },
          take: 5,
          include: { client: { include: { company: true } } }
        }),
        prisma.followup.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              { client: { company: { name: { contains: query } } } }
            ]
          },
          take: 5,
          include: { client: { include: { company: true } } }
        }),
        prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } }
            ]
          },
          take: 5
        }),
        prisma.opportunity.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { client: { company: { name: { contains: query } } } }
            ]
          },
          take: 5,
          include: { client: { include: { company: true } } }
        })
      ]);

      return sendSuccess(res, { clients, meetings, followups, tasks, opportunities });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}
