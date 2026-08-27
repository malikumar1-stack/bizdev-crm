import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { api } from '../services/api';
import { IUser, INotificationLog } from '../types';
import { UserManagementModal } from '../components/users/UserManagementModal';
import { ResetPasswordModal } from '../components/users/ResetPasswordModal';
import { DeactivateUserModal } from '../components/users/DeactivateUserModal';
import { UserDetailDrawer } from '../components/users/UserDetailDrawer';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'USERS' | 'EMAIL' | 'WHATSAPP' | 'NOTIF_LOGS' | 'AUDIT_LOGS'>(isAdmin ? 'USERS' : 'NOTIF_LOGS');

  // Users Tab
  const [usersList, setUsersList] = useState<IUser[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<IUser | null>(null);
  const [resetModalUser, setResetModalUser] = useState<IUser | null>(null);
  const [deactivateModalUser, setDeactivateModalUser] = useState<IUser | null>(null);
  const [detailDrawerUserId, setDetailDrawerUserId] = useState<string | null>(null);

  // Email Settings
  const [resendApiKey, setResendApiKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('BizDev CRM');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');

  // WhatsApp Settings
  const [whatsappApiUrl, setWhatsappApiUrl] = useState('https://graph.facebook.com/v19.0');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappTestLoading, setWhatsappTestLoading] = useState(false);
  const [whatsappStatusMessage, setWhatsappStatusMessage] = useState('');
  const [whatsappClickUrl, setWhatsappClickUrl] = useState<string | null>(null);
  
  // Notification Logs
  const [notifLogs, setNotifLogs] = useState<INotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsersList(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setResendApiKey(s.resend_api_key || '');
      setSmtpHost(s.smtp_host || '');
      setSmtpPort(s.smtp_port || '587');
      setSmtpUser(s.smtp_user || '');
      setSmtpPass(s.smtp_password || '');
      setSmtpSenderName(s.smtp_sender_name || 'BizDev CRM');
      setSmtpSenderEmail(s.smtp_sender_email || '');
      setWhatsappApiUrl(s.whatsapp_api_url || 'https://graph.facebook.com/v19.0');
      setWhatsappApiKey(s.whatsapp_api_key || '');
      setWhatsappPhoneId(s.whatsapp_phone_number_id || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadNotifLogs = async () => {
    setLogsLoading(true);
    try {
      const logs = await api.getNotificationLogs();
      setNotifLogs(logs);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadSettings();
    }
    if (activeTab === 'NOTIF_LOGS') loadNotifLogs();
    if (activeTab === 'AUDIT_LOGS') loadAuditLogs();
  }, [activeTab, isAdmin]);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSaving(true);
    setEmailStatusMessage('');
    try {
      await api.updateSettings({
        resend_api_key: resendApiKey,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPass,
        smtp_sender_name: smtpSenderName,
        smtp_sender_email: smtpSenderEmail
      });
      setEmailStatusMessage('✓ Email transport settings saved successfully.');
    } catch (err: any) {
      setEmailStatusMessage(`✕ Error saving settings: ${err.message}`);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setEmailTestLoading(true);
    setEmailStatusMessage('');
    try {
      // Auto-save form inputs first so test always uses latest values
      await api.updateSettings({
        resend_api_key: resendApiKey,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPass,
        smtp_sender_name: smtpSenderName,
        smtp_sender_email: smtpSenderEmail
      });

      const res = await api.testEmail({
        resendApiKey,
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        password: smtpPass,
        senderName: smtpSenderName,
        senderEmail: smtpSenderEmail
      });
      setEmailStatusMessage(`✓ Test email delivered successfully! (Transport: ${res.mode || 'Active'})`);
    } catch (err: any) {
      setEmailStatusMessage(`✕ ${err.message || 'Failed to send test email'}`);
    } finally {
      setEmailTestLoading(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappSaving(true);
    setWhatsappStatusMessage('');
    try {
      await api.updateSettings({
        whatsapp_api_url: whatsappApiUrl,
        whatsapp_api_key: whatsappApiKey,
        whatsapp_phone_number_id: whatsappPhoneId
      });
      setWhatsappStatusMessage('✓ WhatsApp credentials saved successfully.');
    } catch (err: any) {
      setWhatsappStatusMessage(`✕ Error saving WhatsApp settings: ${err.message}`);
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setWhatsappTestLoading(true);
    setWhatsappStatusMessage('');
    setWhatsappClickUrl(null);
    try {
      const res = await api.sendTestWhatsApp();
      if (res.status === 'NOT_CONFIGURED') {
        setWhatsappStatusMessage('Notice: WhatsApp integration not configured. Direct wa.me link generated below:');
        setWhatsappClickUrl(res.clickUrl);
      } else {
        setWhatsappStatusMessage('✓ Official WhatsApp test message delivered successfully.');
      }
    } catch (err: any) {
      setWhatsappStatusMessage(`✕ WhatsApp test failed: ${err.message}`);
    } finally {
      setWhatsappTestLoading(false);
    }
  };

  const handleReactivateUser = async (targetUser: IUser) => {
    try {
      await api.reactivateUser(targetUser.id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate user');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin & System Settings</h2>
        <p className="text-xs text-slate-500">Configure team access, communication channels, and view system logs</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            User Management
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('EMAIL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'EMAIL'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Email SMTP Config
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'WHATSAPP'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            WhatsApp API Config
          </button>
        )}
        <button
          onClick={() => setActiveTab('NOTIF_LOGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'NOTIF_LOGS'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Notification Logs
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Audit Logs
          </button>
        )}
      </div>

      {/* Tab 1: User Management */}
      {activeTab === 'USERS' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Team Directory & Roles ({usersList.length})
            </h3>
            <Button
              size="sm"
              onClick={() => {
                setSelectedUserToEdit(null);
                setUserModalOpen(true);
              }}
            >
              + Create User
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">User</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold">Contact & WhatsApp</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Assigned Workload</th>
                    <th className="p-3 font-semibold">Last Login</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                            : u.role === 'MANAGER'
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50'
                            : 'bg-brand-50 text-brand-600 dark:bg-brand-950/50'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800 dark:text-slate-200">{u.whatsappNumber || u.whatsapp || u.phone || 'No phone'}</div>
                        <div className="text-[11px] text-slate-400">Notif: {u.notificationEmail || u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE' && u.active
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {u.status === 'ACTIVE' && u.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 dark:text-slate-300">
                          {u._count?.assignedClients || 0} clients &bull; {u._count?.assignedMeetings || 0} meetings
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailDrawerUserId(u.id)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUserToEdit(u);
                              setUserModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResetModalUser(u)}
                          >
                            Reset Password
                          </Button>
                          {u.status === 'ACTIVE' && u.active ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setDeactivateModalUser(u)}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivateUser(u)}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Email Transport Settings */}
      {activeTab === 'EMAIL' && isAdmin && (
        <div className="space-y-6 max-w-2xl">
          {/* Card 1: Resend Cloud HTTPS API (Recommended for Render) */}
          <div className="bg-gradient-to-br from-brand-50 to-sky-50 dark:from-brand-950/40 dark:to-sky-950/40 rounded-2xl border border-brand-200 dark:border-brand-800/60 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">⚡</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Resend HTTPS Email API (100% Reliable & Recommended for Cloud/Render)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Cloud hosting providers (like Render) block raw SMTP ports to prevent spam. <strong>Resend</strong> delivers automated reminders over standard HTTPS port 443 with <strong>100% deliverability</strong> and 3,000 free emails/month.
            </p>

            <form onSubmit={handleSaveEmail} className="space-y-3.5">
              {emailStatusMessage && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  emailStatusMessage.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                }`}>
                  {emailStatusMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Resend API Key
                </label>
                <input
                  type="password"
                  placeholder="re_123456789_abcdef..."
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  className="w-full rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  👉 Free key in 15 seconds: Go to <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-brand-600 underline font-bold">resend.com</a> (Click 'Sign in with Google' &rarr; 'API Keys' &rarr; 'Create API Key').
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    placeholder="BizDev CRM"
                    value={smtpSenderName}
                    onChange={(e) => setSmtpSenderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Sender Email
                  </label>
                  <input
                    type="text"
                    placeholder="onboarding@resend.dev (or your domain)"
                    value={smtpSenderEmail}
                    onChange={(e) => setSmtpSenderEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={emailSaving}>
                  Save Email Settings
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  loading={emailTestLoading}
                  onClick={handleTestEmail}
                >
                  ⚡ Send Test Email
                </Button>
              </div>
            </form>
          </div>

          {/* Card 2: Traditional SMTP (For local/VPS hosting) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Alternative: Traditional SMTP (Self-Hosted VPS)
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Use if you deploy BizDev CRM to a private VPS server where outbound raw SMTP ports are open.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">SMTP Host</label>
                <input
                  type="text"
                  placeholder="smtp.mailgun.org"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Tab 3: WhatsApp API Config */}
      {activeTab === 'WHATSAPP' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Meta WhatsApp Cloud API Integration
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Connect Meta WhatsApp Cloud API credentials. If unconfigured, the CRM generates standard click-to-chat (wa.me) links without false claims.
          </p>

          <form onSubmit={handleSaveWhatsApp} className="space-y-4">
            {whatsappStatusMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                whatsappStatusMessage.startsWith('✓')
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}>
                {whatsappStatusMessage}
                {whatsappClickUrl && (
                  <div className="mt-2">
                    <a
                      href={whatsappClickUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1 rounded bg-emerald-600 text-white font-bold text-xs"
                    >
                      Open WhatsApp Web Direct Link &rarr;
                    </a>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                WhatsApp API Base URL
              </label>
              <input
                type="text"
                value={whatsappApiUrl}
                onChange={(e) => setWhatsappApiUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Phone Number ID
              </label>
              <input
                type="text"
                placeholder="Meta Cloud Phone Number ID"
                value={whatsappPhoneId}
                onChange={(e) => setWhatsappPhoneId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Access Token (Bearer API Key)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={whatsappApiKey}
                onChange={(e) => setWhatsappApiKey(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={whatsappSaving}>
                Save WhatsApp Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={whatsappTestLoading}
                onClick={handleTestWhatsApp}
              >
                Test WhatsApp Dispatch
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Notification Logs */}
      {activeTab === 'NOTIF_LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Notification History & Delivery Logs
              </h3>
              <p className="text-xs text-slate-500">
                Audit trail of all email, WhatsApp, and in-app automated dispatches with real delivery confirmation
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={loadNotifLogs} loading={logsLoading}>
              Refresh Logs
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Notification Title</th>
                    <th className="p-3 font-semibold">Recipient</th>
                    <th className="p-3 font-semibold">Channel</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Delivery Status</th>
                    <th className="p-3 font-semibold">Sent Timestamp</th>
                    <th className="p-3 font-semibold">Diagnostic Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {log.title}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{log.recipientName}</div>
                        <div className="text-[11px] text-slate-400">{log.recipientContact}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.channel}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {log.type}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                            : log.status === 'NOT_CONFIGURED'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                        }`}>
                          {log.status === 'SENT' ? 'Sent' : (log.status === 'NOT_CONFIGURED' ? 'Not Sent (Unconfigured)' : 'Failed')}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">
                        {log.error || log.status === 'SENT' ? 'Delivered' : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {notifLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No notification logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Audit Logs */}
      {activeTab === 'AUDIT_LOGS' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              System Audit & Change Trail
            </h3>
            <Button size="sm" variant="outline" onClick={loadAuditLogs} loading={auditLoading}>
              Refresh Logs
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Timestamp</th>
                    <th className="p-3 font-semibold">User</th>
                    <th className="p-3 font-semibold">Action</th>
                    <th className="p-3 font-semibold">Entity</th>
                    <th className="p-3 font-semibold">Details / Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {log.user?.name || 'System'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {log.entity}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 max-w-sm truncate">
                        {log.diffJson || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <UserManagementModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedUserToEdit(null);
        }}
        userToEdit={selectedUserToEdit}
        onSaved={loadUsers}
      />

      <ResetPasswordModal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        user={resetModalUser}
      />

      <DeactivateUserModal
        isOpen={!!deactivateModalUser}
        onClose={() => setDeactivateModalUser(null)}
        user={deactivateModalUser}
        usersList={usersList}
        onDeactivated={loadUsers}
      />

      <UserDetailDrawer
        isOpen={!!detailDrawerUserId}
        onClose={() => setDetailDrawerUserId(null)}
        userId={detailDrawerUserId}
      />
    </div>
  );
};
