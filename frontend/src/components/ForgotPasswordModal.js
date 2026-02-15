import React, { useState } from 'react';
import { X, Mail, CheckCircle, AlertCircle, Loader2, Send } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {success ? 'Check Your Email' : 'Forgot Password'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Success State */}
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Reset Link Sent!
              </h3>
              <p className="text-slate-600 text-sm mb-2">
                We've sent a password reset link to:
              </p>
              <p className="text-slate-900 font-medium mb-4">{email}</p>
              <p className="text-slate-500 text-sm mb-6">
                Please check your inbox and follow the instructions to reset your password.
                The link will expire in 1 hour.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                <p className="text-amber-800 text-sm">
                  <strong>Didn't receive the email?</strong>
                </p>
                <ul className="text-amber-700 text-xs mt-1 list-disc list-inside">
                  <li>Check your spam/junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            /* Email Form */
            <form onSubmit={handleSubmit}>
              <p className="text-slate-600 text-sm mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
