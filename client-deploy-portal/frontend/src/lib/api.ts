import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  withCredentials: true,
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
};

// ─── Dashboard ───
export const dashboardApi = {
  get: () => api.get('/client/dashboard'),
};

// ─── Projects ───
export const projectsApi = {
  list: () => api.get('/client/projects'),
  get: (id: number) => api.get(`/client/projects/${id}`),
  deploy: (id: number) => api.post(`/client/projects/${id}/deploy`),
  deployments: (id: number, page = 1) => api.get(`/client/projects/${id}/deployments`, { params: { page } }),
  logs: (id: number) => api.get(`/client/projects/${id}/logs`),
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
