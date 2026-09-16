import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class ImportExportService {
  /**
   * Parses CSV or Excel buffer into raw array of objects
   */
  static async parseFile(buffer: Buffer, originalname: string): Promise<any[]> {
    const nameLower = originalname.toLowerCase();
    if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return [];
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      
      // Clean up headers and trim string values
      return rawRows
        .map(row => {
          const cleaned: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim();
            if (cleanKey) {
              const val = row[key];
              cleaned[cleanKey] = typeof val === 'string' ? val.trim() : val;
            }
          }
          return cleaned;
        })
        .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));
    }

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser())
        .on('data', (data) => {
          const cleaned: Record<string, any> = {};
          for (const key of Object.keys(data)) {
            const cleanKey = key.trim();
            if (cleanKey) {
              const val = data[key];
              cleaned[cleanKey] = typeof val === 'string' ? val.trim() : val;
            }
          }
          if (Object.values(cleaned).some(v => v !== '' && v !== null && v !== undefined)) {
            results.push(cleaned);
          }
        })
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Imports clients with full column mapping and entity linkage
   */
  static async importClients(
    rows: any[],
    mapping: Record<string, string>,
    currentUserId: string,
    defaultAssignedUserId?: string
  ) {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Fetch team users for auto-matching assigned rep
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });

    // Determine starting custom client ID counter
    const existingClients = await prisma.client.findMany({
      select: { customClientId: true }
    });
    
    let maxIdNum = 1000;
    for (const c of existingClients) {
      if (c.customClientId && c.customClientId.startsWith('CL-')) {
        const numPart = parseInt(c.customClientId.replace('CL-', ''), 10);
        if (!isNaN(numPart) && numPart > maxIdNum) {
          maxIdNum = numPart;
        }
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Extract fields using mapping with intelligent fallbacks
        const companyName = (
          (mapping.companyName && row[mapping.companyName]) ||
          row['Company Name'] ||
          row['Company'] ||
          row['Organization'] ||
          row['Client Name'] ||
          row['Corporate Name'] ||
          row['Firm'] ||
          ''
        ).toString().trim();

        const contactName = (
          (mapping.contactName && row[mapping.contactName]) ||
          row['Primary Contact Name'] ||
          row['Primary Contact'] ||
          row['Contact Name'] ||
          row['Contact Person'] ||
          row['Contact'] ||
          row['Name'] ||
          row['Stakeholder'] ||
          ''
        ).toString().trim();

        const position = (
          (mapping.position && row[mapping.position]) ||
          row['Designation'] ||
          row['Position'] ||
          row['Title'] ||
          row['Job Title'] ||
          row['Role'] ||
          ''
        ).toString().trim();

        const email = (
          (mapping.contactEmail && row[mapping.contactEmail]) ||
          (mapping.email && row[mapping.email]) ||
          row['Email Address'] ||
          row['Email'] ||
          row['Contact Email'] ||
          row['E-mail'] ||
          ''
        ).toString().trim();

        const phone = (
          (mapping.contactPhone && row[mapping.contactPhone]) ||
          (mapping.phone && row[mapping.phone]) ||
          row['Phone Number'] ||
          row['Mobile Number'] ||
          row['Phone'] ||
          row['Mobile'] ||
          row['Contact Number'] ||
          row['Cell'] ||
          ''
        ).toString().trim();

        const whatsapp = (
          (mapping.whatsapp && row[mapping.whatsapp]) ||
          row['WhatsApp Number'] ||
          row['WhatsApp'] ||
          row['WA Number'] ||
          phone ||
          ''
        ).toString().trim();

        const industry = (
          (mapping.industry && row[mapping.industry]) ||
          row['Industry'] ||
          row['Sector'] ||
          row['Domain'] ||
          row['Category'] ||
          ''
        ).toString().trim();

        const city = (
          (mapping.city && row[mapping.city]) ||
          row['City'] ||
          row['Location'] ||
          row['Station'] ||
          ''
        ).toString().trim();

        const address = (
          (mapping.address && row[mapping.address]) ||
          row['Address'] ||
          row['Office Address'] ||
          ''
        ).toString().trim();

        const statusRaw = (
          (mapping.status && row[mapping.status]) ||
          row['Relationship Status'] ||
          row['Status'] ||
          row['Stage'] ||
          'LEAD'
        ).toString().trim().toUpperCase().replace(/[\s-_]+/g, '_');

        const priorityRaw = (
          (mapping.priority && row[mapping.priority]) ||
          row['Priority'] ||
          row['Urgency'] ||
          'MEDIUM'
        ).toString().trim().toUpperCase();

        const assignedRaw = (
          (mapping.assignedUser && row[mapping.assignedUser]) ||
          row['Assigned Employee'] ||
          row['Assigned BD Representative'] ||
          row['Assigned To'] ||
          row['Assigned User'] ||
          row['BD Executive'] ||
          row['Owner'] ||
          ''
        ).toString().trim();

        const notes = (
          (mapping.notes && row[mapping.notes]) ||
          row['Notes'] ||
          row['Remarks'] ||
          row['Comments'] ||
          row['Description'] ||
          ''
        ).toString().trim();

        if (!companyName && !contactName) {
          failedCount++;
          errors.push(`Row ${i + 1}: Skipped (Empty Company Name & Contact Name)`);
          continue;
        }

        const effectiveCompanyName = companyName || `${contactName} (Individual)`;

        // Normalize status
        let relationshipStatus = 'LEAD';
        if (statusRaw.includes('CONTACT')) relationshipStatus = 'CONTACTED';
        else if (statusRaw.includes('SCHEDULE')) relationshipStatus = 'MEETING_SCHEDULED';
        else if (statusRaw.includes('COMPLETE')) relationshipStatus = 'MEETING_COMPLETED';
        else if (statusRaw.includes('FOLLOW')) relationshipStatus = 'FOLLOWUP_REQUIRED';
        else if (statusRaw.includes('NEGOTIAT')) relationshipStatus = 'NEGOTIATION';
        else if (statusRaw.includes('ACTIVE') || statusRaw.includes('CLIENT') || statusRaw.includes('WON')) relationshipStatus = 'ACTIVE_CLIENT';
        else if (statusRaw.includes('DORMANT') || statusRaw.includes('INACTIVE')) relationshipStatus = 'DORMANT';
        else if (statusRaw.includes('LOST')) relationshipStatus = 'LOST';

        // Normalize priority
        let priority = 'MEDIUM';
        if (priorityRaw.includes('URGENT')) priority = 'URGENT';
        else if (priorityRaw.includes('HIGH')) priority = 'HIGH';
        else if (priorityRaw.includes('LOW')) priority = 'LOW';

        // Match assigned user
        let assignedUserId = defaultAssignedUserId || currentUserId;
        if (assignedRaw) {
          const rawLower = assignedRaw.toLowerCase();
          const matched = users.find(u =>
            u.id === assignedRaw ||
            u.email.toLowerCase() === rawLower ||
            u.name.toLowerCase() === rawLower ||
            u.name.toLowerCase().includes(rawLower) ||
            rawLower.includes(u.name.toLowerCase())
          );
          if (matched) assignedUserId = matched.id;
        }

        // Upsert Company
        let company = await prisma.company.findFirst({
          where: { name: { equals: effectiveCompanyName, mode: 'insensitive' } }
        });

        if (!company) {
          company = await prisma.company.create({
            data: {
              name: effectiveCompanyName,
              industry: industry || null,
              city: city || null,
              address: address || null,
              phone: phone || null,
              notes: notes || null
            }
          });
        } else {
          // Update city or industry if previously empty
          if ((!company.city && city) || (!company.industry && industry)) {
            await prisma.company.update({
              where: { id: company.id },
              data: {
                city: company.city || city || null,
                industry: company.industry || industry || null,
                phone: company.phone || phone || null
              }
            });
          }
        }

        // Create Contact
        let contact = null;
        if (contactName || email || phone) {
          contact = await prisma.contact.create({
            data: {
              companyId: company.id,
              name: contactName || effectiveCompanyName,
              position: position || null,
              email: email || null,
              phone: phone || null,
              whatsapp: whatsapp || phone || null,
              isPrimary: true,
              notes: notes || null
            }
          });
        }

        // Generate custom client ID
        maxIdNum++;
        const customClientId = `CL-${maxIdNum}`;

        // Create Client
        const client = await prisma.client.create({
          data: {
            customClientId,
            companyId: company.id,
            primaryContactId: contact?.id || null,
            relationshipStatus,
            priority,
            clientType: 'Corporate',
            assignedUserId,
            notes: notes || null
          }
        });

        // Add initial activity log
        await prisma.activity.create({
          data: {
            clientId: client.id,
            userId: currentUserId,
            type: 'CLIENT_CREATED',
            title: 'Client Imported',
            description: `Client imported from spreadsheet (${effectiveCompanyName})`
          }
        }).catch(() => {});

        successCount++;
      } catch (err: any) {
        failedCount++;
        logger.error(`Import error row ${i + 1}: ${err.message}`);
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      total: rows.length,
      successCount,
      failedCount,
      created: successCount,
      skipped: failedCount,
      errors
    };
  }

  /**
   * Generates CSV or Excel file buffer of all clients
   */
  static async exportClients(format: 'csv' | 'xlsx' = 'xlsx') {
    const clients = await prisma.client.findMany({
      where: { isArchived: false },
      include: {
        company: true,
        primaryContact: true,
        assignedUser: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = clients.map(c => ({
      'Client ID': c.customClientId,
      'Company Name': c.company.name,
      'Industry': c.company.industry || '',
      'City': c.company.city || '',
      'Address': c.company.address || '',
      'Primary Contact': c.primaryContact?.name || '',
      'Designation': c.primaryContact?.position || '',
      'Phone Number': c.primaryContact?.phone || '',
      'WhatsApp Number': c.primaryContact?.whatsapp || '',
      'Email Address': c.primaryContact?.email || '',
      'Relationship Status': c.relationshipStatus,
      'Priority': c.priority,
      'Assigned BD Representative': c.assignedUser?.name || 'Unassigned',
      'Notes': c.notes || '',
      'Registered Date': c.createdAt ? c.createdAt.toISOString().split('T')[0] : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths
    const colWidths = [
      { wch: 12 }, // Client ID
      { wch: 28 }, // Company Name
      { wch: 20 }, // Industry
      { wch: 14 }, // City
      { wch: 24 }, // Address
      { wch: 22 }, // Primary Contact
      { wch: 22 }, // Designation
      { wch: 16 }, // Phone Number
      { wch: 16 }, // WhatsApp Number
      { wch: 26 }, // Email Address
      { wch: 20 }, // Relationship Status
      { wch: 12 }, // Priority
      { wch: 22 }, // Assigned BD Representative
      { wch: 30 }, // Notes
      { wch: 15 }  // Registered Date
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients Portfolio');

    if (format === 'xlsx') {
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
    return XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
  }

  /**
   * Generates a sample template Excel/CSV for JS Investments team
   */
  static getSampleTemplate(format: 'csv' | 'xlsx' = 'xlsx') {
    const sampleData = [
      {
        'Company Name': 'Engro Corporation',
        'Industry': 'Fertilizers & Energy',
        'City': 'Karachi',
        'Address': 'The Harbor Front, Clifton',
        'Primary Contact': 'Tariq Mansoor',
        'Designation': 'Chief Financial Officer',
        'Phone Number': '03001234567',
        'WhatsApp Number': '03001234567',
        'Email Address': 'tariq.mansoor@engro.com',
        'Relationship Status': 'ACTIVE_CLIENT',
        'Priority': 'HIGH',
        'Assigned BD Representative': 'Raja Kamran',
        'Notes': 'Corporate Provident Fund & Gratuity Advisory'
      },
      {
        'Company Name': 'Systems Limited',
        'Industry': 'Information Technology',
        'City': 'Lahore',
        'Address': 'Sector E-1, DHA Phase 8',
        'Primary Contact': 'Fatima Zahra',
        'Designation': 'Head of Treasury',
        'Phone Number': '03219876543',
        'WhatsApp Number': '03219876543',
        'Email Address': 'fatima.zahra@systemsltd.com',
        'Relationship Status': 'MEETING_SCHEDULED',
        'Priority': 'URGENT',
        'Assigned BD Representative': 'Ali Zaidi',
        'Notes': 'Mutual Funds Investment Portfolio & Cash Management'
      },
      {
        'Company Name': 'Lucky Cement Limited',
        'Industry': 'Manufacturing & Infrastructure',
        'City': 'Islamabad',
        'Address': 'Blue Area, Jinnah Avenue',
        'Primary Contact': 'Kamran Malik',
        'Designation': 'Director Finance',
        'Phone Number': '03335554433',
        'WhatsApp Number': '03335554433',
        'Email Address': 'kamran.malik@lucky-cement.com',
        'Relationship Status': 'LEAD',
        'Priority': 'MEDIUM',
        'Assigned BD Representative': 'Aamir Farooq',
        'Notes': 'Initial institutional presentation scheduled'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 28 },
      { wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 16 },
      { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 24 }, { wch: 36 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'JS Investments Template');

    if (format === 'xlsx') {
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
    return XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
  }
}
