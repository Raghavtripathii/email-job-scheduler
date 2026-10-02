import type { User } from '../types/api';
import { api, BASE_URL } from './client';

export const loginUrl = `${BASE_URL}/api/auth/google`;

export const getMe = () => api<User>('/api/auth/me');

export const logout = () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });