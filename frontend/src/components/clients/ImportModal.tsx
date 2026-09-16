import React, { useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { IUser } from '../../types';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Table,
  Building2,
  Phone,
  Mail,
  UserCheck,
  Check
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usersList?: IUser[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  usersList = []
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    headers: string[];
    sampleRows: any[];
    rows: any[];
    totalRows: number;
  } | null>(null);

  const [mapping, setMapping] = useState<{ [key: string]: string }>({
    companyName: '',
    contactName: '',
    position: '',
    contactEmail: '',
    contactPhone: '',
    whatsapp: '',
    city: '',
    address: '',
    industry: '',
    status: '',
    priority: '',
    assignedUser: '',
    notes: ''
  });

  const [defaultAssignedUserId, setDefaultAssignedUserId] = useState<string>('');
  const [importResult, setImportResult] = useState<{
    total: number;
    successCount: number;
    failedCount: number;
    created?: number;
    skipped?: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      setDownloadingTemplate(true);
      await api.downloadImportTemplate(format);
    } catch (err: any) {
      alert(err.message || 'Failed to download sample template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const data = await api.parseImportFile(selectedFile);
      setParsedData(data);

      // Auto-match headers intelligently
      const autoMap: { [key: string]: string } = {
        companyName: '',
        contactName: '',
        position: '',
        contactEmail: '',
        contactPhone: '',
        whatsapp: '',
        city: '',
        address: '',
        industry: '',
        status: '',
        priority: '',
        assignedUser: '',
        notes: ''
      };

      data.headers.forEach((h: string) => {
        const lower = h.toLowerCase().trim();
        if (!autoMap.companyName && (lower.includes('company') || lower.includes('organization') || lower.includes('client') || lower.includes('firm') || lower.includes('corporate'))) {
          autoMap.companyName = h;
        } else if (!autoMap.contactName && (lower.includes('contact person') || lower.includes('primary contact') || lower.includes('contact name') || lower.includes('stakeholder') || lower === 'contact' || lower === 'name')) {
          autoMap.contactName = h;
        } else if (!autoMap.position && (lower.includes('designation') || lower.includes('position') || lower.includes('title') || lower.includes('role') || lower.includes('job'))) {
          autoMap.position = h;
        } else if (!autoMap.contactEmail && (lower.includes('email') || lower.includes('mail'))) {
          autoMap.contactEmail = h;
        } else if (!autoMap.whatsapp && (lower.includes('whatsapp') || lower.includes('wa'))) {
          autoMap.whatsapp = h;
        } else if (!autoMap.contactPhone && (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell') || lower.includes('tel') || lower.includes('contact no'))) {
          autoMap.contactPhone = h;
        } else if (!autoMap.city && (lower.includes('city') || lower.includes('location') || lower.includes('station'))) {
          autoMap.city = h;
        } else if (!autoMap.address && (lower.includes('address') || lower.includes('office'))) {
          autoMap.address = h;
        } else if (!autoMap.industry && (lower.includes('industry') || lower.includes('sector') || lower.includes('domain') || lower.includes('category'))) {
          autoMap.industry = h;
        } else if (!autoMap.status && (lower.includes('status') || lower.includes('stage'))) {
          autoMap.status = h;
        } else if (!autoMap.priority && (lower.includes('priority') || lower.includes('urgency'))) {
          autoMap.priority = h;
        } else if (!autoMap.assignedUser && (lower.includes('assigned') || lower.includes('owner') || lower.includes('executive') || lower.includes('representative'))) {
          autoMap.assignedUser = h;
        } else if (!autoMap.notes && (lower.includes('note') || lower.includes('remark') || lower.includes('comment') || lower.includes('detail'))) {
          autoMap.notes = h;
        }
      });

      setMapping(autoMap);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file. Please upload a valid CSV or Excel (.xlsx) file.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessImport = async () => {
    if (!mapping.companyName && !mapping.contactName) {
      setError('Please map at least the Company Name or Contact Name column.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const allRows = parsedData?.rows || parsedData?.sampleRows || [];
      const result = await api.processImport({
        rows: allRows,
        mapping,
        defaultAssignedUserId: defaultAssignedUserId || undefined
      });
      setImportResult(result);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Import processing failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setParsedData(null);
    setImportResult(null);
    setError(null);
    onClose();
  };

  const mappingFields = [
    { key: 'companyName', label: 'Company / Organization Name *', req: true },
    { key: 'contactName', label: 'Primary Contact Person Name', req: false },
    { key: 'position', label: 'Designation / Job Title', req: false },
    { key: 'contactPhone', label: 'Mobile / Phone Number', req: false },
    { key: 'whatsapp', label: 'WhatsApp Number', req: false },
    { key: 'contactEmail', label: 'Email Address', req: false },
    { key: 'city', label: 'City / Station', req: false },
    { key: 'industry', label: 'Industry / Sector', req: false },
    { key: 'status', label: 'Relationship Status', req: false },
    { key: 'priority', label: 'Priority (Low/Med/High/Urgent)', req: false },
    { key: 'assignedUser', label: 'Assigned BD Member (by name/email)', req: false },
    { key: 'notes', label: 'Notes / Remarks', req: false }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#002D62] dark:text-blue-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Import Client Portfolio</h3>
              <p className="text-xs text-slate-500">Upload Excel (.xlsx, .xls) or CSV spreadsheets with auto column mapping</p>
            </div>
          </div>
          <button onClick={reset} className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none">&times;</button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Step 1: Upload & Template Download */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Template Download Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  📥 Download JS Investments Client Template
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-formatted Excel sheet with sample institutional clients and pre-aligned column headers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={downloadingTemplate}
                  onClick={() => handleDownloadTemplate('xlsx')}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Excel Template (.xlsx)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={downloadingTemplate}
                  onClick={() => handleDownloadTemplate('csv')}
                >
                  CSV Template
                </Button>
              </div>
            </div>

            {/* Dropzone */}
            <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-[#002D62] dark:hover:border-blue-400 transition-all bg-slate-50/50 dark:bg-slate-800/30">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#002D62] dark:text-blue-400 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {loading ? 'Reading & parsing spreadsheet...' : 'Click or Drag & Drop Excel (.xlsx, .xls) or CSV'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports unlimited client records per batch with automatic deduplication</p>
              <input
                type="file"
                accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Step 2: Column Mapping & Live Alignment Preview */}
        {step === 2 && parsedData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Align Spreadsheet Columns &bull; {parsedData.totalRows} Clients Detected
                </p>
                <p className="text-xs text-slate-500">
                  Review how your Excel columns match with JS Investments CRM fields
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Ready for Import
              </span>
            </div>

            {/* Column Mapping Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {mappingFields.map(f => (
                <div key={f.key} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {f.label}
                  </label>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={e => setMapping({ ...mapping, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-[#002D62] outline-none"
                  >
                    <option value="">-- Ignore Field --</option>
                    {parsedData.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Default Assigned Rep */}
            {usersList.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#002D62] dark:text-blue-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fallback Assigned Team Member (if not in Excel):
                  </span>
                </div>
                <select
                  value={defaultAssignedUserId}
                  onChange={e => setDefaultAssignedUserId(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="">-- Auto (Assign to You) --</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Live Data Alignment Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Table className="w-4 h-4 text-brand-600" />
                <span>Live Data Alignment Preview (First {Math.min(parsedData.sampleRows.length, 3)} records)</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">Company Name</th>
                      <th className="p-2.5">Primary Contact</th>
                      <th className="p-2.5">Designation</th>
                      <th className="p-2.5">Phone / Mobile</th>
                      <th className="p-2.5">City</th>
                      <th className="p-2.5">Industry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {parsedData.sampleRows.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {row[mapping.companyName] || row['Company Name'] || row['Company'] || '—'}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">
                          {row[mapping.contactName] || row['Contact Name'] || row['Primary Contact'] || '—'}
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {row[mapping.position] || row['Designation'] || row['Position'] || '—'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                          {row[mapping.contactPhone] || row['Phone Number'] || row['Phone'] || row['Mobile'] || '—'}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {row[mapping.city] || row['City'] || '—'}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {row[mapping.industry] || row['Industry'] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Change File
              </Button>
              <Button
                size="sm"
                loading={loading}
                onClick={handleProcessImport}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Import {parsedData.totalRows} Clients Now
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success Results */}
        {step === 3 && importResult && (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Client Import Successfully Completed!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                All client records have been populated and aligned into your CRM portfolio.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                <div className="text-2xl font-black text-emerald-600">
                  {importResult.successCount ?? importResult.created ?? 0}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider mt-1">
                  Imported
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900">
                <div className="text-2xl font-black text-amber-600">
                  {importResult.failedCount ?? importResult.skipped ?? 0}
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider mt-1">
                  Skipped / Empty
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900">
                <div className="text-2xl font-black text-[#002D62] dark:text-blue-400">
                  {importResult.total}
                </div>
                <div className="text-[11px] text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider mt-1">
                  Total Processed
                </div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="text-left p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 max-h-32 overflow-y-auto">
                <p className="font-bold mb-1">Notice / Skipped Rows:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li>...and {importResult.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            <Button
              size="md"
              onClick={() => {
                onSuccess();
                reset();
              }}
              className="mt-2 w-full max-w-xs mx-auto"
            >
              Finish & View Portfolio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

