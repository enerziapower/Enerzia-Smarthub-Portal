/**
 * Project Management Page - Revamped
 * 
 * Similar to Order Management:
 * - Dashboard tab with stats
 * - Projects list with pipeline workflow
 * - Budget tracking (linked to orders)
 * - Action buttons: Payment Request, Material Request, Delivery Request
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Clock, CheckCircle, PlayCircle, Receipt, DollarSign,
  Search, RefreshCw, Edit2, Eye, X, Save, ChevronRight, AlertCircle,
  Building2, User, Calendar, FileText, CreditCard, Package, Truck,
  TrendingUp, Percent, Plus, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status Pipeline Configuration
const PROJECT_PIPELINE = [
  { id: 'Need to Start', label: 'Need to Start', color: 'amber', icon: Clock },
  { id: 'Ongoing', label: 'Ongoing', color: 'blue', icon: PlayCircle },
  { id: 'Completed', label: 'Completed', color: 'green', icon: CheckCircle },
  { id: 'Invoiced', label: 'Invoiced', color: 'emerald', icon: Receipt },
  { id: 'Paid', label: 'Paid', color: 'teal', icon: DollarSign },
  { id: 'Closed', label: 'Closed', color: 'slate', icon: CheckCircle },
];

// Format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    if (dateStr.includes('/')) return dateStr;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const ProjectLifecycle = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    needToStart: 0,
    ongoing: 0,
    completed: 0,
    totalBudget: 0,
    totalExpenses: 0
  });

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Calculate stats
        const needToStart = data.filter(p => p.status === 'Need to Start').length;
        const ongoing = data.filter(p => p.status === 'Ongoing').length;
        const completed = data.filter(p => ['Completed', 'Invoiced', 'Paid', 'Closed'].includes(p.status)).length;
        const totalBudget = data.reduce((sum, p) => sum + (p.budget || p.po_amount || 0), 0);
        const totalExpenses = data.reduce((sum, p) => sum + (p.actual_expenses || 0), 0);
        
        setStats({
          total: data.length,
          needToStart,
          ongoing,
          completed,
          totalBudget,
          totalExpenses
        });
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

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = !searchTerm ||
      p.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.linked_order_no?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get pipeline step index
  const getPipelineIndex = (status) => {
    const index = PROJECT_PIPELINE.findIndex(p => p.id === status);
    return index >= 0 ? index : 0;
  };

  // View project details
  const handleViewProject = (project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  // Navigate to Payment Request with project pre-selected
  const handlePaymentRequest = (project) => {
    navigate(`/projects/payment-requests?project_id=${project.id}&pid=${project.pid_no}`);
  };

  // Navigate to Material Request (Purchase module)
  const handleMaterialRequest = (project) => {
    navigate(`/purchase/requirements?project_id=${project.id}&pid=${project.pid_no}`);
  };

  // Navigate to Delivery Request
  const handleDeliveryRequest = (project) => {
    toast.info('Delivery request feature coming soon');
    // navigate(`/projects/delivery-request?project_id=${project.id}`);
  };

  // Calculate profit/margin
  const calculateProfit = (project) => {
    const budget = project.budget || project.po_amount || 0;
    const expenses = project.actual_expenses || 0;
    const profit = budget - expenses;
    const percentage = budget > 0 ? ((profit / budget) * 100).toFixed(0) : 0;
    return { profit, percentage };
  };

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
          <p className="text-slate-500 mt-1">Track projects from execution to delivery with budget control</p>
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

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'projects' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Projects ({filteredProjects.length})
          </button>
        </nav>
      </div>

      {activeTab === 'dashboard' ? (
        /* Dashboard Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderKanban className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Projects</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Need to Start</p>
                <p className="text-2xl font-bold text-amber-700">{stats.needToStart}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <PlayCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ongoing</p>
                <p className="text-2xl font-bold text-blue-700">{stats.ongoing}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-green-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              </div>
            </div>
          </div>

          {/* Budget Summary */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-900 mb-4">Budget Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Total Budget</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalBudget)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Expenses</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Budget Utilization</span>
                <span className="font-medium">{stats.totalBudget > 0 ? ((stats.totalExpenses / stats.totalBudget) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (stats.totalExpenses / stats.totalBudget) > 0.9 ? 'bg-red-500' :
                    (stats.totalExpenses / stats.totalBudget) > 0.7 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((stats.totalExpenses / stats.totalBudget) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Profit Summary */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-900 mb-4">Profit Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Total Profit</p>
                <p className={`text-xl font-bold ${(stats.totalBudget - stats.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.totalBudget - stats.totalExpenses)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Margin</p>
                <p className={`text-xl font-bold ${(stats.totalBudget - stats.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalBudget > 0 ? (((stats.totalBudget - stats.totalExpenses) / stats.totalBudget) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Projects List Tab */
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PID, client, order no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="search-input"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="status-filter"
            >
              <option value="">All Status</option>
              {PROJECT_PIPELINE.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Projects List */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">No projects found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="projects-list">
              {filteredProjects.map((project) => {
                const { profit, percentage } = calculateProfit(project);
                const pipelineIndex = getPipelineIndex(project.status);
                const isOverBudget = (project.actual_expenses || 0) > (project.budget || project.po_amount || 0);
                
                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                    data-testid={`project-${project.id}`}
                  >
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-slate-900">{project.pid_no}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            project.status === 'Completed' || project.status === 'Invoiced' ? 'bg-green-100 text-green-700' :
                            project.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                            project.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {project.status || 'Need to Start'}
                          </span>
                          {project.linked_order_no && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              Order: {project.linked_order_no}
                            </span>
                          )}
                          {isOverBudget && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Over Budget
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            {project.client || 'No client'}
                          </span>
                          {project.engineer_in_charge && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4 text-slate-400" />
                              {project.engineer_in_charge}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(project.project_date)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewProject(project)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePaymentRequest(project)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Payment Request"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMaterialRequest(project)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Material Request"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeliveryRequest(project)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Delivery Request"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Budget Info */}
                    <div className="grid grid-cols-4 gap-4 mb-4 py-3 border-y border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Budget</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(project.budget || project.po_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Expenses</p>
                        <p className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-slate-900'}`}>
                          {formatCurrency(project.actual_expenses || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Balance</p>
                        <p className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Profit</p>
                        <p className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)} ({percentage}%)
                        </p>
                      </div>
                    </div>

                    {/* Pipeline Progress */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {PROJECT_PIPELINE.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index === pipelineIndex;
                        const isPast = index < pipelineIndex;
                        
                        return (
                          <React.Fragment key={step.id}>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              isActive ? `bg-${step.color}-100 text-${step.color}-700 ring-2 ring-${step.color}-300` :
                              isPast ? `bg-${step.color}-50 text-${step.color}-600` :
                              'bg-slate-100 text-slate-400'
                            }`}>
                              <StepIcon className="w-3.5 h-3.5" />
                              {step.label}
                            </div>
                            {index < PROJECT_PIPELINE.length - 1 && (
                              <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                                isPast ? 'text-green-400' : 'text-slate-300'
                              }`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Completion Progress */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Completion Progress</span>
                        <span className="font-medium text-slate-700">{project.completion_percentage || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${project.completion_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Project Details Modal */}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="project-details-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedProject.pid_no}</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedProject.client}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  selectedProject.status === 'Completed' ? 'bg-green-100 text-green-700' :
                  selectedProject.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {selectedProject.status || 'Need to Start'}
                </span>
                {selectedProject.linked_order_no && (
                  <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full">
                    Linked Order: {selectedProject.linked_order_no}
                  </span>
                )}
              </div>

              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Project Name</p>
                  <p className="font-medium text-slate-900">{selectedProject.project_name || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Category</p>
                  <p className="font-medium text-slate-900">{selectedProject.category || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Engineer in Charge</p>
                  <p className="font-medium text-slate-900">{selectedProject.engineer_in_charge || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Location</p>
                  <p className="font-medium text-slate-900">{selectedProject.location || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Start Date</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedProject.project_date)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Target Completion</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedProject.completion_date)}</p>
                </div>
              </div>

              {/* Budget Details */}
              <div>
                <h3 className="font-medium text-slate-900 mb-3">Budget & Expenses</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 mb-1">Budget</p>
                    <p className="font-bold text-blue-900">{formatCurrency(selectedProject.budget || selectedProject.po_amount)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-600 mb-1">Expenses</p>
                    <p className="font-bold text-red-900">{formatCurrency(selectedProject.actual_expenses || 0)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 mb-1">Balance</p>
                    <p className="font-bold text-green-900">{formatCurrency((selectedProject.budget || selectedProject.po_amount || 0) - (selectedProject.actual_expenses || 0))}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 mb-1">Invoiced</p>
                    <p className="font-bold text-purple-900">{formatCurrency(selectedProject.invoiced_amount || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Completion */}
              <div>
                <h3 className="font-medium text-slate-900 mb-3">Completion Progress</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${selectedProject.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-lg text-slate-900">{selectedProject.completion_percentage || 0}%</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handlePaymentRequest(selectedProject);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <CreditCard className="w-4 h-4" />
                  Payment Request
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleMaterialRequest(selectedProject);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Package className="w-4 h-4" />
                  Material Request
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDeliveryRequest(selectedProject);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Truck className="w-4 h-4" />
                  Delivery Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectLifecycle;
