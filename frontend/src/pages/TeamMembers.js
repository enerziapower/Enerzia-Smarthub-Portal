import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Plus, Search, Edit2, Trash2, Phone, Mail, 
  Loader2, X, Save, AlertCircle, Building2, UserCircle, 
  FolderKanban, Calculator, ShoppingCart, Package, Globe, 
  PiggyBank, Briefcase, Cog, ChevronDown, ChevronRight,
  Camera, Image
} from 'lucide-react';
import { departmentTeamAPI } from '../services/api';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const DEPARTMENTS = [
  { code: 'projects', name: 'Projects', icon: FolderKanban, color: 'blue' },
  { code: 'accounts', name: 'Accounts', icon: Calculator, color: 'emerald' },
  { code: 'sales', name: 'Sales & Marketing', icon: ShoppingCart, color: 'orange' },
  { code: 'purchase', name: 'Purchase', icon: Package, color: 'violet' },
  { code: 'exports', name: 'Exports', icon: Globe, color: 'cyan' },
  { code: 'finance', name: 'Finance', icon: PiggyBank, color: 'pink' },
  { code: 'hr', name: 'HR & Admin', icon: Briefcase, color: 'amber' },
  { code: 'operations', name: 'Operations', icon: Cog, color: 'slate' },
];

const COLORS = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', badge: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', badge: 'bg-emerald-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', badge: 'bg-orange-500' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200', badge: 'bg-violet-500' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200', badge: 'bg-cyan-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200', badge: 'bg-pink-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', badge: 'bg-amber-500' },
  slate: { bg: 'bg-slate-200', text: 'text-slate-600', border: 'border-slate-300', badge: 'bg-slate-500' },
};

