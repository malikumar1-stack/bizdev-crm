export type UserRole = 'ADMIN' | 'MANAGER' | 'BD_EXECUTIVE' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type RelationshipStatus = 'LEAD' | 'CONTACTED' | 'MEETING_SCHEDULED' | 'MEETING_COMPLETED' | 'FOLLOWUP_REQUIRED' | 'NEGOTIATION' | 'ACTIVE_CLIENT' | 'DORMANT' | 'LOST';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MeetingType = 'PHYSICAL' | 'ONLINE' | 'PHONE' | 'VIDEO_CONFERENCE' | 'INTERNAL' | 'OTHER';
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
export type MeetingOutcome = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'PROPOSAL_REQUESTED' | 'FURTHER_DISCUSSION_REQUIRED' | 'CLOSED';
export type FollowupType = 'CALL' | 'EMAIL' | 'MEETING' | 'PROPOSAL' | 'DOCUMENT' | 'GENERAL';
export type FollowupStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type OpportunityStage = 'LEAD' | 'CONTACTED' | 'MEETING' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  whatsapp?: string | null;
  whatsappNumber?: string | null;
  countryCode?: string | null;
  notificationEmail?: string | null;
  status: UserStatus;
  active: boolean;
  forcePasswordChange?: boolean;
  lastLoginAt?: string | null;
  avatar?: string | null;
  createdAt: string;
  preferences?: INotificationPreference;
  _count?: {
    assignedClients: number;
    assignedMeetings: number;
    assignedFollowups: number;
    assignedTasks?: number;
  };
}

export interface INotificationPreference {
  id?: string;
  userId?: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  browserEnabled: boolean;
  inAppEnabled: boolean;
  meetingReminders: boolean;
  followupReminders: boolean;
  taskReminders: boolean;
  meetingReminderLeadHours?: number;
  followupReminderLeadHours?: number;
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
  contacts?: IContact[];
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
  isArchived?: boolean;
}

export interface IClient {
  id: string;
  customClientId: string;
  companyId: string;
  company: ICompany;
  primaryContactId?: string | null;
  primaryContact?: IContact | null;
  relationshipStatus: RelationshipStatus;
  clientType: string;
  priority: Priority;
  leadSource?: string | null;
  assignedUserId?: string | null;
  assignedUser?: IUser | null;
  notes?: string | null;
  lastContactDate?: string | null;
  nextMeetingDate?: string | null;
  nextFollowupDate?: string | null;
  isArchived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  meetings?: IMeeting[];
  followups?: IFollowup[];
  tasks?: ITask[];
  opportunities?: IOpportunity[];
  activities?: IActivity[];
  healthAnalysis?: {
    score: number;
    health: string;
    rationale: string;
    nextAction: string;
  };
  _count?: {
    meetings: number;
    followups: number;
    tasks: number;
    opportunities: number;
  };
}

export interface IMeeting {
  id: string;
  clientId: string;
  client?: IClient;
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
  assignedUser?: IUser | null;
  reminded24h: boolean;
  reminded1h: boolean;
  participants?: any[];
  reminders?: IMeetingReminder[];
}

export interface IMeetingReminder {
  id: string;
  meetingId: string;
  reminderType: '24H' | '1H' | string;
  channel: 'WHATSAPP' | 'EMAIL' | string;
  recipientType: 'ASSIGNED_USER' | 'CLIENT_CONTACT';
  recipientName?: string | null;
  recipientContact: string;
  scheduledTime: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attemptsCount: number;
  attemptedAt?: string | null;
  providerMessageId?: string | null;
  providerResponse?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  meeting?: IMeeting;
}

export interface ISystemDiagnostics {
  system: {
    name: string;
    environment: string;
    timezone: string;
    serverTimeUtc: string;
    serverTimePkt: string;
  };
  scheduler: {
    isRunning: boolean;
    status: 'RUNNING' | 'STOPPED';
    lastRunAt?: string | null;
    lastSuccessAt?: string | null;
    lastFailureAt?: string | null;
  };
  whatsapp: {
    configured: boolean;
    status: 'CONNECTED' | 'NOT_CONFIGURED';
    apiUrl: string;
    phoneNumberId?: string | null;
    hasApiKey: boolean;
    templateName?: string | null;
    missingFields: string[];
  };
  email: {
    configured: boolean;
    status: 'CONNECTED' | 'NOT_CONFIGURED';
    transport: string;
  };
  metrics: {
    pendingRemindersCount: number;
    sentTodayCount: number;
    failedTodayCount: number;
    totalRemindersCount: number;
    lastSuccessfulWhatsApp?: string | null;
    lastFailedWhatsApp?: string | null;
    lastFailedReason?: string | null;
  };
}

export interface IFollowup {
  id: string;
  clientId: string;
  client?: IClient;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  followupType: FollowupType;
  priority: Priority;
  status: FollowupStatus;
  dueDate: string;
  dueTime?: string | null;
  assignedUserId?: string | null;
  assignedUser?: IUser | null;
  completedAt?: string | null;
}

export interface ITask {
  id: string;
  clientId?: string | null;
  client?: IClient | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: Priority;
  status: TaskStatus;
  assignedUserId?: string | null;
  assignedUser?: IUser | null;
}

export interface IOpportunity {
  id: string;
  clientId: string;
  client?: IClient;
  title: string;
  stage: OpportunityStage;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  assignedUserId?: string | null;
  assignedUser?: IUser | null;
  notes?: string | null;
}

export interface IActivity {
  id: string;
  clientId?: string | null;
  userId?: string | null;
  user?: IUser | null;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
}

export interface INotificationLog {
  id: string;
  userId?: string | null;
  user?: IUser | null;
  recipientName?: string | null;
  recipientContact: string;
  channel: string;
  type: string;
  title: string;
  message: string;
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  error?: string | null;
  metadataJson?: string | null;
  sentAt: string;
}

export interface IDashboardMetrics {
  totalClients: number;
  activeClients: number;
  meetingsToday: number;
  meetingsTomorrow: number;
  overdueFollowups: number;
  followupsDueThisWeek: number;
  openOpportunities: number;
  totalPipelineValue: number;
  winRate: number;
  upcomingMeetings: IMeeting[];
  todayFollowups: IFollowup[];
  overdueItems: {
    meetings: IMeeting[];
    followups: IFollowup[];
    tasks: ITask[];
  };
  chartData: {
    weeklyMeetings: { name: string; count: number; completed: number }[];
    pipelineDistribution: { stage: string; value: number; count: number }[];
    clientGrowth: { month: string; clients: number }[];
    followupCompletion: { name: string; completed: number; pending: number; overdue: number }[];
  };
}

export interface INotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  channelsJson?: string | null;
  read: boolean;
  createdAt: string;
}
