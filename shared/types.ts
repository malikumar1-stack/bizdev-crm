// Core Enums & Types for AI-Powered Business Development CRM

export type UserRole = 'ADMIN' | 'MANAGER' | 'BD_EXECUTIVE' | 'VIEWER';

export type RelationshipStatus =
  | 'LEAD'
  | 'CONTACTED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_COMPLETED'
  | 'FOLLOWUP_REQUIRED'
  | 'NEGOTIATION'
  | 'ACTIVE_CLIENT'
  | 'DORMANT'
  | 'LOST';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type MeetingType =
  | 'PHYSICAL'
  | 'ONLINE'
  | 'PHONE'
  | 'VIDEO_CONFERENCE'
  | 'INTERNAL'
  | 'OTHER';

export type MeetingStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export type MeetingOutcome =
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'NEGATIVE'
  | 'PROPOSAL_REQUESTED'
  | 'FURTHER_DISCUSSION_REQUIRED'
  | 'CLOSED';

export type FollowupType =
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'PROPOSAL'
  | 'DOCUMENT'
  | 'GENERAL';

export type FollowupStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type OpportunityStage =
  | 'LEAD'
  | 'CONTACTED'
  | 'MEETING'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'BROWSER';

export type NotificationType =
  | 'MEETING_REMINDER'
  | 'FOLLOWUP_REMINDER'
  | 'TASK_REMINDER'
  | 'OVERDUE_ALERT'
  | 'SYSTEM';

export type ActivityType =
  | 'CLIENT_CREATED'
  | 'STATUS_CHANGED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_COMPLETED'
  | 'FOLLOWUP_CREATED'
  | 'FOLLOWUP_COMPLETED'
  | 'NOTE_ADDED'
  | 'TASK_CREATED'
  | 'OPPORTUNITY_STAGE_CHANGED'
  | 'EMAIL_SENT'
  | 'NOTIFICATION_SENT';

// Interfaces
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  whatsapp?: string | null;
  avatar?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICompany {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  size?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  contacts?: IContact[];
  clients?: IClient[];
}

export interface IContact {
  id: string;
  companyId: string;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  preferredMethod?: string | null;
  notes?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  company?: ICompany;
}

export interface IClient {
  id: string;
  customClientId: string;
  companyId: string;
  primaryContactId?: string | null;
  relationshipStatus: RelationshipStatus;
  clientType: string;
  priority: Priority;
  leadSource?: string | null;
  assignedUserId?: string | null;
  notes?: string | null;
  lastContactDate?: string | null;
  nextMeetingDate?: string | null;
  nextFollowupDate?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: ICompany;
  primaryContact?: IContact | null;
  assignedUser?: IUser | null;
  meetings?: IMeeting[];
  followups?: IFollowup[];
  tasks?: ITask[];
  opportunities?: IOpportunity[];
  activities?: IActivity[];
}

export interface IMeeting {
  id: string;
  clientId: string;
  title: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string | null;
  meetingLink?: string | null;
  agenda?: string | null;
  notes?: string | null;
  outcome?: MeetingOutcome | null;
  nextAction?: string | null;
  nextMeetingDate?: string | null;
  nextFollowupDate?: string | null;
  assignedUserId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: IClient;
  assignedUser?: IUser | null;
  createdByUser?: IUser | null;
  participants?: IMeetingParticipant[];
}

export interface IMeetingParticipant {
  id: string;
  meetingId: string;
  contactId?: string | null;
  userId?: string | null;
  name: string;
  email?: string | null;
  role?: string | null;
}

export interface IFollowup {
  id: string;
  clientId: string;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  followupType: FollowupType;
  priority: Priority;
  status: FollowupStatus;
  dueDate: string;
  dueTime?: string | null;
  reminderDate?: string | null;
  reminderChannel: string;
  assignedUserId?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: IClient;
  assignedUser?: IUser | null;
}

export interface ITask {
  id: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: Priority;
  status: TaskStatus;
  assignedUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: IClient | null;
  assignedUser?: IUser | null;
}

export interface IOpportunity {
  id: string;
  clientId: string;
  title: string;
  stage: OpportunityStage;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  assignedUserId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: IClient;
  assignedUser?: IUser | null;
}

export interface IActivity {
  id: string;
  clientId?: string | null;
  userId?: string | null;
  type: ActivityType;
  title: string;
  description?: string | null;
  metadataJson?: string | null;
  createdAt: string;
  client?: IClient | null;
  user?: IUser | null;
}

export interface INotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  channelsJson?: string | null;
  read: boolean;
  sentAt?: string | null;
  createdAt: string;
}

export interface INotificationPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  browserEnabled: boolean;
  inAppEnabled: boolean;
  meetingReminderLeadHours: number;
  followupReminderLeadHours: number;
}

export interface ISetting {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
}

export interface IDashboardMetrics {
  totalClients: number;
  activeClients: number;
  meetingsToday: number;
  meetingsTomorrow: number;
  overdueFollowups: number;
  followupsDueThisWeek: number;
  openOpportunities: number;
  completedMeetings: number;
  totalPipelineValue: number;
  winRate: number;
  upcomingMeetings: IMeeting[];
  todayFollowups: IFollowup[];
  overdueItems: {
    meetings: IMeeting[];
    followups: IFollowup[];
    tasks: ITask[];
  };
  recentActivities: IActivity[];
  chartData: {
    weeklyMeetings: { name: string; count: number; completed: number }[];
    pipelineDistribution: { stage: string; value: number; count: number }[];
    clientGrowth: { month: string; clients: number }[];
    followupCompletion: { name: string; completed: number; pending: number; overdue: number }[];
  };
}

export interface IPostMeetingWorkflowPayload {
  meetingId: string;
  outcome: MeetingOutcome;
  notes: string;
  nextAction?: string;
  nextFollowupDate?: string;
  nextFollowupTime?: string;
  nextFollowupType?: FollowupType;
  nextFollowupPriority?: Priority;
  nextMeetingDate?: string;
  nextMeetingStartTime?: string;
  nextMeetingEndTime?: string;
  nextMeetingType?: MeetingType;
  nextMeetingTitle?: string;
  assignedUserId?: string;
  createTask?: boolean;
}
