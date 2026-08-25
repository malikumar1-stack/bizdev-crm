import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class ImportExportService {
  /**
   * Parses CSV or Excel buffer into raw objects
   */
  static async parseFile(buffer: Buffer, originalname: string): Promise<any[]> {
    if (originalname.endsWith('.xlsx') || originalname.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json(sheet);
    }

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Imports clients with column mapping
   */
  static async importClients(rows: any[], mapping: Record<string, string>, currentUserId: string) {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const companyName = row[mapping.companyName || 'Company'] || row['Company Name'] || row['Company'];
        const contactName = row[mapping.contactName || 'Contact'] || row['Contact Name'] || row['Contact'];
        const email = row[mapping.email || 'Email'] || row['Email Address'];
        const phone = row[mapping.phone || 'Phone'] || row['Phone Number'];
        const industry = row[mapping.industry || 'Industry'];
        const priority = row[mapping.priority || 'Priority'] || 'MEDIUM';

        if (!companyName) {
          failedCount++;
          errors.push(`Row ${i + 1}: Missing Company Name`);
          continue;
        }

        // Upsert Company
        let company = await prisma.company.findFirst({ where: { name: companyName } });
        if (!company) {
          company = await prisma.company.create({
            data: { name: companyName, industry: industry || null, phone: phone || null }
          });
        }

        // Upsert Contact
        let contact = null;
        if (contactName) {
          contact = await prisma.contact.create({
            data: {
              companyId: company.id,
              name: contactName,
              email: email || null,
              phone: phone || null,
              whatsapp: phone || null,
              isPrimary: true
            }
          });
        }

        // Create Client
        const customId = `CL-${1000 + (await prisma.client.count()) + 1}`;
        await prisma.client.create({
          data: {
            customClientId: customId,
            companyId: company.id,
            primaryContactId: contact?.id || null,
            relationshipStatus: 'LEAD',
            priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority.toUpperCase()) ? priority.toUpperCase() : 'MEDIUM') as any,
            assignedUserId: currentUserId
          }
        });

        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return { total: rows.length, successCount, failedCount, errors };
  }

  /**
   * Generates CSV or Excel file buffer for clients
   */
  static async exportClients(format: 'csv' | 'xlsx' = 'csv') {
    const clients = await prisma.client.findMany({
      include: { company: true, primaryContact: true, assignedUser: true }
    });

    const data = clients.map(c => ({
      'Client ID': c.customClientId,
      'Company Name': c.company.name,
      'Industry': c.company.industry || '',
      'Primary Contact': c.primaryContact?.name || '',
      'Position': c.primaryContact?.position || '',
      'Email': c.primaryContact?.email || '',
      'Phone': c.primaryContact?.phone || '',
      'WhatsApp': c.primaryContact?.whatsapp || '',
      'Status': c.relationshipStatus,
      'Priority': c.priority,
      'Assigned Employee': c.assignedUser?.name || '',
      'Created Date': c.createdAt.toISOString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    if (format === 'xlsx') {
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
    return XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
  }
}
