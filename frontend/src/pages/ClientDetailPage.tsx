import React, { useState, useEffect } from 'react';
import { IClient, IContact, IUser } from '../types';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { ContactModal } from '../components/clients/ContactModal';

interface ClientDetailPageProps {
  clientId: string;
  onBack: () => void;
  onScheduleMeeting: (clientId: string) => void;
  onScheduleFollowup: (clientId: string) => void;
}

export const ClientDetailPage: React.FC<ClientDetailPageProps> = ({
  clientId,
  onBack,
  onScheduleMeeting,
  onScheduleFollowup
}) => {
  const [client, setClient] = useState<IClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONTACTS' | 'MEETINGS' | 'TIMELINE'>('OVERVIEW');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<IContact | null>(null);
  const [usersList, setUsersList] = useState<IUser[]>([]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const [data, users] = await Promise.all([
        api.getClient(clientId),
        api.getUsers().catch(() => [])
      ]);
      setClient(data);
      setUsersList(users);
    } catch (err) {
      console.error('Failed to load client:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const handleArchive = async () => {
    if (!client || !confirm(`Archive "${client.company.name}"?`)) return;
    try {
      await api.archiveClient(client.id);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to archive client');
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    const confirmed = window.confirm(
      `⚠️ Permanently delete "${client.company?.name || client.customClientId}"?\n\nThis will remove all associated meetings, contact records, timeline activities, and tasks. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.deleteClient(client.id);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading client 360 profile...</div>;
  }

  if (!client) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-semibold">Client not found</p>
        <Button size="sm" onClick={onBack} className="mt-3">Back to Clients</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={onBack}>&larr; Back</Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">{client.customClientId}</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{client.company?.name}</h2>
              {client.isArchived && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{client.company?.industry} &bull; {client.company?.city || 'Location N/A'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(true)}>
            Edit Client
          </Button>
          <Button size="sm" onClick={() => onScheduleMeeting(client.id)}>
            Schedule Meeting
          </Button>
          <Button size="sm" variant="ghost" onClick={handleArchive}>
            Archive
          </Button>
          <Button size="sm" variant="outline" onClick={handleDelete} className="text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40">
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Overview & Strategy
        </button>
        <button
          onClick={() => setActiveTab('CONTACTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CONTACTS'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Key Stakeholders & Contacts ({client.company?.contacts?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('MEETINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'MEETINGS'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Meetings ({client.meetings?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'TIMELINE'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Activity Audit Timeline
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Relationship Health & Status
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="text-[11px] text-slate-400">Current Status</div>
                  <div className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-0.5">{client.relationshipStatus}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="text-[11px] text-slate-400">Account Priority</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{client.priority}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="text-[11px] text-slate-400">Client Type</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{client.clientType}</div>
                </div>
              </div>

              {client.notes && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Account Notes</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Account Ownership
              </h3>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-400">Assigned Manager:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{client.assignedUser?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>{' '}
                  <span className="text-slate-700 dark:text-slate-300">{client.assignedUser?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>{' '}
                  <span className="text-slate-700 dark:text-slate-300">{client.assignedUser?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Contacts */}
      {activeTab === 'CONTACTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multiple Client Contacts</h3>
            <Button size="sm" onClick={() => { setContactToEdit(null); setIsContactModalOpen(true); }}>
              + Add Contact
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.company?.contacts?.map((contact) => (
              <div key={contact.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{contact.name}</h4>
                      {contact.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{contact.position || 'Key Stakeholder'}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setContactToEdit(contact); setIsContactModalOpen(true); }}>
                    Edit
                  </Button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
                  {contact.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Email:</span>
                      <a href={`mailto:${contact.email}`} className="text-brand-600 font-medium hover:underline">{contact.email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono">{contact.phone}</span>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">WhatsApp:</span>
                      <a
                        href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 font-semibold hover:underline font-mono"
                      >
                        {contact.whatsapp} &bull; Open Chat
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Meetings */}
      {activeTab === 'MEETINGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Scheduled & Past Meetings</h3>
            <Button size="sm" onClick={() => onScheduleMeeting(client.id)}>
              + Schedule Meeting
            </Button>
          </div>

          <div className="space-y-3">
            {client.meetings && client.meetings.length > 0 ? (
              client.meetings.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h4>
                    <p className="text-xs text-slate-400">
                      {new Date(m.startTime).toLocaleString()} &bull; {m.meetingType} &bull; {m.status}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {m.outcome || m.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                No meetings recorded for this client yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'TIMELINE' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activity History & Audit Trail</h3>
          <div className="space-y-3">
            {client.activities && client.activities.length > 0 ? (
              client.activities.map((act) => (
                <div key={act.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{act.title}</span>
                    <span className="text-[11px] text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                  {act.description && <p className="text-slate-600 dark:text-slate-400 mt-1">{act.description}</p>}
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">No activity entries yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ClientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        clientToEdit={client}
        onSaved={loadClient}
        usersList={usersList}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        clientId={client.id}
        contactToEdit={contactToEdit}
        onSaved={loadClient}
      />
    </div>
  );
};
