import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  withCredentials: false,
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('portal_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.patch('/auth/profile', data),
  updatePassword: (data: any) => api.patch('/auth/profile/password', data),
};

// ─── Notifications ───
export const notificationsApi = {
  list: () => api.get('/auth/notifications'),
  markRead: (id: string) => api.post(`/auth/notifications/${id}/read`),
  markAllRead: () => api.post('/auth/notifications/read-all'),
};


// ─── Admin ───
export const adminApi = {
  healthDeep: () => api.get('/admin/health/deep'),
  
  // Clients
  getClients: () => api.get('/admin/clients'),
  createClient: (data: any) => api.post('/admin/clients', data),
  updateClient: (id: number, data: any) => api.patch(`/admin/clients/${id}`, data),
  deleteClient: (id: number) => api.delete(`/admin/clients/${id}`),

  // Audit Logs
  getAuditLogs: (page = 1) => api.get(`/admin/audit-logs?page=${page}`),
};

// ─── Dashboard ───
export const dashboardApi = {
  get: () => api.get('/client/dashboard'),
};

// ─── Projects ───
export const projectsApi = {
  list: () => api.get('/client/projects'),
  create: (data: any) => api.post('/client/projects', data),
  get: (id: number) => api.get(`/client/projects/${id}`),
  update: (id: number, data: any) => api.patch(`/client/projects/${id}`, data),
  delete: (id: number) => api.delete(`/client/projects/${id}`),
  deploy: (id: number) => api.post(`/client/projects/${id}/deploy`),
  deployments: (id: number, page = 1) => api.get(`/client/projects/${id}/deployments`, { params: { page } }),
  logs: (id: number) => api.get(`/client/projects/${id}/logs`),
  env: {
    list: (id: number) => api.get(`/client/projects/${id}/env`),
    create: (projectId: number, data: any) => api.post(`/client/projects/${projectId}/env`, data),
    update: (projectId: number, envId: number, data: any) => api.patch(`/client/projects/${projectId}/env/${envId}`, data),
    delete: (projectId: number, envId: number) => api.delete(`/client/projects/${projectId}/env/${envId}`),
  },
  domains: {
    list: (projectId: number) => api.get(`/client/projects/${projectId}/domains`),
    create: (projectId: number, data: any) => api.post(`/client/projects/${projectId}/domains`, data),
    delete: (projectId: number, domainId: number) => api.delete(`/client/projects/${projectId}/domains/${domainId}`),
  },
};

// ─── Tickets ───
export const ticketsApi = {
  list: () => api.get('/client/tickets'),
  get: (id: number) => api.get(`/client/tickets/${id}`),
  create: (data: { subject: string; message: string; project_id?: number; priority?: string }) =>
    api.post('/client/tickets', data),
  reply: (id: number, message: string) => api.post(`/client/tickets/${id}/reply`, { message }),
};

export default api;
