/**
 * Project Management - Business Hub
 * 
 * Displays projects in table format (one line per project) - matching Order Management style
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Search, Filter, RefreshCw, Eye, X,
  CheckCircle, Clock, AlertTriangle, DollarSign, Users, Calendar,
  TrendingUp, Target, BarChart3, Percent, Play, Pause
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

// Project status configuration
const PROJECT_STATUS = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Play },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-700', icon: Pause },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

// Category configuration
const CATEGORY_CONFIG = {
  PSS: { label: 'Projects & Services', color: 'violet' },
  AS: { label: 'Asset Services', color: 'blue' },
  OSS: { label: 'Other Sales & Services', color: 'amber' },
  CS: { label: 'Commercial Sales', color: 'green' }
};

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, budget: 0, invoiced: 0 });

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Calculate stats
        const active = data.filter(p => p.status === 'in_progress' || p.status === 'Ongoing').length;
        const completed = data.filter(p => p.status === 'completed' || p.status === 'Completed').length;
        const totalBudget = data.reduce((sum, p) => sum + (p.budget || p.po_amount || 0), 0);
        const totalInvoiced = data.reduce((sum, p) => sum + (p.invoiced_amount || 0), 0);
        setStats({ total: data.length, active, completed, budget: totalBudget, invoiced: totalInvoiced });
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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    const matchesCategory = !categoryFilter || project.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-slate-300';
  };

  const getStatusConfig = (status) => {
    // Handle both lowercase and capitalized status values
    const normalizedStatus = status?.toLowerCase().replace(' ', '_');
    if (normalizedStatus === 'ongoing') return PROJECT_STATUS.in_progress;
    return PROJECT_STATUS[normalizedStatus] || PROJECT_STATUS.pending;
  };

  return (
    <div className="space-y-6" data-testid="project-management">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Project Management</h2>
            <p className="text-sm text-slate-500">Track project execution and progress</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{key} - {config.label}</option>
              ))}
            </select>

            {/* Refresh */}
            <button onClick={fetchProjects} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={20} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-sm text-slate-500">Total Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            <p className="text-sm text-slate-500">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-slate-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-600">{formatCurrency(stats.budget)}</p>
            <p className="text-sm text-slate-500">Total PO Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.invoiced)}</p>
            <p className="text-sm text-slate-500">Total Invoiced</p>
          </div>
        </div>
      </div>

      {/* Projects List - Table Format */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-slate-500">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 mb-1">No projects found</h3>
            <p className="text-sm text-slate-500">Projects will appear here when created</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            const catConfig = CATEGORY_CONFIG[project.category] || { color: 'slate' };
            const progress = project.progress || 0;
            const invoiceProgress = project.po_amount > 0 
              ? ((project.invoiced_amount || 0) / project.po_amount * 100).toFixed(0) 
              : 0;
            
            return (
              <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm font-semibold text-${catConfig.color}-600`}>{project.pid_no}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                        {project.status}
                      </span>
                      {project.category && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${catConfig.color}-100 text-${catConfig.color}-700`}>
                          {project.category}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800 truncate">{project.project_name}</p>
                    <p className="text-sm text-slate-500">{project.client}</p>
                  </div>

                  {/* Financials - Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">PO Value</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(project.po_amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Budget</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(project.budget)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Expenses</p>
                      <p className="font-semibold text-purple-600">{formatCurrency(project.actual_expenses)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Invoiced</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(project.invoiced_amount)} ({invoiceProgress}%)
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedProject(project); setShowProjectDetail(true); }}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    {/* Project Progress */}
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Project Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getProgressColor(progress)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    {/* Invoice Progress */}
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Invoice Progress</span>
                        <span className="font-medium">{invoiceProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(invoiceProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Engineer */}
                    {project.engineer_in_charge && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Users size={14} />
                        <span>{project.engineer_in_charge}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Project Detail Modal */}
      {showProjectDetail && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-violet-600 font-semibold">{selectedProject.pid_no}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusConfig(selectedProject.status).color}`}>
                    {selectedProject.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedProject.project_name}</h3>
                <p className="text-sm text-slate-500">{selectedProject.client}</p>
              </div>
              <button
                onClick={() => setShowProjectDetail(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Project Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Category</label>
                  <p className="font-medium text-slate-800">{selectedProject.category || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Engineer</label>
                  <p className="font-medium text-slate-800">{selectedProject.engineer_in_charge || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">PO Date</label>
                  <p className="font-medium text-slate-800">{selectedProject.po_date || '-'}</p>
                </div>
              </div>

              {/* Financials */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">PO Value</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedProject.po_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Budget</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedProject.budget)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Expenses</p>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(selectedProject.actual_expenses)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Invoiced</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedProject.invoiced_amount)}</p>
                  </div>
                </div>
              </div>

              {/* Savings & Billing */}
              <div className="bg-emerald-50 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-800 mb-3">Savings & Billing</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-emerald-600">PID Savings</p>
                    <p className="text-lg font-bold text-emerald-800">{formatCurrency(selectedProject.pid_savings)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600">This Week Billing</p>
                    <p className="text-lg font-bold text-emerald-800">{formatCurrency(selectedProject.this_week_billing)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-600">Pending Invoice</p>
                    <p className="text-lg font-bold text-emerald-800">
                      {formatCurrency((selectedProject.po_amount || 0) - (selectedProject.invoiced_amount || 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-3">Progress</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Project Completion</span>
                      <span className="font-medium">{selectedProject.progress || 0}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getProgressColor(selectedProject.progress || 0)}`}
                        style={{ width: `${selectedProject.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Invoice Progress</span>
                      <span className="font-medium">
                        {selectedProject.po_amount > 0 
                          ? ((selectedProject.invoiced_amount || 0) / selectedProject.po_amount * 100).toFixed(0) 
                          : 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-emerald-500"
                        style={{ 
                          width: `${selectedProject.po_amount > 0 
                            ? Math.min((selectedProject.invoiced_amount || 0) / selectedProject.po_amount * 100, 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
