import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export class ContactController {
  static async getContacts(req: AuthRequest, res: Response) {
    try {
      const { companyId } = req.query;
      const where: any = {};
      if (companyId) where.companyId = companyId as string;

      const contacts = await prisma.contact.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { company: true }
      });
      return sendSuccess(res, contacts);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createContact(req: AuthRequest, res: Response) {
    try {
      const { companyId, name, position, email, phone, whatsapp, preferredMethod, notes, isPrimary } = req.body;
      if (!companyId || !name) return sendError(res, 'Company and contact name are required', 400);

      const contact = await prisma.contact.create({
        data: { companyId, name, position, email, phone, whatsapp, preferredMethod, notes, isPrimary: isPrimary || false },
        include: { company: true }
      });
      return sendSuccess(res, contact, 'Contact created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
