import type { SlackStatus } from '../types/api';
import { api, BASE_URL } from './client';

// a normal page visit, so the browser carries the login cookie
export const slackConnectUrl = `${BASE_URL}/api/slack/connect`;

export const getSlackStatus = () => api<SlackStatus>('/api/slack/status');

export const disconnectSlack = () => api<{ ok: boolean }>('/api/slack/disconnect', { method: 'DELETE' });
