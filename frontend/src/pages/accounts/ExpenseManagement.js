import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Receipt, DollarSign, CheckCircle, XCircle, Clock, AlertCircle,
  Plus, Search, Filter, RefreshCw, X, Edit2, Eye, Trash2, Upload,
  FileText, Building2, Calendar, ChevronDown, Download, Paperclip,
  TrendingUp, Users, Package, Truck, Briefcase, Plane, MoreHorizontal,
  Check, MessageSquare, Send, History
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EXPENSE_CATEGORIES = [
  { value: 'material_purchase', label: 'Material Purchase', icon: Package },
  { value: 'labor', label: 'Labor / Manpower', icon: Users },
  { value: 'transport', label: 'Transport & Logistics', icon: Truck },
  { value: 'site_expenses', label: 'Site Expenses', icon: Building2 },
  { value: 'subcontractor', label: 'Subcontractor Payments', icon: Briefcase },
  { value: 'equipment_rental', label: 'Equipment Rental', icon: Package },
  { value: 'travel', label: 'Travel & Accommodation', icon: Plane },
  { value: 'misc', label: 'Miscellaneous', icon: MoreHorizontal }
];

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'petty_cash', label: 'Petty Cash' }
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: Clock },
  submitted: { label: 'Awaiting Approval', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  info_requested: { label: 'Info Requested', color: 'bg-blue-100 text-blue-700', icon: AlertCircle }
};

const ExpenseManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Form
  const [expenseForm, setExpenseForm] = useState({
    order_id: '',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    reference_no: '',
    payment_mode: 'cash',
    remarks: ''
  });
  
  // File upload
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  
  // Approval form
  const [approvalAction, setApprovalAction] = useState({ action: '', comments: '' });
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch functions
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/expense-management/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/expense-management/expenses?`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (categoryFilter) url += `category=${categoryFilter}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  const fetchApprovalQueue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/expense-management/approval-queue`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApprovalQueue(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching approval queue:', error);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchStats(),
        fetchExpenses(),
        fetchApprovalQueue(),
        fetchSalesOrders()
      ]);
    };
    loadData();
  }, [fetchExpenses]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const resetForm = () => {
    setExpenseForm({
      order_id: '',
      category: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      reference_no: '',
      payment_mode: 'cash',
      remarks: ''
    });
    setEditingExpense(null);
  };

  // Create/Update expense
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    
    if (!expenseForm.order_id || !expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast.error('Please fill required fields');
      return;
    }
    
    try {
      const url = editingExpense 
        ? `${API_URL}/api/expense-management/expenses/${editingExpense.id}`
        : `${API_URL}/api/expense-management/expenses`;
      
      const response = await fetch(url, {
        method: editingExpense ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
          created_by: 'admin'
        })
      });
      
      if (!response.ok) throw new Error('Failed to save expense');
      
      const data = await response.json();
      toast.success(editingExpense ? 'Expense updated!' : 'Expense created!');
      setShowExpenseModal(false);
      resetForm();
      fetchExpenses();
      fetchStats();
      
      // If new expense, ask to upload receipt
      if (!editingExpense && data.expense) {
        setSelectedExpense(data.expense);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save expense');
    }
  };

  // Upload receipt
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedExpense) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${selectedExpense.id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      toast.success('Receipt uploaded!');
      
      // Refresh expense details
      const detailsResponse = await fetch(`${API_URL}/api/expense-management/expenses/${selectedExpense.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (detailsResponse.ok) {
        const data = await detailsResponse.json();
        setSelectedExpense(data.expense);
      }
      
      fetchExpenses();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to upload receipt');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit for approval
  const handleSubmitForApproval = async (expenseId) => {
    try {
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${expenseId}/submit?submitted_by=admin`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to submit');
      
      toast.success('Submitted for approval!');
      fetchExpenses();
      fetchApprovalQueue();
      fetchStats();
      
      if (showDetailsModal) {
        const detailsResponse = await fetch(`${API_URL}/api/expense-management/expenses/${expenseId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (detailsResponse.ok) {
          const data = await detailsResponse.json();
          setSelectedExpense(data.expense);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to submit');
    }
  };

  // Approve/Reject expense
  const handleApprovalAction = async (expenseId, action, comments = '') => {
    try {
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${expenseId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          approved_by: 'admin',
          comments
        })
      });
      
      if (!response.ok) throw new Error('Failed to process');
      
      toast.success(`Expense ${action}d!`);
      setShowApprovalModal(false);
      setApprovalAction({ action: '', comments: '' });
      fetchExpenses();
      fetchApprovalQueue();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process');
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select expenses to approve');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/expense-management/bulk-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          expense_ids: selectedIds,
          approved_by: 'admin',
          comments: 'Bulk approved'
        })
      });
      
      if (!response.ok) throw new Error('Failed to bulk approve');
      
      const data = await response.json();
      toast.success(`Approved ${data.approved_count} expenses!`);
      setSelectedIds([]);
      fetchExpenses();
      fetchApprovalQueue();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to bulk approve');
    }
  };

  // Delete expense
  const handleDelete = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      toast.success('Expense deleted!');
      setShowDetailsModal(false);
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete');
    }
  };

  // Open expense details
  const openDetails = async (expense) => {
    try {
      const response = await fetch(`${API_URL}/api/expense-management/expenses/${expense.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedExpense(data.expense);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setSelectedExpense(expense);
      setShowDetailsModal(true);
    }
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Expenses</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.total_expenses || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved Amount</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.approved_amount)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Approval</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.pending_approval || 0}</p>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-1">{formatCurrency(stats?.pending_amount)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">This Month</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.this_month?.amount)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">{stats?.this_month?.count || 0} expenses</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats?.by_category && Object.keys(stats.by_category).length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Expenses by Category (Approved)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.by_category).map(([key, value]) => {
              const category = EXPENSE_CATEGORIES.find(c => c.value === key);
              const Icon = category?.icon || Receipt;
              return (
                <div key={key} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">{category?.label || key}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(value.amount)}</p>
                  <p className="text-xs text-slate-500">{value.count} expenses</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approval Queue Preview */}
      {approvalQueue.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Awaiting Approval ({approvalQueue.length})</h3>
            <button
              onClick={() => setActiveTab('approval')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {approvalQueue.slice(0, 5).map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{exp.expense_no}</p>
                  <p className="text-sm text-slate-600">{exp.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{formatCurrency(exp.amount)}</p>
                  <button
                    onClick={() => handleApprovalAction(exp.id, 'approve')}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    Quick Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Expenses Tab
  const ExpensesTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button onClick={() => { fetchExpenses(); fetchStats(); }} className="p-2 hover:bg-slate-100 rounded-lg">
          <RefreshCw className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expense No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Attachments</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No expenses found</p>
                </td>
              </tr>
            ) : (
              expenses.filter(e => 
                !searchTerm || 
                e.expense_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((exp) => {
                const statusConfig = STATUS_CONFIG[exp.approval_status] || STATUS_CONFIG.pending;
                const category = EXPENSE_CATEGORIES.find(c => c.value === exp.category);
                const CategoryIcon = category?.icon || Receipt;
                
                return (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{exp.expense_no}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{exp.order_no}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{category?.label || exp.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{exp.description}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {exp.attachments?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          <Paperclip className="w-3 h-3" /> {exp.attachments.length}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetails(exp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {exp.approval_status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setEditingExpense(exp); setExpenseForm({...exp, amount: exp.amount.toString()}); setShowExpenseModal(true); }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSubmitForApproval(exp.id)}
                              className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Submit for Approval"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Approval Tab
  const ApprovalTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Approval Queue ({approvalQueue.length})</h3>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" /> Approve Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {approvalQueue.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
          <p className="text-slate-500">No expenses pending approval</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvalQueue.map((exp) => {
            const category = EXPENSE_CATEGORIES.find(c => c.value === exp.category);
            const CategoryIcon = category?.icon || Receipt;
            const isSelected = selectedIds.includes(exp.id);
            
            return (
              <div key={exp.id} className={`bg-white rounded-xl border p-4 ${isSelected ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, exp.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== exp.id));
                      }
                    }}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-slate-900">{exp.expense_no}</span>
                      <span className="text-sm text-slate-500">{exp.date}</span>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <CategoryIcon className="w-4 h-4" />
                        {category?.label}
                      </div>
                    </div>
                    <p className="text-slate-700 mb-1">{exp.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Order: {exp.order_no}</span>
                      {exp.vendor && <span>Vendor: {exp.vendor}</span>}
                      {exp.attachments?.length > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Paperclip className="w-3 h-3" /> {exp.attachments.length} files
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(exp.amount)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleApprovalAction(exp.id, 'approve')}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setSelectedExpense(exp); setShowApprovalModal(true); }}
                        className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="expense-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Management</h1>
          <p className="text-slate-500 mt-1">Track expenses with receipt uploads and approval workflow</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowExpenseModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> New Expense
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'expenses', label: `All Expenses (${expenses.length})` },
          { id: 'approval', label: `Approval Queue (${approvalQueue.length})`, highlight: approvalQueue.length > 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.highlight && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'approval' && <ApprovalTab />}

      {/* Create/Edit Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingExpense ? 'Edit Expense' : 'New Expense'}
              </h3>
              <button onClick={() => { setShowExpenseModal(false); resetForm(); }} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveExpense} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sales Order *</label>
                <select
                  required
                  value={expenseForm.order_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, order_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Order</option>
                  {salesOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.order_no} - {o.customer_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Category</option>
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={expenseForm.payment_mode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    {PAYMENT_MODES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="What was this expense for?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reference No.</label>
                  <input
                    type="text"
                    value={expenseForm.reference_no}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="Bill/Receipt No."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={expenseForm.remarks}
                  onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowExpenseModal(false); resetForm(); }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  {editingExpense ? 'Update' : 'Create & Upload Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {showDetailsModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedExpense.expense_no}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[selectedExpense.approval_status]?.color || 'bg-slate-100 text-slate-700'}`}>
                  {STATUS_CONFIG[selectedExpense.approval_status]?.label || selectedExpense.approval_status}
                </span>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Order</p>
                  <p className="font-medium text-slate-900">{selectedExpense.order_no}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="font-medium text-slate-900">
                    {EXPENSE_CATEGORIES.find(c => c.value === selectedExpense.category)?.label || selectedExpense.category}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium text-slate-900">{selectedExpense.date}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="font-medium text-slate-900">{selectedExpense.description}</p>
                </div>
                {selectedExpense.vendor && (
                  <div>
                    <p className="text-sm text-slate-500">Vendor</p>
                    <p className="font-medium text-slate-900">{selectedExpense.vendor}</p>
                  </div>
                )}
                {selectedExpense.reference_no && (
                  <div>
                    <p className="text-sm text-slate-500">Reference No.</p>
                    <p className="font-medium text-slate-900">{selectedExpense.reference_no}</p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">Attachments ({selectedExpense.attachments?.length || 0})</h4>
                  {selectedExpense.approval_status !== 'approved' && (
                    <label className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100">
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Upload Receipt'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                {selectedExpense.attachments?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedExpense.attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{att.original_name}</p>
                            <p className="text-xs text-slate-500">{(att.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <a
                          href={`${API_URL}/api/expense-management/expenses/${selectedExpense.id}/attachments/${att.id}`}
                          download={att.original_name}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-slate-500 bg-slate-50 rounded-lg">
                    No attachments yet. Upload a receipt to support this expense.
                  </p>
                )}
              </div>

              {/* Approval History */}
              {selectedExpense.approval_history?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" /> Approval History
                  </h4>
                  <div className="space-y-2">
                    {selectedExpense.approval_history.map((h, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className={`p-1 rounded-full ${h.action === 'approve' ? 'bg-green-100' : h.action === 'reject' ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {h.action === 'approve' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                           h.action === 'reject' ? <XCircle className="w-4 h-4 text-red-600" /> :
                           <MessageSquare className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 capitalize">{h.action.replace('_', ' ')}</p>
                          <p className="text-xs text-slate-500">by {h.by} • {new Date(h.at).toLocaleString()}</p>
                          {h.comments && <p className="text-sm text-slate-600 mt-1">{h.comments}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <div>
                  {selectedExpense.approval_status === 'pending' && (
                    <button
                      onClick={() => handleDelete(selectedExpense.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedExpense.approval_status === 'pending' && (
                    <button
                      onClick={() => handleSubmitForApproval(selectedExpense.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" /> Submit for Approval
                    </button>
                  )}
                  {selectedExpense.approval_status === 'submitted' && (
                    <button
                      onClick={() => handleApprovalAction(selectedExpense.id, 'approve')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Action Modal */}
      {showApprovalModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Review Expense</h3>
              <p className="text-sm text-slate-500">{selectedExpense.expense_no} - {formatCurrency(selectedExpense.amount)}</p>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setApprovalAction({ ...approvalAction, action: 'approve' })}
                  className={`p-3 rounded-lg border-2 transition-colors ${approvalAction.action === 'approve' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-300'}`}
                >
                  <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" />
                  <p className="text-sm font-medium">Approve</p>
                </button>
                <button
                  onClick={() => setApprovalAction({ ...approvalAction, action: 'reject' })}
                  className={`p-3 rounded-lg border-2 transition-colors ${approvalAction.action === 'reject' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'}`}
                >
                  <XCircle className="w-6 h-6 mx-auto text-red-600 mb-1" />
                  <p className="text-sm font-medium">Reject</p>
                </button>
                <button
                  onClick={() => setApprovalAction({ ...approvalAction, action: 'request_info' })}
                  className={`p-3 rounded-lg border-2 transition-colors ${approvalAction.action === 'request_info' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                >
                  <MessageSquare className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-sm font-medium">Need Info</p>
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comments</label>
                <textarea
                  rows={3}
                  value={approvalAction.comments}
                  onChange={(e) => setApprovalAction({ ...approvalAction, comments: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder={approvalAction.action === 'reject' ? 'Reason for rejection...' : 'Optional comments...'}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowApprovalModal(false); setApprovalAction({ action: '', comments: '' }); }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!approvalAction.action) {
                      toast.error('Select an action');
                      return;
                    }
                    handleApprovalAction(selectedExpense.id, approvalAction.action, approvalAction.comments);
                  }}
                  disabled={!approvalAction.action}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
      />
    </div>
  );
};

export default ExpenseManagement;
