import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Loader2, Search,
  ClipboardCheck, AlertCircle, Clock, Building2, Calendar,
  RefreshCw, ArrowUpRight, ArrowDownLeft, Reply, Eye, CheckCircle2
} from 'lucide-react';
import { projectsAPI, projectRequirementsAPI } from '../services/api';

// Import modular components
import { 
  CreateRequirementModal, 
  ViewRequirementModal, 
  ReplyModal,
  REQUIREMENT_TYPES,
  DEPARTMENTS,
  PRIORITIES,
  STATUSES
} from './DepartmentRequirements/index';

const DepartmentRequirements = ({ department }) => {
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
  });

  const currentDept = department.toUpperCase();
  const deptLabel = DEPARTMENTS.find(d => d.code === currentDept)?.label || department;

  useEffect(() => {
    loadData();
  }, [department]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, projRes] = await Promise.all([
        projectRequirementsAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setRequirements(reqRes.data);
      const ongoingProjects = projRes.data.filter(p => p.status !== 'Completed');
      setProjects(ongoingProjects);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this requirement?')) return;
    try {
      await projectRequirementsAPI.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting requirement:', error);
      alert('Failed to delete requirement');
    }
  };

  const getStatusColor = (status) => {
    const found = STATUSES.find(s => s.value === status);
    return found ? found.color : 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority) => {
    const found = PRIORITIES.find(p => p.value === priority);
    return found ? found.color : 'bg-gray-100 text-gray-700';
  };

  const getTypeIcon = (type) => {
    const found = REQUIREMENT_TYPES.find(t => t.value === type);
    return found ? found.icon : AlertCircle;
  };

  // Filter requirements based on active tab
  const sentRequirements = requirements.filter(req => req.created_by_department === currentDept);
  const receivedRequirements = requirements.filter(req => req.assigned_to_department === currentDept);
  
  const currentRequirements = activeTab === 'sent' ? sentRequirements : receivedRequirements;

  // Apply filters
  const filteredRequirements = currentRequirements.filter(req => {
    const matchesSearch = searchTerm === '' || 
      req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.project_pid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === '' || req.status === filters.status;
    const matchesPriority = filters.priority === '' || req.priority === filters.priority;
    const matchesType = filters.type === '' || req.requirement_type === filters.type;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  // Stats
  const sentStats = {
    total: sentRequirements.length,
    pending: sentRequirements.filter(r => r.status === 'Pending').length,
    completed: sentRequirements.filter(r => r.status === 'Completed').length,
  };
  
  const receivedStats = {
    total: receivedRequirements.length,
    pending: receivedRequirements.filter(r => r.status === 'Pending').length,
    inProgress: receivedRequirements.filter(r => r.status === 'In Progress').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dept-requirements-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dept. Requirements</h1>
          <p className="text-slate-600 mt-1">Cross-department requests and responses for {deptLabel}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          data-testid="create-requirement-btn"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ArrowUpRight size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-indigo-700">Sent Requests</p>
              <p className="text-2xl font-bold text-indigo-800">{sentStats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowDownLeft size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-700">Received Requests</p>
              <p className="text-2xl font-bold text-purple-800">{receivedStats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-700">Pending Action</p>
              <p className="text-2xl font-bold text-yellow-800">{receivedStats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700">Completed</p>
              <p className="text-2xl font-bold text-green-800">{sentStats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            data-testid="received-tab"
          >
            <ArrowDownLeft size={18} />
            Received Requests ({receivedRequirements.length})
            {receivedStats.pending > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {receivedStats.pending} new
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            data-testid="sent-tab"
          >
            <ArrowUpRight size={18} />
            Sent Requests ({sentRequirements.length})
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by PID, project, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  data-testid="search-input"
                />
              </div>
            </div>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">All Status</option>
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">All Priority</option>
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.value}</option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">All Types</option>
              {REQUIREMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Requirements Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  {activeTab === 'sent' ? 'To Dept' : 'From Dept'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                    <ClipboardCheck size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">
                      {activeTab === 'sent' ? 'No requests sent yet' : 'No requests received'}
                    </p>
                    <p className="text-sm mt-1">
                      {activeTab === 'sent' 
                        ? 'Click "New Request" to send a request to another department'
                        : 'Requests from other departments will appear here'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequirements.map((req) => {
                  const TypeIcon = getTypeIcon(req.requirement_type);
                  const hasReply = req.reply || req.response;
                  return (
                    <tr 
                      key={req.id} 
                      className={`hover:bg-slate-50 ${req.status === 'Pending' && activeTab === 'received' ? 'bg-yellow-50/50' : ''}`}
                      data-testid={`requirement-row-${req.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded">
                            <TypeIcon size={14} className="text-slate-600" />
                          </div>
                          <span className="text-sm text-slate-700">{req.requirement_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-blue-600">{req.project_pid}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[120px]">{req.project_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700 max-w-[200px] truncate">{req.description}</p>
                        {hasReply && (
                          <div className="flex items-center gap-1 mt-1">
                            <Reply size={12} className="text-green-500" />
                            <span className="text-xs text-green-600">Has response</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Building2 size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {activeTab === 'sent' ? req.assigned_to_department : req.created_by_department}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {req.due_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-700">{req.due_date}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(req.priority)}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedRequirement(req);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {activeTab === 'received' && req.status !== 'Completed' && (
                            <button
                              onClick={() => {
                                setSelectedRequirement(req);
                                setShowReplyModal(true);
                              }}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                              title="Reply / Update Status"
                            >
                              <Reply size={16} />
                            </button>
                          )}
                          {activeTab === 'sent' && (
                            <button
                              onClick={() => handleDelete(req.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
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
      </div>

      {/* Modals */}
      <CreateRequirementModal
        isOpen={showCreateModal}
        currentDept={currentDept}
        projects={projects}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          setShowCreateModal(false);
          loadData();
        }}
      />

      <ViewRequirementModal
        isOpen={showViewModal}
        requirement={selectedRequirement}
        currentDept={currentDept}
        onClose={() => {
          setShowViewModal(false);
          setSelectedRequirement(null);
        }}
      />

      <ReplyModal
        isOpen={showReplyModal}
        requirement={selectedRequirement}
        currentDept={currentDept}
        onClose={() => {
          setShowReplyModal(false);
          setSelectedRequirement(null);
        }}
        onSaved={() => {
          setShowReplyModal(false);
          setSelectedRequirement(null);
          loadData();
        }}
      />
    </div>
  );
};

export default DepartmentRequirements;
