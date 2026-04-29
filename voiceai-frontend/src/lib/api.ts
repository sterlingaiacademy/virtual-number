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

// Auto-logout on 401 and mock data for local dev
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('voiceai_token');
      localStorage.removeItem('voiceai_user');
      window.location.href = '/login';
    }

    // LOCAL UI PREVIEW MOCK DATA
    if (process.env.NODE_ENV === 'development') {
      const url = err.config.url || '';
      console.log('Mocking response for', url);
      
      // MOCK ADMIN DASHBOARD
      if (url.includes('/api/admin/stats/overview')) return Promise.resolve({ data: { total_clients: 42, total_numbers: 15, total_calls_today: 1250, revenue_this_month: 45000, pending_invoices: 3 } });
      if (url.includes('/api/admin/stats/calls-chart')) return Promise.resolve({ data: { data: [{date:'Mon', calls:120}, {date:'Tue', calls:450}, {date:'Wed', calls:300}, {date:'Thu', calls:500}, {date:'Fri', calls:480}, {date:'Sat', calls:200}, {date:'Sun', calls:150}] } });
      if (url.includes('/api/admin/stats/top-clients')) return Promise.resolve({ data: { clients: [{business_name: 'TechCorp India', total_calls: 5400, revenue: 12000}, {business_name: 'Metro Hospitals', total_calls: 3200, revenue: 8500}] } });
      
      // MOCK ADMIN LISTS
      if (url.includes('/api/admin/clients')) return Promise.resolve({ data: { clients: [{id:'1', business_name:'TechCorp', email:'admin@techcorp.in', plan_name:'Pro', status:'active', created_at: new Date().toISOString()}], total: 1 } });
      if (url.includes('/api/admin/numbers')) return Promise.resolve({ data: { numbers: [{id:'1', phone_number:'+919876543210', status:'active', sip_trunk_name:'Twilio India', business_name:'TechCorp'}], total: 1 } });
      if (url.includes('/api/admin/calls')) return Promise.resolve({ data: { calls: [{id:'1', caller_number:'+919999999999', business_name:'TechCorp', duration_seconds:145, status:'completed', started_at: new Date().toISOString()}], total: 1 } });
      if (url.includes('/api/admin/billing')) return Promise.resolve({ data: { invoices: [], total: 0 } });
      if (url.includes('/api/admin/settings')) return Promise.resolve({ data: { plans: [{id:'plan_1', name:'Starter', monthly_fee: 1000, per_minute_rate: 2}, {id:'plan_2', name:'Pro', monthly_fee: 5000, per_minute_rate: 1.5}] } });
      
      // MOCK CLIENT DASHBOARD
      if (url.includes('/api/client/stats/overview')) return Promise.resolve({ data: { calls_this_month: 520, total_seconds_this_month: 35000, phone_number: '+919876543210', plan_name: 'Pro' } });
      if (url.includes('/api/client/stats/calls-chart')) return Promise.resolve({ data: { data: [{date:'Mon', calls:50}, {date:'Tue', calls:120}, {date:'Wed', calls:90}] } });
      if (url.includes('/api/client/calls')) return Promise.resolve({ data: { calls: [{id:'1', caller_number:'+919999999999', duration_seconds:145, status:'completed', started_at: new Date().toISOString()}], total: 1 } });
      if (url.includes('/api/client/agent')) return Promise.resolve({ data: { name:'Support AI', voice_id:'', system_prompt:'You are a helpful assistant.', first_message:'Hello!', language:'en', available_voices: [{voice_id:'123', name:'Priya (Indian English)'}] } });
      if (url.includes('/api/client/knowledge')) return Promise.resolve({ data: { documents: [] } });
      if (url.includes('/api/client/billing')) return Promise.resolve({ data: { plan: {name:'Pro', monthly_fee: 5000, per_minute_rate: 1.5}, pending_amount: 0, invoices: [] } });

      return Promise.resolve({ data: {} });
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
