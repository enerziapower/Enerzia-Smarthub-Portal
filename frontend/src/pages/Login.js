import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react';
import { settingsAPI, authAPI } from '../services/api';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgSettings, setOrgSettings] = useState({ name: '', logo_url: null });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    loadOrgSettings();
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const res = await authAPI.check();
      setNeedsSetup(res.data.needs_setup);
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setCheckingSetup(false);
    }
  };

  const loadOrgSettings = async () => {
    try {
      const res = await settingsAPI.getOrganization();
      setOrgSettings(res.data);
    } catch (error) {
      console.error('Error loading org settings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (needsSetup) {
        // Registration mode
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await register(email, name, password);
      } else {
        // Login mode
        await login(email, password);
      }
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.detail || (needsSetup ? 'Registration failed.' : 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = orgSettings.logo_url 
    ? `${process.env.REACT_APP_BACKEND_URL}/api${orgSettings.logo_url}` 
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Logo/Header */}
            <div className="text-center mb-8">
              {logoUrl ? (
                <img 
                  src={logoUrl}
                  alt={orgSettings.name || 'Company Logo'}
                  className="h-20 w-auto mx-auto mb-4 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/logo.png';
                  }}
                />
              ) : (
                <img 
                  src="/logo.png"
                  alt="Smarthub Enerzia Logo"
                  className="h-20 w-auto mx-auto mb-4 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <h1 className="text-2xl font-bold text-slate-900">
                Smarthub Enerzia
              </h1>
              <p className="text-slate-500 mt-2">
                {needsSetup ? 'Create your admin account to get started' : 'Sign in to your workspace'}
              </p>
            </div>

            {/* First-time Setup Info */}
            {needsSetup && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                <p className="text-sm">
                  <strong>First-time setup:</strong> This account will be the administrator with full access to manage users and settings.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name field - only for registration */}
              {needsSetup && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  {!needsSetup && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password - only for registration */}
              {needsSetup && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || checkingSetup}
                className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || checkingSetup ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : needsSetup ? (
                  <>
                    <UserPlus size={18} />
                    Create Admin Account
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Contact your administrator if you need access
          </p>
        </div>
      </div>

      {/* Copyright Footer */}
      <footer className="py-4 text-center">
        <p className="text-sm text-slate-500">
          COPYRIGHT © 2026 Smarthub Enerzia, All rights Reserved
        </p>
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default Login;
