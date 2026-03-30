// ============================================================================
// API SERVICE - AXIOS CONFIGURATION
// ============================================================================

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  verify: () => 
    api.get('/auth/verify'),
};

// ============================================================================
// CLAIMS ENDPOINTS
// ============================================================================

export const claimsAPI = {
  getAll: () => 
    api.get('/claims'),
  
  getById: (claimId) => 
    api.get(`/claims/${claimId}`),
  
  getByUser: (userId) => 
    api.get(`/claims/user/${userId}`),
  
  create: (claimData) => 
    api.post('/claims', claimData),
  
  updateStatus: (claimId, status, remarks = '') => 
    api.put(`/claims/${claimId}/status`, { status, remarks }),
  
  getCategories: () => 
    api.get('/claims/categories'),
};

// ============================================================================
// USERS ENDPOINTS
// ============================================================================

export const usersAPI = {
  getAll: () => 
    api.get('/users'),
  
  getMe: () => 
    api.get('/users/me'),
  
  getRoles: () => 
    api.get('/users/roles'),
  
  updateRole: (userId, portalRole, fullName) => 
    api.put(`/users/${userId}/role`, { portal_role: portalRole, full_name: fullName }),
};

// ============================================================================
// CONFIG ENDPOINTS
// ============================================================================

export const configAPI = {
  getAll: () => 
    api.get('/config'),
  
  update: (configKey, configValue) => 
    api.put('/config', { config_key: configKey, config_value: configValue }),
  
  getWorkflow: () => 
    api.get('/config/workflow'),
};

export default api;