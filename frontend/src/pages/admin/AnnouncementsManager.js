import React, { useState, useEffect } from 'react';
import { 
  Bell, Plus, Search, Edit, Trash2, Calendar, Clock,
  AlertCircle, CheckCircle, Eye, Users, Loader2
} from 'lucide-react';
import { adminHubAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const AnnouncementsManager = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    target_audience: 'all',
    expiry_date: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await adminHubAPI.getAnnouncements();
      setAnnouncements(res.data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingId) {
        await adminHubAPI.updateAnnouncement(editingId, formData);
        toast.success('Announcement updated successfully');
      } else {
        await adminHubAPI.createAnnouncement(formData, user?.name || 'Admin');
        toast.success('Announcement published successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ title: '', content: '', priority: 'medium', target_audience: 'all', expiry_date: '' });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      target_audience: announcement.target_audience,
      expiry_date: announcement.expiry_date
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await adminHubAPI.deleteAnnouncement(id);
        toast.success('Announcement deleted');
        fetchAnnouncements();
      } catch (error) {
        console.error('Error deleting announcement:', error);
        toast.error('Failed to delete announcement');
      }
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const activeCount = announcements.filter(a => a.status === 'active').length;
  const highPriorityCount = announcements.filter(a => a.priority === 'high').length;
  const companyWideCount = announcements.filter(a => a.target_audience === 'all').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="announcements-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements Manager</h1>
          <p className="text-slate-500 mt-1">Create and manage company-wide announcements</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ title: '', content: '', priority: 'medium', target_audience: 'all', expiry_date: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="new-announcement-btn"
        >
          <Plus size={18} />
          New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Active</p>
              <p className="text-xl font-bold text-slate-800">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-red-600">High Priority</p>
              <p className="text-xl font-bold text-red-700">{highPriorityCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-amber-600">Expiring Soon</p>
              <p className="text-xl font-bold text-amber-700">
                {announcements.filter(a => {
                  const expiry = new Date(a.expiry_date);
                  const diff = (expiry - new Date()) / (1000 * 60 * 60 * 24);
                  return diff >= 0 && diff <= 7;
                }).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-green-600">Company-wide</p>
              <p className="text-xl font-bold text-green-700">{companyWideCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">All Announcements</h2>
        </div>
        {announcements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No announcements yet</p>
            <p className="text-sm">Create your first announcement to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 hover:bg-slate-50" data-testid={`announcement-${announcement.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      announcement.priority === 'high' ? 'bg-red-100' :
                      announcement.priority === 'medium' ? 'bg-amber-100' : 'bg-green-100'
                    }`}>
                      <Bell size={24} className={
                        announcement.priority === 'high' ? 'text-red-600' :
                        announcement.priority === 'medium' ? 'text-amber-600' : 'text-green-600'
                      } />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800">{announcement.title}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getPriorityBadge(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 capitalize">
                          {announcement.target_audience === 'all' ? 'All Employees' : announcement.target_audience}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{announcement.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Created: {new Date(announcement.created_at).toLocaleDateString('en-IN')}</span>
                        <span>Expires: {new Date(announcement.expiry_date).toLocaleDateString('en-IN')}</span>
                        <span>By: {announcement.created_by}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(announcement)}
                      className="p-2 hover:bg-slate-200 rounded-lg" 
                      title="Edit"
                    >
                      <Edit size={16} className="text-slate-500" />
                    </button>
                    <button 
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 hover:bg-red-50 rounded-lg" 
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Announcement' : 'Create Announcement'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="announcement-title-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  placeholder="Announcement details..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="announcement-content-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Employees</option>
                    <option value="projects">Projects Dept</option>
                    <option value="accounts">Accounts Dept</option>
                    <option value="sales">Sales Dept</option>
                    <option value="hr">HR Dept</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="announcement-expiry-input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                  data-testid="announcement-submit-btn"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsManager;
