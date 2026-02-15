import React, { useState, useEffect, useRef, useCallback } from 'react';
import { projectsAPI } from '../services/api';
import { Search, Filter, Loader2, ChevronRight, Plus, Edit, Download, Upload, FileText, FileSpreadsheet, Trash2, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import AddProjectModal from '../components/AddProjectModal';
import EditProjectModal from '../components/EditProjectModal';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeView, setActiveView] = useState('live'); // 'live' or 'completed'
  const [lastUpdated, setLastUpdated] = useState(null);
  const fileInputRef = useRef(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
  });

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      
      const response = await projectsAPI.getAll(params);
      setProjects(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.category]);

  // Real-time sync - automatically refresh when project updates come in
  useRealtimeSync('project', (message) => {
    console.log('Project update received:', message);
    // Refresh data when any project is updated
    loadProjects();
  });

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const response = await projectsAPI.exportExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `projects_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel file');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const response = await projectsAPI.exportPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `project_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF file');
    } finally {
      setExporting(false);
    }
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await projectsAPI.importExcel(formData);
      const data = response.data;
      
      // Build detailed message for new import behavior
      let message = `✅ Import Complete!\n\n`;
      
      if (data.deleted > 0) {
        message += `🗑️ Removed ${data.deleted} old ongoing projects\n`;
      }
      if (data.imported > 0) {
        message += `➕ Added ${data.imported} new projects\n`;
      }
      if (data.updated > 0) {
        message += `🔄 Updated ${data.updated} existing projects\n`;
      }
      
      message += `\n📊 Total rows processed: ${data.total_rows}`;
      
      if (data.errors && data.errors.length > 0) {
        message += `\n\n⚠️ Errors:\n${data.errors.slice(0, 5).join('\n')}`;
        if (data.errors.length > 5) {
          message += `\n... and ${data.errors.length - 5} more`;
        }
      }
      
      alert(message);
      await loadProjects();
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Failed to import Excel file. Please check the format.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (window.confirm(`Are you sure you want to delete project "${projectName}"? This action cannot be undone.`)) {
      try {
        await projectsAPI.delete(projectId);
        await loadProjects();
        alert('Project deleted successfully');
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  const filteredProjects = projects.filter((project) => {
    // First filter by view (Live vs Completed)
    const isCompleted = project.status === 'Completed';
    if (activeView === 'completed' && !isCompleted) return false;
    if (activeView === 'live' && isCompleted) return false;

    // Then apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        project.project_name.toLowerCase().includes(searchLower) ||
        project.client.toLowerCase().includes(searchLower) ||
        project.pid_no.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Count projects for each view
  const liveCount = projects.filter(p => p.status !== 'Completed').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'Ongoing': 'bg-sky-50 text-sky-700 border-sky-200',
      'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Invoiced': 'bg-green-50 text-green-700 border-green-200',
      'Need to Start': 'bg-amber-50 text-amber-700 border-amber-200',
      'Partially Invoiced': 'bg-violet-50 text-violet-700 border-violet-200',
      'Cancelled': 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return statusClasses[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getCategoryBadgeClass = (category) => {
    const categoryClasses = {
      'PSS': 'bg-blue-50 text-blue-700 border-blue-200',
      'AS': 'bg-purple-50 text-purple-700 border-purple-200',
      'OSS': 'bg-pink-50 text-pink-700 border-pink-200',
      'CS': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
    return categoryClasses[category] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportExcel}
        className="hidden"
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProjectAdded={loadProjects}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onProjectUpdated={loadProjects}
        project={selectedProject}
      />

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            All Projects & Services
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage and track your projects & services</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Buttons */}
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            data-testid="export-excel-btn"
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            {exporting ? 'Exporting...' : 'Excel'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            data-testid="export-pdf-btn"
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium hover:bg-rose-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileText size={16} />
            {exporting ? 'Exporting...' : 'PDF'}
          </button>
          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            data-testid="import-btn"
            className="flex items-center gap-2 px-3 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-sm font-medium hover:bg-violet-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <Upload size={16} />
            {importing ? 'Importing...' : 'Import'}
          </button>
          {/* Add Project Button */}
          <button
            data-testid="add-project-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
          >
            <Plus size={18} />
            Add Project
          </button>
        </div>
      </div>

      {/* View Tabs - Live vs Completed */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeView === 'live'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={16} />
          Live Projects
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeView === 'live'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {liveCount}
          </span>
        </button>
        <button
          onClick={() => setActiveView('completed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeView === 'completed'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 size={16} />
          Completed Projects
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeView === 'completed'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {completedCount}
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                data-testid="search-input"
                placeholder="Search projects, clients, or PID..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              data-testid="status-filter"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Need to Start">Need to Start</option>
              <option value="Completed">Completed</option>
              <option value="Invoiced">Invoiced</option>
              <option value="Partially Invoiced">Partially Invoiced</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              data-testid="category-filter"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
            >
              <option value="">All Categories</option>
              <option value="PSS">PSS</option>
              <option value="AS">AS</option>
              <option value="OSS">OSS</option>
              <option value="CS">CS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filteredProjects.length}</span> projects
        </p>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.map((project, index) => (
          <div
            key={project.id}
            data-testid={`project-card-${index}`}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {project.project_name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeClass(
                      project.category
                    )}`}
                  >
                    {project.category}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{project.pid_no}</span>
                  <span>{project.client}</span>
                  <span>•</span>
                  <span>{project.location}</span>
                  <span>•</span>
                  <span className="font-medium">{project.engineer_in_charge}</span>
                  {project.linked_order_no && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <ChevronRight size={14} />
                        <span className="text-xs font-medium">Linked: {project.linked_order_no}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditProject(project)}
                  data-testid={`edit-project-btn-${index}`}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-all active:scale-95"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id, project.project_name)}
                  data-testid={`delete-project-btn-${index}`}
                  className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium hover:bg-rose-100 transition-all active:scale-95"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">PO Amount</p>
                <p className="text-sm font-semibold font-mono text-slate-900">
                  ₹{project.po_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Invoiced</p>
                <p className="text-sm font-semibold font-mono text-emerald-600">
                  ₹{project.invoiced_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Balance Amount</p>
                <p className="text-sm font-semibold font-mono text-amber-600">
                  ₹{((project.po_amount || 0) - (project.invoiced_amount || 0)).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">This Week</p>
                <p className="text-sm font-semibold font-mono text-violet-600">
                  ₹{project.this_week_billing.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Budget</p>
                <p className="text-sm font-semibold font-mono text-blue-600">
                  ₹{(project.budget || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">PID Savings</p>
                <p className={`text-sm font-semibold font-mono ${(project.pid_savings || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{(project.pid_savings || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Progress Bar & Target Date */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">Completion Progress</p>
                  <p className="text-xs font-semibold text-slate-900">{project.completion_percentage}%</p>
                </div>
                <Progress value={project.completion_percentage} className="h-2" />
              </div>
              {project.completion_date && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Target Date</p>
                  <p className="text-sm font-semibold text-orange-600">{project.completion_date}</p>
                </div>
              )}
            </div>

            {/* Weekly Actions */}
            {project.weekly_actions && (
              <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                <p className="text-xs font-medium text-sky-900 mb-1">Weekly Actions:</p>
                <p className="text-sm text-sky-700">{project.weekly_actions}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Vendor: <span className="text-slate-700 font-medium">{project.vendor}</span>
              </p>
              {project.po_number && (
                <p className="text-xs text-slate-500">
                  PO: <span className="font-mono text-slate-700">{project.po_number}</span>
                </p>
              )}
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No projects found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
