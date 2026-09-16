import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';
import { ReportsPage } from './pages/ReportsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { CalendarView } from './components/calendar/CalendarView';
import { KanbanBoard } from './components/pipeline/KanbanBoard';
import { ClientFormModal } from './components/clients/ClientFormModal';
import { api } from './services/api';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { IUser } from './types';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Quick modals
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [newOppTitle, setNewOppTitle] = useState('');
  const [newOppValue, setNewOppValue] = useState(10000);
  const [newOppStage, setNewOppStage] = useState('LEAD');
  const [newOppClientId, setNewOppClientId] = useState('');
  const [oppLoading, setOppLoading] = useState(false);
  
  // Pipeline Data
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<IUser[]>([]);

  // Meeting Form states
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingClientId, setNewMeetingClientId] = useState('');
  const [newMeetingContactId, setNewMeetingContactId] = useState('');
  const [newMeetingAssignedUserId, setNewMeetingAssignedUserId] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newMeetingTime, setNewMeetingTime] = useState('11:00');
  const [newMeetingType, setNewMeetingType] = useState('VIDEO_CONFERENCE');
  const [newMeetingLocation, setNewMeetingLocation] = useState('');
  const [newMeetingAgenda, setNewMeetingAgenda] = useState('');
  const [meetingLoading, setMeetingLoading] = useState(false);

  // Followup Form states
  const [newFollowupTitle, setNewFollowupTitle] = useState('');
  const [newFollowupClientId, setNewFollowupClientId] = useState('');
  const [newFollowupDate, setNewFollowupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [newFollowupType, setNewFollowupType] = useState('CALL');
  const [followupLoading, setFollowupLoading] = useState(false);

  const loadData = async () => {
    try {
      const [opps, m, f, t, c, u] = await Promise.all([
        api.getOpportunities().catch(() => []),
        api.getMeetings().catch(() => []),
        api.getFollowups().catch(() => []),
        api.getTasks().catch(() => []),
        api.getClients().catch(() => []),
        api.getUsers().catch(() => [])
      ]);
      setOpportunities(opps);
      setMeetings(m);
      setFollowups(f);
      setTasks(t);
      setClientsList(c);
      setUsersList(u);
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // When opening meeting modal, ensure date is defaulted and latest clients are loaded
  useEffect(() => {
    if (showMeetingModal) {
      loadData();
      if (!newMeetingDate) {
        setNewMeetingDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [showMeetingModal]);

  // When client changes in meeting modal, default to their primary contact
  useEffect(() => {
    if (newMeetingClientId) {
      const selectedClient = clientsList.find((c) => c.id === newMeetingClientId);
      if (selectedClient) {
        setNewMeetingContactId(selectedClient.primaryContactId || '');
        setNewMeetingAssignedUserId(selectedClient.assignedUserId || user?.id || '');
      }
    }
  }, [newMeetingClientId, clientsList]);

  const selectedClientForMeeting = clientsList.find((c) => c.id === newMeetingClientId);

  const availableContactsForMeeting = React.useMemo(() => {
    if (!selectedClientForMeeting) return [];
    const list: any[] = [];
    if (selectedClientForMeeting.company?.contacts && Array.isArray(selectedClientForMeeting.company.contacts)) {
      list.push(...selectedClientForMeeting.company.contacts);
    }
    if (selectedClientForMeeting.primaryContact && !list.some(c => c.id === selectedClientForMeeting.primaryContact.id)) {
      list.unshift(selectedClientForMeeting.primaryContact);
    }
    return list;
  }, [selectedClientForMeeting]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
        Initializing JS Investments BD CRM...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (page: string, entityId?: string) => {
    setCurrentPage(page);
    if (entityId) {
      setSelectedClientId(entityId);
    } else {
      setSelectedClientId(null);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingClientId) {
      alert('Please select a client account.');
      return;
    }
    if (!newMeetingDate) {
      alert('Please select a meeting date.');
      return;
    }
    setMeetingLoading(true);
    try {
      const [year, month, day] = newMeetingDate.split('-').map(Number);
      const [h, m] = (newMeetingTime || '11:00').split(':').map(Number);
      const s = new Date(year, month - 1, day, h, m, 0, 0);
      const end = new Date(s.getTime() + 3600000);

      await api.createMeeting({
        clientId: newMeetingClientId,
        title: newMeetingTitle || `${selectedClientForMeeting?.company?.name || 'Client'} BD Meeting`,
        meetingType: newMeetingType,
        location: newMeetingLocation || undefined,
        agenda: newMeetingAgenda || undefined,
        assignedUserId: newMeetingAssignedUserId || user.id,
        participantContactIds: newMeetingContactId ? [newMeetingContactId] : undefined,
        startTime: s.toISOString(),
        endTime: end.toISOString()
      });
      setShowMeetingModal(false);
      setNewMeetingTitle('');
      setNewMeetingClientId('');
      setNewMeetingContactId('');
      setNewMeetingLocation('');
      setNewMeetingAgenda('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error scheduling meeting');
    } finally {
      setMeetingLoading(false);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOppClientId) {
      alert('Please select a client for this opportunity.');
      return;
    }
    setOppLoading(true);
    try {
      await api.createOpportunity({
        clientId: newOppClientId,
        title: newOppTitle || 'Institutional Investment Mandate',
        value: Number(newOppValue) || 10000,
        stage: newOppStage || 'LEAD',
        assignedUserId: user?.id
      });
      setShowOpportunityModal(false);
      setNewOppTitle('');
      setNewOppClientId('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create opportunity');
    } finally {
      setOppLoading(false);
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowupClientId) {
      alert('Please select a client for this follow-up.');
      return;
    }
    setFollowupLoading(true);
    try {
      await api.createFollowup({
        clientId: newFollowupClientId,
        title: newFollowupTitle || 'Client Check-in',
        followupType: newFollowupType,
        dueDate: new Date(newFollowupDate || Date.now()).toISOString(),
        assignedUserId: user.id
      });
      setShowFollowupModal(false);
      setNewFollowupTitle('');
      setNewFollowupClientId('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating follow-up');
    } finally {
      setFollowupLoading(false);
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onQuickAdd={(type) => {
        if (type === 'meeting') setShowMeetingModal(true);
        else if (type === 'client') setShowClientModal(true);
        else if (type === 'followup') setShowFollowupModal(true);
        else if (type === 'opportunity') setShowOpportunityModal(true);
      }}
    >
      {currentPage === 'dashboard' && (
        <DashboardPage onNavigate={handleNavigate} />
      )}

      {currentPage === 'clients' && (
        selectedClientId ? (
          <ClientDetailPage
            clientId={selectedClientId}
            onBack={() => setSelectedClientId(null)}
            onScheduleMeeting={(cid) => {
              setNewMeetingClientId(cid);
              setShowMeetingModal(true);
            }}
            onScheduleFollowup={(cid) => {
              setNewFollowupClientId(cid);
              setShowFollowupModal(true);
            }}
          />
        ) : (
          <ClientsPage
            onSelectClient={(id) => setSelectedClientId(id)}
            onOpenCreate={() => setShowClientModal(true)}
          />
        )
      )}

      {currentPage === 'meetings' && (
        <MeetingsPage onOpenSchedule={() => setShowMeetingModal(true)} />
      )}

      {currentPage === 'calendar' && (
        <CalendarView
          meetings={meetings}
          followups={followups}
          tasks={tasks}
          onSelectEvent={(type) => {
            if (type === 'meeting') setCurrentPage('meetings');
          }}
        />
      )}

      {currentPage === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Deal Pipeline</h2>
              <p className="text-xs text-slate-500">Visual drag-and-drop opportunity progression and forecasting</p>
            </div>
            <Button size="sm" onClick={() => setShowOpportunityModal(true)} className="text-xs font-bold shrink-0 self-start sm:self-auto">+ New Opportunity</Button>
          </div>
          <KanbanBoard
            opportunities={opportunities}
            onRefresh={loadData}
            onOpenOpportunity={(opp) => alert(`Opportunity: ${opp.title} (${opp.value.toLocaleString()})`)}
            onNewOpportunity={(stage) => {
              if (stage) setNewOppStage(stage);
              setShowOpportunityModal(true);
            }}
          />
        </div>
      )}

      {currentPage === 'followups' && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Follow-up Management</h3>
              <p className="text-xs text-slate-500">Track client touchpoints and critical BD deadlines</p>
            </div>
            <Button size="sm" onClick={() => setShowFollowupModal(true)} className="text-xs font-bold shrink-0 self-start sm:self-auto">+ New Follow-up</Button>
          </div>
          <div className="space-y-3">
            {followups.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">No pending follow-ups</p>
            ) : (
              followups.map((f) => (
                <div key={f.id} className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{f.title}</h5>
                    <p className="text-xs text-slate-400 truncate">{f.client?.company?.name} &bull; Due: {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <Button size="sm" variant={f.status === 'COMPLETED' ? 'outline' : 'primary'} onClick={async () => { await api.completeFollowup(f.id); loadData(); }} className="text-xs shrink-0">
                    {f.status === 'COMPLETED' ? 'Completed' : 'Mark Done'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentPage === 'profile' && (
        <ProfilePage />
      )}

      {currentPage === 'settings' && (
        <SettingsPage />
      )}

      {currentPage === 'tasks' && (
        <TasksPage />
      )}

      {currentPage === 'reports' && (
        <ReportsPage />
      )}

      {currentPage === 'ai' && (
        <AIAssistantPage />
      )}


      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        title="Schedule Client Meeting"
        subtitle="Automated 24-hour and 1-hour reminders will be routed to the assigned manager"
        size="lg"
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Select Client <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={newMeetingClientId}
                onChange={(e) => setNewMeetingClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="">-- Choose Client Account ({clientsList.length} Available) --</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company?.name || c.customClientId} ({c.customClientId}){c.primaryContact?.name ? ` — Contact: ${c.primaryContact.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Client Contact Person
              </label>
              <select
                value={newMeetingContactId}
                onChange={(e) => setNewMeetingContactId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="">-- Choose Key Stakeholder / Contact --</option>
                {availableContactsForMeeting.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} {contact.position ? `(${contact.position})` : ''} {contact.phone ? `• ${contact.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Meeting Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Investment Partnership Discussion"
              value={newMeetingTitle}
              onChange={(e) => setNewMeetingTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Meeting Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newMeetingDate}
                onChange={(e) => setNewMeetingDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={newMeetingTime}
                onChange={(e) => setNewMeetingTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Meeting Type
              </label>
              <select
                value={newMeetingType}
                onChange={(e) => setNewMeetingType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="PHYSICAL">Physical / In-Person</option>
                <option value="VIDEO_CONFERENCE">Video Conference</option>
                <option value="PHONE">Phone Call</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Assigned BD Manager
              </label>
              <select
                value={newMeetingAssignedUserId}
                onChange={(e) => setNewMeetingAssignedUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Location / Video Link
            </label>
            <input
              type="text"
              placeholder="e.g. Islamabad Head Office or Zoom Link"
              value={newMeetingLocation}
              onChange={(e) => setNewMeetingLocation(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Agenda & Objectives
            </label>
            <textarea
              rows={2}
              placeholder="Discussion points, proposal review, strategic expansion..."
              value={newMeetingAgenda}
              onChange={(e) => setNewMeetingAgenda(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowMeetingModal(false)}>Cancel</Button>
            <Button type="submit" loading={meetingLoading}>Schedule Meeting</Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Client Modal */}
      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSaved={loadData}
        usersList={usersList}
      />

      {/* Quick Add Followup Modal */}
      <Modal
        isOpen={showFollowupModal}
        onClose={() => setShowFollowupModal(false)}
        title="Schedule Client Follow-up"
        subtitle="Ensure timely communication and pipeline progression"
      >
        <form onSubmit={handleCreateFollowup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Client Account <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={newFollowupClientId}
              onChange={(e) => setNewFollowupClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            >
              <option value="">-- Choose Client --</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>{c.company?.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Follow-up Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Send revised fee proposal"
              value={newFollowupTitle}
              onChange={(e) => setNewFollowupTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newFollowupDate}
                onChange={(e) => setNewFollowupDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Follow-up Channel
              </label>
              <select
                value={newFollowupType}
                onChange={(e) => setNewFollowupType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="CALL">Phone Call</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
                <option value="PROPOSAL">Send Proposal</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowFollowupModal(false)}>Cancel</Button>
            <Button type="submit" loading={followupLoading}>Save Follow-up</Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Opportunity Modal */}
      <Modal
        isOpen={showOpportunityModal}
        onClose={() => setShowOpportunityModal(false)}
        title="Create Pipeline Opportunity"
        subtitle="Track institutional deals, mutual funds mandates, and advisory progression"
      >
        <form onSubmit={handleCreateOpportunity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Client Account <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={newOppClientId}
              onChange={(e) => setNewOppClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            >
              <option value="">-- Choose Client Account ({clientsList.length} Available) --</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company?.name || c.customClientId} ({c.customClientId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Opportunity / Deal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Provident Fund Advisory Mandate"
              value={newOppTitle}
              onChange={(e) => setNewOppTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Expected Value (PKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="10000"
                value={newOppValue}
                onChange={(e) => setNewOppValue(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Pipeline Stage
              </label>
              <select
                value={newOppStage}
                onChange={(e) => setNewOppStage(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="LEAD">Lead / Prospect</option>
                <option value="CONTACTED">Contacted</option>
                <option value="MEETING">Meeting Scheduled</option>
                <option value="PROPOSAL">Proposal Sent</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="WON">Won / Closed</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowOpportunityModal(false)}>Cancel</Button>
            <Button type="submit" loading={oppLoading}>Create Opportunity</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </AuthProvider>
  );
}
