import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export class CompanyController {
  static async getCompanies(req: AuthRequest, res: Response) {
    try {
      const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
        include: { contacts: true, _count: { select: { clients: true } } }
      });
      return sendSuccess(res, companies);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createCompany(req: AuthRequest, res: Response) {
    try {
      const { name, industry, website, address, city, country, phone, size, notes } = req.body;
      if (!name) return sendError(res, 'Company name is required', 400);

      const company = await prisma.company.create({
        data: { name, industry, website, address, city, country, phone, size, notes }
      });
      return sendSuccess(res, company, 'Company created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
