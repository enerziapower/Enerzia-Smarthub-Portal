import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper to check if token is expired (decode JWT without verification)
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if token expires within 5 minutes (give buffer)
    return payload.exp * 1000 < Date.now() + 5 * 60 * 1000;
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      // Skip setup check - always go to login page
      // For fresh deployments, admin user should be created via API or seed
      const token = localStorage.getItem('token');
      if (token) {
        // First check if token is expired locally
        if (isTokenExpired(token)) {
          console.log('Token expired, clearing session');
          localStorage.removeItem('token');
          setUser(null);
          return;
        }
        
        try {
          const meRes = await authAPI.me();
          setUser(meRes.data);
        } catch (error) {
          // Token invalid, clear it
          console.log('Token validation failed, clearing session');
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Set up periodic token check every 5 minutes
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        console.log('Token expired during session, logging out');
        localStorage.removeItem('token');
        setUser(null);
      }
    }, 5 * 60 * 1000);

    // Listen for storage changes (logout from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(tokenCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, name, password) => {
    const res = await authAPI.register({ email, name, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setNeedsSetup(false);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    needsSetup,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    userDepartment: user?.department,
    canViewDepartments: user?.can_view_departments || [],
    refreshAuth: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
