import React, { useState, useEffect } from 'react';
import { IClient, IUser } from '../types';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { ImportModal } from '../components/clients/ImportModal';
import { Download, Upload } from 'lucide-react';

interface ClientsPageProps {
  onSelectClient: (clientId: string) => void;
  onOpenCreate: () => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
  onSelectClient,
  onOpenCreate
}) => {
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewTab, setViewTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Edit / Add modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<IClient | null>(null);
  const [usersList, setUsersList] = useState<IUser[]>([]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        archivedOnly: viewTab === 'ARCHIVED' ? 'true' : 'false'
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [data, users] = await Promise.all([
        api.getClients(params),
        api.getUsers().catch(() => [])
      ]);
      setClients(data);
      setUsersList(users);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [search, statusFilter, priorityFilter, viewTab]);

  const handleArchive = async (client: IClient, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to archive "${client.company.name}"?`)) return;
    try {
      await api.archiveClient(client.id);
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Failed to archive client');
    }
  };

  const handleRestore = async (client: IClient, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.restoreClient(client.id);
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Failed to restore client');
    }
  };

  
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      setExporting(true);
      await api.exportClients(format);
    } catch (err: any) {
      alert(err.message || 'Failed to export clients portfolio');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenEdit = (client: IClient, e: React.MouseEvent) => {
    e.stopPropagation();
    setClientToEdit(client);
    setIsFormModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Client Portfolio</h2>
          <p className="text-xs text-slate-500">Enterprise accounts, stakeholder contacts, and relationship health</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            icon={<Upload className="w-4 h-4 text-[#002D62] dark:text-blue-400" />}
          >
            Import Spreadsheet
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={exporting}
            onClick={() => handleExport('xlsx')}
            icon={<Download className="w-4 h-4 text-emerald-600" />}
          >
            Export Excel (.xlsx)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={exporting}
            onClick={() => handleExport('csv')}
          >
            CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setClientToEdit(null);
              setIsFormModalOpen(true);
            }}
          >
            + Add Client
          </Button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 border-b sm:border-b-0 border-slate-200 dark:border-slate-800 pb-1">
          <button
            onClick={() => setViewTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewTab === 'ACTIVE'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active Accounts
          </button>
          <button
            onClick={() => setViewTab('ARCHIVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewTab === 'ARCHIVED'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Archived Clients
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search by company or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="CONTACTED">Contacted</option>
            <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
            <option value="MEETING_COMPLETED">Meeting Completed</option>
            <option value="FOLLOWUP_REQUIRED">Follow-up Required</option>
            <option value="NEGOTIATION">Negotiation</option>
            <option value="ACTIVE_CLIENT">Active Client</option>
            <option value="DORMANT">Dormant</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading client portfolio...</div>
      ) : clients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectClient(c.id)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{c.customClientId}</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{c.company?.name}</h3>
                    <p className="text-xs text-slate-500">{c.company?.industry || 'Enterprise Client'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.priority === 'URGENT'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                      : c.priority === 'HIGH'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                  }`}>
                    {c.priority}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {c.primaryContact?.name || 'No Primary Contact'}
                    </span>
                  </div>
                  {c.primaryContact?.position && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Title:</span>
                      <span className="text-slate-600 dark:text-slate-400">{c.primaryContact.position}</span>
                    </div>
                  )}
                  {c.primaryContact?.whatsapp && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">WhatsApp:</span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{c.primaryContact.whatsapp}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-400">Assigned To:</span>
                    <span className="font-medium text-brand-600 dark:text-brand-400">
                      {c.assignedUser?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600 dark:bg-brand-950/50">
                  {c.relationshipStatus}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={(e) => handleOpenEdit(c, e)}>
                    Edit
                  </Button>
                  {viewTab === 'ACTIVE' ? (
                    <Button size="sm" variant="ghost" onClick={(e) => handleArchive(c, e)}>
                      Archive
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={(e) => handleRestore(c, e)}>
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No clients found</p>
          <p className="text-xs text-slate-400 mt-1">Get started by registering your first enterprise client</p>
          <div className="mt-4">
            <Button onClick={() => { setClientToEdit(null); setIsFormModalOpen(true); }}>
              + Add Client
            </Button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
        onSaved={loadClients}
        usersList={usersList}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadClients}
        usersList={usersList}
      />
    </div>
  );
};
