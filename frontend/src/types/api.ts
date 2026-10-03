export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
};

export type EmailStatus = 'scheduled' | 'sending' | 'sent' | 'failed';

export type EmailItem = {
  id: string;
  toEmail: string;
  subject: string;
  snippet: string;
  scheduledAt: string;
  status: EmailStatus;
  sentAt: string | null;
  error: string | null;
  starred: boolean;
  sender: { email: string };
};

export type EmailList = {
  items: EmailItem[];
  total: number;
  page: number;
  limit: number;
};

export type EmailDetail = {
  id: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  scheduledAt: string;
  status: EmailStatus;
  sentAt: string | null;
  error: string | null;
  starred: boolean;
  sender: { name: string; email: string };
};

export type Sender = {
  id: string;
  name: string;
  email: string;
};

export type ScheduleRequest = {
  subject: string;
  body: string;
  emails: string[];
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  senderId?: string;
};

export type ScheduleResult = {
  batchId: string;
  total: number;
  duplicatesRemoved: number;
  senders: number;
  hourlyLimit: number;
  firstSendAt: string;
  lastSendAt: string;
};

export type SlackStatus = {
  connected: boolean;
  channel?: string | null;
  teamName?: string | null;
};