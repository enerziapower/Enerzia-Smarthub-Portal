import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, Save, Loader2, Search, Filter,
  Send, CheckCircle2, Clock, AlertCircle, ArrowRight, Building2,
  Calendar, User, MessageSquare, RefreshCw, Users
} from 'lucide-react';
import { departmentTasksAPI, departmentTeamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = [
  { code: 'PROJECTS', label: 'Projects Dept' },
  { code: 'ACCOUNTS', label: 'Accounts Dept' },
  { code: 'SALES', label: 'Sales Dept' },
  { code: 'PURCHASE', label: 'Purchase Dept' },
  { code: 'EXPORTS', label: 'Exports Dept' },
  { code: 'FINANCE', label: 'Finance Dept' },
  { code: 'HR', label: 'HR Dept' },
  { code: 'OPERATIONS', label: 'Operations Dept' }
];

const TASK_TYPES = [
  'General',
  'Request',
  'Follow-up',
  'Urgent',
  'Approval',
  'Information',
  'Action Required',
  'Material Purchase',
  'Delivery',
  'Vendor P.O.',
  'Manpower Arrangements',
  'Payment Request',
  'Documentation',
  'Inspection',
  'Other'
];

const STATUSES = [
  { value: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'On Hold', color: 'bg-gray-100 text-gray-700' },
  { value: 'Cancelled', color: 'bg-red-100 text-red-700' },
];

const DepartmentTaskManager = ({ department }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ created: {}, assigned: {} });
  const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' or 'created'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
  });

  useEffect(() => {
    loadData();
  }, [department, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load tasks based on active tab
      const params = activeTab === 'assigned' 
        ? { assigned_to: department }
        : { created_by: department };
      
      const [tasksRes, statsRes] = await Promise.all([
        departmentTasksAPI.getAll(params),
        departmentTasksAPI.getStats(department),
      ]);
      
      setTasks(tasksRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await departmentTasksAPI.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(error.response?.data?.detail || 'Failed to delete task');
    }
  };

  const getStatusColor = (status) => {
    const found = STATUSES.find(s => s.value === status);
    return found ? found.color : 'bg-gray-100 text-gray-700';
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchTerm === '' || 
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === '' || task.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-slate-900">Task Manager</h1>
          <p className="text-slate-600 mt-1">Manage tasks assigned to and created by {department}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus size={18} />
          Create Task
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
          <p className="text-sm text-indigo-700">Assigned to Us</p>
          <p className="text-2xl font-bold text-indigo-800">{stats.assigned?.total || 0}</p>
          <p className="text-xs text-indigo-600 mt-1">
            {stats.assigned?.pending || 0} pending
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-sm text-amber-700">Created by Us</p>
          <p className="text-2xl font-bold text-amber-800">{stats.created?.total || 0}</p>
          <p className="text-xs text-amber-600 mt-1">
            {stats.created?.pending || 0} pending
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-700">In Progress</p>
          <p className="text-2xl font-bold text-blue-800">{stats.assigned?.in_progress || 0}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700">Completed</p>
          <p className="text-2xl font-bold text-green-800">{stats.assigned?.completed || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'assigned' 
              ? 'text-indigo-600' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Tasks Assigned to Us
          {activeTab === 'assigned' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('created')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'created' 
              ? 'text-amber-600' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Tasks Created by Us
          {activeTab === 'created' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
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

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Task</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  {activeTab === 'assigned' ? 'From' : 'Assigned To'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Team Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    {activeTab === 'assigned' 
                      ? 'No tasks assigned to your department yet.'
                      : 'No tasks created by your department yet.'}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className={`hover:bg-slate-50 ${task.status === 'Completed' ? 'bg-green-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className={`text-sm font-medium ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[250px]">
                          {task.description}
                        </p>
                        {task.action_taken && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <MessageSquare size={12} />
                            {task.action_taken}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {activeTab === 'assigned' ? task.created_by_department : task.assigned_to_department}
                        </span>
                      </div>
                      {activeTab === 'assigned' && task.created_by_user && (
                        <p className="text-xs text-slate-500 mt-0.5">{task.created_by_user}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.assigned_to_person ? (
                        <div className="flex items-center gap-1">
                          <User size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{task.assigned_to_person}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{task.due_date}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="Edit / Update Status"
                        >
                          <Edit2 size={16} />
                        </button>
                        {activeTab === 'created' && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <TaskFormModal
          mode="create"
          department={department}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTask && (
        <TaskFormModal
          mode="edit"
          department={department}
          task={selectedTask}
          isAssignedTask={activeTab === 'assigned'}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTask(null);
          }}
          onSaved={() => {
            setShowEditModal(false);
            setSelectedTask(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Task Form Modal Component
const TaskFormModal = ({ mode, department, task, isAssignedTask, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    task_type: task?.task_type || 'General',
    assigned_to_department: task?.assigned_to_department || '',
    assigned_to_person: task?.assigned_to_person || '',
    due_date: task?.due_date || '',
    status: task?.status || 'Pending',
    action_taken: task?.action_taken || '',
  });

  // Load team members when department changes
  useEffect(() => {
    if (formData.assigned_to_department) {
      loadTeamMembers(formData.assigned_to_department);
    } else {
      setTeamMembers([]);
    }
  }, [formData.assigned_to_department]);

  const loadTeamMembers = async (dept) => {
    setLoadingTeam(true);
    try {
      const deptCode = dept.toLowerCase();
      const response = await departmentTeamAPI.getTeam(deptCode);
      const activeMembers = response.data.filter(m => m.is_active !== false);
      setTeamMembers(activeMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    setFormData({ 
      ...formData, 
      assigned_to_department: newDept,
      assigned_to_person: '' // Reset person when department changes
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (mode === 'create') {
      if (!formData.title.trim()) {
        alert('Please enter a task title');
        return;
      }
      if (!formData.assigned_to_department) {
        alert('Please select a department');
        return;
      }
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await departmentTasksAPI.create(formData);
      } else {
        await departmentTasksAPI.update(task.id, formData);
      }
      onSaved();
    } catch (error) {
      console.error('Error saving task:', error);
      alert(error.response?.data?.detail || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'create' ? 'Create New Task' : isAssignedTask ? 'Update Task Status' : 'Edit Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              disabled={mode === 'edit' && isAssignedTask}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe the task..."
              disabled={mode === 'edit' && isAssignedTask}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
            />
          </div>

          {/* Task Type & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Task Type
              </label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                disabled={mode === 'edit' && isAssignedTask}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
              >
                {TASK_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign to Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.assigned_to_department}
                onChange={handleDepartmentChange}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
                required
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.filter(d => d.code !== department).map(dept => (
                  <option key={dept.code} value={dept.code}>{dept.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Team Member & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  Team Member
                </span>
              </label>
              <select
                value={formData.assigned_to_person}
                onChange={(e) => setFormData({ ...formData, assigned_to_person: e.target.value })}
                disabled={mode === 'edit' && isAssignedTask || !formData.assigned_to_department}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
              >
                <option value="">
                  {loadingTeam ? 'Loading...' : !formData.assigned_to_department ? 'Select department first' : 'Select Team Member'}
                </option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.name}>
                    {member.name}{member.designation ? ` (${member.designation})` : ''}
                  </option>
                ))}
              </select>
              {formData.assigned_to_department && teamMembers.length === 0 && !loadingTeam && (
                <p className="text-xs text-amber-600 mt-1">No team members found for this department</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                disabled={mode === 'edit' && isAssignedTask}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
              />
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
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Taken (only in edit mode for assigned tasks) */}
          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Action Taken / Notes
              </label>
              <textarea
                value={formData.action_taken}
                onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                rows={2}
                placeholder="Describe the action taken..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          {/* Task Info (in edit mode) */}
          {mode === 'edit' && task && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
              <p>Created by: {task.created_by_department} ({task.created_by_user})</p>
              <p>Created at: {new Date(task.created_at).toLocaleString()}</p>
              {task.completed_at && (
                <p className="text-green-600">Completed at: {new Date(task.completed_at).toLocaleString()} by {task.completed_by}</p>
              )}
            </div>
          )}

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
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentTaskManager;
