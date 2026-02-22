import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Plus, Search, Filter, RefreshCw, X, Edit2, Eye, ChevronDown,
  Target, Wallet, Truck, FileText, Building2, Calendar, Percent,
  ArrowRight, PiggyBank, Receipt, CreditCard, AlertCircle, ChevronRight, FolderKanban
} from 'lucide-react';
import { toast } from 'sonner';
import AddProjectModal from '../../components/AddProjectModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status configuration
const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-slate-100 text-slate-700', icon: FileText },
  procurement: { label: 'Procurement', color: 'bg-blue-100 text-blue-700', icon: Package },
  execution: { label: 'Execution', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  invoiced: { label: 'Invoiced', color: 'bg-amber-100 text-amber-700', icon: Receipt },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: Wallet },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700', icon: CheckCircle }
};

const EXPENSE_CATEGORIES = [
  { value: 'material_purchase', label: 'Material Purchase' },
  { value: 'labor', label: 'Labor / Manpower' },
  { value: 'transport', label: 'Transport & Logistics' },
  { value: 'site_expenses', label: 'Site Expenses' },
  { value: 'subcontractor', label: 'Subcontractor Payments' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'misc', label: 'Miscellaneous' }
];

const PROJECT_TYPES = [
  { value: 'amc', label: 'AMC - Annual Maintenance Contract' },
  { value: 'equipment_service', label: 'Equipment Service' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'transformer_testing', label: 'Transformer Testing' },
  { value: 'ir_thermography', label: 'IR Thermography' },
  { value: 'custom', label: 'Custom Project' }
];

