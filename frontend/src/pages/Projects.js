import React, { useState, useEffect, useRef, useCallback } from 'react';
import { projectsAPI } from '../services/api';
import { Search, Filter, Loader2, ChevronRight, Plus, Edit, Download, Upload, FileText, FileSpreadsheet, Trash2, CheckCircle2, Clock, RefreshCw, Package, Truck, CreditCard, ClipboardList, TrendingUp, Calendar } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import AddProjectModal from '../components/AddProjectModal';
import EditProjectModal from '../components/EditProjectModal';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

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
  const [projectRequests, setProjectRequests] = useState({}); // Cache for requests
  const [showRaiseRequestModal, setShowRaiseRequestModal] = useState(false);
  const [raiseRequestProject, setRaiseRequestProject] = useState(null);
  const fileInputRef = useRef(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
  });

  // Calculate work items completion
  const getWorkItemsStats = (workItems) => {
    if (!workItems || workItems.length === 0) return { total: 0, completed: 0, avgCompletion: 0 };
    const validItems = workItems.filter(w => w.description?.trim());
    if (validItems.length === 0) return { total: 0, completed: 0, avgCompletion: 0 };
    
    const completed = validItems.filter(w => w.status === 'Completed' || w.completion_percentage === 100).length;
    const avgCompletion = Math.round(
      validItems.reduce((sum, item) => sum + (item.completion_percentage || 0), 0) / validItems.length
    );
    return { total: validItems.length, completed, avgCompletion };
  };

  // Fetch project requests (cached)
  const fetchProjectRequests = async (projectId) => {
    if (projectRequests[projectId]) return projectRequests[projectId];
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/by-order/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjectRequests(prev => ({ ...prev, [projectId]: data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
    return { material: [], vendor: [], payment: [] };
  };

  // Load requests for visible projects
  useEffect(() => {
    if (projects.length > 0) {
      // Only load for first 20 visible projects to avoid too many requests
      projects.slice(0, 20).forEach(p => fetchProjectRequests(p.id));
    }
  }, [projects]);

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
        (project.project_name || '').toLowerCase().includes(searchLower) ||
        (project.client || '').toLowerCase().includes(searchLower) ||
        (project.pid_no || '').toLowerCase().includes(searchLower)
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
      <div className="space-y-3">
        {filteredProjects.map((project, index) => {
          const workStats = getWorkItemsStats(project.work_items);
          const requests = projectRequests[project.id] || { material: [], vendor: [], payment: [] };
          const pendingMaterial = requests.material?.filter(r => r.status === 'pending').length || 0;
          const pendingPayment = requests.payment?.filter(r => r.status === 'pending').length || 0;
          
          return (
            <div
              key={project.id}
              data-testid={`project-card-${index}`}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">{project.pid_no}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeClass(project.category)}`}>
                      {project.category}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(project.status)}`}>
                      {project.status}
                    </span>
                    {project.source_order_id && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200">
                        Business Hub
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 truncate max-w-xl">
                    {project.client || project.project_name || 'Unnamed Project'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {project.location && <span>{project.location} • </span>}
                    {project.engineer_in_charge && <span className="font-medium">{project.engineer_in_charge}</span>}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setRaiseRequestProject(project);
                      setShowRaiseRequestModal(true);
                    }}
                    data-testid={`raise-request-btn-${index}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-all"
                    title="Raise Request"
                  >
                    <Plus size={14} />
                    Request
                  </button>
                  <button
                    onClick={() => handleEditProject(project)}
                    data-testid={`edit-project-btn-${index}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 transition-all"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id, project.project_name)}
                    data-testid={`delete-project-btn-${index}`}
                    className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Main Content - 3 Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Column 1: Financials */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Financials
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">PO Amount</p>
                      <p className="font-semibold font-mono text-slate-800">₹{(project.po_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Invoiced</p>
                      <p className="font-semibold font-mono text-emerald-600">₹{(project.invoiced_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Balance</p>
                      <p className="font-semibold font-mono text-amber-600">₹{((project.po_amount || 0) - (project.invoiced_amount || 0)).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">This Week</p>
                      <p className="font-semibold font-mono text-violet-600">₹{(project.this_week_billing || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Work Items & Progress */}
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <ClipboardList size={12} />
                    Work Items & Progress
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-600">Items</span>
                      <span className="font-semibold text-amber-800">
                        {workStats.completed}/{workStats.total} completed
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${workStats.avgCompletion >= 100 ? 'bg-green-500' : 'bg-amber-500'} transition-all`}
                          style={{ width: `${Math.min(workStats.avgCompletion, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-amber-800 w-10">{workStats.avgCompletion || project.completion_percentage || 0}%</span>
                    </div>
                    {project.completion_date && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200">
                        <span className="text-amber-600 flex items-center gap-1">
                          <Calendar size={10} />
                          Target
                        </span>
                        <span className="font-medium text-amber-800">{project.completion_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3: Business Hub Requests */}
                <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                  <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1">
                    <Package size={12} />
                    Requests
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-lg py-1.5 px-2 border border-violet-100">
                      <Package size={14} className="mx-auto text-amber-500 mb-0.5" />
                      <p className="text-xs font-bold text-slate-800">{requests.material?.length || 0}</p>
                      <p className="text-[10px] text-slate-500">Material</p>
                      {pendingMaterial > 0 && (
                        <span className="text-[9px] text-amber-600 font-medium">{pendingMaterial} pending</span>
                      )}
                    </div>
                    <div className="bg-white rounded-lg py-1.5 px-2 border border-violet-100">
                      <Truck size={14} className="mx-auto text-blue-500 mb-0.5" />
                      <p className="text-xs font-bold text-slate-800">{requests.vendor?.length || 0}</p>
                      <p className="text-[10px] text-slate-500">Vendor</p>
                    </div>
                    <div className="bg-white rounded-lg py-1.5 px-2 border border-violet-100">
                      <CreditCard size={14} className="mx-auto text-green-500 mb-0.5" />
                      <p className="text-xs font-bold text-slate-800">{requests.payment?.length || 0}</p>
                      <p className="text-[10px] text-slate-500">Payment</p>
                      {pendingPayment > 0 && (
                        <span className="text-[9px] text-amber-600 font-medium">{pendingPayment} pending</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Budget Info */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">
                    Budget: <span className="font-mono font-medium text-blue-600">₹{(project.budget || 0).toLocaleString('en-IN')}</span>
                  </span>
                  <span className="text-slate-500">
                    Available: <span className={`font-mono font-semibold ${((project.budget || 0) - (project.actual_expenses || 0)) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{((project.budget || 0) - (project.actual_expenses || 0)).toLocaleString('en-IN')}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {project.vendor && (
                    <span className="text-slate-500">Vendor: <span className="text-slate-700">{project.vendor}</span></span>
                  )}
                  {project.po_number && (
                    <span className="text-slate-500">PO: <span className="font-mono text-slate-700">{project.po_number}</span></span>
                  )}
                </div>
              </div>

              {/* Weekly Actions - Collapsible */}
              {project.weekly_actions && (
                <div className="mt-2 p-2 bg-sky-50 border border-sky-100 rounded-lg text-xs">
                  <span className="font-medium text-sky-700">Weekly Actions: </span>
                  <span className="text-sky-600">{project.weekly_actions}</span>
                </div>
              )}
            </div>
          );
        })}

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
