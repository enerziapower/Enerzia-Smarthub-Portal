/**
 * Finance Analytics - Business Hub Tab
 * 
 * Combines: P&L, Savings, Cash Flow from Finance dept
 * Purpose: Financial overview and analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank, ArrowUpRight,
  ArrowDownRight, BarChart3, PieChart, RefreshCw, Calendar,
  Download, Filter, Wallet, CreditCard, Receipt, Building2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const FinanceAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    profit_margin: 0,
    pending_receivables: 0,
    pending_payables: 0
  });
  const [projectPnL, setProjectPnL] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch project P&L dashboard from new API
      const dashboardRes = await fetch(`${API_URL}/api/project-requests/finance-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (dashboardRes.ok) {
        const dashData = await dashboardRes.json();
        setDashboardData(dashData);
        setProjectPnL(dashData.projects || []);
        
        // Update stats from dashboard
        setStats({
          total_revenue: dashData.summary?.total_revenue || 0,
          total_expenses: dashData.summary?.total_actual_cost || 0,
          total_budget: dashData.summary?.total_budgeted_cost || 0,
          net_profit: dashData.summary?.gross_profit || 0,
          profit_margin: dashData.summary?.total_revenue > 0 
            ? ((dashData.summary?.gross_profit / dashData.summary?.total_revenue) * 100).toFixed(1) 
            : 0,
          budget_variance: dashData.summary?.budget_variance || 0,
          project_count: dashData.summary?.total_projects || 0
        });
      }
      
      // Also fetch legacy projects for historical data
      const projectsRes = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        
        // Calculate by category (department proxy)
        const byCategory = {};
        projects.forEach(p => {
          const cat = p.category || 'Other';
          if (!byCategory[cat]) {
            byCategory[cat] = { revenue: 0, expenses: 0, savings: 0, count: 0 };
          }
          byCategory[cat].revenue += (p.po_amount || 0);
          byCategory[cat].expenses += (p.actual_expenses || 0);
          byCategory[cat].savings += (p.pid_savings || 0);
          byCategory[cat].count += 1;
        });
        
        setDepartmentData(Object.entries(byCategory).map(([name, data]) => ({
          name,
          ...data,
          profit: data.revenue - data.expenses
        })));
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const CATEGORY_COLORS = {
    PSS: { bg: 'bg-violet-100', text: 'text-violet-700', bar: 'bg-violet-500' },
    AS: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
    OSS: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
    CS: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
    Other: { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-500' }
  };

  return (
    <div className="space-y-6" data-testid="finance-analytics">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-600" />
              Finance Analytics
            </h2>
            <p className="text-sm text-slate-500">P&L, Project Profitability, and Cash Flow Overview</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
              <option value="all">All Time</option>
            </select>

            <button
              onClick={fetchFinanceData}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-t border-slate-200 pt-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'overview' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('project_pnl')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'project_pnl' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Project P&L
          </button>
          <button
            onClick={() => setActiveTab('by_category')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'by_category' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            By Category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <>
          {/* Main Stats - Always visible */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={20} />
                <span className="text-sm opacity-90">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_revenue)}</p>
              <p className="text-xs opacity-75 mt-1">{stats.project_count} projects</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} />
                <span className="text-sm opacity-90">Gross Profit</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.net_profit)}</p>
              <p className="text-xs opacity-75 mt-1">{stats.profit_margin}% margin</p>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={20} />
                <span className="text-sm opacity-90">Total Costs</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_expenses)}</p>
              <p className="text-xs opacity-75 mt-1">of {formatCurrency(stats.total_budget)} budget</p>
            </div>

            <div className={`bg-gradient-to-br ${stats.budget_variance > 0 ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-green-600'} rounded-xl p-4 text-white`}>
              <div className="flex items-center gap-2 mb-2">
                {stats.budget_variance > 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                <span className="text-sm opacity-90">Budget Variance</span>
              </div>
              <p className="text-2xl font-bold">{stats.budget_variance > 0 ? '+' : ''}{formatCurrency(stats.budget_variance)}</p>
              <p className="text-xs opacity-75 mt-1">{stats.budget_variance > 0 ? 'Over Budget' : 'Under Budget'}</p>
            </div>
          </div>

          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Request Summary */}
              {dashboardData?.request_totals && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Receipt size={18} className="text-amber-600" />
                      </div>
                      <span className="text-sm text-slate-600">Material Requests</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{dashboardData.request_totals.materials?.count || 0}</p>
                    <p className="text-sm text-slate-500">{formatCurrency(dashboardData.request_totals.materials?.value || 0)}</p>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 size={18} className="text-blue-600" />
                      </div>
                      <span className="text-sm text-slate-600">Vendor Requests</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{dashboardData.request_totals.vendors?.count || 0}</p>
                    <p className="text-sm text-slate-500">{formatCurrency(dashboardData.request_totals.vendors?.value || 0)}</p>
                  </div>
                  <div className="bg-white border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CreditCard size={18} className="text-green-600" />
                      </div>
                      <span className="text-sm text-slate-600">Payment Requests</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{dashboardData.request_totals.payments?.count || 0}</p>
                    <p className="text-sm text-slate-500">{formatCurrency(dashboardData.request_totals.payments?.value || 0)}</p>
                  </div>
                </div>
              )}

              {/* P&L Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">P&L Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Total Revenue (Order Value)</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(stats.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">(-) Material Costs</span>
                    <span className="font-semibold text-red-600">- {formatCurrency(dashboardData?.request_totals?.materials?.value || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">(-) Vendor Costs</span>
                    <span className="font-semibold text-red-600">- {formatCurrency(dashboardData?.request_totals?.vendors?.value || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">(-) Payments</span>
                    <span className="font-semibold text-red-600">- {formatCurrency(dashboardData?.request_totals?.payments?.value || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3 -mx-3">
                    <span className="font-semibold text-slate-800">Gross Profit</span>
                    <span className={`text-xl font-bold ${stats.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.net_profit)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Project P&L Tab Content */}
          {activeTab === 'project_pnl' && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Project-wise Profit & Loss</h3>
                <p className="text-sm text-slate-500">Track profitability for each project</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Order Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Costs</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Profit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Margin</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projectPnL.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                          <BarChart3 size={32} className="mx-auto text-slate-300 mb-2" />
                          <p>No project data available</p>
                          <p className="text-sm">Accept orders in Project Management to see P&L</p>
                        </td>
                      </tr>
                    ) : (
                      projectPnL.map((project) => (
                        <tr key={project.order_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-medium text-violet-600">{project.order_no}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                            {project.customer_name}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">
                            {formatCurrency(project.order_value)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-600">
                            {formatCurrency(project.total_costs)}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(project.profit)}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${project.profit_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {project.profit_percent}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              project.project_status === 'completed' ? 'bg-green-100 text-green-700' :
                              project.project_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              project.project_status === 'accepted' ? 'bg-violet-100 text-violet-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {project.project_status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Category Breakdown Tab Content */}
          {activeTab === 'by_category' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance by Category</h3>
              <div className="space-y-4">
                {departmentData.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No category data available</p>
                ) : (
                  departmentData.map((dept) => {
                    const colors = CATEGORY_COLORS[dept.name] || CATEGORY_COLORS.Other;
                    const profitMargin = dept.revenue > 0 ? (dept.profit / dept.revenue) * 100 : 0;
                    
                    return (
                      <div key={dept.name} className="border border-slate-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                              {dept.name}
                            </span>
                            <span className="text-sm text-slate-500">{dept.count} projects</span>
                          </div>
                          <span className={`text-sm font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitMargin.toFixed(1)}% margin
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Revenue</span>
                            <p className="font-semibold text-slate-800">{formatCurrency(dept.revenue)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Expenses</span>
                            <p className="font-semibold text-slate-800">{formatCurrency(dept.expenses)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Profit</span>
                            <p className={`font-semibold ${dept.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(dept.profit)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Savings</span>
                            <p className={`font-semibold ${dept.savings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {formatCurrency(dept.savings)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Revenue bar */}
                        <div className="mt-3">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={colors.bar}
                              style={{ 
                                width: `${stats.total_revenue > 0 ? (dept.revenue / stats.total_revenue) * 100 : 0}%`,
                                height: '100%'
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">Revenue share</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinanceAnalytics;
