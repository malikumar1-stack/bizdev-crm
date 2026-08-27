import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { aiService } from '../services/ai/ai.service';
import { prisma } from '../utils/prisma';

export class AIController {
  static async chat(req: AuthRequest, res: Response) {
    try {
      const { message, prompt, query, clientId } = req.body;
      const userText = message || prompt || query;
      if (!userText || !userText.trim()) {
        return sendError(res, 'Message or prompt text is required', 400);
      }

      const result = await aiService.processUserChat(req.user!.id, userText.trim(), clientId);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async summarizeMeetingNotes(req: AuthRequest, res: Response) {
    try {
      const { notes, clientName } = req.body;
      if (!notes) return sendError(res, 'Meeting notes are required', 400);

      const summary = await aiService.summarizeMeeting(notes, clientName || 'Client');
      return sendSuccess(res, summary);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async draftFollowup(req: AuthRequest, res: Response) {
    try {
      const { clientId, contactId, meetingId, type } = req.body;
      const [client, contact, meeting] = await Promise.all([
        clientId ? prisma.client.findUnique({ where: { id: clientId }, include: { company: true } }) : null,
        contactId ? prisma.contact.findUnique({ where: { id: contactId } }) : null,
        meetingId ? prisma.meeting.findUnique({ where: { id: meetingId } }) : null
      ]);

      const draft = await aiService.draftFollowup(client, contact, meeting, type || 'EMAIL');
      return sendSuccess(res, { draft });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getClientInsights(req: AuthRequest, res: Response) {
    try {
      const { clientId } = req.params;
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { company: true, primaryContact: true, meetings: true, followups: true, opportunities: true }
      });
      if (!client) return sendError(res, 'Client not found', 404);

      const insights = await aiService.getClientHealth(client);
      return sendSuccess(res, insights);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}
