import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('voiceai_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('voiceai_token');
      localStorage.removeItem('voiceai_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  logout: () => api.post('/api/auth/logout'),
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/api/auth/reset-password', { token, password }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  // Stats
  getOverview: () => api.get('/api/admin/stats/overview'),
  getCallsChart: (period: string) => api.get(`/api/admin/stats/calls-chart?period=${period}`),
  getRevenueChart: (period: string) => api.get(`/api/admin/stats/revenue-chart?period=${period}`),
  getTopClients: () => api.get('/api/admin/stats/top-clients'),
  getSystemHealth: () => api.get('/api/admin/stats/system-health'),

  // Clients
  getClients: (params?: Record<string, any>) => api.get('/api/admin/clients', { params }),
  getClient: (id: string) => api.get(`/api/admin/clients/${id}`),
  createClient: (data: any) => api.post('/api/admin/clients', data),
  updateClient: (id: string, data: any) => api.patch(`/api/admin/clients/${id}`, data),
  deleteClient: (id: string) => api.delete(`/api/admin/clients/${id}`),
  suspendClient: (id: string) => api.post(`/api/admin/clients/${id}/suspend`),
  activateClient: (id: string) => api.post(`/api/admin/clients/${id}/activate`),

  // Numbers
  getNumbers: (params?: Record<string, any>) => api.get('/api/admin/numbers', { params }),
  addNumber: (data: any) => api.post('/api/admin/numbers', data),
  assignNumber: (id: string, clientId: string) =>
    api.post(`/api/admin/numbers/${id}/assign`, { client_id: clientId }),
  unassignNumber: (id: string) => api.post(`/api/admin/numbers/${id}/unassign`),
  deleteNumber: (id: string) => api.delete(`/api/admin/numbers/${id}`),

  // Calls
  getCalls: (params?: Record<string, any>) => api.get('/api/admin/calls', { params }),
  getCallTranscript: (id: string) => api.get(`/api/admin/calls/${id}/transcript`),
  getCallRecording: (id: string) => api.get(`/api/admin/calls/${id}/recording`),

  // Billing
  getBillingList: (params?: Record<string, any>) => api.get('/api/admin/billing', { params }),
  generateInvoice: (clientId: string) => api.post('/api/admin/billing/generate', { client_id: clientId }),
  markInvoicePaid: (id: string) => api.post(`/api/admin/billing/${id}/mark-paid`),
  sendReminder: (id: string) => api.post(`/api/admin/billing/${id}/remind`),

  // SIP Trunks
  getSipTrunks: () => api.get('/api/admin/sip-trunks'),
  createSipTrunk: (data: any) => api.post('/api/admin/sip-trunks', data),
  deleteSipTrunk: (id: string) => api.delete(`/api/admin/sip-trunks/${id}`),

  // Settings
  getSettings: () => api.get('/api/admin/settings'),
  updatePlan: (id: string, data: any) => api.patch(`/api/admin/settings/plans/${id}`, data),
};

// ─── Client ───────────────────────────────────────────────────────────────────
export const clientApi = {
  getOverview: () => api.get('/api/client/stats/overview'),
  getCallsChart: (period: string) => api.get(`/api/client/stats/calls-chart?period=${period}`),

  getCalls: (params?: Record<string, any>) => api.get('/api/client/calls', { params }),
  getCallTranscript: (id: string) => api.get(`/api/client/calls/${id}/transcript`),
  getCallRecording: (id: string) => api.get(`/api/client/calls/${id}/recording`),

  getAgent: () => api.get('/api/client/agent'),
  updateAgent: (data: any) => api.patch('/api/client/agent', data),

  getKnowledge: () => api.get('/api/client/knowledge'),
  uploadKnowledge: (formData: FormData) =>
    api.post('/api/client/knowledge', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteKnowledge: (id: string) => api.delete(`/api/client/knowledge/${id}`),

  getBilling: () => api.get('/api/client/billing'),
  getInvoice: (id: string) => api.get(`/api/client/billing/${id}`),
};
