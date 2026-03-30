import axios from 'axios';

// ============================================================================
// STANDALONE CLIENT API - No Base44 Dependency
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle errors
apiClient.interceptors.response.use(
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
// AUTH API
// ============================================================================
export const auth = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { token, user };
  },

  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  me: async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) throw new Error('Not authenticated');
    return JSON.parse(userStr);
  },

  isAuthenticated: async () => {
    return !!localStorage.getItem('token');
  },

  updateMe: async (data) => {
    const response = await apiClient.put('/auth/me', data);
    const updatedUser = response.data.data;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  },

  redirectToLogin: (nextUrl) => {
    window.location.href = `/login?next=${nextUrl || window.location.pathname}`;
  },
};

// ============================================================================
// ENTITIES API
// ============================================================================
export const entities = {
  /**
   * Create entity class with CRUD operations
   * Usage: base44.entities.Claim.list()
   */
  createEntity: (entityName) => ({
    list: async (sort = '-created_date', limit = 50, offset = 0) => {
      const response = await apiClient.get(`/entities/${entityName}`, {
        params: { sort, limit, offset },
      });
      return response.data.data || [];
    },

    filter: async (query = {}, sort = '-created_date', limit = 50) => {
      const response = await apiClient.post(`/entities/${entityName}/filter`, {
        query,
        sort,
        limit,
      });
      return response.data.data || [];
    },

    get: async (id) => {
      const response = await apiClient.get(`/entities/${entityName}/${id}`);
      return response.data.data;
    },

    create: async (data) => {
      const response = await apiClient.post(`/entities/${entityName}`, data);
      return response.data.data;
    },

    bulkCreate: async (dataArray) => {
      const response = await apiClient.post(
        `/entities/${entityName}/bulk`,
        { data: dataArray }
      );
      return response.data.data || [];
    },

    update: async (id, data) => {
      const response = await apiClient.put(
        `/entities/${entityName}/${id}`,
        data
      );
      return response.data.data;
    },

    delete: async (id) => {
      await apiClient.delete(`/entities/${entityName}/${id}`);
      return true;
    },

    schema: async () => {
      const response = await apiClient.get(`/entities/${entityName}/schema`);
      return response.data.data;
    },

    subscribe: (callback) => {
      // Placeholder for real-time subscriptions
      // In production, use WebSockets
      console.warn('subscribe() not yet implemented for standalone API');
      return () => {};
    },
  }),
};

// Proxy handler for dynamic entity access
// Allows: base44.entities.Claim.list()
const entitiesProxy = new Proxy(entities.createEntity(''), {
  get(target, prop) {
    if (prop === 'createEntity') return target.createEntity;
    return entities.createEntity(prop);
  },
});

// ============================================================================
// FUNCTIONS API
// ============================================================================
export const functions = {
  invoke: async (functionName, params = {}) => {
    const response = await apiClient.post(`/functions/${functionName}`, params);
    return response.data;
  },
};

// ============================================================================
// INTEGRATIONS API
// ============================================================================
export const integrations = {
  Core: {
    InvokeLLM: async (payload) => {
      const response = await apiClient.post('/integrations/invoke-llm', payload);
      return response.data.data;
    },

    SendEmail: async (payload) => {
      const response = await apiClient.post('/integrations/send-email', payload);
      return response.data.data;
    },

    UploadFile: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/integrations/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },

    GenerateImage: async (payload) => {
      const response = await apiClient.post('/integrations/generate-image', payload);
      return response.data.data;
    },

    ExtractDataFromUploadedFile: async (payload) => {
      const response = await apiClient.post('/integrations/extract-file-data', payload);
      return response.data.data;
    },

    CreateFileSignedUrl: async (payload) => {
      const response = await apiClient.post('/integrations/create-signed-url', payload);
      return response.data.data;
    },

    UploadPrivateFile: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/integrations/upload-private-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
  },
};

// ============================================================================
// ANALYTICS API
// ============================================================================
export const analytics = {
  track: async (payload) => {
    try {
      await apiClient.post('/analytics/track', payload);
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  },
};

// ============================================================================
// CONNECTORS API
// ============================================================================
export const connectors = {
  connectAppUser: async (connectorId) => {
    const response = await apiClient.post(`/connectors/${connectorId}/connect`);
    return response.data.data?.url;
  },

  disconnectAppUser: async (connectorId) => {
    await apiClient.post(`/connectors/${connectorId}/disconnect`);
  },

  getConnection: async (integrationType) => {
    const response = await apiClient.get(`/connectors/${integrationType}`);
    return response.data.data;
  },
};

// ============================================================================
// USERS API
// ============================================================================
export const users = {
  inviteUser: async (email, role) => {
    const response = await apiClient.post('/users/invite', { email, role });
    return response.data.data;
  },

  list: async (limit = 50, offset = 0) => {
    const response = await apiClient.get('/users', { params: { limit, offset } });
    return response.data.data || [];
  },

  get: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data.data;
  },
};

// ============================================================================
// OCR API - Local OCR Service
// ============================================================================
export const ocr = {
  /**
   * Extract text from image/PDF using local OCR
   * Supports: JPEG, PNG, WebP, PDF
   */
  extractText: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  /**
   * Batch extract text from multiple files
   */
  extractBatch: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await apiClient.post('/ocr/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  /**
   * Extract and validate Aadhaar number from document
   */
  validateAadhaar: async (text) => {
    const response = await apiClient.post('/ocr/validate-aadhaar', { text });
    return response.data.data;
  },

  /**
   * Extract and validate PAN number from document
   */
  validatePAN: async (text) => {
    const response = await apiClient.post('/ocr/validate-pan', { text });
    return response.data.data;
  },
};

// ============================================================================
// MAIN EXPORT - Mimics base44 client structure
// ============================================================================
export const base44 = {
  auth,
  entities: entitiesProxy,
  functions,
  integrations,
  analytics,
  connectors,
  users,
  ocr,
  asServiceRole: {
    entities: entitiesProxy,
    functions,
    connectors,
    integrations,
  },
};

export default base44;