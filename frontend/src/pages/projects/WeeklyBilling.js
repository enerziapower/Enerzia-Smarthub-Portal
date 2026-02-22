/**
 * Weekly Billing Page
 * 
 * Allows Project Managers to:
 * - Submit weekly billing entries for projects
 * - Track billing history
 * - View billing summaries
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Calendar, Search, RefreshCw, Plus, X, Save,
  TrendingUp, FileText, Building2, User, ChevronDown, ChevronRight,
  Clock, CheckCircle, AlertCircle, Edit2, Trash2, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Get current week range
const getCurrentWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: `${formatDate(monday)} - ${formatDate(sunday)}`
  };
};

const WeeklyBilling = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [billingEntries, setBillingEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Ongoing');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Billing form
  const [billingForm, setBillingForm] = useState({
    billing_amount: '',
    completion_percentage: '',
    work_done_description: '',
    remarks: ''
  });

  const currentWeek = getCurrentWeekRange();

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/projects`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  // Fetch current week billing summary
  const fetchBillingSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/project-orders/weekly-billing/summary/current-week`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching billing summary:', err);
    }
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchBillingSummary()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProjects, fetchBillingSummary]);

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchProjects(), fetchBillingSummary()]);
    setLoading(false);
    toast.success('Data refreshed');
  };

  // Open add billing modal
  const openAddBillingModal = (project) => {
    setSelectedProject(project);
    setBillingForm({
      billing_amount: '',
      completion_percentage: project.completion_percentage || 0,
      work_done_description: '',
      remarks: ''
    });
    setShowAddModal(true);
  };

  // Submit billing entry
  const handleSubmitBilling = async (e) => {
    e.preventDefault();
    
    if (!billingForm.billing_amount || parseFloat(billingForm.billing_amount) <= 0) {
      toast.error('Please enter a valid billing amount');
      return;
    }
    
    if (!billingForm.work_done_description.trim()) {
      toast.error('Please describe the work done');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        project_id: selectedProject.id,
        billing_amount: parseFloat(billingForm.billing_amount),
        completion_percentage: parseInt(billingForm.completion_percentage) || 0,
        work_done_description: billingForm.work_done_description,
        remarks: billingForm.remarks
      };
      
      const res = await fetch(`${API}/api/project-orders/weekly-billing`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success('Weekly billing submitted successfully');
        setShowAddModal(false);
        setSelectedProject(null);
        // Refresh data
        await Promise.all([fetchProjects(), fetchBillingSummary()]);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to submit billing');
      }
    } catch (err) {
      console.error('Error submitting billing:', err);
      toast.error('Failed to submit billing');
    } finally {
      setSaving(false);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = !searchTerm ||
      p.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const ongoingProjects = projects.filter(p => p.status === 'Ongoing').length;
  const thisWeekTotal = summary?.total_billing || 0;
  const entriesThisWeek = summary?.entries_count || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="weekly-billing-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Billing</h1>
          <p className="text-slate-500 mt-1">Submit weekly billing entries for projects</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          data-testid="refresh-btn"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Current Week Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Current Week</p>
            <p className="text-sm text-blue-700">{currentWeek.label}</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ongoing Projects</p>
              <p className="text-2xl font-bold text-slate-900">{ongoingProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">This Week Billing</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(thisWeekTotal)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Entries This Week</p>
              <p className="text-2xl font-bold text-slate-900">{entriesThisWeek}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          data-testid="status-filter"
        >
          <option value="">All Status</option>
          <option value="Need to Start">Need to Start</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Invoiced">Invoiced</option>
        </select>
      </div>

      {/* Projects List */}
      <div className="space-y-4" data-testid="projects-list">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">No projects found</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div 
              key={project.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              data-testid={`project-${project.id}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-slate-900">{project.pid_no}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      project.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                      project.status === 'Invoiced' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {project.status || 'Need to Start'}
                    </span>
                    {project.category && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                        {project.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{project.client || 'No client'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>{project.engineer_in_charge || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <span>PO: {formatCurrency(project.po_amount)}</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Completion</span>
                      <span className="font-medium text-slate-700">{project.completion_percentage || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${project.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* This Week Billing */}
                  {project.this_week_billing > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      This week: {formatCurrency(project.this_week_billing)}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAddBillingModal(project)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    data-testid={`add-billing-btn-${project.id}`}
                  >
                    <Plus className="h-4 w-4" />
                    Add Billing
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Billing Modal */}
      {showAddModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="add-billing-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Add Weekly Billing</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedProject.pid_no} - {selectedProject.client}</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitBilling} className="p-6 space-y-5">
              {/* Week Info */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Week: {currentWeek.label}</span>
                </div>
              </div>
              
              {/* Project Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">PO Amount:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(selectedProject.po_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current Completion:</span>
                  <span className="font-medium text-slate-900">{selectedProject.completion_percentage || 0}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Previous Billing:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(selectedProject.invoiced_amount || 0)}</span>
                </div>
              </div>

              {/* Billing Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Billing Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                  <input
                    type="number"
                    value={billingForm.billing_amount}
                    onChange={(e) => setBillingForm({...billingForm, billing_amount: e.target.value})}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter billing amount"
                    required
                    data-testid="billing-amount-input"
                  />
                </div>
              </div>

              {/* Completion Percentage */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Updated Completion %
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={billingForm.completion_percentage}
                    onChange={(e) => setBillingForm({...billingForm, completion_percentage: e.target.value})}
                    className="flex-1"
                    data-testid="completion-slider"
                  />
                  <span className="w-12 text-center font-medium text-slate-900">{billingForm.completion_percentage}%</span>
                </div>
              </div>

              {/* Work Done Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Work Done Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={billingForm.work_done_description}
                  onChange={(e) => setBillingForm({...billingForm, work_done_description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Describe the work completed this week..."
                  required
                  data-testid="work-description-input"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Remarks (Optional)
                </label>
                <textarea
                  value={billingForm.remarks}
                  onChange={(e) => setBillingForm({...billingForm, remarks: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Any additional remarks..."
                  data-testid="remarks-input"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  data-testid="submit-billing-btn"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Submit Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyBilling;
