export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'MEETING_REMINDER' | 'FOLLOWUP_REMINDER' | 'TASK_REMINDER' | 'OVERDUE_ALERT' | 'SYSTEM';
  entityType?: 'MEETING' | 'FOLLOWUP' | 'TASK' | 'CLIENT' | 'OPPORTUNITY';
  entityId?: string;
  channels?: ('IN_APP' | 'EMAIL' | 'WHATSAPP' | 'BROWSER')[];
  recipientEmail?: string;
  recipientPhone?: string;
  recipientWhatsapp?: string;
  metadata?: Record<string, any>;
}

export interface INotificationProvider {
  name: string;
  send(payload: NotificationPayload): Promise<{ success: boolean; channel: string; details?: any; error?: string }>;
}
