import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Plus, Edit2, Trash2, Search, Check, X, Loader2, 
  Phone, Mail, Download, UserCircle, Camera, Upload, Image
} from 'lucide-react';
import { departmentTeamAPI } from '../services/api';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const DEPARTMENT_LABELS = {
  projects: 'Project Team',
  sales: 'Sales Team',
  purchase: 'Purchase Team',
  exports: 'Exports Team',
  finance: 'Finance Team',
  hr: 'HR Team',
  operations: 'Operations Team',
  accounts: 'Accounts Team',
};

const DepartmentTeam = ({ department }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedMemberForPhoto, setSelectedMemberForPhoto] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    is_active: true
  });

  const teamLabel = DEPARTMENT_LABELS[department] || 'Team Members';

  useEffect(() => {
    loadMembers();
  }, [department]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await departmentTeamAPI.getTeam(department);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      showMessage('error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleImport = async () => {
    try {
      const response = await departmentTeamAPI.importFromEngineers(department);
      showMessage('success', response.data.message);
      await loadMembers();
    } catch (error) {
      showMessage('error', 'Failed to import team members');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showMessage('error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingMember) {
        await departmentTeamAPI.updateMember(department, editingMember.id, formData);
        showMessage('success', 'Team member updated successfully');
      } else {
        await departmentTeamAPI.createMember(department, formData);
        showMessage('success', 'Team member added successfully');
      }
      setShowAddModal(false);
      setEditingMember(null);
      resetForm();
      await loadMembers();
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Failed to save team member');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      designation: member.designation || '',
      is_active: member.is_active !== false
    });
    setShowAddModal(true);
  };

  const handleDelete = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove "${memberName}" from the team?`)) return;
    
    try {
      await departmentTeamAPI.deleteMember(department, memberId);
      showMessage('success', 'Team member removed successfully');
      await loadMembers();
    } catch (error) {
      showMessage('error', 'Failed to remove team member');
    }
  };

  const handlePhotoClick = (member) => {
    setSelectedMemberForPhoto(member);
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
      await departmentTeamAPI.uploadPhoto(department, selectedMemberForPhoto.id, file);
      showMessage('success', 'Photo uploaded successfully');
      await loadMembers();
    } catch (error) {
      console.error('Error uploading photo:', error);
      showMessage('error', error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploadingPhotoId(null);
      setSelectedMemberForPhoto(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (member) => {
    if (!window.confirm(`Remove photo for ${member.name}?`)) return;
    
    setUploadingPhotoId(member.id);
    try {
      await departmentTeamAPI.deletePhoto(department, member.id);
      showMessage('success', 'Photo removed');
      await loadMembers();
    } catch (error) {
      showMessage('error', 'Failed to remove photo');
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      designation: '',
      is_active: true
    });
  };

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeMembers = members.filter(m => m.is_active !== false);

  // Helper to get full photo URL
  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http')) return photoUrl;
    return `${API_BASE}${photoUrl}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="department-team-page">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{teamLabel}</h1>
          <p className="text-slate-500 mt-1">Manage your {department} department team members</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Download size={18} />
            Import from Master
          </button>
          <button
            onClick={() => {
              setEditingMember(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="add-member-btn"
          >
            <Plus size={18} />
            Add Member
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Members</p>
              <p className="text-2xl font-bold text-slate-900">{members.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <UserCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Members</p>
              <p className="text-2xl font-bold text-slate-900">{activeMembers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Inactive</p>
              <p className="text-2xl font-bold text-slate-900">{members.length - activeMembers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search team members by name, email, or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Designation</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No team members found</p>
                    <p className="text-sm text-slate-400 mt-1">Add team members or import from the master list</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50" data-testid={`team-member-${member.id}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {/* Photo Avatar */}
                        <div className="relative">
                          {uploadingPhotoId === member.id ? (
                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
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
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center border-2 border-slate-200">
                              <span className="text-slate-600 font-semibold text-lg">
                                {member.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {/* Upload Photo Button Badge */}
                          <button
                            onClick={() => handlePhotoClick(member)}
                            className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-600 transition-colors"
                            title="Upload Photo"
                            data-testid={`upload-photo-btn-${member.id}`}
                          >
                            <Camera size={12} className="text-white" />
                          </button>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{member.name}</span>
                          {member.photo_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(member);
                              }}
                              className="text-xs text-red-500 hover:text-red-700 text-left"
                              title="Remove photo"
                            >
                              Remove photo
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {member.email ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={14} className="text-slate-400" />
                          <span className="text-sm">{member.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {member.phone ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone size={14} className="text-slate-400" />
                          <span className="text-sm">{member.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">{member.designation || '-'}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        member.is_active !== false 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {member.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePhotoClick(member)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Upload Photo"
                        >
                          <Image size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id, member.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingMember ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {editingMember ? 'Update team member details' : `Add a new member to ${teamLabel}`}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  required
                  data-testid="member-name-input"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  data-testid="member-email-input"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 xxx xxx xxxx"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  data-testid="member-phone-input"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Project Manager, Sales Executive"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  data-testid="member-designation-input"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  Active member
                </label>
              </div>

              {/* Photo Upload Hint */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 flex items-center gap-2">
                  <Camera size={14} />
                  {editingMember 
                    ? "You can upload a photo by clicking on the avatar in the team list after saving."
                    : "After adding, click on the avatar to upload a photo."}
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMember(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  data-testid="save-member-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingMember ? 'Update' : 'Add Member'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentTeam;
