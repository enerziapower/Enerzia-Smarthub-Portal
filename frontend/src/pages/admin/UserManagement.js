import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Edit, Trash2, Search, Shield,
  CheckCircle, XCircle, Key, X, RefreshCw, Eye, EyeOff,
  Copy, AlertTriangle, UserPlus, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { usersAPI } from '../../services/api';

const API = process.env.REACT_APP_BACKEND_URL;

const UserManagement = () => {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    department: '',
    can_view_departments: []
  });
  
  const [passwordData, setPasswordData] = useState({
    new_password: ''
  });
  
  const [submitting, setSubmitting] = useState(false);

  const departments = [
    'Projects', 'Accounts', 'Sales', 'Purchase', 'Exports', 
    'HR', 'Operations', 'Finance', 'Management', 'IT'
  ];

  const roles = [
    { value: 'user', label: 'User', color: 'bg-slate-100 text-slate-700' },
    { value: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-700' },
    { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
    { value: 'ceo_owner', label: 'CEO/Owner', color: 'bg-amber-100 text-amber-700' }
  ];

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 403) {
        toast.error('Admin access required to view users');
      } else {
        toast.error('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle invite/add user
  const handleInviteUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await usersAPI.invite(formData);
      toast.success('User invited successfully');
      
      // Show temporary password if returned
      if (response.data?.temp_password) {
        setTempPassword(response.data.temp_password);
      }
      
      fetchUsers();
      setShowAddModal(false);
      resetFormData();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(error.response?.data?.detail || 'Failed to invite user');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setSubmitting(true);
    try {
      await usersAPI.update(selectedUser.id, formData);
      toast.success('User updated successfully');
      fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
      resetFormData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setSubmitting(true);
    try {
      await usersAPI.delete(selectedUser.id);
      toast.success('User deleted successfully');
      fetchUsers();
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setSubmitting(true);
    try {
      await usersAPI.resetPassword(selectedUser.id, passwordData);
      toast.success('Password reset successfully');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setPasswordData({ new_password: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user) => {
    try {
      await usersAPI.update(user.id, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      department: user.department || '',
      can_view_departments: user.can_view_departments || []
    });
    setShowEditModal(true);
  };

  // Open password modal
  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordData({ new_password: '' });
    setShowPasswordModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Reset form
  const resetFormData = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
      department: '',
      can_view_departments: []
    });
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Get role badge color
  const getRoleBadge = (role) => {
    const found = roles.find(r => r.value === role);
    return found?.color || 'bg-slate-100 text-slate-700';
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesDept = filterDept === 'all' || user.department === filterDept;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active !== false) ||
      (filterStatus === 'inactive' && user.is_active === false);
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active !== false).length,
    inactive: users.filter(u => u.is_active === false).length,
    admins: users.filter(u => u.role === 'super_admin' || u.role === 'admin').length
  };

  return (
    <div className="space-y-6" data-testid="user-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 mt-1">Manage system users and their access permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { resetFormData(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            data-testid="add-user-btn"
          >
            <UserPlus size={18} />
            Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="text-xl font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-green-600">Active</p>
              <p className="text-xl font-bold text-green-700">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-red-600">Admins</p>
              <p className="text-xl font-bold text-red-700">{stats.admins}</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-amber-600">Inactive</p>
              <p className="text-xl font-bold text-amber-700">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="search-users"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            data-testid="filter-role"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            data-testid="filter-department"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            data-testid="filter-status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            <p className="text-slate-500 mt-2">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="font-semibold text-slate-800">No Users Found</h3>
            <p className="text-slate-500 mt-1">
              {users.length === 0 ? 'Start by inviting users to the system' : 'No users match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50" data-testid={`user-row-${user.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.name || 'Unnamed User'}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getRoleBadge(user.role)}`}>
                        {user.role?.replace('_', ' ') || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.department || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          user.is_active !== false 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        data-testid={`toggle-status-${user.id}`}
                      >
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-1.5 hover:bg-blue-50 rounded" 
                          title="Edit User"
                          data-testid={`edit-user-${user.id}`}
                        >
                          <Edit size={16} className="text-blue-500" />
                        </button>
                        <button 
                          onClick={() => openPasswordModal(user)}
                          className="p-1.5 hover:bg-amber-50 rounded" 
                          title="Reset Password"
                          data-testid={`reset-password-${user.id}`}
                        >
                          <Key size={16} className="text-amber-500" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(user)}
                          className="p-1.5 hover:bg-red-50 rounded" 
                          title="Delete User"
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Invite User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" data-testid="add-user-modal">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Invite New User</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="input-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-testid="select-role"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-testid="select-department"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Mail className="text-blue-500 mt-0.5" size={16} />
                  <p className="text-sm text-blue-700">
                    A temporary password will be generated and sent to the user's email. 
                    If email sending fails, the password will be displayed for manual sharing.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                  data-testid="submit-invite"
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Invite User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Password Modal */}
      {tempPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">User Created Successfully</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Save this temporary password! It won't be shown again.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Share this with the user for their first login.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-100 rounded-lg p-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-mono text-slate-800">{tempPassword}</code>
                  <button
                    onClick={() => copyToClipboard(tempPassword)}
                    className="p-2 hover:bg-slate-200 rounded-lg"
                    title="Copy"
                  >
                    <Copy size={18} className="text-slate-500" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setTempPassword('')}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" data-testid="edit-user-modal">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" data-testid="reset-password-modal">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Reset Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">
                  Resetting password for: <span className="font-medium text-slate-800">{selectedUser.name}</span>
                </p>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ new_password: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" data-testid="delete-user-modal">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Delete User</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this user?
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      This action cannot be undone. All user data will be permanently removed.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">
                  User: <span className="font-medium text-slate-800">{selectedUser.name}</span>
                </p>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                  data-testid="confirm-delete"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
