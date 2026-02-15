import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, Save, Loader2, Filter, Search,
  Package, Truck, FileText, Users, CreditCard, ClipboardCheck,
  AlertCircle, CheckCircle2, Clock, Calendar, Building2, User
} from 'lucide-react';
import { projectsAPI, projectRequirementsAPI } from '../../services/api';
import { DatePicker } from '../../components/ui/date-picker';

// Requirement types with icons
const REQUIREMENT_TYPES = [
  { value: 'Material Purchase', label: 'Material Purchase', icon: Package },
  { value: 'Delivery', label: 'Delivery', icon: Truck },
  { value: 'Vendor P.O.', label: 'Vendor P.O.', icon: FileText },
  { value: 'Manpower Arrangements', label: 'Manpower Arrangements', icon: Users },
  { value: 'Payment Request', label: 'Payment Request', icon: CreditCard },
  { value: 'Documentation', label: 'Documentation', icon: FileText },
  { value: 'Inspection', label: 'Inspection', icon: ClipboardCheck },
  { value: 'Approval', label: 'Approval', icon: CheckCircle2 },
  { value: 'Other', label: 'Other', icon: AlertCircle },
];

const DEPARTMENTS = [
  'PROJECTS', 'ACCOUNTS', 'SALES', 'PURCHASE', 'EXPORTS', 'FINANCE', 'HR', 'OPERATIONS'
];

const PRIORITIES = [
  { value: 'Low', color: 'bg-slate-100 text-slate-700' },
  { value: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'Urgent', color: 'bg-red-100 text-red-700' },
];

const STATUSES = [
  { value: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'On Hold', color: 'bg-gray-100 text-gray-700' },
  { value: 'Cancelled', color: 'bg-red-100 text-red-700' },
];

const ProjectRequirements = () => {
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    priority: '',
    type: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, projRes] = await Promise.all([
        projectRequirementsAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setRequirements(reqRes.data);
      setProjects(projRes.data);
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

  // Filter requirements
  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = searchTerm === '' || 
      req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.project_pid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === '' || req.status === filters.status;
    const matchesDept = filters.department === '' || req.assigned_to_department === filters.department;
    const matchesPriority = filters.priority === '' || req.priority === filters.priority;
    const matchesType = filters.type === '' || req.requirement_type === filters.type;
    
    return matchesSearch && matchesStatus && matchesDept && matchesPriority && matchesType;
  });

  // Stats
  const stats = {
    total: requirements.length,
    pending: requirements.filter(r => r.status === 'Pending').length,
    inProgress: requirements.filter(r => r.status === 'In Progress').length,
    completed: requirements.filter(r => r.status === 'Completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Requirements</h1>
          <p className="text-slate-600 mt-1">Assign and track cross-department requirements for projects</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus size={18} />
          New Requirement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-600">Total Requirements</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-700">In Progress</p>
          <p className="text-2xl font-bold text-blue-800">{stats.inProgress}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700">Completed</p>
          <p className="text-2xl font-bold text-green-800">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PID, project name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Status</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.value}</option>
            ))}
          </select>

          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Priority</option>
            {PRIORITIES.map(p => (
              <option key={p.value} value={p.value}>{p.value}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Types</option>
            {REQUIREMENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirements List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    No requirements found. Click "New Requirement" to create one.
                  </td>
                </tr>
              ) : (
                filteredRequirements.map((req) => {
                  const TypeIcon = getTypeIcon(req.requirement_type);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TypeIcon size={16} className="text-slate-500" />
                          <span className="text-sm text-slate-700">{req.requirement_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{req.project_pid}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">{req.project_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700 max-w-[200px] truncate">{req.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Building2 size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{req.assigned_to_department}</span>
                        </div>
                        {req.assigned_to_person && (
                          <div className="flex items-center gap-1 mt-1">
                            <User size={14} className="text-slate-400" />
                            <span className="text-xs text-slate-500">{req.assigned_to_person}</span>
                          </div>
                        )}
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequirement(req);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
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

      {/* Create Modal */}
      {showCreateModal && (
        <RequirementFormModal
          mode="create"
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRequirement && (
        <RequirementFormModal
          mode="edit"
          requirement={selectedRequirement}
          projects={projects}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRequirement(null);
          }}
          onSaved={() => {
            setShowEditModal(false);
            setSelectedRequirement(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Form Modal Component
const RequirementFormModal = ({ mode, requirement, projects, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    project_id: requirement?.project_id || '',
    requirement_type: requirement?.requirement_type || 'Other',
    description: requirement?.description || '',
    assigned_to_department: requirement?.assigned_to_department || '',
    assigned_to_person: requirement?.assigned_to_person || '',
    due_date: requirement?.due_date || '',
    priority: requirement?.priority || 'Medium',
    status: requirement?.status || 'Pending',
    notes: requirement?.notes || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.project_id) {
      alert('Please select a project');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return;
    }
    if (!formData.assigned_to_department) {
      alert('Please select a department');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await projectRequirementsAPI.create(formData);
      } else {
        await projectRequirementsAPI.update(requirement.id, formData);
      }
      onSaved();
    } catch (error) {
      console.error('Error saving requirement:', error);
      alert('Failed to save requirement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'create' ? 'New Requirement' : 'Edit Requirement'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pid_no} - {p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Requirement Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Requirement Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.requirement_type}
              onChange={(e) => setFormData({ ...formData, requirement_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {REQUIREMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe the requirement..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          {/* Assigned Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign to Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.assigned_to_department}
                onChange={(e) => setFormData({ ...formData, assigned_to_department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign to Person (Optional)
              </label>
              <input
                type="text"
                value={formData.assigned_to_person}
                onChange={(e) => setFormData({ ...formData, assigned_to_person: e.target.value })}
                placeholder="Person name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Due Date and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <DatePicker
                value={formData.due_date}
                onChange={(val) => setFormData({ ...formData, due_date: val })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.value}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status (only in edit mode) */}
          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {mode === 'create' ? 'Create Requirement' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectRequirements;
