// ============================================================================
// USEAUTH HOOK - AUTHENTICATION STATE MANAGEMENT
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Check if user has a specific role
  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.portal_role);
    }
    return user.portal_role === role;
  }, [user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
  };
};