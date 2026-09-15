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
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('11:00');
  const [newMeetingType, setNewMeetingType] = useState('VIDEO_CONFERENCE');
  const [newMeetingLocation, setNewMeetingLocation] = useState('');
  const [newMeetingAgenda, setNewMeetingAgenda] = useState('');
  const [meetingLoading, setMeetingLoading] = useState(false);

  // Followup Form states
  const [newFollowupTitle, setNewFollowupTitle] = useState('');
  const [newFollowupClientId, setNewFollowupClientId] = useState('');
  const [newFollowupDate, setNewFollowupDate] = useState('');
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

  // When client changes in meeting modal, default to their primary contact
  useEffect(() => {
    if (newMeetingClientId) {
      const selectedClient = clientsList.find((c) => c.id === newMeetingClientId);
      if (selectedClient) {
        setNewMeetingContactId(selectedClient.primaryContactId || '');
        setNewMeetingAssignedUserId(selectedClient.assignedUserId || user?.id || '');
      }
    }
  }, [newMeetingClientId]);

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
    setMeetingLoading(true);
    try {
      const s = new Date(newMeetingDate);
      const [h, m] = newMeetingTime.split(':').map(Number);
      s.setHours(h, m, 0, 0);
      const end = new Date(s.getTime() + 3600000);

      await api.createMeeting({
        clientId: newMeetingClientId,
        title: newMeetingTitle,
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
      setNewMeetingLocation('');
      setNewMeetingAgenda('');
      loadData();
      alert('✓ Meeting scheduled! Automated 24h and 1h reminders configured for assigned team member.');
    } catch (err: any) {
      alert(err.message || 'Error scheduling meeting');
    } finally {
      setMeetingLoading(false);
    }
  };

  
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setOppLoading(true);
    try {
      await api.createOpportunity({
        clientId: newOppClientId,
        title: newOppTitle,
        value: Number(newOppValue),
        stage: newOppStage,
        assignedUserId: user?.id
      });
      setShowOpportunityModal(false);
      setNewOppTitle('');
      loadData();
      alert('✓ Opportunity created in pipeline!');
    } catch (err: any) {
      alert(err.message || 'Failed to create opportunity');
    } finally {
      setOppLoading(false);
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFollowupLoading(true);
    try {
      await api.createFollowup({
        clientId: newFollowupClientId,
        title: newFollowupTitle,
        followupType: newFollowupType,
        dueDate: new Date(newFollowupDate).toISOString(),
        assignedUserId: user.id
      });
      setShowFollowupModal(false);
      setNewFollowupTitle('');
      loadData();
      alert('✓ Follow-up created successfully!');
    } catch (err: any) {
      alert(err.message || 'Error creating follow-up');
    } finally {
      setFollowupLoading(false);
    }
  };

  const selectedClientForMeeting = clientsList.find((c) => c.id === newMeetingClientId);

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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deal Pipeline</h2>
              <p className="text-xs text-slate-500">Visual drag-and-drop opportunity progression and forecasting</p>
            </div>
            <Button size="sm" onClick={() => setShowOpportunityModal(true)}>+ New Opportunity</Button>
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
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Follow-up Management</h3>
            <Button size="sm" onClick={() => setShowFollowupModal(true)}>+ New Follow-up</Button>
          </div>
          <div className="space-y-3">
            {followups.map((f) => (
              <div key={f.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">{f.title}</h5>
                  <p className="text-xs text-slate-400">{f.client?.company?.name} &bull; Due: {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <Button size="sm" variant={f.status === 'COMPLETED' ? 'outline' : 'primary'} onClick={async () => { await api.completeFollowup(f.id); loadData(); }}>
                  {f.status === 'COMPLETED' ? 'Completed' : 'Mark Done'}
                </Button>
              </div>
            ))}
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
                <option value="">-- Choose Client Account --</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>{c.company?.name} ({c.primaryContact?.name || 'Contact'})</option>
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
                <option value="">-- Choose Key Stakeholder --</option>
                {selectedClientForMeeting?.company?.contacts?.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} ({contact.position || 'Contact'})
                  </option>
                )) || (selectedClientForMeeting?.primaryContact && (
                  <option value={selectedClientForMeeting.primaryContact.id}>
                    {selectedClientForMeeting.primaryContact.name} ({selectedClientForMeeting.primaryContact.position || 'Contact'})
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
