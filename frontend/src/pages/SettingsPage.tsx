import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { api } from '../services/api';
import { IUser, INotificationLog, IMeetingReminder, ISystemDiagnostics } from '../types';
import { UserManagementModal } from '../components/users/UserManagementModal';
import { ResetPasswordModal } from '../components/users/ResetPasswordModal';
import { DeactivateUserModal } from '../components/users/DeactivateUserModal';
import { UserDetailDrawer } from '../components/users/UserDetailDrawer';
import {
  Send,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Activity,
  MessageSquare,
  Mail,
  Shield,
  Clock,
  Check,
  AlertTriangle,
  Play
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'HEALTH' | 'USERS' | 'WHATSAPP' | 'EMAIL' | 'REMINDER_LOGS' | 'NOTIF_LOGS' | 'AUDIT_LOGS'>(isAdmin ? 'HEALTH' : 'NOTIF_LOGS');

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<ISystemDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);
  const [schedulerTriggerMsg, setSchedulerTriggerMsg] = useState('');

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
  const [smtpSenderName, setSmtpSenderName] = useState('JS Investments BD CRM');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');

  // WhatsApp Settings & Live Test Tool
  const [whatsappApiUrl, setWhatsappApiUrl] = useState('https://graph.facebook.com/v19.0');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappTemplateName, setWhatsappTemplateName] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappTestLoading, setWhatsappTestLoading] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('✓ JS Investments BD CRM — Official WhatsApp Test Dispatch');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Meeting Reminder Logs
  const [reminderLogs, setReminderLogs] = useState<IMeetingReminder[]>([]);
  const [reminderLogsLoading, setReminderLogsLoading] = useState(false);
  const [reminderStatusFilter, setReminderStatusFilter] = useState('ALL');
  const [reminderTimeframeFilter, setReminderTimeframeFilter] = useState('ALL');

  // Notification Logs
  const [notifLogs, setNotifLogs] = useState<INotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const data = await api.getDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setDiagLoading(false);
    }
  };

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
      setSmtpSenderName(s.smtp_sender_name || 'JS Investments BD CRM');
      setSmtpSenderEmail(s.smtp_sender_email || '');
      setWhatsappApiUrl(s.whatsapp_api_url || 'https://graph.facebook.com/v19.0');
      setWhatsappApiKey(s.whatsapp_api_key || '');
      setWhatsappPhoneId(s.whatsapp_phone_number_id || '');
      setWhatsappTemplateName(s.whatsapp_template_name || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadReminderLogs = async () => {
    setReminderLogsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (reminderStatusFilter !== 'ALL') params.status = reminderStatusFilter;
      if (reminderTimeframeFilter !== 'ALL') params.timeframe = reminderTimeframeFilter;
      const logs = await api.getReminderLogs(params);
      setReminderLogs(logs);
    } catch (err) {
      console.error('Failed to load reminder logs:', err);
    } finally {
      setReminderLogsLoading(false);
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
      loadDiagnostics();
      loadUsers();
      loadSettings();
    }
    if (activeTab === 'HEALTH') loadDiagnostics();
    if (activeTab === 'REMINDER_LOGS') loadReminderLogs();
    if (activeTab === 'NOTIF_LOGS') loadNotifLogs();
    if (activeTab === 'AUDIT_LOGS') loadAuditLogs();
  }, [activeTab, isAdmin, reminderStatusFilter, reminderTimeframeFilter]);

  const handleTriggerScheduler = async () => {
    setTriggeringScheduler(true);
    setSchedulerTriggerMsg('');
    try {
      await api.triggerScheduler();
      setSchedulerTriggerMsg('✓ Background reminder scheduler executed successfully.');
      await loadDiagnostics();
      if (activeTab === 'REMINDER_LOGS') await loadReminderLogs();
    } catch (err: any) {
      setSchedulerTriggerMsg(`✕ Failed to trigger scheduler: ${err.message}`);
    } finally {
      setTriggeringScheduler(false);
    }
  };

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
      loadDiagnostics();
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
    setTestResult(null);
    try {
      await api.updateSettings({
        whatsapp_api_url: whatsappApiUrl,
        whatsapp_api_key: whatsappApiKey,
        whatsapp_phone_number_id: whatsappPhoneId,
        whatsapp_template_name: whatsappTemplateName
      });
      setTestResult({
        success: true,
        message: '✓ WhatsApp credentials saved successfully to database.'
      });
      loadDiagnostics();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `✕ Error saving WhatsApp settings: ${err.message}`
      });
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setWhatsappTestLoading(true);
    setTestResult(null);
    try {
      // Auto-save form values first so test dispatches latest inputs
      await api.updateSettings({
        whatsapp_api_url: whatsappApiUrl,
        whatsapp_api_key: whatsappApiKey,
        whatsapp_phone_number_id: whatsappPhoneId,
        whatsapp_template_name: whatsappTemplateName
      });

      const targetPhone = testPhoneNumber || user?.whatsappNumber || user?.phone || '';
      if (!targetPhone) {
        setTestResult({
          success: false,
          message: '✕ WhatsApp test failed: Please enter a recipient mobile number (e.g. 03001234567).'
        });
        setWhatsappTestLoading(false);
        return;
      }

      const res = await api.sendTestWhatsApp(targetPhone, testMessage);
      setTestResult({
        success: true,
        message: `SUCCESS: WhatsApp test message accepted by Meta Cloud API and dispatched to ${res.recipient || targetPhone}! (Message ID: ${res.providerMessageId || 'SENT'})`,
        details: res
      });
      loadDiagnostics();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `FAILED: WhatsApp message rejected. Provider Reason: ${err.message}`
      });
      loadDiagnostics();
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
        <p className="text-xs text-slate-500">JS Investments BD CRM system health, WhatsApp integration, user roles, and delivery logs</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('HEALTH')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'HEALTH'
                ? 'bg-[#002D62] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>System Health & Diagnostics</span>
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'WHATSAPP'
                ? 'bg-[#002D62] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp Cloud API & Test</span>
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-[#002D62] text-white shadow-sm'
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
                ? 'bg-[#002D62] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Email SMTP Config
          </button>
        )}
        <button
          onClick={() => setActiveTab('REMINDER_LOGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'REMINDER_LOGS'
              ? 'bg-[#002D62] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Meeting Reminder Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('NOTIF_LOGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'NOTIF_LOGS'
              ? 'bg-[#002D62] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          General Delivery Logs
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-[#002D62] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Audit Logs
          </button>
        )}
      </div>

      {/* Tab 1: System Health & Diagnostics */}
      {activeTab === 'HEALTH' && isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Reminder System Health & Live Engine Status
              </h3>
              <p className="text-xs text-slate-500">
                Live monitoring of background reminder scheduler, WhatsApp API connectivity, and delivery metrics (PKT)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadDiagnostics}
                loading={diagLoading}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh Status
              </Button>
              <Button
                size="sm"
                onClick={handleTriggerScheduler}
                loading={triggeringScheduler}
                icon={<Play className="w-3.5 h-3.5" />}
              >
                Trigger Scheduler Scan Now
              </Button>
            </div>
          </div>

          {schedulerTriggerMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${
              schedulerTriggerMsg.startsWith('✓')
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}>
              {schedulerTriggerMsg}
            </div>
          )}

          {diagnostics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Scheduler Status */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduler Engine</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Running (1-min Cron)
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timezone:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{diagnostics.system.timezone} (PKT)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Scheduler Scan:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {diagnostics.scheduler.lastRunAt ? new Date(diagnostics.scheduler.lastRunAt).toLocaleTimeString() : 'Active upon boot'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Server Time (PKT):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{diagnostics.system.serverTimePkt}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: WhatsApp API Connectivity */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Cloud API</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                    diagnostics.whatsapp.configured
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${diagnostics.whatsapp.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {diagnostics.whatsapp.configured ? 'Configured & Ready' : 'Credentials Missing'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Number ID:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {diagnostics.whatsapp.phoneNumberId || 'Not Configured'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Access Token:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {diagnostics.whatsapp.hasApiKey ? '•••••••• (Stored)' : 'Missing'}
                    </span>
                  </div>
                  {!diagnostics.whatsapp.configured && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pt-1">
                      ⚠️ Go to the WhatsApp tab to enter Meta API credentials.
                    </p>
                  )}
                </div>
              </div>

              {/* Card 3: Reminder Volume & Performance */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Reminders</span>
                  <span className="text-xs font-bold text-[#002D62] dark:text-amber-400">
                    {diagnostics.metrics.totalRemindersCount} Total in Database
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Pending</span>
                    <span className="text-base font-bold text-sky-600 dark:text-sky-400">{diagnostics.metrics.pendingRemindersCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Sent Today</span>
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{diagnostics.metrics.sentTodayCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-semibold">Failed Today</span>
                    <span className="text-base font-bold text-rose-700 dark:text-rose-300">{diagnostics.metrics.failedTodayCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">Loading system health diagnostics...</div>
          )}
        </div>
      )}

      {/* Tab 2: WhatsApp Cloud API Settings & Live Testing Tool */}
      {activeTab === 'WHATSAPP' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credentials Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Meta WhatsApp Cloud API Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your official Meta WhatsApp Business Cloud credentials for automated meeting reminders
              </p>
            </div>

            <form onSubmit={handleSaveWhatsApp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  API Endpoint Base URL
                </label>
                <input
                  type="text"
                  value={whatsappApiUrl}
                  onChange={(e) => setWhatsappApiUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 106547893214568"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Found in Meta Developer Portal &rarr; WhatsApp &rarr; API Setup</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  System User Access Token (Bearer Token) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={whatsappApiKey}
                  onChange={(e) => setWhatsappApiKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Use a permanent System User Token with `whatsapp_business_messaging` permission</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Approved Template Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. meeting_reminder (Leave empty for direct sandbox/text)"
                  value={whatsappTemplateName}
                  onChange={(e) => setWhatsappTemplateName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white font-mono"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" loading={whatsappSaving}>
                  Save WhatsApp Settings
                </Button>
              </div>
            </form>
          </div>

          {/* Admin Live WhatsApp Test Tool */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Admin WhatsApp Live Test Tool
                </h3>
                <p className="text-xs text-slate-500">
                  Verify real WhatsApp message delivery to any Pakistani or international number
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Recipient Test Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 03001234567 or +923001234567"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Automatic Pakistan normalization: <span className="font-mono text-emerald-600 font-bold">03001234567 &rarr; +923001234567</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Test Message Content
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                />
              </div>

              <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                loading={whatsappTestLoading}
                onClick={handleTestWhatsApp}
                icon={<Send className="w-4 h-4" />}
              >
                Send Test WhatsApp Message
              </Button>

              {testResult && (
                <div className={`p-4 rounded-xl text-xs space-y-1.5 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="font-semibold leading-relaxed">
                      {testResult.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: User Management */}
      {activeTab === 'USERS' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              JS Investments BD Team Directory & Roles ({usersList.length})
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
                    <th className="p-3 font-semibold">WhatsApp & Phone</th>
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
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-slate-800 dark:text-slate-200">{u.whatsappNumber || u.whatsapp || u.phone || 'No phone'}</div>
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

      {/* Tab 4: Email Settings */}
      {activeTab === 'EMAIL' && isAdmin && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-sky-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Email Dispatch Configuration (Resend HTTPS API / SMTP)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure email transports for corporate meeting notifications and team briefings
              </p>
            </div>

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
                  Resend HTTPS API Key (Recommended for Render)
                </label>
                <input
                  type="password"
                  placeholder="re_123456789_abcdef..."
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    placeholder="JS Investments BD CRM"
                    value={smtpSenderName}
                    onChange={(e) => setSmtpSenderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Sender Email
                  </label>
                  <input
                    type="text"
                    placeholder="crm@jsil.com"
                    value={smtpSenderEmail}
                    onChange={(e) => setSmtpSenderEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#002D62] focus:outline-none dark:text-white"
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
        </div>
      )}

      {/* Tab 5: Meeting Reminder Logs */}
      {activeTab === 'REMINDER_LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Scheduled Meeting Reminders & WhatsApp Dispatch Trail
              </h3>
              <p className="text-xs text-slate-500">
                Idempotent execution history of 24h & 1h pre-meeting briefings with exact provider responses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={reminderStatusFilter}
                onChange={(e) => setReminderStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PROCESSING">Processing</option>
              </select>

              <select
                value={reminderTimeframeFilter}
                onChange={(e) => setReminderTimeframeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium dark:text-white"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today Only</option>
                <option value="WEEK">Last 7 Days</option>
              </select>

              <Button size="sm" variant="outline" onClick={loadReminderLogs} loading={reminderLogsLoading}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Scheduled Time (PKT)</th>
                    <th className="p-3 font-semibold">Client & Meeting</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Recipient Contact</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Attempts</th>
                    <th className="p-3 font-semibold">Provider Message ID / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reminderLogs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {new Date(r.scheduledTime).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{r.meeting?.title || 'Meeting'}</div>
                        <div className="text-[11px] text-slate-400">{r.meeting?.client?.company?.name || 'Client'}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {r.reminderType} ({r.channel})
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">{r.recipientContact}</div>
                        <div className="text-[10px] text-slate-400">{r.recipientName || 'BD Executive'}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                            : r.status === 'SCHEDULED'
                            ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/50'
                            : r.status === 'PROCESSING'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-medium">
                        {r.attemptsCount}
                      </td>
                      <td className="p-3 text-[11px] max-w-xs truncate font-mono">
                        {r.status === 'SENT' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">ID: {r.providerMessageId || 'SENT'}</span>
                        ) : r.status === 'FAILED' ? (
                          <span className="text-rose-600 dark:text-rose-400" title={r.errorMessage || ''}>{r.errorMessage || 'Rejection'}</span>
                        ) : (
                          <span className="text-slate-400">Pending Execution</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reminderLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No meeting reminders recorded yet for selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: General Delivery Logs */}
      {activeTab === 'NOTIF_LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              General Notification Logs
            </h3>
            <Button size="sm" variant="outline" onClick={loadNotifLogs} loading={logsLoading}>
              Refresh Logs
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold">Recipient</th>
                    <th className="p-3 font-semibold">Channel</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Timestamp (PKT)</th>
                    <th className="p-3 font-semibold">Diagnostic Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{log.title}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{log.recipientName}</div>
                        <div className="text-[11px] text-slate-400">{log.recipientContact}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                          {log.channel}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                            : log.status === 'NOT_CONFIGURED'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">
                        {log.error || (log.status === 'SENT' ? 'Delivered' : 'N/A')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Audit Logs */}
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
                      <td className="p-3 text-slate-500">{log.entity}</td>
                      <td className="p-3 text-[11px] text-slate-400 max-w-sm truncate font-mono">
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
