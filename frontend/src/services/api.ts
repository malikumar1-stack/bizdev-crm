import { IClient, IMeeting, IFollowup, ITask, IOpportunity, IDashboardMetrics, IUser, INotificationLog } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  baseUrl: API_BASE,
  // Notifications In-App
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/notifications/read-all', { method: 'POST' }),

  // Auth & Profile
  login: (emailOrData: any, password?: string) => {
    const payload = typeof emailOrData === 'string' ? { email: emailOrData, password } : emailOrData;
    return request<{ token: string; user: IUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getMe: () => request<IUser>('/auth/me'),
  updateMyProfile: (data: Partial<IUser>) =>
    request<IUser>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  changeMyPassword: (data: { currentPassword: string; newPassword: string; confirmNewPassword?: string }) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Dashboard & Metrics
  getDashboardMetrics: () => request<IDashboardMetrics>('/reports/dashboard'),

  // Clients
  getClients: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return request<IClient[]>(`/clients${qs ? '?' + qs : ''}`);
  },
  getClient: (id: string) => request<IClient>(`/clients/${id}`),
  createClient: (client: any) =>
    request<IClient>('/clients', {
      method: 'POST',
      body: JSON.stringify(client)
    }),
  updateClient: (id: string, client: any) =>
    request<IClient>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client)
    }),
  archiveClient: (id: string) =>
    request<IClient>(`/clients/${id}/archive`, {
      method: 'PATCH'
    }),
  restoreClient: (id: string) =>
    request<IClient>(`/clients/${id}/restore`, {
      method: 'PATCH'
    }),
  deleteClient: (id: string) =>
    request<void>(`/clients/${id}`, {
      method: 'DELETE'
    }),

  // Contacts
  addContact: (clientId: string, contact: any) =>
    request<any>(`/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(contact)
    }),
  updateContact: (contactId: string, contact: any) =>
    request<any>(`/clients/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(contact)
    }),
  archiveContact: (contactId: string) =>
    request<any>(`/clients/contacts/${contactId}/archive`, {
      method: 'PATCH'
    }),

  // Meetings & Post-Meeting Workflow
  getMeetings: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return request<IMeeting[]>(`/meetings${qs ? '?' + qs : ''}`);
  },
  createMeeting: (meeting: any) =>
    request<IMeeting>('/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting)
    }),
  completeMeetingWorkflow: (id: string, payload: any) =>
    request<any>(`/meetings/${id}/workflow`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Follow-ups & Tasks
  getFollowups: () => request<IFollowup[]>('/followups'),
  createFollowup: (followup: any) =>
    request<IFollowup>('/followups', {
      method: 'POST',
      body: JSON.stringify(followup)
    }),
  completeFollowup: (id: string) =>
    request<IFollowup>(`/followups/${id}/complete`, {
      method: 'PATCH'
    }),
  getTasks: () => request<ITask[]>('/tasks'),
  createTask: (task: any) =>
    request<ITask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    }),
  updateTask: (id: string, task: any) =>
    request<ITask>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task)
    }),

  // Opportunities / Pipeline
  getOpportunities: () => request<IOpportunity[]>('/opportunities'),
  createOpportunity: (opp: any) =>
    request<IOpportunity>('/opportunities', {
      method: 'POST',
      body: JSON.stringify(opp)
    }),
  updateOpportunityStage: (id: string, stage: string) =>
    request<IOpportunity>(`/opportunities/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage })
    }),

  // User Management (Admin)
  getUsers: () => request<IUser[]>('/users'),
  getUserById: (id: string) => request<any>(`/users/${id}`),
  createUser: (userData: any) =>
    request<IUser>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  updateUser: (id: string, userData: any) =>
    request<IUser>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    }),
  resetUserPassword: (id: string, temporaryPassword?: string) =>
    request<{ temporaryPassword: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ temporaryPassword })
    }),
  deactivateUser: (id: string, reassignToUserId?: string) =>
    request<IUser>(`/users/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reassignToUserId })
    }),
  reactivateUser: (id: string) =>
    request<IUser>(`/users/${id}/reactivate`, {
      method: 'POST'
    }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, {
      method: 'DELETE'
    }),
  updateUserPreferences: (id: string, prefs: any) =>
    request<any>(`/users/${id}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(prefs)
    }),

  // Settings & Integrations
  getSettings: () => request<Record<string, string>>('/settings'),
  updateSettings: (settings: Record<string, string>) =>
    request<void>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),
  sendTestEmail: (recipientEmail?: string) =>
    request<any>('/settings/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail })
    }),
  sendTestWhatsApp: (phone?: string, message?: string) =>
    request<any>('/settings/test-whatsapp', {
      method: 'POST',
      body: JSON.stringify({ phone, message })
    }),
  getNotificationLogs: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return request<INotificationLog[]>(`/settings/notification-logs${qs ? '?' + qs : ''}`);
  },
  getAuditLogs: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return request<any[]>(`/settings/audit-logs${qs ? '?' + qs : ''}`);
  },

  // AI & Search
  globalSearch: (query: string) => request<any>(`/search?q=${encodeURIComponent(query)}`),
  chatAI: (prompt: string, clientId?: string) =>
    request<{ reply: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, clientId })
    }),
  summarizeNotes: (notes: string, clientName?: string) =>
    request<any>('/ai/summarize-notes', {
      method: 'POST',
      body: JSON.stringify({ notes, clientName })
    }),

  // Import / Export
  parseImportFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/import-export/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'File parsing failed');
    return data.data || data;
  },
  processImport: (payload: { rows: any[]; mapping: Record<string, string> }) =>
    request<any>('/import-export/process', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
