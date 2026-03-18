/**
 * Finance Analytics - Business Hub Tab
 * 
 * Purpose: Financial overview showing Project Profitability
 * 
 * PROFIT CALCULATION:
 * Profit = Order Amount - Actual Expenses (from Expense Management)
 * 
 * NOTE: Only APPROVED expenses from Expense Management are counted
 * Requests (Material, Vendor, Payment) are workflow items, NOT expenses
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
    total_budget: 0,
    project_count: 0
  });
  const [projectPnL, setProjectPnL] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch all projects
      const projectsRes = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let projects = [];
      if (projectsRes.ok) {
        projects = await projectsRes.json();
      }
      
      // Fetch all approved expenses from Expense Management
      const expensesRes = await fetch(`${API_URL}/api/expense-management/expenses?status=approved&limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let approvedExpenses = [];
      if (expensesRes.ok) {
        const expenseData = await expensesRes.json();
        approvedExpenses = expenseData.expenses || [];
      }
      
      // Group expenses by order_id
      const expensesByOrder = {};
      approvedExpenses.forEach(expense => {
        if (!expensesByOrder[expense.order_id]) {
          expensesByOrder[expense.order_id] = {
            total: 0,
            count: 0,
            byCategory: {}
          };
        }
        expensesByOrder[expense.order_id].total += expense.amount || 0;
        expensesByOrder[expense.order_id].count += 1;
        
        const cat = expense.category || 'misc';
        if (!expensesByOrder[expense.order_id].byCategory[cat]) {
          expensesByOrder[expense.order_id].byCategory[cat] = 0;
        }
        expensesByOrder[expense.order_id].byCategory[cat] += expense.amount || 0;
      });
      
      // Calculate P&L for each project
      // Try to match projects with their source orders
      const projectPnLData = [];
      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalBudget = 0;
      
      // Also fetch orders for matching
      const ordersRes = await fetch(`${API_URL}/api/order-lifecycle/orders?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let orders = [];
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        orders = ordersData.orders || ordersData || [];
      }
      
      // Create order map
      const orderMap = {};
      orders.forEach(order => {
        orderMap[order.id] = order;
      });
      
      // Process each project
      projects.forEach(project => {
        const orderAmount = project.po_amount || 0;
        const budget = project.budget || 0;
        
        // Find expenses for this project
        // Try matching by source_order_id first, then by project.id
        let projectExpenses = expensesByOrder[project.source_order_id] || expensesByOrder[project.id] || { total: 0, count: 0, byCategory: {} };
        
        // Also check if there's a matching order by order_no
        if (projectExpenses.total === 0 && project.pid_no) {
          const matchingOrder = orders.find(o => o.order_no === project.pid_no || o.order_no === project.source_order_no);
          if (matchingOrder) {
            projectExpenses = expensesByOrder[matchingOrder.id] || { total: 0, count: 0, byCategory: {} };
          }
        }
        
        const actualExpenses = projectExpenses.total;
        const profit = orderAmount - actualExpenses;
        const profitPercent = orderAmount > 0 ? ((profit / orderAmount) * 100).toFixed(1) : 0;
        
        totalRevenue += orderAmount;
        totalExpenses += actualExpenses;
        totalBudget += budget;
        
        if (orderAmount > 0 || actualExpenses > 0) {
          projectPnLData.push({
            project_id: project.id,
            pid_no: project.pid_no,
            project_name: project.project_name,
            client: project.client,
            category: project.category,
            order_amount: orderAmount,
            budget: budget,
            actual_expenses: actualExpenses,
            expense_count: projectExpenses.count,
            profit: profit,
            profit_percent: parseFloat(profitPercent),
            available_budget: budget - actualExpenses,
            status: project.status
          });
        }
      });
      
      // Sort by order amount descending
      projectPnLData.sort((a, b) => b.order_amount - a.order_amount);
      setProjectPnL(projectPnLData);
      
      // Calculate overall stats
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
      
      setStats({
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        total_budget: totalBudget,
        net_profit: netProfit,
        profit_margin: parseFloat(profitMargin),
        project_count: projectPnLData.length
      });
      
      // Calculate by category
      const byCategory = {};
      projectPnLData.forEach(p => {
        const cat = p.category || 'Other';
        if (!byCategory[cat]) {
          byCategory[cat] = { revenue: 0, expenses: 0, profit: 0, count: 0 };
        }
        byCategory[cat].revenue += p.order_amount;
        byCategory[cat].expenses += p.actual_expenses;
        byCategory[cat].profit += p.profit;
        byCategory[cat].count += 1;
      });
      
      setDepartmentData(Object.entries(byCategory).map(([name, data]) => ({
        name,
        ...data
      })));
      
      // Expenses by category (from expense management)
      const expenseCategoryTotals = {};
      approvedExpenses.forEach(expense => {
        const cat = expense.category || 'misc';
        if (!expenseCategoryTotals[cat]) {
          expenseCategoryTotals[cat] = { amount: 0, count: 0 };
        }
        expenseCategoryTotals[cat].amount += expense.amount || 0;
        expenseCategoryTotals[cat].count += 1;
      });
      
      setExpensesByCategory(Object.entries(expenseCategoryTotals).map(([category, data]) => ({
        category,
        ...data
      })).sort((a, b) => b.amount - a.amount));
      
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

  const EXPENSE_CATEGORY_LABELS = {
    material_purchase: 'Material Purchase',
    labor: 'Labor / Manpower',
    transport: 'Transport & Logistics',
    site_expenses: 'Site Expenses',
    subcontractor: 'Subcontractor',
    equipment_rental: 'Equipment Rental',
    travel: 'Travel & Accommodation',
    misc: 'Miscellaneous'
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
            <p className="text-sm text-slate-500">Project Profitability based on Actual Expenses</p>
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
          <button
            onClick={() => setActiveTab('expense_breakdown')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'expense_breakdown' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Expense Breakdown
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

            <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={20} />
                <span className="text-sm opacity-90">Actual Expenses</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_expenses)}</p>
              <p className="text-xs opacity-75 mt-1">From Expense Management</p>
            </div>

            <div className={`bg-gradient-to-br ${stats.net_profit >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'} rounded-xl p-4 text-white`}>
              <div className="flex items-center gap-2 mb-2">
                {stats.net_profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="text-sm opacity-90">Net Profit</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.net_profit)}</p>
              <p className="text-xs opacity-75 mt-1">{stats.profit_margin}% margin</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={20} />
                <span className="text-sm opacity-90">Total Budget</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.total_budget)}</p>
              <p className="text-xs opacity-75 mt-1">Allocated for execution</p>
            </div>
          </div>

          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* P&L Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Profit & Loss Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Total Order Value (Revenue)</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(stats.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">(-) Actual Expenses</span>
                    <span className="font-semibold text-red-600">- {formatCurrency(stats.total_expenses)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3 -mx-3">
                    <span className="font-semibold text-slate-800">Net Profit</span>
                    <span className={`text-xl font-bold ${stats.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.net_profit)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Profit is calculated from approved expenses in Expense Management only.
                    Material, Vendor, and Payment Requests are workflow items and not counted as expenses.
                  </p>
                </div>
              </div>

              {/* Budget vs Expenses */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Budget Utilization</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Allocated Budget</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(stats.total_budget)}</p>
                  </div>
                  <div className="text-center p-4 bg-rose-50 border border-rose-200 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Actual Expenses</p>
                    <p className="text-2xl font-bold text-rose-700">{formatCurrency(stats.total_expenses)}</p>
                  </div>
                  <div className={`text-center p-4 border rounded-lg ${(stats.total_budget - stats.total_expenses) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-sm text-slate-500 mb-1">Available Budget</p>
                    <p className={`text-2xl font-bold ${(stats.total_budget - stats.total_expenses) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(stats.total_budget - stats.total_expenses)}
                    </p>
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
                <p className="text-sm text-slate-500">Profit = Order Amount - Actual Expenses (from Expense Management)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Order Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Budget</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Expenses</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Profit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Margin</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projectPnL.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                          <BarChart3 size={32} className="mx-auto text-slate-300 mb-2" />
                          <p>No project data available</p>
                          <p className="text-sm">Add expenses in Expense Management to see P&L</p>
                        </td>
                      </tr>
                    ) : (
                      projectPnL.slice(0, 50).map((project) => (
                        <tr key={project.project_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-medium text-violet-600">{project.pid_no}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                            {project.client || project.project_name}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">
                            {formatCurrency(project.order_amount)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-amber-700">
                            {formatCurrency(project.budget)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-600">
                            {formatCurrency(project.actual_expenses)}
                            {project.expense_count > 0 && (
                              <span className="text-xs text-slate-400 ml-1">({project.expense_count})</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(project.profit)}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${project.profit_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {project.profit_percent}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              project.status === 'completed' ? 'bg-green-100 text-green-700' :
                              project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              project.status === 'live' ? 'bg-violet-100 text-violet-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {project.status || 'active'}
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
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance by Project Category</h3>
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
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Revenue</span>
                            <p className="font-semibold text-slate-800">{formatCurrency(dept.revenue)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Expenses</span>
                            <p className="font-semibold text-rose-700">{formatCurrency(dept.expenses)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Profit</span>
                            <p className={`font-semibold ${dept.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(dept.profit)}
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

          {/* Expense Breakdown Tab Content */}
          {activeTab === 'expense_breakdown' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Expense Breakdown by Category</h3>
              <p className="text-sm text-slate-500 mb-4">Approved expenses from Expense Management</p>
              
              {expensesByCategory.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No approved expenses yet</p>
                  <p className="text-sm text-slate-400">Add and approve expenses in Expense Management</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expensesByCategory.map((item, idx) => {
                    const percentage = stats.total_expenses > 0 ? ((item.amount / stats.total_expenses) * 100).toFixed(1) : 0;
                    return (
                      <div key={item.category} className="border border-slate-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <span className="text-xs text-slate-400">({item.count} entries)</span>
                          </div>
                          <span className="font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-12 text-right">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Total Expenses</span>
                    <span className="text-xl font-bold text-rose-700">{formatCurrency(stats.total_expenses)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinanceAnalytics;