const OrderLifecycle = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectPrefillData, setProjectPrefillData] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  
  // Form data for lifecycle setup
  const [setupForm, setSetupForm] = useState({
    purchase_budget: { type: 'percentage', value: 40 },
    execution_budget: { type: 'percentage', value: 25 },
    target_profit: { type: 'percentage', value: 35 },
    payment_milestones: [
      { id: '1', name: 'Advance', type: 'percentage', value: 30, due_condition: 'On Order Confirmation', status: 'pending' },
      { id: '2', name: 'On Delivery', type: 'percentage', value: 50, due_condition: 'On Material Delivery', status: 'pending' },
      { id: '3', name: 'Final', type: 'percentage', value: 20, due_condition: '30 days from Invoice', status: 'pending' }
    ],
    credit_period_days: 30,
    project_type: '',
    auto_create_project: false,
    estimated_delivery_date: '',
    notes: ''
  });
  
  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    reference_no: ''
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/order-lifecycle/orders?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/order-lifecycle/dashboard/stats`, {
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

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const openSetupModal = (order) => {
    setSelectedOrder(order);
    if (order.lifecycle) {
      setSetupForm({
        purchase_budget: order.lifecycle.purchase_budget || { type: 'percentage', value: 40 },
        execution_budget: order.lifecycle.execution_budget || { type: 'percentage', value: 25 },
        target_profit: order.lifecycle.target_profit || { type: 'percentage', value: 35 },
        payment_milestones: order.lifecycle.payment_milestones || [],
        credit_period_days: order.lifecycle.credit_period_days || 30,
        project_type: order.lifecycle.project_type || '',
        auto_create_project: false,
        estimated_delivery_date: order.lifecycle.estimated_delivery_date || '',
        notes: order.lifecycle.notes || ''
      });
    } else {
      // Reset to defaults
      setSetupForm({
        purchase_budget: { type: 'percentage', value: 40 },
        execution_budget: { type: 'percentage', value: 25 },
        target_profit: { type: 'percentage', value: 35 },
        payment_milestones: [
          { id: '1', name: 'Advance', type: 'percentage', value: 30, due_condition: 'On Order Confirmation', status: 'pending' },
          { id: '2', name: 'On Delivery', type: 'percentage', value: 50, due_condition: 'On Material Delivery', status: 'pending' },
          { id: '3', name: 'Final', type: 'percentage', value: 20, due_condition: '30 days from Invoice', status: 'pending' }
        ],
        credit_period_days: 30,
        project_type: '',
        auto_create_project: false,
        estimated_delivery_date: '',
        notes: ''
      });
    }
    setShowSetupModal(true);
  };

  const openDetailsModal = async (order) => {
    setSelectedOrder(order);
    await fetchOrderDetails(order.id);
    setShowDetailsModal(true);
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders/${selectedOrder.id}/lifecycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sales_order_id: selectedOrder.id,
          ...setupForm
        })
      });
      
      if (!response.ok) throw new Error('Failed to save lifecycle');
      
      toast.success('Order lifecycle configured!');
      setShowSetupModal(false);
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error saving lifecycle:', error);
      toast.error('Failed to save lifecycle configuration');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders/${orderId}/lifecycle/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success('Status updated!');
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const addPaymentMilestone = () => {
    setSetupForm({
      ...setupForm,
      payment_milestones: [
        ...setupForm.payment_milestones,
        { id: Date.now().toString(), name: '', type: 'percentage', value: 0, due_condition: '', status: 'pending' }
      ]
    });
  };

  const updateMilestone = (index, field, value) => {
    const milestones = [...setupForm.payment_milestones];
    milestones[index] = { ...milestones[index], [field]: value };
    setSetupForm({ ...setupForm, payment_milestones: milestones });
  };

  const removeMilestone = (index) => {
    const milestones = setupForm.payment_milestones.filter((_, i) => i !== index);
    setSetupForm({ ...setupForm, payment_milestones: milestones });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast.error('Please fill required fields');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/order-lifecycle/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          ...expenseForm,
          amount: parseFloat(expenseForm.amount)
        })
      });
      
      if (!response.ok) throw new Error('Failed to add expense');
      
      toast.success('Expense added!');
      setShowExpenseModal(false);
      setExpenseForm({
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        reference_no: ''
      });
      
      // Refresh order details if viewing
      if (showDetailsModal) {
        fetchOrderDetails(selectedOrder.id);
      }
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  // Dashboard Tab Component
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.total_orders || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.total_revenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Profit</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.total_profit)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Profit Margin</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.profit_margin || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <h4 className="text-sm font-medium text-slate-500 mb-2">Purchase Cost</h4>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(stats?.total_purchase)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <h4 className="text-sm font-medium text-slate-500 mb-2">Execution Expenses</h4>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(stats?.total_expenses)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <h4 className="text-sm font-medium text-slate-500 mb-2">Pending Payments</h4>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(stats?.pending_payments)}</p>
        </div>
      </div>

      {/* Orders by Status */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-4">Orders by Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const statusData = stats?.orders_by_status?.[key] || { count: 0, value: 0 };
            const Icon = config.icon;
            return (
              <div key={key} className={`p-3 rounded-lg ${config.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <p className="text-lg font-bold">{statusData.count}</p>
                <p className="text-xs">{formatCurrency(statusData.value)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Orders Tab Component
  const OrdersTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        <button onClick={() => { fetchOrders(); fetchStats(); }} className="p-2 hover:bg-slate-100 rounded-lg">
          <RefreshCw className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No orders found</p>
          </div>
        ) : (
          orders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.lifecycle_status] || STATUS_CONFIG.new;
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-slate-900">{order.order_no}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {order.lifecycle && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Configured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{order.customer_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{order.date}</p>
                  </div>

                  {/* Financials */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Order Value</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(order.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Purchase</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(order.financials?.purchase_actual)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Expenses</p>
                      <p className="font-semibold text-purple-600">{formatCurrency(order.financials?.execution_actual)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Profit</p>
                      <p className={`font-semibold ${order.financials?.actual_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(order.financials?.actual_profit)} ({order.financials?.profit_margin}%)
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openDetailsModal(order)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openSetupModal(order)}
                      className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Configure Lifecycle"
                    >
                      <Target className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setSelectedOrder(order); setShowExpenseModal(true); }}
                      className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                      title="Add Expense"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {order.lifecycle && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, config], idx) => {
                        const isActive = key === order.lifecycle_status;
                        const isPast = Object.keys(STATUS_CONFIG).indexOf(key) < Object.keys(STATUS_CONFIG).indexOf(order.lifecycle_status);
                        const Icon = config.icon;
                        
                        return (
                          <React.Fragment key={key}>
                            <button
                              onClick={() => handleStatusChange(order.id, key)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                isActive ? config.color + ' font-semibold' : 
                                isPast ? 'bg-green-100 text-green-700' : 
                                'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </button>
                            {idx < Object.keys(STATUS_CONFIG).length - 1 && (
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="order-lifecycle-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-slate-500 mt-1">Track orders from procurement to delivery with budget control</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'orders'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Orders ({orders.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'orders' && <OrdersTab />}

      {/* Setup Modal */}
      {showSetupModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Configure Order</h3>
                <p className="text-sm text-slate-500">{selectedOrder.order_no} - {selectedOrder.customer_name}</p>
                <p className="text-sm font-medium text-blue-600">Order Value: {formatCurrency(selectedOrder.total_amount)}</p>
              </div>
              <button onClick={() => setShowSetupModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSetupSubmit} className="p-4 space-y-6">
              {/* Budget Targets */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4" /> Budget Targets
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Budget</label>
                    <div className="flex gap-2">
                      <select
                        value={setupForm.purchase_budget.type}
                        onChange={(e) => setSetupForm({
                          ...setupForm,
                          purchase_budget: { ...setupForm.purchase_budget, type: e.target.value }
                        })}
                        className="px-2 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="percentage">%</option>
                        <option value="value">₹</option>
                      </select>
                      <input
                        type="number"
                        value={setupForm.purchase_budget.value}
                        onChange={(e) => setSetupForm({
                          ...setupForm,
                          purchase_budget: { ...setupForm.purchase_budget, value: parseFloat(e.target.value) || 0 }
                        })}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      = {formatCurrency(setupForm.purchase_budget.type === 'percentage' 
                        ? selectedOrder.total_amount * (setupForm.purchase_budget.value / 100)
                        : setupForm.purchase_budget.value
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Execution Budget</label>
                    <div className="flex gap-2">
                      <select
                        value={setupForm.execution_budget.type}
                        onChange={(e) => setSetupForm({
                          ...setupForm,
                          execution_budget: { ...setupForm.execution_budget, type: e.target.value }
                        })}
                        className="px-2 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="percentage">%</option>
                        <option value="value">₹</option>
                      </select>
                      <input
                        type="number"
                        value={setupForm.execution_budget.value}
                        onChange={(e) => setSetupForm({
                          ...setupForm,
                          execution_budget: { ...setupForm.execution_budget, value: parseFloat(e.target.value) || 0 }
                        })}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      = {formatCurrency(setupForm.execution_budget.type === 'percentage' 
                        ? selectedOrder.total_amount * (setupForm.execution_budget.value / 100)
                        : setupForm.execution_budget.value
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Profit</label>
                    <div className="flex gap-2">
                      <select
                        value={setupForm.target_profit.type}
                        onChange={(e) => setSetupForm({
                          ...setupForm,
                          target_profit: { ...setupForm.target_profit, type: e.target.value }
                        })}
                        className="px-2 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="percentage">%</option>
                        <option value="value">₹</option>
                      </select>
                      <input
                        type="number"
                        value={setupForm.target_profit.value}
                        onChange={(e) => setSetupForm({
                          ...setupForm,
                          target_profit: { ...setupForm.target_profit, value: parseFloat(e.target.value) || 0 }
                        })}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      = {formatCurrency(setupForm.target_profit.type === 'percentage' 
                        ? selectedOrder.total_amount * (setupForm.target_profit.value / 100)
                        : setupForm.target_profit.value
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Milestones */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-amber-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Payment Milestones (Custom)
                  </h4>
                  <button
                    type="button"
                    onClick={addPaymentMilestone}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {setupForm.payment_milestones.map((milestone, idx) => (
                    <div key={milestone.id} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                      <input
                        type="text"
                        placeholder="Name"
                        value={milestone.name}
                        onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                        className="w-32 px-2 py-1.5 border border-slate-200 rounded text-sm"
                      />
                      <select
                        value={milestone.type}
                        onChange={(e) => updateMilestone(idx, 'type', e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded text-sm"
                      >
                        <option value="percentage">%</option>
                        <option value="value">₹</option>
                      </select>
                      <input
                        type="number"
                        value={milestone.value}
                        onChange={(e) => updateMilestone(idx, 'value', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm text-right"
                      />
                      <input
                        type="text"
                        placeholder="Due Condition"
                        value={milestone.due_condition}
                        onChange={(e) => updateMilestone(idx, 'due_condition', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                      />
                      <span className="text-sm font-medium text-slate-600 w-24 text-right">
                        {formatCurrency(milestone.type === 'percentage' 
                          ? selectedOrder.total_amount * (milestone.value / 100)
                          : milestone.value
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credit Period (Days)</label>
                    <input
                      type="number"
                      value={setupForm.credit_period_days}
                      onChange={(e) => setSetupForm({ ...setupForm, credit_period_days: parseInt(e.target.value) || 30 })}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Project Linking */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4" /> Project Linking
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Type</label>
                    <select
                      value={setupForm.project_type}
                      onChange={(e) => setSetupForm({ ...setupForm, project_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="">Select Type</option>
                      {PROJECT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Delivery</label>
                    <input
                      type="date"
                      value={setupForm.estimated_delivery_date}
                      onChange={(e) => setSetupForm({ ...setupForm, estimated_delivery_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={setupForm.auto_create_project}
                      onChange={(e) => setSetupForm({ ...setupForm, auto_create_project: e.target.checked })}
                      className="rounded"
                    />
                    Auto-create project entry in Projects module
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={setupForm.notes}
                  onChange={(e) => setSetupForm({ ...setupForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Internal notes..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && orderDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Order Details</h3>
                <p className="text-sm text-slate-500">{selectedOrder.order_no} - {selectedOrder.customer_name}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Financials Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Order Value</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(orderDetails.financials?.order_value)}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Total Cost</p>
                  <p className="text-xl font-bold text-purple-900">{formatCurrency(orderDetails.financials?.total_cost)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Profit</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(orderDetails.financials?.actual_profit)}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600">Margin</p>
                  <p className="text-xl font-bold text-amber-900">{orderDetails.financials?.profit_margin}%</p>
                </div>
              </div>

              {/* Budget vs Actual */}
              {orderDetails.lifecycle && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-4">Budget vs Actual</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Purchase</span>
                        <span className={orderDetails.financials?.purchase_savings >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Savings: {formatCurrency(orderDetails.financials?.purchase_savings)}
                        </span>
                      </div>
                      <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min((orderDetails.financials?.purchase_actual / orderDetails.financials?.purchase_target) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Actual: {formatCurrency(orderDetails.financials?.purchase_actual)}</span>
                        <span>Target: {formatCurrency(orderDetails.financials?.purchase_target)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Execution</span>
                        <span className={orderDetails.financials?.execution_savings >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Savings: {formatCurrency(orderDetails.financials?.execution_savings)}
                        </span>
                      </div>
                      <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${Math.min((orderDetails.financials?.execution_actual / orderDetails.financials?.execution_target) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Actual: {formatCurrency(orderDetails.financials?.execution_actual)}</span>
                        <span>Target: {formatCurrency(orderDetails.financials?.execution_target)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expenses */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">Expenses ({orderDetails.expenses?.length || 0})</h4>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" /> Add Expense
                  </button>
                </div>
                {orderDetails.expenses?.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Category</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Amount</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderDetails.expenses.map((exp) => (
                          <tr key={exp.id}>
                            <td className="px-3 py-2 text-slate-600">{exp.date}</td>
                            <td className="px-3 py-2 text-slate-600">
                              {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                            </td>
                            <td className="px-3 py-2 text-slate-900">{exp.description}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(exp.amount)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${exp.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {exp.approved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-4 text-slate-500">No expenses recorded yet</p>
                )}
              </div>

              {/* Payment Milestones */}
              {orderDetails.lifecycle?.payment_milestones?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Payment Milestones</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {orderDetails.lifecycle.payment_milestones.map((m) => (
                      <div key={m.id} className={`p-3 rounded-lg border ${m.status === 'paid' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-slate-900">{m.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${m.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(m.amount)}</p>
                        <p className="text-xs text-slate-500">{m.due_condition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Project / Link Existing Project */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium text-purple-900">Linked Project</h4>
                  </div>
                  {orderDetails.linked_project ? (
                    <div className="text-right">
                      <p className="font-medium text-purple-900">{orderDetails.linked_project.pid_no}</p>
                      <p className="text-sm text-purple-600">{orderDetails.linked_project.status}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLinkProjectModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Link2 className="w-4 h-4" />
                      Link Project
                    </button>
                  )}
                </div>
                {!orderDetails.linked_project && (
                  <p className="text-sm text-purple-700 mt-2">
                    Link an existing project created by the Projects department for this order.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Expense</h3>
                <p className="text-sm text-slate-500">{selectedOrder.order_no}</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                >
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
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
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      <AddProjectModal 
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setProjectPrefillData(null);
        }}
        onProjectAdded={(newProject) => {
          toast.success(`Project ${newProject.pid_no} created successfully!`);
          setShowProjectModal(false);
          setProjectPrefillData(null);
          // Refresh order details to show linked project
          if (selectedOrder) {
            fetchOrderDetails(selectedOrder.id);
          }
        }}
        prefillData={projectPrefillData}
      />
    </div>
  );
};

export default OrderLifecycle;
