/**
 * Order Handoff Page
 * 
 * Allows Projects department to:
 * - View confirmed sales orders pending project assignment
 * - Create projects from confirmed orders with full details
 * - Track order-to-project pipeline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, Plus, TrendingUp, Clock, CheckCircle2, 
  DollarSign, Calendar, User, Building2, FileText, 
  RefreshCw, X, Users, Briefcase, ListChecks, Trash2,
  ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Project Categories
const PROJECT_CATEGORIES = [
  { value: 'PSS', label: 'PSS - Project & Services' },
  { value: 'AS', label: 'AS - Asset Services' },
  { value: 'OSS', label: 'OSS - Other Sales & Services' },
  { value: 'CS', label: 'CS - Commercial Sales' },
  { value: 'AMC', label: 'AMC - Annual Maintenance' },
  { value: 'CAL', label: 'CAL - Calibration' }
];

// Work Item Units
const UNIT_OPTIONS = ['Nos', 'Mtr', 'Sqm', 'Set', 'Lot', 'Kg', 'Ltr', 'Box', 'Pcs', 'Unit'];

// Format currency
const formatCurrency = (amount) => {
  if (!amount) return '₹0';
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

const OrderHandoff = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [ordersWithProjects, setOrdersWithProjects] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [engineers, setEngineers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Enhanced form state for project creation
  const [projectForm, setProjectForm] = useState({
    customer_name: '',
    location: '',
    category: '',
    project_name: '',
    vendor: 'Enerzia',
    engineer_in_charge: '',
    team_members: [],
    project_actions: '',
    work_items: [],
    notes: ''
  });

  // New team member input
  const [newTeamMember, setNewTeamMember] = useState('');

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/project-orders/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  }, []);

  // Fetch pending orders
  const fetchPendingOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/project-orders/pending-orders`);
      if (res.ok) {
        const data = await res.json();
        setPendingOrders(data.pending_orders || []);
      }
    } catch (err) {
      console.error('Error fetching pending orders:', err);
    }
  }, []);

  // Fetch orders with project status
  const fetchOrdersWithProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/project-orders/orders-with-projects`);
      if (res.ok) {
        const data = await res.json();
        setOrdersWithProjects(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, []);

  // Fetch team members for engineer selection
  const fetchEngineers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/departments/projects/team`);
      if (res.ok) {
        const data = await res.json();
        setEngineers(data || []);
      }
    } catch (err) {
      console.error('Error fetching engineers:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchPendingOrders(),
        fetchOrdersWithProjects(),
        fetchEngineers()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchPendingOrders, fetchOrdersWithProjects, fetchEngineers]);

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboard(),
      fetchPendingOrders(),
      fetchOrdersWithProjects()
    ]);
    setLoading(false);
    toast.success('Data refreshed');
  };

  // Handle order selection for project creation
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    
    // Extract work items from order items (derived from quotation)
    const workItems = (order.items || []).map((item, idx) => ({
      id: `item-${idx}-${Date.now()}`,
      description: item.description || item.name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'Nos',
      rate: item.rate || item.unit_price || 0,
      amount: item.amount || item.total || 0
    }));
    
    setProjectForm({
      customer_name: order.customer_name || '',
      location: order.customer_address || '',
      category: order.category || 'PSS',
      project_name: `Project for ${order.order_no || order.po_number || 'Order'}`,
      vendor: 'Enerzia',
      engineer_in_charge: '',
      team_members: [],
      project_actions: '',
      work_items: workItems,
      notes: ''
    });
    setShowCreateModal(true);
  };

  // Add team member
  const addTeamMember = () => {
    if (newTeamMember.trim()) {
      setProjectForm(prev => ({
        ...prev,
        team_members: [...prev.team_members, newTeamMember.trim()]
      }));
      setNewTeamMember('');
    }
  };

  // Remove team member
  const removeTeamMember = (index) => {
    setProjectForm(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  // Add work item
  const addWorkItem = () => {
    setProjectForm(prev => ({
      ...prev,
      work_items: [
        ...prev.work_items,
        { id: `new-${Date.now()}`, description: '', quantity: 1, unit: 'Nos', rate: 0, amount: 0 }
      ]
    }));
  };

  // Update work item
  const updateWorkItem = (index, field, value) => {
    setProjectForm(prev => ({
      ...prev,
      work_items: prev.work_items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Auto-calculate amount
        if (field === 'quantity' || field === 'rate') {
          updated.amount = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.rate) || 0);
        }
        return updated;
      })
    }));
  };

  // Remove work item
  const removeWorkItem = (index) => {
    setProjectForm(prev => ({
      ...prev,
      work_items: prev.work_items.filter((_, i) => i !== index)
    }));
  };

  // Create project from order
  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!projectForm.engineer_in_charge) {
      toast.error('Please select an engineer in charge');
      return;
    }
    
    if (!projectForm.project_name.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    
    setCreating(true);
    try {
      const payload = {
        order_id: selectedOrder.id,
        customer_name: projectForm.customer_name,
        location: projectForm.location,
        category: projectForm.category,
        project_name: projectForm.project_name,
        vendor: projectForm.vendor,
        engineer_in_charge: projectForm.engineer_in_charge,
        team_members: projectForm.team_members,
        project_actions: projectForm.project_actions,
        work_items: projectForm.work_items,
        notes: projectForm.notes
      };
      
      const res = await fetch(`${API}/api/project-orders/create-project-from-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Project ${data.project.pid_no} created successfully!`);
        setShowCreateModal(false);
        setSelectedOrder(null);
        // Refresh data
        await Promise.all([
          fetchDashboard(),
          fetchPendingOrders(),
          fetchOrdersWithProjects()
        ]);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  // Filter orders by search term
  const filteredPendingOrders = pendingOrders.filter(order => 
    !searchTerm || 
    order.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.po_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrdersWithProjects = ordersWithProjects.filter(order =>
    !searchTerm ||
    order.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.project_pid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="order-handoff-loading">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading order handoff data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="order-handoff-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Summary</h1>
          <p className="text-slate-500 mt-1">View orders from Sales and create projects</p>
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

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Pending Orders</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{dashboard.pending_orders?.count || 0}</p>
                <p className="text-sm text-amber-600 mt-1">{formatCurrency(dashboard.pending_orders?.total_value)}</p>
              </div>
              <div className="p-3 bg-amber-200/50 rounded-lg">
                <Clock className="h-6 w-6 text-amber-700" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Active Projects</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{dashboard.active_projects_from_orders || 0}</p>
                <p className="text-sm text-blue-600 mt-1">From orders</p>
              </div>
              <div className="p-3 bg-blue-200/50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Week Billing</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(dashboard.this_week_billing)}</p>
                <p className="text-sm text-green-600 mt-1">Project billing</p>
              </div>
              <div className="p-3 bg-green-200/50 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">This Month</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{dashboard.projects_this_month || 0}</p>
                <p className="text-sm text-purple-600 mt-1">Projects created</p>
              </div>
              <div className="p-3 bg-purple-200/50 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === 'pending' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            data-testid="tab-pending"
          >
            Pending Orders
            {pendingOrders.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'all' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            data-testid="tab-all"
          >
            All Orders Status
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by order number, customer, PID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          data-testid="search-input"
        />
      </div>

      {/* Content */}
      {activeTab === 'pending' ? (
        <div className="space-y-4" data-testid="pending-orders-list">
          {filteredPendingOrders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">No pending orders</p>
              <p className="text-slate-500 text-sm mt-1">All confirmed orders have been assigned to projects</p>
            </div>
          ) : (
            filteredPendingOrders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                data-testid={`pending-order-${order.id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-slate-900">{order.order_no || order.po_number}</span>
                      {order.category && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {order.category}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Date: {formatDate(order.date || order.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{formatCurrency(order.total_amount || order.subtotal)}</span>
                      </div>
                    </div>
                    
                    {order.items && order.items.length > 0 && (
                      <p className="text-sm text-slate-500 mt-2">
                        {order.items.length} line item(s) from quotation
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectOrder(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      data-testid={`create-project-btn-${order.id}`}
                    >
                      <Plus className="h-4 w-4" />
                      Create Project
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4" data-testid="all-orders-list">
          {filteredOrdersWithProjects.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Order No</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Customer</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Amount</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Project</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrdersWithProjects.map((order) => (
                    <tr key={order.order_id} className="hover:bg-slate-50" data-testid={`order-row-${order.order_id}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{order.order_no}</td>
                      <td className="px-4 py-3 text-slate-600">{order.customer_name}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{formatCurrency(order.total_amount)}</td>
                      <td className="px-4 py-3">
                        {order.has_project ? (
                          <span className="font-medium text-blue-600">{order.project_pid}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {order.has_project ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            order.project_status === 'Completed' ? 'bg-green-100 text-green-700' :
                            order.project_status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {order.project_status || 'Need to Start'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-600">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {order.has_project ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${order.project_completion || 0}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600">{order.project_completion || 0}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Create Project Modal */}
      {showCreateModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-project-modal">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Create Project from Order</h2>
                  <p className="text-sm text-slate-500 mt-1">Order: {selectedOrder.order_no || selectedOrder.po_number}</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  data-testid="close-modal-btn"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-6">
              {/* Order Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Order Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-blue-600">Order No:</span>
                    <span className="ml-2 font-medium text-blue-900">{selectedOrder.order_no || selectedOrder.po_number}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Value:</span>
                    <span className="ml-2 font-medium text-blue-900">{formatCurrency(selectedOrder.total_amount || selectedOrder.subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Category:</span>
                    <span className="ml-2 font-medium text-blue-900">{selectedOrder.category || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectForm.customer_name}
                    onChange={(e) => setProjectForm({...projectForm, customer_name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Customer name"
                    required
                    data-testid="customer-input"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={projectForm.location}
                    onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Project location"
                    data-testid="location-input"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({...projectForm, category: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    data-testid="category-select"
                  >
                    <option value="">Select category...</option>
                    {PROJECT_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Vendor
                  </label>
                  <input
                    type="text"
                    value={projectForm.vendor}
                    onChange={(e) => setProjectForm({...projectForm, vendor: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Vendor name"
                    data-testid="vendor-input"
                  />
                </div>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectForm.project_name}
                  onChange={(e) => setProjectForm({...projectForm, project_name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter project name"
                  required
                  data-testid="project-name-input"
                />
              </div>

              {/* Engineer in Charge */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <User className="w-4 h-4 inline mr-1" />
                  Engineer in Charge <span className="text-red-500">*</span>
                </label>
                <select
                  value={projectForm.engineer_in_charge}
                  onChange={(e) => setProjectForm({...projectForm, engineer_in_charge: e.target.value})}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="engineer-select"
                >
                  <option value="">Select engineer...</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.name}>{eng.name} - {eng.designation || 'Engineer'}</option>
                  ))}
                  <option value="Giftson">Giftson - Project Head</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Team Members */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Users className="w-4 h-4 inline mr-1" />
                  Team Members
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTeamMember}
                    onChange={(e) => setNewTeamMember(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTeamMember())}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add team member name"
                    data-testid="team-member-input"
                  />
                  <button
                    type="button"
                    onClick={addTeamMember}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {projectForm.team_members.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {projectForm.team_members.map((member, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {member}
                        <button type="button" onClick={() => removeTeamMember(idx)} className="hover:text-blue-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Actions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <ListChecks className="w-4 h-4 inline mr-1" />
                  Project Actions / Scope
                </label>
                <textarea
                  value={projectForm.project_actions}
                  onChange={(e) => setProjectForm({...projectForm, project_actions: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the project scope, actions to be taken..."
                  data-testid="project-actions-input"
                />
              </div>

              {/* Work Items (Derived from Quotation) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Work Summary / Line Items
                    <span className="text-slate-400 font-normal ml-2">(from quotation)</span>
                  </label>
                  <button
                    type="button"
                    onClick={addWorkItem}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                    data-testid="add-work-item-btn"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                
                {projectForm.work_items.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {projectForm.work_items.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-medium text-blue-600">Item #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeWorkItem(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateWorkItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-2 text-sm"
                          placeholder="Description"
                        />
                        <div className="grid grid-cols-4 gap-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateWorkItem(index, 'quantity', e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded text-sm"
                            placeholder="Qty"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => updateWorkItem(index, 'unit', e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded text-sm"
                          >
                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateWorkItem(index, 'rate', e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded text-sm"
                            placeholder="Rate"
                          />
                          <div className="px-2 py-1.5 bg-slate-100 rounded text-sm text-right font-medium">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <FileText className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No line items from quotation</p>
                    <button
                      type="button"
                      onClick={addWorkItem}
                      className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                    >
                      + Add manually
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={projectForm.notes}
                  onChange={(e) => setProjectForm({...projectForm, notes: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes..."
                  data-testid="notes-input"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  data-testid="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  data-testid="submit-btn"
                >
                  {creating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHandoff;
