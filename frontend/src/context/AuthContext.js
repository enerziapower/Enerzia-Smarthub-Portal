import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'sonner';

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

// Helper to get time until token expiry in minutes
const getMinutesUntilExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    const now = Date.now();
    return Math.max(0, Math.floor((expiryTime - now) / 60000));
  } catch {
    return 0;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const warningShownRef = useRef(false);
  const refreshInProgressRef = useRef(false);

  // Refresh the access token using refresh token
  const refreshAccessToken = useCallback(async () => {
    if (refreshInProgressRef.current) return false;
    
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;
    
    refreshInProgressRef.current = true;
    
    try {
      const res = await authAPI.refreshToken({ refresh_token: refreshToken });
      localStorage.setItem('token', res.data.token);
      warningShownRef.current = false;
      setSessionWarning(false);
      console.log('Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear all tokens on refresh failure
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      return false;
    } finally {
      refreshInProgressRef.current = false;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // First check if token is expired locally
        if (isTokenExpired(token)) {
          console.log('Token expired, attempting refresh...');
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            setUser(null);
            return;
          }
        }
        
        try {
          const meRes = await authAPI.me();
          setUser(meRes.data);
        } catch (error) {
          // Try to refresh token if unauthorized
          if (error.response?.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              const meRes = await authAPI.me();
              setUser(meRes.data);
            } else {
              setUser(null);
            }
          } else {
            console.log('Token validation failed, clearing session');
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            setUser(null);
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    checkAuth();
    
    // Set up periodic token check every minute
    const tokenCheckInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const minutesLeft = getMinutesUntilExpiry(token);
        
        // Show warning when 5 minutes left
        if (minutesLeft <= 5 && minutesLeft > 0 && !warningShownRef.current) {
          warningShownRef.current = true;
          setSessionWarning(true);
          toast.warning(`Session expires in ${minutesLeft} minutes`, {
            description: 'Click here to extend your session',
            duration: 30000,
            action: {
              label: 'Extend',
              onClick: () => refreshAccessToken()
            }
          });
        }
        
        // Auto-refresh when token is about to expire
        if (isTokenExpired(token)) {
          console.log('Token expiring, auto-refreshing...');
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            toast.error('Session expired', {
              description: 'Please log in again to continue'
            });
            setUser(null);
          }
        }
      }
    }, 60 * 1000); // Check every minute

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
  }, [checkAuth, refreshAccessToken]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('token', res.data.token);
    // Store refresh token if provided
    if (res.data.refresh_token) {
      localStorage.setItem('refresh_token', res.data.refresh_token);
    }
    warningShownRef.current = false;
    setSessionWarning(false);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, name, password) => {
    const res = await authAPI.register({ email, name, password });
    localStorage.setItem('token', res.data.token);
    if (res.data.refresh_token) {
      localStorage.setItem('refresh_token', res.data.refresh_token);
    }
    setUser(res.data.user);
    setNeedsSetup(false);
    return res.data;
  };

  const logout = async () => {
    try {
      // Call backend logout to invalidate refresh tokens
      await authAPI.logout();
    } catch (error) {
      console.log('Logout API call failed, clearing local state');
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setSessionWarning(false);
    warningShownRef.current = false;
  };

  // Manually extend session
  const extendSession = async () => {
    const success = await refreshAccessToken();
    if (success) {
      toast.success('Session extended successfully');
    }
    return success;
  };

  // Check if user has access to a specific module
  const hasModuleAccess = (moduleId) => {
    if (!user) return false;
    // Super admin always has access
    if (user.role === 'super_admin') return true;
    // Check user's permissions
    return user.permissions?.modules?.[moduleId] === true;
  };

  // Check if user has access to a specific sub-module
  const hasSubModuleAccess = (subModuleId) => {
    if (!user) return false;
    // Super admin always has access
    if (user.role === 'super_admin') return true;
    // Check user's permissions
    return user.permissions?.sub_modules?.[subModuleId] === true;
  };

  // Check if user has any access in the system (for basic navigation)
  const hasAnyAccess = () => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const modules = user.permissions?.modules || {};
    return Object.values(modules).some(v => v === true);
  };

  const value = {
    user,
    loading,
    needsSetup,
    sessionWarning,
    login,
    register,
    logout,
    extendSession,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    userDepartment: user?.department,
    canViewDepartments: user?.can_view_departments || [],
    refreshAuth: checkAuth,
    hasModuleAccess,
    hasSubModuleAccess,
    hasAnyAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
