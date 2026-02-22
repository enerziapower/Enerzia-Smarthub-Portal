/**
 * Project Management Page - Simplified
 * 
 * Groups projects by status in accordion-style:
 * - Need to Start
 * - Ongoing
 * - Completed
 * - Invoiced
 * - Partially Invoiced
 * - Cancelled
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Clock, CheckCircle, PlayCircle, Receipt, AlertCircle,
  ChevronDown, ChevronRight, Search, RefreshCw, Edit2, Calendar,
  Building2, User, DollarSign, Percent, Plus, X, Save, FileText,
  Upload, Download, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status Configuration
const STATUS_CONFIG = [
  { 
    id: 'Need to Start', 
    label: 'Need to Start', 
    icon: Clock, 
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  { 
    id: 'Ongoing', 
    label: 'Ongoing', 
    icon: PlayCircle, 
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  { 
    id: 'Completed', 
    label: 'Completed', 
    icon: CheckCircle, 
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    badgeColor: 'bg-green-100 text-green-700'
  },
  { 
    id: 'Invoiced', 
    label: 'Invoiced', 
    icon: Receipt, 
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  { 
    id: 'Partially Invoiced', 
    label: 'Partially Invoiced', 
    icon: Receipt, 
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  { 
    id: 'Cancelled', 
    label: 'Cancelled', 
    icon: AlertCircle, 
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    badgeColor: 'bg-red-100 text-red-700'
  }
];

// Unit options for work items
const UNIT_OPTIONS = ['Nos', 'Mtr', 'Sqm', 'Set', 'Lot', 'Kg', 'Ltr', 'Box', 'Pcs', 'Unit'];

// Work item status options
const WORK_ITEM_STATUS = ['Pending', 'In Progress', 'Completed'];

const ProjectLifecycle = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState(['Need to Start', 'Ongoing']);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const response = await fetch(`${API_URL}/api/projects`, { headers });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Group projects by status
  const groupedProjects = STATUS_CONFIG.reduce((acc, status) => {
    acc[status.id] = projects.filter(p => {
      const projectStatus = p.status || 'Need to Start';
      return projectStatus === status.id;
    });
    return acc;
  }, {});

  // Filter projects by search
  const filterProjects = (projectList) => {
    if (!searchTerm) return projectList;
    return projectList.filter(p =>
      p.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.engineer_in_charge?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Toggle section
  const toggleSection = (statusId) => {
    setExpandedSections(prev =>
      prev.includes(statusId)
        ? prev.filter(s => s !== statusId)
        : [...prev, statusId]
    );
  };

  // Open edit modal
  const handleEditProject = (project) => {
    setSelectedProject(project);
    setEditForm({
      status: project.status || 'Need to Start',
      project_date: project.project_date || '',
      completion_date: project.completion_date || '',
      work_items: project.work_items || []
    });
    setShowEditModal(true);
  };

  // Save project updates
  const handleSaveProject = async () => {
    if (!selectedProject) return;
    
    setSaving(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };

      // Auto-set completion to 100% if status is Completed
      const updateData = { ...editForm };
      if (updateData.status === 'Completed') {
        updateData.completion_percentage = 100;
      }

      const response = await fetch(`${API_URL}/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast.success('Project updated successfully');
        setShowEditModal(false);
        fetchProjects();
      } else {
        toast.error('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  // Add work item
  const addWorkItem = () => {
    setEditForm(prev => ({
      ...prev,
      work_items: [
        ...(prev.work_items || []),
        { id: Date.now().toString(), description: '', quantity: '', unit: 'Nos', status: 'Pending' }
      ]
    }));
  };

  // Update work item
  const updateWorkItem = (index, field, value) => {
    setEditForm(prev => ({
      ...prev,
      work_items: prev.work_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Remove work item
  const removeWorkItem = (index) => {
    setEditForm(prev => ({
      ...prev,
      work_items: prev.work_items.filter((_, i) => i !== index)
    }));
  };

  // Calculate stats
  const totalProjects = projects.length;
  const needToStart = groupedProjects['Need to Start']?.length || 0;
  const ongoing = groupedProjects['Ongoing']?.length || 0;
  const completed = groupedProjects['Completed']?.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="project-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Management</h1>
          <p className="text-slate-500 mt-1">Manage projects by status phase</p>
        </div>
        <button
          onClick={fetchProjects}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          data-testid="refresh-btn"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <FolderKanban className="w-4 h-4" />
            <span className="text-sm">Total Projects</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalProjects}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Need to Start</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{needToStart}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <PlayCircle className="w-4 h-4" />
            <span className="text-sm">Ongoing</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{ongoing}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{completed}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by PID, client, project name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          data-testid="search-input"
        />
      </div>

      {/* Status Accordions */}
      <div className="space-y-3">
        {STATUS_CONFIG.map((status) => {
          const StatusIcon = status.icon;
          const projectsInStatus = filterProjects(groupedProjects[status.id] || []);
          const isExpanded = expandedSections.includes(status.id);

          return (
            <div
              key={status.id}
              className={`rounded-xl border ${status.borderColor} overflow-hidden`}
              data-testid={`status-section-${status.id.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleSection(status.id)}
                className={`w-full flex items-center justify-between p-4 ${status.bgColor} hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon className={`w-5 h-5 ${status.textColor}`} />
                  <span className={`font-semibold ${status.textColor}`}>{status.label}</span>
                  <span className={`px-2.5 py-0.5 text-sm font-medium rounded-full ${status.badgeColor}`}>
                    {projectsInStatus.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className={`w-5 h-5 ${status.textColor}`} />
                ) : (
                  <ChevronRight className={`w-5 h-5 ${status.textColor}`} />
                )}
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-4 bg-white">
                  {projectsInStatus.length === 0 ? (
                    <p className="text-center text-slate-400 py-6">No projects in this status</p>
                  ) : (
                    <div className="space-y-3">
                      {projectsInStatus.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => handleEditProject(project)}
                          data-testid={`project-card-${project.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">{project.pid_no}</span>
                              {project.category && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded">
                                  {project.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="w-3.5 h-3.5" />
                                {project.client || 'No client'}
                              </span>
                              {project.engineer_in_charge && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {project.engineer_in_charge}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Completion */}
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${project.completion_percentage || 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-slate-600 w-10">{project.completion_percentage || 0}%</span>
                            </div>
                            {/* Amount */}
                            <span className="text-sm font-medium text-slate-900 min-w-[80px] text-right">
                              {formatCurrency(project.po_amount)}
                            </span>
                            {/* Edit Icon */}
                            <Edit2 className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="edit-project-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Edit Project</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedProject.pid_no}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Quick Update Section */}
              <div className="bg-slate-50 rounded-xl p-5">
                <h3 className="font-medium text-slate-900 mb-4">Quick Update</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-testid="status-select"
                    >
                      {STATUS_CONFIG.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Project Date
                    </label>
                    <input
                      type="text"
                      value={editForm.project_date}
                      onChange={(e) => setEditForm({ ...editForm, project_date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-testid="project-date-input"
                    />
                  </div>

                  {/* Target Completion */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Target Completion
                    </label>
                    <input
                      type="text"
                      value={editForm.completion_date}
                      onChange={(e) => setEditForm({ ...editForm, completion_date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-testid="completion-date-input"
                    />
                  </div>
                </div>
              </div>

              {/* Work Summary / Line Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <h3 className="font-medium text-slate-900">Work Summary / Line Items</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Template
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Excel
                    </button>
                    <button
                      type="button"
                      onClick={addWorkItem}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                      data-testid="add-work-item-btn"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                </div>

                <p className="text-sm text-blue-600 mb-4">
                  Upload Excel with columns: Description, Quantity, Unit (Nos/Mtr/Sqm/etc.), Status
                </p>

                {/* Work Items List */}
                <div className="space-y-4">
                  {(editForm.work_items || []).map((item, index) => (
                    <div key={item.id || index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-600">Item #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeWorkItem(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Description */}
                        <div>
                          <textarea
                            value={item.description || ''}
                            onChange={(e) => updateWorkItem(index, 'description', e.target.value)}
                            placeholder="Work description (max 500 characters)"
                            rows={2}
                            maxLength={500}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <p className="text-xs text-slate-400 text-right mt-1">
                            {(item.description || '').length}/500
                          </p>
                        </div>

                        {/* Qty, Unit, Status */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Qty</label>
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateWorkItem(index, 'quantity', e.target.value)}
                              placeholder="Qty"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Unit</label>
                            <select
                              value={item.unit || 'Nos'}
                              onChange={(e) => updateWorkItem(index, 'unit', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              {UNIT_OPTIONS.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Status</label>
                            <select
                              value={item.status || 'Pending'}
                              onChange={(e) => updateWorkItem(index, 'status', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              {WORK_ITEM_STATUS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(editForm.work_items || []).length === 0 && (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No work items yet</p>
                      <button
                        type="button"
                        onClick={addWorkItem}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add your first work item
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-3">
                  These items are used in Planning & Execution and transferred to Work Completion reports.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                data-testid="save-btn"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectLifecycle;
