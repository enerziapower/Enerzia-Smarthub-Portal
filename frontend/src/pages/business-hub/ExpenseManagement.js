/**
 * Expense Management - Business Hub Tab
 * 
 * Migrated from: Accounts → Expense Management
 * Purpose: Track and approve expenses across all orders/projects
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Plus, Search, Filter, RefreshCw, Eye, Edit2, CheckCircle,
  Clock, AlertTriangle, DollarSign, FileText, Calendar, User,
  Check, X, TrendingDown, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700' }
};

const CATEGORY_CONFIG = {
  material_purchase: { label: 'Material Purchase', color: 'blue' },
  labor: { label: 'Labor', color: 'violet' },
  transport: { label: 'Transport', color: 'amber' },
  site_expenses: { label: 'Site Expenses', color: 'emerald' },
  subcontractor: { label: 'Subcontractor', color: 'cyan' },
  equipment_rental: { label: 'Equipment Rental', color: 'rose' },
  misc: { label: 'Miscellaneous', color: 'slate' }
};

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, totalAmount: 0 });

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
        
        // Calculate stats
        const pending = data.filter(e => e.status === 'pending').length;
        const approved = data.filter(e => e.status === 'approved').length;
        const totalAmount = data.reduce((sum, e) => sum + (e.amount || 0), 0);
        setStats({ total: data.length, pending, approved, totalAmount });
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.reference_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || expense.status === statusFilter;
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleApprove = async (expenseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/expenses/${expenseId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Expense approved');
        fetchExpenses();
      }
    } catch (error) {
      toast.error('Failed to approve expense');
    }
  };

  const handleReject = async (expenseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/expenses/${expenseId}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Expense rejected');
        fetchExpenses();
      }
    } catch (error) {
      toast.error('Failed to reject expense');
    }
  };

  return (
    <div className="space-y-6" data-testid="expense-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Expense Management</h2>
            <p className="text-sm text-slate-500">Track and approve expenses</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <button onClick={fetchExpenses} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={18} className="text-rose-600" />
            <span className="text-sm text-slate-600">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-rose-700">{stats.total}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Pending Approval</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm text-slate-600">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-indigo-600" />
            <span className="text-sm text-slate-600">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">₹{(stats.totalAmount / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-rose-500" size={32} />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No expenses found</h3>
          <p className="text-sm text-slate-500">Expenses will appear here when submitted</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Description</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Amount</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vendor</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.slice(0, 20).map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{expense.description}</p>
                    <p className="text-xs text-slate-500">{expense.reference_no}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${CATEGORY_CONFIG[expense.category]?.color || 'slate'}-100 text-${CATEGORY_CONFIG[expense.category]?.color || 'slate'}-700`}>
                      {CATEGORY_CONFIG[expense.category]?.label || expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    ₹{(expense.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{expense.vendor || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{expense.date || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[expense.status]?.color}`}>
                      {STATUS_CONFIG[expense.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {expense.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(expense.id)}
                          className="p-1.5 bg-green-100 hover:bg-green-200 rounded text-green-700"
                          title="Accept"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleReject(expense.id)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 rounded text-red-700"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
