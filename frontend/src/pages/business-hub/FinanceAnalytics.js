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
          {/* Main Stats */}
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
                <span className="text-sm opacity-90">Net Profit</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.net_profit)}</p>
              <p className="text-xs opacity-75 mt-1">{stats.profit_margin}% margin</p>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={20} />
                <span className="text-sm opacity-90">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_expenses)}</p>
              <p className="text-xs opacity-75 mt-1">of {formatCurrency(stats.total_budget)} budget</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank size={20} />
                <span className="text-sm opacity-90">Total Savings</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_savings)}</p>
              <p className="text-xs opacity-75 mt-1">Budget vs Actual</p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">Total Invoiced</span>
                <Wallet size={18} className="text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.total_invoiced)}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Invoice Progress</span>
                  <span>{stats.total_revenue > 0 ? ((stats.total_invoiced / stats.total_revenue) * 100).toFixed(0) : 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${stats.total_revenue > 0 ? (stats.total_invoiced / stats.total_revenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">Pending Receivables</span>
                <ArrowUpRight size={18} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pending_receivables)}</p>
              <p className="text-xs text-slate-500 mt-2">Yet to be invoiced</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">Budget Utilization</span>
                <BarChart3 size={18} className="text-violet-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {stats.total_budget > 0 ? ((stats.total_expenses / stats.total_budget) * 100).toFixed(0) : 0}%
              </p>
              <div className="mt-2 h-2 bg-slate-100 rounded-full">
                <div 
                  className={`h-full rounded-full ${
                    (stats.total_expenses / stats.total_budget) > 1 ? 'bg-red-500' :
                    (stats.total_expenses / stats.total_budget) > 0.8 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((stats.total_expenses / stats.total_budget) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Category/Department Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance by Category</h3>
            <div className="space-y-4">
              {departmentData.map((dept) => {
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
                    
                    {/* Revenue vs Expense bar */}
                    <div className="mt-3 flex gap-2">
                      <div className="flex-1">
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* P&L Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">P&L Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Total Revenue (PO Value)</span>
                <span className="font-semibold text-slate-800">{formatCurrency(stats.total_revenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Total Invoiced</span>
                <span className="font-semibold text-slate-800">{formatCurrency(stats.total_invoiced)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">(-) Total Expenses</span>
                <span className="font-semibold text-red-600">- {formatCurrency(stats.total_expenses)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3 -mx-3">
                <span className="font-semibold text-slate-800">Net Profit</span>
                <span className={`text-xl font-bold ${stats.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.net_profit)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinanceAnalytics;
