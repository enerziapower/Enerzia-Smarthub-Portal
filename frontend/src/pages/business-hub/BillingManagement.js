/**
 * Billing Management - Business Hub Tab
 * 
 * Consolidates: Weekly billing from Projects
 * Purpose: Billing schedules and invoice tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Calendar, TrendingUp, FileText, RefreshCw,
  ChevronLeft, ChevronRight, Download, Filter, Search,
  CheckCircle, Clock, AlertTriangle, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

// Category configuration (from existing projects)
const CATEGORY_CONFIG = {
  PSS: { label: 'Projects & Services', color: 'violet' },
  AS: { label: 'Asset Services', color: 'blue' },
  OSS: { label: 'Other Sales & Services', color: 'amber' },
  CS: { label: 'Commercial Sales', color: 'green' }
};

const BillingManagement = () => {
  const [billingData, setBillingData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [stats, setStats] = useState({
    total_billing: 0,
    by_category: {},
    week_over_week: 0
  });

  // Get current week number and year
  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000);
    const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
    return { week, year: now.getFullYear() };
  }

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch projects with this week's billing
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Calculate billing stats
        const projectsWithBilling = data.filter(p => (p.this_week_billing || 0) > 0);
        const totalBilling = data.reduce((sum, p) => sum + (p.this_week_billing || 0), 0);
        
        const byCategory = {};
        Object.keys(CATEGORY_CONFIG).forEach(cat => {
          byCategory[cat] = data
            .filter(p => p.category === cat)
            .reduce((sum, p) => sum + (p.this_week_billing || 0), 0);
        });
        
        setStats({
          total_billing: totalBilling,
          by_category: byCategory,
          projects_with_billing: projectsWithBilling.length
        });
        
        setBillingData(projectsWithBilling);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

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

  return (
    <div className="space-y-6" data-testid="billing-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Billing Management</h2>
            <p className="text-sm text-slate-500">Weekly billing schedules and tracking</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Week Navigation */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-white rounded-lg"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 py-1 font-medium text-slate-700">
                Week {selectedWeek.week}, {selectedWeek.year}
              </span>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-white rounded-lg"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={fetchBillingData}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} />
            <span className="text-sm opacity-90">This Week</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.total_billing)}</p>
          <p className="text-xs opacity-75 mt-1">{stats.projects_with_billing} projects</p>
        </div>
        
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <div key={key} className={`bg-${config.color}-50 border border-${config.color}-200 rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className={`text-${config.color}-600`} />
              <span className="text-xs text-slate-600">{key}</span>
            </div>
            <p className={`text-xl font-bold text-${config.color}-700`}>
              {formatCurrency(stats.by_category[key] || 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Billing Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : billingData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No billing this week</h3>
          <p className="text-sm text-slate-500">Projects with billing will appear here</p>
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
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billingData.map((project) => {
                const catConfig = CATEGORY_CONFIG[project.category] || CATEGORY_CONFIG.PSS;
                const invoiceProgress = project.po_amount > 0 
                  ? ((project.invoiced_amount || 0) / project.po_amount) * 100 
                  : 0;
                
                return (
                  <tr key={project.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{project.pid_no}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{project.project_name}</p>
                      <p className="text-xs text-slate-500">{project.engineer_in_charge}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{project.client}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${catConfig.color}-100 text-${catConfig.color}-700`}>
                        {project.category}
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
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(invoiceProgress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={5} className="px-4 py-3 font-semibold text-slate-700">
                  Total ({billingData.length} projects)
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-600 text-lg">
                  {formatCurrency(stats.total_billing)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Category Summary Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Billing by Category</h3>
        <div className="space-y-4">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const amount = stats.by_category[key] || 0;
            const percentage = stats.total_billing > 0 ? (amount / stats.total_billing) * 100 : 0;
            
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{config.label}</span>
                  <span className="text-slate-600">
                    {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-${config.color}-500 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BillingManagement;
