import { Response } from 'express';
import multer from 'multer';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { ImportExportService } from '../services/import-export/csv-excel.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

export class ImportExportController {
  static uploadMiddleware = upload.single('file');

  static async parseUpload(req: AuthRequest, res: Response) {
    try {
      if (!req.file) return sendError(res, 'No spreadsheet file uploaded', 400);
      const rows = await ImportExportService.parseFile(req.file.buffer, req.file.originalname);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      return sendSuccess(res, {
        headers,
        sampleRows: rows.slice(0, 5),
        rows,
        totalRows: rows.length
      }, 'Spreadsheet parsed successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to parse spreadsheet file', 400);
    }
  }

  static async processImport(req: AuthRequest, res: Response) {
    try {
      const { rows, mapping, defaultAssignedUserId } = req.body;
      if (!rows || !Array.isArray(rows) || !mapping) {
        return sendError(res, 'Client rows and column mapping are required', 400);
      }

      if (rows.length === 0) {
        return sendError(res, 'The uploaded file does not contain any data rows', 400);
      }

      const result = await ImportExportService.importClients(
        rows,
        mapping,
        req.user!.id,
        defaultAssignedUserId
      );

      return sendSuccess(res, result, `Successfully imported ${result.successCount} clients`);
    } catch (err: any) {
      return sendError(res, err.message || 'Import processing failed', 400);
    }
  }

  static async exportClients(req: AuthRequest, res: Response) {
    try {
      const format = (req.query.format === 'xlsx' ? 'xlsx' : 'csv') as 'csv' | 'xlsx';
      const buffer = await ImportExportService.exportClients(format);
      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="JS_Investments_Clients_${dateStr}.xlsx"`);
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="JS_Investments_Clients_${dateStr}.csv"`);
      }

      return res.send(buffer);
    } catch (err: any) {
      return sendError(res, err.message || 'Export failed');
    }
  }

  static async downloadTemplate(req: AuthRequest, res: Response) {
    try {
      const format = (req.query.format === 'csv' ? 'csv' : 'xlsx') as 'csv' | 'xlsx';
      const buffer = ImportExportService.getSampleTemplate(format);

      if (format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="JS_Investments_Clients_Import_Template.xlsx"');
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="JS_Investments_Clients_Import_Template.csv"');
      }

      return res.send(buffer);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to generate template');
    }
  }
}