const TeamMembers = () => {
  const [loading, setLoading] = useState(true);
  const [teamsByDept, setTeamsByDept] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [expandedDepts, setExpandedDepts] = useState(DEPARTMENTS.map(d => d.code));
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const [selectedMemberForPhoto, setSelectedMemberForPhoto] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    designation: '',
    department: 'projects',
    is_active: true,
  });

  useEffect(() => {
    loadAllTeams();
  }, []);

  const loadAllTeams = async () => {
    try {
      setLoading(true);
      const results = await Promise.all(
        DEPARTMENTS.map(dept => 
          departmentTeamAPI.getTeam(dept.code)
            .then(res => ({ code: dept.code, data: res.data || [] }))
            .catch(() => ({ code: dept.code, data: [] }))
        )
      );
      const teamsMap = {};
      results.forEach(r => { teamsMap[r.code] = r.data; });
      setTeamsByDept(teamsMap);
    } catch (error) {
      console.error('Error loading teams:', error);
      showMessage('error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Helper to get full photo URL
  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http')) return photoUrl;
    return `${API_BASE}${photoUrl}`;
  };

  const handlePhotoClick = (member, deptCode) => {
    setSelectedMemberForPhoto({ ...member, department: deptCode });
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMemberForPhoto) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('error', 'Please upload a valid image (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image size must be less than 5MB');
      return;
    }

    setUploadingPhotoId(selectedMemberForPhoto.id);
    try {
      await departmentTeamAPI.uploadPhoto(selectedMemberForPhoto.department, selectedMemberForPhoto.id, file);
      showMessage('success', 'Photo uploaded successfully');
      await loadAllTeams();
    } catch (error) {
      console.error('Error uploading photo:', error);
      showMessage('error', error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploadingPhotoId(null);
      setSelectedMemberForPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (member, deptCode) => {
    if (!window.confirm(`Remove photo for ${member.name}?`)) return;
    
    setUploadingPhotoId(member.id);
    try {
      await departmentTeamAPI.deletePhoto(deptCode, member.id);
      showMessage('success', 'Photo removed');
      await loadAllTeams();
    } catch (error) {
      showMessage('error', 'Failed to remove photo');
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const handleAddMember = async () => {
    if (!formData.name.trim()) {
      showMessage('error', 'Name is required');
      return;
    }
    try {
      await departmentTeamAPI.createMember(formData.department, formData);
      await loadAllTeams();
      setShowAddModal(false);
      resetForm();
      showMessage('success', 'Team member added successfully');
    } catch (error) {
      showMessage('error', 'Failed to add team member');
    }
  };

  const handleUpdateMember = async () => {
    if (!formData.name.trim()) {
      showMessage('error', 'Name is required');
      return;
    }
    try {
      await departmentTeamAPI.updateMember(selectedMember.department, selectedMember.id, formData);
      await loadAllTeams();
      setShowEditModal(false);
      setSelectedMember(null);
      resetForm();
      showMessage('success', 'Team member updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update team member');
    }
  };

  const handleDeleteMember = async (deptCode, memberId) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;
    try {
      await departmentTeamAPI.deleteMember(deptCode, memberId);
      setTeamsByDept(prev => ({
        ...prev,
        [deptCode]: prev[deptCode].filter(m => m.id !== memberId)
      }));
      showMessage('success', 'Team member deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete team member');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      designation: '',
      department: 'projects',
      is_active: true,
    });
  };

  const openEditModal = (member, deptCode) => {
    setSelectedMember({ ...member, department: deptCode });
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || '',
      designation: member.designation || '',
      department: deptCode,
      is_active: member.is_active !== false,
    });
    setShowEditModal(true);
  };

  const toggleDeptExpanded = (deptCode) => {
    setExpandedDepts(prev => 
      prev.includes(deptCode) 
        ? prev.filter(d => d !== deptCode)
        : [...prev, deptCode]
    );
  };

  const getTotalMembers = () => {
    return Object.values(teamsByDept).reduce((sum, arr) => sum + arr.length, 0);
  };

  const getActiveMembers = () => {
    return Object.values(teamsByDept).reduce((sum, arr) => 
      sum + arr.filter(m => m.is_active !== false).length, 0
    );
  };

  const filteredDepartments = filterDept 
    ? DEPARTMENTS.filter(d => d.code === filterDept)
    : DEPARTMENTS;

  const filterMembers = (members) => {
    if (!searchTerm) return members;
    return members.filter(m => 
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.designation?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="team-members-page">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="text-violet-600" size={28} />
            Team Members
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage team members across all departments</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 flex items-center gap-2"
          data-testid="add-team-member-btn"
        >
          <Plus size={16} />
          Add Team Member
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <AlertCircle size={16} />
          {message.text}
        </div>
      )}

      {/* Stats & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
            <span className="text-sm text-slate-500">Total: </span>
            <span className="font-bold text-violet-600">{getTotalMembers()}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2">
            <span className="text-sm text-slate-500">Active: </span>
            <span className="font-bold text-green-600">{getActiveMembers()}</span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Departments with Team Members */}
      <div className="space-y-4">
        {filteredDepartments.map(dept => {
          const DeptIcon = dept.icon;
          const colors = COLORS[dept.color];
          const members = filterMembers(teamsByDept[dept.code] || []);
          const isExpanded = expandedDepts.includes(dept.code);
          
          return (
            <div key={dept.code} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Department Header */}
              <div
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 ${colors.border} border-l-4`}
                onClick={() => toggleDeptExpanded(dept.code)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                    <DeptIcon size={20} className={colors.text} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{dept.name}</h3>
                    <p className="text-sm text-slate-500">{members.length} members</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${colors.badge}`}>
                    {members.filter(m => m.is_active !== false).length} active
                  </span>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
              
              {/* Team Members Grid */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  {members.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {members.map(member => (
                        <div key={member.id} className="bg-white rounded-lg border border-slate-200 p-4" data-testid={`member-card-${member.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {/* Photo Avatar with Upload Button */}
                              <div className="relative">
                                {uploadingPhotoId === member.id ? (
                                  <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center`}>
                                    <Loader2 size={18} className="animate-spin text-slate-500" />
                                  </div>
                                ) : member.photo_url ? (
                                  <img 
                                    src={getPhotoUrl(member.photo_url)} 
                                    alt={member.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                      e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                                    }}
                                  />
                                ) : (
                                  <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center`}>
                                    <span className={`${colors.text} font-semibold text-lg`}>
                                      {member.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                {/* Upload Photo Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePhotoClick(member, dept.code); }}
                                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-600 transition-colors"
                                  title="Upload Photo"
                                  data-testid={`upload-photo-${member.id}`}
                                >
                                  <Camera size={12} className="text-white" />
                                </button>
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-900">{member.name}</h4>
                                {member.designation && (
                                  <p className="text-xs text-slate-500">{member.designation}</p>
                                )}
                                {member.photo_url && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(member, dept.code); }}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    Remove photo
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(member, dept.code); }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteMember(dept.code, member.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 space-y-1 text-sm">
                            {member.email && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Mail size={12} className="text-slate-400" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone size={12} className="text-slate-400" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              member.is_active !== false 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {member.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                            {member.role && (
                              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                {member.role}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Users size={32} className="mx-auto mb-2 text-slate-300" />
                      <p>No team members in this department</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {showEditModal ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Enter name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g., Project Manager"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g., Team Lead"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">Active member</label>
              </div>

              {/* Photo Upload Note */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 flex items-center gap-2">
                  <Camera size={14} />
                  After {showEditModal ? 'updating' : 'adding'}, click the camera button on the member's avatar to upload a photo.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdateMember : handleAddMember}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2"
              >
                <Save size={16} />
                {showEditModal ? 'Update' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembers;
