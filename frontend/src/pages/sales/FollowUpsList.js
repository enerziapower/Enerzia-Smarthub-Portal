import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  Plus, Filter, Search, Calendar, Clock, User, Building2,
  PhoneCall, Car, Phone, MapPin, MessageSquare, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, RotateCcw, AlertCircle, MoreVertical, Edit, Trash2, Eye
} from 'lucide-react';

const followupTypes = [
  { id: 'cold_call', label: 'Cold Call', icon: PhoneCall, color: 'blue' },
  { id: 'site_visit', label: 'Site Visit', icon: Car, color: 'green' },
  { id: 'call_back', label: 'Call Back', icon: Phone, color: 'orange' },
  { id: 'visit_later', label: 'Visit Later', icon: MapPin, color: 'purple' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'slate' },
];

const statusOptions = [
  { id: 'scheduled', label: 'Scheduled', color: 'blue' },
  { id: 'pending', label: 'Pending', color: 'yellow' },
  { id: 'completed', label: 'Completed', color: 'green' },
  { id: 'cancelled', label: 'Cancelled', color: 'red' },
  { id: 'rescheduled', label: 'Rescheduled', color: 'purple' },
];

const statusColors = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  rescheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const priorityColors = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

const FollowUpsList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    followup_type: searchParams.get('type') || '',
    priority: searchParams.get('priority') || '',
    date_from: searchParams.get('from') || '',
    date_to: searchParams.get('to') || '',
  });

  useEffect(() => {
    fetchFollowups();
  }, [page, filters]);

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.followup_type) params.append('followup_type', filters.followup_type);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const res = await api.get(`/lead-management/followups?${params.toString()}`);
      setFollowups(res.data.followups || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      followup_type: '',
      priority: '',
      date_from: '',
      date_to: '',
    });
    setSearchParams({});
    setPage(1);
  };

  const handleMarkComplete = async (followupId) => {
    try {
      await api.post(`/lead-management/followups/${followupId}/complete?outcome=Completed`);
      toast.success('Follow-up marked as completed');
      fetchFollowups();
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
    setActionMenuId(null);
  };

  const handleDelete = async (followupId) => {
    if (!window.confirm('Are you sure you want to delete this follow-up?')) return;
    
    try {
      await api.delete(`/lead-management/followups/${followupId}`);
      toast.success('Follow-up deleted');
      fetchFollowups();
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
    setActionMenuId(null);
  };

  const getTypeInfo = (type) => {
    return followupTypes.find(t => t.id === type) || followupTypes[4];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isOverdue = (followup) => {
    if (followup.status === 'completed' || followup.status === 'cancelled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(followup.scheduled_date);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div data-testid="followups-list" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">All Follow-ups</h1>
          <p className="text-slate-400 mt-1">{total} follow-ups found</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => navigate('/sales/lead-management/new')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Follow-up
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={filters.followup_type}
                onChange={(e) => handleFilterChange('followup_type', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">All Types</option>
                {followupTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-slate-400 hover:text-white"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Title / Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                  </td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No follow-ups found
                  </td>
                </tr>
              ) : (
                followups.map(followup => {
                  const typeInfo = getTypeInfo(followup.followup_type);
                  const TypeIcon = typeInfo.icon;
                  const overdue = isOverdue(followup);
                  
                  return (
                    <tr 
                      key={followup.id} 
                      className={`hover:bg-slate-800/50 cursor-pointer ${overdue ? 'bg-red-500/5' : ''}`}
                      onClick={() => navigate(`/sales/lead-management/followups/${followup.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-${typeInfo.color}-500/20`}>
                          <TypeIcon className={`w-4 h-4 text-${typeInfo.color}-400`} />
                          <span className={`text-xs text-${typeInfo.color}-400`}>{typeInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{followup.title}</p>
                        <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {followup.customer_name || followup.lead_company || followup.lead_name || 'Unknown'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-white'}`}>
                          {overdue && <AlertCircle className="w-3 h-3" />}
                          {formatDate(followup.scheduled_date)}
                        </p>
                        {followup.scheduled_time && (
                          <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {followup.scheduled_time}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {followup.assigned_to_name ? (
                          <span className="text-slate-300 text-sm flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {followup.assigned_to_name}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[followup.priority]}`}>
                          {followup.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[followup.status]}`}>
                          {followup.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setActionMenuId(actionMenuId === followup.id ? null : followup.id)}
                            className="p-1 hover:bg-slate-700 rounded"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                          
                          {actionMenuId === followup.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                              <button
                                onClick={() => {
                                  navigate(`/sales/lead-management/followups/${followup.id}`);
                                  setActionMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" /> View
                              </button>
                              <button
                                onClick={() => {
                                  navigate(`/sales/lead-management/edit/${followup.id}`);
                                  setActionMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" /> Edit
                              </button>
                              {followup.status !== 'completed' && (
                                <button
                                  onClick={() => handleMarkComplete(followup.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-green-400 hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Complete
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(followup.id)}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white rounded-lg flex items-center gap-1 text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white rounded-lg flex items-center gap-1 text-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpsList;
