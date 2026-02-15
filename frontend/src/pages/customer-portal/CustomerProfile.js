import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, ArrowLeft, Loader2, Save, Eye, EyeOff,
  Building2, Phone, Mail, MapPin, Hash, Calendar, Lock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }
    loadProfile(token);
  }, [navigate]);

  const loadProfile = async (token) => {
    try {
      const response = await fetch(`${API}/api/customer-portal/profile?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/customer-portal/login');
          return;
        }
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfile(data);
      setFormData({
        name: data.name || '',
        contact_number: data.contact_number || '',
        address: data.address || '',
        gst_number: data.gst_number || ''
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('customer_token');
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API}/api/customer-portal/profile?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setEditMode(false);
      loadProfile(token);
      
      // Update local storage
      const customerInfo = JSON.parse(localStorage.getItem('customer_info') || '{}');
      customerInfo.name = formData.name;
      localStorage.setItem('customer_info', JSON.stringify(customerInfo));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    const token = localStorage.getItem('customer_token');
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API}/api/customer-portal/profile/password?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to change password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully' });
      setShowPasswordForm(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            to="/customer-portal/dashboard"
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h1 className="text-white font-semibold">My Profile</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{profile?.name}</h2>
                <p className="text-slate-400">{profile?.company_name}</p>
              </div>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">GST Number</label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setFormData({
                      name: profile?.name || '',
                      contact_number: profile?.contact_number || '',
                      address: profile?.address || '',
                      gst_number: profile?.gst_number || ''
                    });
                  }}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-white">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <Phone className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Contact Number</p>
                  <p className="text-white">{profile?.contact_number || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <Building2 className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Company</p>
                  <p className="text-white">{profile?.company_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <Hash className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">GST Number</p>
                  <p className="text-white">{profile?.gst_number || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg md:col-span-2">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="text-white">{profile?.address || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Last Login</p>
                  <p className="text-white">{formatDate(profile?.last_login)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Member Since</p>
                  <p className="text-white">{formatDate(profile?.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Section */}
        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-400" />
              <h3 className="text-white font-medium">Change Password</h3>
            </div>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-sm text-emerald-400 hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {showPasswordForm && (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm text-slate-400 mb-1">Current Password</label>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <label className="block text-sm text-slate-400 mb-1">New Password</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                  }}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
