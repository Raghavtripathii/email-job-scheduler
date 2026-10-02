import type { EmailList, ScheduleRequest, ScheduleResult } from '../types/api';
import { api } from './client';

export const listScheduled = (page: number, limit: number) =>
  api<EmailList>(`/api/emails/scheduled?page=${page}&limit=${limit}`);

export const listSent = (page: number, limit: number) =>
  api<EmailList>(`/api/emails/sent?page=${page}&limit=${limit}`);

export const scheduleEmails = (input: ScheduleRequest) =>
  api<ScheduleResult>('/api/schedule', { method: 'POST', body: input });