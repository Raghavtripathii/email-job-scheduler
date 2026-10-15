import type {
  EmailDetail,
  EmailList,
  EmailStatus,
  ScheduleRequest,
  ScheduleResult,
  Sender,
} from '../types/api';
import { api, BASE_URL } from './client';

// builds ?a=1&b=2 and leaves out empty values
function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

export const listScheduled = (page: number, limit: number, status?: EmailStatus) =>
  api<EmailList>(`/api/emails/scheduled?${query({ page, limit, status })}`);

export const listSent = (page: number, limit: number, status?: EmailStatus) =>
  api<EmailList>(`/api/emails/sent?${query({ page, limit, status })}`);

export const searchEmails = (q: string, page: number, limit: number, status?: EmailStatus) =>
  api<EmailList>(`/api/emails/search?${query({ q, page, limit, status })}`);

export const getEmail = (id: string) => api<EmailDetail>(`/api/emails/${id}`);

export const setStar = (id: string, starred: boolean) =>
  api<{ starred: boolean }>(`/api/emails/${id}/star`, { method: 'PATCH', body: { starred } });

export const listSenders = () => api<Sender[]>('/api/senders');

export const scheduleEmails = (input: ScheduleRequest) =>
  api<ScheduleResult>('/api/schedule', { method: 'POST', body: input });

// a normal page visit, so the browser carries the login cookie
export const queueBoardUrl = `${BASE_URL}/admin/queues`;
