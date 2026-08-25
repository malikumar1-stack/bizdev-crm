import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit/audit.service';

export class OpportunityController {
  static async getOpportunities(req: AuthRequest, res: Response) {
    try {
      const { stage, assignedUserId, clientId } = req.query;
      const where: any = {};
      if (stage) where.stage = stage;
      if (assignedUserId) where.assignedUserId = assignedUserId;
      if (clientId) where.clientId = clientId;

      const opportunities = await prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { include: { company: true, primaryContact: true } },
          assignedUser: { select: { id: true, name: true, email: true } }
        }
      });
      return sendSuccess(res, opportunities);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createOpportunity(req: AuthRequest, res: Response) {
    try {
      const { clientId, title, stage, value, currency, probability, expectedCloseDate, assignedUserId, notes } = req.body;
      if (!clientId || !title) return sendError(res, 'Client and title are required', 400);

      const opportunity = await prisma.opportunity.create({
        data: {
          clientId,
          title,
          stage: stage || 'LEAD',
          value: parseFloat(value) || 0,
          currency: currency || 'USD',
          probability: parseInt(probability, 10) || 20,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
          assignedUserId: assignedUserId || req.user!.id,
          notes
        },
        include: { client: { include: { company: true } }, assignedUser: true }
      });

      await prisma.activity.create({
        data: {
          clientId,
          userId: req.user!.id,
          type: 'OPPORTUNITY_STAGE_CHANGED',
          title: `Opportunity Created: ${title}`,
          description: `Stage: ${opportunity.stage}, Value: $${opportunity.value.toLocaleString()}`
        }
      });

      AuditService.log(req.user!.id, 'CREATE', 'OPPORTUNITY', opportunity.id);
      return sendSuccess(res, opportunity, 'Opportunity created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateStage(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      const current = await prisma.opportunity.findUnique({ where: { id } });
      if (!current) return sendError(res, 'Opportunity not found', 404);

      let probability = current.probability;
      if (stage === 'LEAD') probability = 20;
      else if (stage === 'CONTACTED') probability = 40;
      else if (stage === 'MEETING') probability = 60;
      else if (stage === 'PROPOSAL') probability = 75;
      else if (stage === 'NEGOTIATION') probability = 90;
      else if (stage === 'WON') probability = 100;
      else if (stage === 'LOST') probability = 0;

      const updated = await prisma.opportunity.update({
        where: { id },
        data: { stage, probability },
        include: { client: { include: { company: true } } }
      });

      await prisma.activity.create({
        data: {
          clientId: updated.clientId,
          userId: req.user!.id,
          type: 'OPPORTUNITY_STAGE_CHANGED',
          title: `Opportunity Stage Changed: ${updated.title} (${stage})`,
          description: `Moved from ${current.stage} to ${stage} ($ ${updated.value.toLocaleString()})`
        }
      });

      AuditService.log(req.user!.id, 'UPDATE_STAGE', 'OPPORTUNITY', id, { from: current.stage, to: stage });
      return sendSuccess(res, updated, 'Stage updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateOpportunity(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, stage, value, currency, probability, expectedCloseDate, assignedUserId, notes } = req.body;

      const updated = await prisma.opportunity.update({
        where: { id },
        data: {
          title,
          stage,
          value: value !== undefined ? parseFloat(value) : undefined,
          currency,
          probability: probability !== undefined ? parseInt(probability, 10) : undefined,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
          assignedUserId,
          notes
        },
        include: { client: { include: { company: true } }, assignedUser: true }
      });

      AuditService.log(req.user!.id, 'UPDATE', 'OPPORTUNITY', id);
      return sendSuccess(res, updated, 'Opportunity updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteOpportunity(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.opportunity.delete({ where: { id } });
      AuditService.log(req.user!.id, 'DELETE', 'OPPORTUNITY', id);
      return sendSuccess(res, null, 'Opportunity deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
