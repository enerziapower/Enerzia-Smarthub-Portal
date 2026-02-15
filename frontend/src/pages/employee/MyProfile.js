import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, MapPin, Calendar, 
  Edit2, Save, X, Camera, Loader2, Shield, Clock,
  Briefcase, Award, Key, Bell, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const MyProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employee_id: '',
    date_of_joining: '',
    address: '',
    emergency_contact: '',
    blood_group: '',
    profile_photo: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        designation: user.designation || '',
        employee_id: user.employee_id || user.id?.slice(0, 8) || '',
        date_of_joining: user.date_of_joining || '',
        address: user.address || '',
        emergency_contact: user.emergency_contact || '',
        blood_group: user.blood_group || '',
        profile_photo: user.profile_photo || ''
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        if (updateUser) updateUser(updatedUser);
        toast.success('Profile updated successfully');
        setEditing(false);
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/users/${user.id}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (response.ok) {
        toast.success('Password changed successfully');
        setShowPasswordChange(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'profile_photo');

      const response = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => ({ ...prev, profile_photo: data.file_url || data.url }));
        toast.success('Photo uploaded successfully');
      } else {
        toast.error('Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error uploading photo');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  return (
    <div className="space-y-6" data-testid="my-profile">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
          <p className="text-slate-500 mt-1">Manage your personal information and settings</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="edit-profile-btn"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              data-testid="save-profile-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Photo & Basic Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="text-center">
              {/* Profile Photo */}
              <div className="relative inline-block">
                {profileData.profile_photo ? (
                  <img
                    src={profileData.profile_photo.startsWith('http') ? profileData.profile_photo : `${API}${profileData.profile_photo}`}
                    alt={profileData.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-100">
                    {getInitials(profileData.name)}
                  </div>
                )}
                {editing && (
                  <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-800 mt-4">{profileData.name}</h2>
              <p className="text-slate-500">{profileData.designation || 'Employee'}</p>
              <p className="text-sm text-slate-400">{profileData.department}</p>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{user?.role || 'User'}</p>
                    <p className="text-xs text-slate-500">Role</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">Active</p>
                    <p className="text-xs text-slate-500">Status</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-slate-600" />
              Security
            </h3>
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full py-2 px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                data-testid="change-password-btn"
              >
                Change Password
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-8 text-slate-400"
                  >
                    {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-8 text-slate-400"
                  >
                    {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-8 text-slate-400"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                    }}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-slate-800 py-2">{profileData.name || '-'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <p className="text-slate-800 py-2">{profileData.email || '-'}</p>
                <p className="text-xs text-slate-400">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+91 9876543210"
                  />
                ) : (
                  <p className="text-slate-800 py-2">{profileData.phone || '-'}</p>
                )}
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Employee ID
                </label>
                <p className="text-slate-800 py-2">{profileData.employee_id || '-'}</p>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Department
                </label>
                {editing ? (
                  <select
                    value={profileData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    <option value="Projects">Projects</option>
                    <option value="Sales">Sales</option>
                    <option value="Accounts">Accounts</option>
                    <option value="HR">HR & Admin</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Operations">Operations</option>
                    <option value="Exports">Exports</option>
                  </select>
                ) : (
                  <p className="text-slate-800 py-2">{profileData.department || '-'}</p>
                )}
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Award className="w-4 h-4 inline mr-1" />
                  Designation
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Senior Engineer"
                  />
                ) : (
                  <p className="text-slate-800 py-2">{profileData.designation || '-'}</p>
                )}
              </div>

              {/* Date of Joining */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date of Joining
                </label>
                {editing ? (
                  <input
                    type="date"
                    value={profileData.date_of_joining}
                    onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-slate-800 py-2">{profileData.date_of_joining || '-'}</p>
                )}
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Blood Group
                </label>
                {editing ? (
                  <select
                    value={profileData.blood_group}
                    onChange={(e) => handleInputChange('blood_group', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <p className="text-slate-800 py-2">{profileData.blood_group || '-'}</p>
                )}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Address
                </label>
                {editing ? (
                  <textarea
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your address"
                  />
                ) : (
                  <p className="text-slate-800 py-2">{profileData.address || '-'}</p>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Emergency Contact
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={profileData.emergency_contact}
                    onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Name - Phone Number"
                  />
                ) : (
                  <p className="text-slate-800 py-2">{profileData.emergency_contact || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
