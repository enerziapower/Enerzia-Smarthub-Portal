import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, Plus, Search, Trash2, Edit2, X, RefreshCw, 
  Clock, AlertTriangle, CheckCircle, Calendar, Upload, Filter
} from 'lucide-react';
import { accountsAPI } from '../services/api';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    status: 'pending',
    category: 'general',
    related_customer: '',
    related_invoice: '',
    remarks: '',
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'followup', label: 'Follow-up' },
    { value: 'payment', label: 'Payment' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'gst', label: 'GST' },
    { value: 'tds', label: 'TDS' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
  ];

  const statuses = [
    { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-700' },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.getTasks({ 
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        category: filterCategory || undefined
      });
      setTasks(response.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await accountsAPI.updateTask(editingTask.id, formData);
      } else {
        await accountsAPI.createTask(formData);
      }
      setShowAddModal(false);
      setEditingTask(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Failed to save task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await accountsAPI.deleteTask(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await accountsAPI.updateTask(task.id, { ...task, status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      const result = await accountsAPI.importTasks(formData);
      alert(`Successfully imported ${result.data.imported} tasks`);
      setShowImportModal(false);
      setImportFile(null);
      fetchData();
    } catch (err) {
      console.error('Error importing:', err);
      alert('Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      task_name: '',
      description: '',
      assigned_to: '',
      due_date: '',
      priority: 'medium',
      status: 'pending',
      category: 'general',
      related_customer: '',
      related_invoice: '',
      remarks: '',
    });
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormData({ ...task });
    setShowAddModal(true);
  };

  const getPriorityColor = (priority) => {
    return priorities.find(p => p.value === priority)?.color || 'bg-slate-100 text-slate-700';
  };

  const getStatusColor = (status) => {
    return statuses.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-700';
  };

  const isOverdue = (dueDate, status) => {
    if (status === 'completed' || status === 'cancelled') return false;
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.split('/').reverse().join('-'));
    return due < today;
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.related_customer?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => isOverdue(t.due_date, t.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Manager</h1>
          <p className="text-slate-500 mt-1">Manage daily tasks and follow-ups</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => { resetForm(); setEditingTask(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-xl font-bold text-slate-900">{inProgressCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-xl font-bold text-slate-900">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="text-xl font-bold text-red-600">{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Status</option>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Priority</option>
          {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button
          onClick={fetchData}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              Loading...
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            No tasks found
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className={`bg-white rounded-xl border ${isOverdue(task.due_date, task.status) ? 'border-red-300 bg-red-50/30' : 'border-slate-200'} p-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`font-semibold ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {task.task_name}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                    {isOverdue(task.due_date, task.status) && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        Overdue
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {task.due_date || 'No due date'}
                    </span>
                    {task.assigned_to && (
                      <span>Assigned to: <strong>{task.assigned_to}</strong></span>
                    )}
                    {task.related_customer && (
                      <span>Customer: <strong>{task.related_customer}</strong></span>
                    )}
                    <span className="px-2 py-0.5 text-xs bg-slate-100 rounded-full capitalize">{task.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(task, 'completed')}
                      className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Mark Complete"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(task)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingTask ? 'Edit Task' : 'Add Task'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  value={formData.task_name}
                  onChange={(e) => setFormData({...formData, task_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To *</label>
                  <input
                    type="text"
                    required
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/YYYY"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Related Customer</label>
                  <input
                    type="text"
                    value={formData.related_customer}
                    onChange={(e) => setFormData({...formData, related_customer: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Related Invoice</label>
                  <input
                    type="text"
                    value={formData.related_invoice}
                    onChange={(e) => setFormData({...formData, related_invoice: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Import Tasks from Excel</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-2">Upload Excel file (.xlsx, .xls)</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full"
                />
              </div>
              {importFile && <p className="text-sm text-slate-600">Selected: {importFile.name}</p>}
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button onClick={handleImport} disabled={!importFile || importing} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
