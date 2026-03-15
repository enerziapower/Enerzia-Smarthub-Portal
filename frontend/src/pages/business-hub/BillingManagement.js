/**
 * Billing Management - Business Hub
 * 
 * Simplified billing view:
 * - Progress Tracking (completion % from Project & Services)
 * - Weekly Billing (read-only from Project & Services)
 * 
 * Note: Invoices/POs are managed in ZOHO Books
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Calendar, TrendingUp, RefreshCw,
  ChevronLeft, ChevronRight, Percent, BarChart3,
  CheckCircle, Clock, Play, Building2, Users
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

// Category configuration
const CATEGORY_CONFIG = {
  PSS: { label: 'Projects & Services', color: 'violet', bgColor: 'bg-violet-500' },
  AS: { label: 'Asset Services', color: 'blue', bgColor: 'bg-blue-500' },
  OSS: { label: 'Other Sales & Services', color: 'amber', bgColor: 'bg-amber-500' },
  CS: { label: 'Commercial Sales', color: 'green', bgColor: 'bg-green-500' }
};

const BillingManagement = () => {
  const [activeTab, setActiveTab] = useState('progress'); // 'progress', 'weekly'
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  
  const [stats, setStats] = useState({
    total_po_value: 0,
    total_invoiced: 0,
    total_pending: 0,
    avg_completion: 0,
    this_week_billing: 0,
    by_category: {}
  });

  // Get current week number and year
  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000);
    const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
    return { week, year: now.getFullYear() };
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  // Fetch projects from Project & Services
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data || []);
        
        // Calculate stats
        const totalPO = data.reduce((sum, p) => sum + (p.po_amount || 0), 0);
        const totalInvoiced = data.reduce((sum, p) => sum + (p.invoiced_amount || 0), 0);
        const thisWeekBilling = data.reduce((sum, p) => sum + (p.this_week_billing || 0), 0);
        
        // Calculate by category
        const byCategory = {};
        Object.keys(CATEGORY_CONFIG).forEach(cat => {
          const catProjects = data.filter(p => p.category?.toUpperCase() === cat);
          byCategory[cat] = {
            count: catProjects.length,
            po_value: catProjects.reduce((sum, p) => sum + (p.po_amount || 0), 0),
            invoiced: catProjects.reduce((sum, p) => sum + (p.invoiced_amount || 0), 0)
          };
        });

        // Calculate average completion
        const projectsWithPO = data.filter(p => p.po_amount > 0);
        const avgCompletion = projectsWithPO.length > 0
          ? Math.round(projectsWithPO.reduce((sum, p) => sum + ((p.invoiced_amount || 0) / p.po_amount * 100), 0) / projectsWithPO.length)
          : 0;

        setStats({
          total_po_value: totalPO,
          total_invoiced: totalInvoiced,
          total_pending: totalPO - totalInvoiced,
          avg_completion: avgCompletion,
          this_week_billing: thisWeekBilling,
          by_category: byCategory
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateWeek = (direction) => {
    setSelectedWeek(prev => {
      let newWeek = prev.week + direction;
      let newYear = prev.year;
      
      if (newWeek > 52) {
        newWeek = 1;
        newYear += 1;
      } else if (newWeek < 1) {
        newWeek = 52;
        newYear -= 1;
      }
      
      return { week: newWeek, year: newYear };
    });
  };

  // Get completion percentage for a project
  const getCompletionPercent = (project) => {
    if (project.po_amount && project.po_amount > 0) {
      return Math.round((project.invoiced_amount || 0) / project.po_amount * 100);
    }
    return 0;
  };

  // Filter projects with billing this week
  const projectsWithBilling = projects.filter(p => (p.this_week_billing || 0) > 0);

  // Live projects (not completed)
  const liveProjects = projects.filter(p => !['completed', 'invoiced'].includes(p.status?.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="billing-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-emerald-600" />
              Billing & Progress
            </h2>
            <p className="text-sm text-slate-500">Track project progress and weekly billing (Invoices in ZOHO Books)</p>
          </div>

          <button
            onClick={fetchData}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} />
            <span className="text-sm opacity-90">Total PO Value</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.total_po_value)}</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-blue-600" />
            <span className="text-sm text-slate-600">Invoiced</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(stats.total_invoiced)}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Pending</span>
          </div>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(stats.total_pending)}</p>
        </div>

        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={18} className="text-violet-600" />
            <span className="text-sm text-slate-600">Avg Completion</span>
          </div>
          <p className="text-xl font-bold text-violet-700">{stats.avg_completion}%</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-600" />
            <span className="text-sm text-slate-600">This Week</span>
          </div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(stats.this_week_billing)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'progress'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Percent size={16} />
          Progress Tracking
          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs">
            {liveProjects.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'weekly'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} />
          Weekly Billing
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
            {projectsWithBilling.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : activeTab === 'progress' ? (
        /* Progress Tracking Tab */
        <div className="space-y-4">
          {/* Category Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Progress by Category</h3>
            <div className="space-y-4">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const catData = stats.by_category[key] || { count: 0, po_value: 0, invoiced: 0 };
                const percentage = catData.po_value > 0 ? (catData.invoiced / catData.po_value) * 100 : 0;
                
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{config.label}</span>
                      <span className="text-slate-600">
                        {formatCurrency(catData.invoiced)} / {formatCurrency(catData.po_value)} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${config.bgColor} rounded-full transition-all`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{catData.count} projects</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Projects Progress */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Live Projects Progress</h3>
              <p className="text-xs text-slate-500">Completion based on invoiced vs PO amount</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">PID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Project / Client</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">PO Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Invoiced</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Completion</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Engineer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveProjects.slice(0, 20).map(project => {
                    const completion = getCompletionPercent(project);
                    const catConfig = CATEGORY_CONFIG[project.category?.toUpperCase()] || CATEGORY_CONFIG.PSS;
                    
                    return (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-sm font-medium text-slate-800">
                          {project.pid_no}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{project.project_name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{project.client}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${catConfig.color}-100 text-${catConfig.color}-700`}>
                            {project.category?.toUpperCase() || 'PSS'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            project.status?.toLowerCase() === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                            project.status?.toLowerCase() === 'need to start' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {project.status || 'Need to Start'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatCurrency(project.po_amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {formatCurrency(project.invoiced_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  completion >= 100 ? 'bg-green-500' :
                                  completion >= 50 ? 'bg-blue-500' :
                                  completion > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min(completion, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 w-8">{completion}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[100px]">
                          {project.engineer_in_charge || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {liveProjects.length > 20 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500 text-center">
                Showing 20 of {liveProjects.length} live projects
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Weekly Billing Tab */
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Weekly Billing Summary</h3>
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-white rounded-lg">
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 font-medium text-slate-700">
                  Week {selectedWeek.week}, {selectedWeek.year}
                </span>
                <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-white rounded-lg">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Weekly Billing Total */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">This Week Total Billing</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.this_week_billing)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Projects with Billing</p>
                <p className="text-3xl font-bold mt-1">{projectsWithBilling.length}</p>
              </div>
            </div>
          </div>

          {/* Projects with Weekly Billing */}
          {projectsWithBilling.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No billing this week</h3>
              <p className="text-sm text-slate-500">Projects with weekly billing will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">PO Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">This Week</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Invoiced</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Engineer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectsWithBilling.map((project) => {
                    const catConfig = CATEGORY_CONFIG[project.category?.toUpperCase()] || CATEGORY_CONFIG.PSS;
                    const invoiceProgress = project.po_amount > 0 
                      ? ((project.invoiced_amount || 0) / project.po_amount) * 100 
                      : 0;
                    
                    return (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-sm font-medium text-slate-800">{project.pid_no}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-800 truncate max-w-[150px]">{project.project_name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[150px]">{project.client}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${catConfig.color}-100 text-${catConfig.color}-700`}>
                            {project.category?.toUpperCase() || 'PSS'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatCurrency(project.po_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          {formatCurrency(project.this_week_billing)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div>
                            <span className="text-slate-700">{formatCurrency(project.invoiced_amount)}</span>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(invoiceProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[100px]">
                          {project.engineer_in_charge || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-semibold text-slate-700">
                      Total ({projectsWithBilling.length} projects)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 text-lg">
                      {formatCurrency(stats.this_week_billing)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Billing by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const catData = stats.by_category[key] || { count: 0, po_value: 0, invoiced: 0 };
                
                return (
                  <div key={key} className={`bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-4`}>
                    <p className="text-sm text-slate-600">{config.label}</p>
                    <p className={`text-xl font-bold text-${config.color}-700`}>{formatCurrency(catData.invoiced)}</p>
                    <p className="text-xs text-slate-500">{catData.count} projects</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingManagement;
