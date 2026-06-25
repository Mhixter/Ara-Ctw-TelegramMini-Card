import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  telegram: (data: { telegramId?: number; username?: string; firstName?: string; initData?: string }) =>
    api.post('/auth/telegram', data).then(r => r.data),
  adminLogin: (email: string, password: string) =>
    api.post('/auth/admin/login', { email, password }).then(r => r.data)
};

export const walletApi = {
  list: () => api.get('/wallet').then(r => r.data),
  transactions: () => api.get('/wallet/transactions').then(r => r.data),
  transaction: (id: string) => api.get(`/wallet/transactions/${id}`).then(r => r.data),
  fund: (amount: number, currency: string) => {
    const reference = `FUND-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return api.post('/wallet/fund', { amount, currency, reference }).then(r => r.data);
  }
};

export const kycApi = {
  status: () => api.get('/kyc/status').then(r => r.data),
  tier1: (data: { bvn: string; nin: string; fullName: string; dateOfBirth: string }) =>
    api.post('/kyc/tier1', data).then(r => r.data),
  tier2: (data: { documentUrl: string; livenessScore: number }) =>
    api.post('/kyc/tier2', data).then(r => r.data)
};

export const cardsApi = {
  list: () => api.get('/cards').then(r => r.data),
  issue: (currency?: string, brand?: string) =>
    api.post('/cards/issue', { currency, brand }).then(r => r.data),
  details: (cardId: string) =>
    api.get(`/cards/${cardId}/details`).then(r => r.data),
  updateStatus: (cardId: string, status: string) =>
    api.patch(`/cards/${cardId}/status`, { status }).then(r => r.data),
  updateLimits: (cardId: string, dailyLimit: number, monthlyLimit: number) =>
    api.patch(`/cards/${cardId}/limits`, { dailyLimit, monthlyLimit }).then(r => r.data),
  spend: (cardId: string, amount: number, merchant: string) =>
    api.post(`/cards/${cardId}/spend`, { amount, merchant }).then(r => r.data)
};

export const adminApi = {
  stats: () => api.get('/admin/stats').then(r => r.data),
  users: (params?: any) => api.get('/admin/users', { params }).then(r => r.data),
  userDetail: (id: string) => api.get(`/admin/users/${id}`).then(r => r.data),
  updateKyc: (userId: string, kycStatus: string) =>
    api.patch(`/admin/users/${userId}/kyc`, { kycStatus }).then(r => r.data),
  freezeCard: (cardId: string, status: string) =>
    api.patch(`/admin/cards/${cardId}/freeze`, { status }).then(r => r.data),
  ledger: (params?: any) => api.get('/admin/ledger', { params }).then(r => r.data),
  createAdmin: (data: { email: string; password: string; role: string }) =>
    api.post('/admin/admins', data).then(r => r.data)
};
