import { Response } from 'express';
import multer from 'multer';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { ImportExportService } from '../services/import-export/csv-excel.service';

const upload = multer({ storage: multer.memoryStorage() });

export class ImportExportController {
  static uploadMiddleware = upload.single('file');

  static async parseUpload(req: AuthRequest, res: Response) {
    try {
      if (!req.file) return sendError(res, 'No file uploaded', 400);
      const rows = await ImportExportService.parseFile(req.file.buffer, req.file.originalname);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      return sendSuccess(res, { headers, sampleRows: rows.slice(0, 5), totalRows: rows.length });
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async processImport(req: AuthRequest, res: Response) {
    try {
      const { rows, mapping } = req.body;
      if (!rows || !Array.isArray(rows) || !mapping) {
        return sendError(res, 'Rows and column mapping are required', 400);
      }

      const result = await ImportExportService.importClients(rows, mapping, req.user!.id);
      return sendSuccess(res, result, 'Import processing completed');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async exportClients(req: AuthRequest, res: Response) {
    try {
      const { format = 'csv' } = req.query;
      const buffer = await ImportExportService.exportClients(format as any);

      if (format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="clients.xlsx"');
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
      }

      return res.send(buffer);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}
