/**
 * Expense Management - Business Hub Tab
 * 
 * Purpose: Track and manage actual expenses incurred for projects (PIDs)
 * - Enter expenses manually with bill/receipt attachments
 * - Link expenses to specific PIDs
 * - Show budget availability when selecting PID
 * - Approval workflow for expense verification
 * 
 * IMPORTANT: Only approved expenses from this module are used for Profit calculation
 * Profit = Order Amount - Sum(Approved Expenses)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Plus, Search, Filter, RefreshCw, Eye, Edit2, CheckCircle,
  Clock, AlertTriangle, DollarSign, FileText, Calendar, User,
  Check, X, TrendingDown, TrendingUp, Upload, Paperclip, Trash2,
  Building2, Package, Loader2, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  info_requested: { label: 'Info Requested', color: 'bg-blue-100 text-blue-700' }
};

const CATEGORY_CONFIG = {
  material_purchase: { label: 'Material Purchase', color: 'blue', icon: Package },
  labor: { label: 'Labor / Manpower', color: 'violet', icon: User },
  transport: { label: 'Transport & Logistics', color: 'amber', icon: Building2 },
  site_expenses: { label: 'Site Expenses', color: 'emerald', icon: Building2 },
  subcontractor: { label: 'Subcontractor', color: 'cyan', icon: Building2 },
  equipment_rental: { label: 'Equipment Rental', color: 'rose', icon: Package },
  travel: { label: 'Travel & Accommodation', color: 'orange', icon: Building2 },
  misc: { label: 'Miscellaneous', color: 'slate', icon: Receipt }
};

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'petty_cash', label: 'Petty Cash' }
];

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, totalAmount: 0, approvedAmount: 0 });
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Projects for PID selection
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Vendors for dropdown
  const [vendors, setVendors] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    order_id: '',
    category: 'material_purchase',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor_id: '',
    vendor: '',
    reference_no: '',
    payment_mode: 'bank',
    remarks: ''
  });
  const [uploadFile, setUploadFile] = useState(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/expense-management/expenses?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
        
        // Calculate stats
        const allExpenses = data.expenses || [];
        const pending = allExpenses.filter(e => e.approval_status === 'pending' || e.approval_status === 'submitted').length;
        const approved = allExpenses.filter(e => e.approval_status === 'approved').length;
        const totalAmount = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const approvedAmount = allExpenses.filter(e => e.approval_status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
        setStats({ total: allExpenses.length, pending, approved, totalAmount, approvedAmount });
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch orders from order lifecycle API
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || data || [];
        
        // Filter to only accepted orders (those with projects)
        const acceptedOrders = orders.filter(o => o.status === 'accepted' || o.project_id);
        
        // Enrich with budget info
        const ordersWithBudget = acceptedOrders.map(order => {
          let executionBudget = 0;
          if (order.execution_budget) {
            const budget = order.execution_budget;
            if (budget.type === 'percentage') {
              executionBudget = (order.total_amount || 0) * (budget.value / 100);
            } else {
              executionBudget = budget.value || 0;
            }
          }
          return {
            ...order,
            execution_budget: executionBudget
          };
        });
        
        setProjects(ordersWithBudget);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  // Fetch vendors from Vendor Management
  const fetchVendors = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/settings/vendors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVendors(data || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
    fetchVendors();
  }, [fetchExpenses, fetchProjects, fetchVendors]);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.reference_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.expense_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || expense.approval_status === statusFilter;
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate used budget for a project
  const getUsedBudget = (orderId) => {
    return expenses
      .filter(e => e.order_id === orderId && e.approval_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const handleProjectSelect = (orderId) => {
    const project = projects.find(p => p.id === orderId);
    setSelectedProject(project);
    setFormData(prev => ({ ...prev, order_id: orderId }));
  };

  const handleSubmitExpense = async () => {
    if (!formData.order_id) {
      toast.error('Please select a PID/Project');
      return;
    }
    if (!formData.description || !formData.amount) {
      toast.error('Please fill required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      // Create expense
      const response = await fetch(`${API_URL}/api/expense-management/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Upload file if selected
        if (uploadFile && data.expense?.id) {
          const fileFormData = new FormData();
          fileFormData.append('file', uploadFile);
          
          await fetch(`${API_URL}/api/expense-management/expenses/${data.expense.id}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fileFormData
          });
        }
        
        toast.success(`Expense ${data.expense?.expense_no} created`);
        setShowAddModal(false);
        resetForm();
        fetchExpenses();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create expense');
      }
    } catch (error) {
      toast.error('Error creating expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (expense) => {
    try {
      const token = localStorage.getItem('token');
      
      // First submit if pending
      if (expense.approval_status === 'pending') {
        await fetch(`${API_URL}/api/expense-management/expenses/${expense.id}/submit?submitted_by=admin`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      // Then approve
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${expense.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'approve',
          approved_by: 'admin',
          comments: 'Approved'
        })
      });
      
      if (response.ok) {
        toast.success('Expense approved');
        fetchExpenses();
        setShowDetailModal(false);
      }
    } catch (error) {
      toast.error('Failed to approve expense');
    }
  };

  const handleReject = async (expense) => {
    try {
      const token = localStorage.getItem('token');
      
      // First submit if pending
      if (expense.approval_status === 'pending') {
        await fetch(`${API_URL}/api/expense-management/expenses/${expense.id}/submit?submitted_by=admin`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${expense.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'reject',
          approved_by: 'admin',
          comments: 'Rejected'
        })
      });
      
      if (response.ok) {
        toast.success('Expense rejected');
        fetchExpenses();
        setShowDetailModal(false);
      }
    } catch (error) {
      toast.error('Failed to reject expense');
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${expense.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Expense deleted');
        fetchExpenses();
        setShowDetailModal(false);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Error deleting expense');
    }
  };

  const resetForm = () => {
    setFormData({
      order_id: '',
      category: 'material_purchase',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      reference_no: '',
      payment_mode: 'bank',
      remarks: ''
    });
    setSelectedProject(null);
    setUploadFile(null);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6" data-testid="expense-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="text-rose-600" />
              Expense Management
            </h2>
            <p className="text-sm text-slate-500">Record and track actual expenses for projects</p>
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
                data-testid="expense-search"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              data-testid="status-filter"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <button onClick={fetchExpenses} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
              data-testid="add-expense-btn"
            >
              <Plus size={18} />
              Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={18} className="text-slate-500" />
            <span className="text-sm text-slate-600">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-blue-600" />
            <span className="text-sm text-slate-600">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalAmount)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-600">Approved Amount</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(stats.approvedAmount)}</p>
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
          <p className="text-sm text-slate-500 mb-4">Click "Add Expense" to record project expenses</p>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            Add First Expense
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Expense #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">PID / Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.slice(0, 50).map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-rose-600">{expense.expense_no}</span>
                    {expense.attachments?.length > 0 && (
                      <Paperclip size={12} className="inline ml-1 text-slate-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">{expense.order_no}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[150px]">{expense.customer_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-800 truncate max-w-[200px]">{expense.description}</p>
                    {expense.vendor && <p className="text-xs text-slate-500">Vendor: {expense.vendor}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${CATEGORY_CONFIG[expense.category]?.color || 'slate'}-100 text-${CATEGORY_CONFIG[expense.category]?.color || 'slate'}-700`}>
                      {CATEGORY_CONFIG[expense.category]?.label || expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{expense.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[expense.approval_status]?.color}`}>
                      {STATUS_CONFIG[expense.approval_status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setSelectedExpense(expense); setShowDetailModal(true); }}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {(expense.approval_status === 'pending' || expense.approval_status === 'submitted') && (
                        <>
                          <button
                            onClick={() => handleApprove(expense)}
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(expense)}
                            className="p-1.5 hover:bg-red-100 rounded text-red-600"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="add-expense-modal">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-pink-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Add New Expense</h3>
                <p className="text-sm text-slate-500">Record actual expense for a project</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* PID/Project Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select PID / Project *</label>
                <select
                  value={formData.order_id}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  data-testid="pid-select"
                >
                  <option value="">-- Select Project --</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.order_no} - {project.customer_name?.substring(0, 40)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Info Display */}
              {selectedProject && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Order Value</p>
                      <p className="font-bold text-slate-800">{formatCurrency(selectedProject.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Execution Budget</p>
                      <p className="font-bold text-blue-700">{formatCurrency(selectedProject.execution_budget)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Available Budget</p>
                      <p className={`font-bold ${(selectedProject.execution_budget - getUsedBudget(selectedProject.id)) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(selectedProject.execution_budget - getUsedBudget(selectedProject.id))}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Used: {formatCurrency(getUsedBudget(selectedProject.id))} (Approved expenses)
                  </p>
                </div>
              )}

              {/* Category & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    data-testid="category-select"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Enter amount"
                    data-testid="amount-input"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Describe the expense..."
                  data-testid="description-input"
                />
              </div>

              {/* Vendor & Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor / Supplier</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Vendor name"
                    data-testid="vendor-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bill / Receipt No.</label>
                  <input
                    type="text"
                    value={formData.reference_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Invoice/Receipt number"
                    data-testid="reference-input"
                  />
                </div>
              </div>

              {/* Date & Payment Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    data-testid="date-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    data-testid="payment-mode-select"
                  >
                    {PAYMENT_MODES.map(mode => (
                      <option key={mode.value} value={mode.value}>{mode.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Additional notes..."
                  data-testid="remarks-input"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attach Bill / Receipt</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="expense-file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Paperclip size={18} className="text-green-600" />
                      <span className="text-sm text-slate-700">{uploadFile.name}</span>
                      <button onClick={() => setUploadFile(null)} className="text-red-500 hover:text-red-700">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="expense-file" className="cursor-pointer">
                      <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">Click to upload bill/receipt</p>
                      <p className="text-xs text-slate-400">JPG, PNG, PDF, DOC, XLS (Max 10MB)</p>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExpense}
                disabled={submitting}
                className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
                data-testid="submit-expense-btn"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="expense-detail-modal">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Expense Details</h3>
                <p className="text-sm text-rose-600 font-mono">{selectedExpense.expense_no}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">PID / Order</label>
                  <p className="font-medium text-slate-800">{selectedExpense.order_no}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Customer</label>
                  <p className="font-medium text-slate-800">{selectedExpense.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Category</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${CATEGORY_CONFIG[selectedExpense.category]?.color || 'slate'}-100 text-${CATEGORY_CONFIG[selectedExpense.category]?.color || 'slate'}-700`}>
                    {CATEGORY_CONFIG[selectedExpense.category]?.label}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Amount</label>
                  <p className="font-bold text-xl text-slate-800">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Date</label>
                  <p className="font-medium text-slate-800">{selectedExpense.date}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedExpense.approval_status]?.color}`}>
                    {STATUS_CONFIG[selectedExpense.approval_status]?.label}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-500">Description</label>
                <p className="text-slate-700">{selectedExpense.description}</p>
              </div>

              {selectedExpense.vendor && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Vendor</label>
                    <p className="text-slate-700">{selectedExpense.vendor}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Reference No.</label>
                    <p className="text-slate-700">{selectedExpense.reference_no || '-'}</p>
                  </div>
                </div>
              )}

              {selectedExpense.attachments?.length > 0 && (
                <div>
                  <label className="text-sm text-slate-500">Attachments</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedExpense.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={`${API_URL}/api/expense-management/expenses/${selectedExpense.id}/attachments/${att.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-sm text-blue-600 hover:bg-slate-200"
                      >
                        <Paperclip size={12} />
                        {att.original_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {(selectedExpense.approval_status === 'pending' || selectedExpense.approval_status === 'submitted') && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleApprove(selectedExpense)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedExpense)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Reject
                  </button>
                </div>
              )}

              {selectedExpense.approval_status !== 'approved' && (
                <button
                  onClick={() => handleDelete(selectedExpense)}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete Expense
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
