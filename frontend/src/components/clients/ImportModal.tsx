import React, { useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Download } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; sampleRows: any[]; totalRows: number } | null>(null);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    industry: '',
    city: ''
  });
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const data = await api.parseImportFile(selectedFile);
      setParsedData(data);

      // Auto-match common header names
      const autoMap: { [key: string]: string } = { ...mapping };
      data.headers.forEach((h: string) => {
        const lower = h.toLowerCase();
        if (lower.includes('company') || lower.includes('organization')) autoMap.companyName = h;
        if (lower.includes('contact') || lower.includes('name') || lower.includes('person')) autoMap.contactName = h;
        if (lower.includes('email') || lower.includes('mail')) autoMap.contactEmail = h;
        if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) autoMap.contactPhone = h;
        if (lower.includes('industry') || lower.includes('sector')) autoMap.industry = h;
        if (lower.includes('city') || lower.includes('location')) autoMap.city = h;
      });
      setMapping(autoMap);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file. Please upload a valid CSV or Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessImport = async () => {
    if (!mapping.companyName) {
      setError('Company Name column mapping is required');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await api.processImport({
        rows: parsedData?.sampleRows || [],
        mapping
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Import Client Accounts</h3>
              <p className="text-xs text-slate-500">Upload CSV or Excel spreadsheets with column auto-mapping</p>
            </div>
          </div>
          <button onClick={reset} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-brand-500 transition-all bg-slate-50 dark:bg-slate-800/40">
              <Upload className="w-10 h-10 text-brand-500 mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Click to select CSV or Excel (.xlsx)</p>
              <p className="text-xs text-slate-400 mt-1">Supports up to 5,000 client records per batch</p>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && parsedData && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Map File Columns &bull; {parsedData.totalRows} Records Detected
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {[
                { key: 'companyName', label: 'Company Name *', req: true },
                { key: 'contactName', label: 'Primary Contact Name', req: false },
                { key: 'contactEmail', label: 'Contact Email', req: false },
                { key: 'contactPhone', label: 'Contact Phone', req: false },
                { key: 'industry', label: 'Industry', req: false },
                { key: 'city', label: 'City', req: false }
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{f.label}</label>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={e => setMapping({ ...mapping, [f.key]: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs"
                  >
                    <option value="">-- Ignore Field --</option>
                    {parsedData.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
              <Button size="sm" loading={loading} onClick={handleProcessImport} icon={<ArrowRight className="w-4 h-4" />}>
                Execute Import
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success Results */}
        {step === 3 && importResult && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Import Processing Completed</h4>
            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                <div className="text-lg font-bold text-emerald-600">{importResult.created}</div>
                <div className="text-[10px] text-emerald-700 font-semibold uppercase">Created</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                <div className="text-lg font-bold text-amber-600">{importResult.skipped}</div>
                <div className="text-[10px] text-amber-700 font-semibold uppercase">Skipped</div>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                <div className="text-lg font-bold text-rose-600">{importResult.errors.length}</div>
                <div className="text-[10px] text-rose-700 font-semibold uppercase">Errors</div>
              </div>
            </div>

            <Button size="sm" onClick={() => { onSuccess(); reset(); }} className="mt-4">
              Finish & View Portfolio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
