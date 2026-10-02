import type { EmailList, ScheduleRequest, ScheduleResult } from '../types/api';
import { api, BASE_URL } from './client';

export const listScheduled = (page: number, limit: number) =>
  api<EmailList>(`/api/emails/scheduled?page=${page}&limit=${limit}`);

export const listSent = (page: number, limit: number) =>
  api<EmailList>(`/api/emails/sent?page=${page}&limit=${limit}`);

export const searchEmails = (q: string, page: number, limit: number) =>
  api<EmailList>(`/api/emails/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);

export const scheduleEmails = (input: ScheduleRequest) =>
  api<ScheduleResult>('/api/schedule', { method: 'POST', body: input });

// a normal page visit, so the browser carries the login cookie
export const queueBoardUrl = `${BASE_URL}/admin/queues`;