import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'INFO' | 'NOTIFICATIONS' | 'SECURITY'>('INFO');

  // Tab 1: Personal Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  // Tab 2: Notification Preferences
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [browserEnabled, setBrowserEnabled] = useState(true);
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [followupReminders, setFollowupReminders] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMessage, setPrefMessage] = useState('');

  // Tab 3: Security / Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setWhatsappNumber(user.whatsappNumber || user.whatsapp || '');
      setNotificationEmail(user.notificationEmail || '');

      if (user.preferences) {
        setEmailEnabled(user.preferences.emailEnabled !== false);
        setWhatsappEnabled(user.preferences.whatsappEnabled !== false);
        setInAppEnabled(user.preferences.inAppEnabled !== false);
        setBrowserEnabled(user.preferences.browserEnabled !== false);
        setMeetingReminders(user.preferences.meetingReminders !== false);
        setFollowupReminders(user.preferences.followupReminders !== false);
        setTaskReminders(user.preferences.taskReminders !== false);
      }
    }
  }, [user]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoSaving(true);
    setInfoMessage('');
    try {
      await api.updateMyProfile({
        name,
        phone,
        whatsappNumber,
        whatsapp: whatsappNumber,
        notificationEmail: notificationEmail || null
      });
      await refreshUser();
      setInfoMessage('✓ Profile information updated successfully.');
    } catch (err: any) {
      setInfoMessage(`✕ Error: ${err.message}`);
    } finally {
      setInfoSaving(false);
    }
  };

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPrefSaving(true);
    setPrefMessage('');
    try {
      await api.updateUserPreferences(user.id, {
        emailEnabled,
        whatsappEnabled,
        inAppEnabled,
        browserEnabled,
        meetingReminders,
        followupReminders,
        taskReminders
      });
      await refreshUser();
      setPrefMessage('✓ Notification preferences saved.');
    } catch (err: any) {
      setPrefMessage(`✕ Error: ${err.message}`);
    } finally {
      setPrefSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSaving(true);
    setPassError('');
    setPassMessage('');

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirm password do not match.');
      setPassSaving(false);
      return;
    }

    try {
      await api.changeMyPassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword
      });
      setPassMessage('✓ Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setPassSaving(false);
    }
  };

  // Real-time password validation helpers
  const passLength = newPassword.length >= 8;
  const passUpper = /[A-Z]/.test(newPassword);
  const passLower = /[a-z]/.test(newPassword);
  const passNumber = /[0-9]/.test(newPassword);
  const passSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Profile & Preferences</h2>
          <p className="text-xs text-slate-500">Manage your user account, notification channels, and security settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('INFO')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'INFO'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'NOTIFICATIONS'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Notification Preferences
        </button>
        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SECURITY'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Security & Password
        </button>
      </div>

      {/* Tab 1: Personal Information */}
      {activeTab === 'INFO' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <form onSubmit={handleSaveInfo} className="space-y-4 max-w-xl">
            {infoMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                infoMessage.startsWith('✓')
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                {infoMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Login Email (Read-Only)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 p-2.5 text-xs font-medium text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Notification Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="Defaults to login email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="+923001234567"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" loading={infoSaving}>Save Personal Info</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Notification Preferences */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <form onSubmit={handleSavePrefs} className="space-y-6 max-w-xl">
            {prefMessage && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {prefMessage}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
                1. Delivery Channels
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Email Notifications</div>
                    <div className="text-[11px] text-slate-400">Receive 24h/1h agendas and follow-up reminders in your inbox</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">WhatsApp Reminders</div>
                    <div className="text-[11px] text-slate-400">Receive meeting briefings and direct wa.me chat alerts</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inAppEnabled}
                    onChange={(e) => setInAppEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">In-App Notification Center</div>
                    <div className="text-[11px] text-slate-400">Bell icon alerts inside the CRM navigation bar</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={browserEnabled}
                    onChange={(e) => setBrowserEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Browser Desktop Push</div>
                    <div className="text-[11px] text-slate-400">Native desktop popup alerts for upcoming milestones</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
                2. Reminder Event Triggers
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={meetingReminders}
                    onChange={(e) => setMeetingReminders(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Meeting Reminders</div>
                    <div className="text-[11px] text-slate-400">24-hour and 1-hour notifications before scheduled meetings</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followupReminders}
                    onChange={(e) => setFollowupReminders(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Follow-up Due Alerts</div>
                    <div className="text-[11px] text-slate-400">Reminders when client follow-ups are due or approaching deadline</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taskReminders}
                    onChange={(e) => setTaskReminders(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Task Due Alerts</div>
                    <div className="text-[11px] text-slate-400">Notifications when tasks are assigned or overdue</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" loading={prefSaving}>Save Preferences</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            {passMessage && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {passMessage}
              </div>
            )}
            {passError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {passError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            {/* Password Validation Checklist */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">Password Strength Requirements:</div>
              <div className={passLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                {passLength ? '✓' : '○'} Minimum 8 characters
              </div>
              <div className={passUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                {passUpper ? '✓' : '○'} At least one uppercase letter (A-Z)
              </div>
              <div className={passLower ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                {passLower ? '✓' : '○'} At least one lowercase letter (a-z)
              </div>
              <div className={passNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                {passNumber ? '✓' : '○'} At least one number (0-9)
              </div>
              <div className={passSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                {passSpecial ? '✓' : '○'} At least one special character (!@#$%^&*)
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" loading={passSaving}>Update Password</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
