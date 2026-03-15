/**
 * Project Management - Business Hub
 * 
 * Displays orders from Order Management as projects (linked by PID)
 * - Project Dept can accept orders as projects
 * - Timeline fields (Start Date, End Date, Deadline) can be added
 * - Bi-directional sync with Order Summary status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Search, Filter, RefreshCw, Eye, X, Edit2,
  CheckCircle, Clock, AlertTriangle, DollarSign, Calendar,
  TrendingUp, Target, Play, Pause, Check, XCircle,
  Building2, FileText, Save, Loader2, Plus, Package, Truck, CreditCard,
  ClipboardList, ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

// Project/Order status configuration
const PROJECT_STATUS = {
  pending: { label: 'Pending Acceptance', color: 'bg-amber-100 text-amber-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: Check },
  in_progress: { label: 'In Progress', color: 'bg-violet-100 text-violet-700', icon: Play },
  on_hold: { label: 'On Hold', color: 'bg-slate-100 text-slate-700', icon: Pause },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
};

// Category configuration
const CATEGORY_CONFIG = {
  PSS: { label: 'Projects & Services', color: 'violet' },
  AS: { label: 'Asset Services', color: 'blue' },
  OSS: { label: 'Other Sales & Services', color: 'amber' },
  CS: { label: 'Commercial Sales', color: 'green' }
};

const ProjectManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showRaiseRequestModal, setShowRaiseRequestModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [requestType, setRequestType] = useState('material'); // material, vendor, payment
  const [projectRequests, setProjectRequests] = useState([]);
  const [accepting, setAccepting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0, 
    accepted: 0, 
    inProgress: 0, 
    completed: 0, 
    totalValue: 0 
  });

  // Timeline form data
  const [timelineData, setTimelineData] = useState({
    start_date: '',
    end_date: '',
    deadline: '',
    project_manager: '',
    notes: ''
  });

  // Raise Request form data
  const initialRequestData = {
    // Material Request
    items: [{ description: '', quantity: 1, unit: 'Nos', estimated_cost: 0 }],
    // Vendor Request
    service_type: 'Subcontractor',
    description: '',
    estimated_cost: 0,
    // Payment Request
    payment_type: 'Advance',
    payee: '',
    amount: 0,
    due_date: '',
    bank_details: '',
    // Common
    required_by: '',
    priority: 'medium',
    notes: ''
  };
  const [requestData, setRequestData] = useState(initialRequestData);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Fetch orders from Order Management (sales_orders with PID)
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const ordersList = data.orders || [];
        setOrders(ordersList);
        
        // Calculate stats
        const pending = ordersList.filter(o => !o.project_status || o.project_status === 'pending').length;
        const accepted = ordersList.filter(o => o.project_status === 'accepted').length;
        const inProgress = ordersList.filter(o => o.project_status === 'in_progress').length;
        const completed = ordersList.filter(o => o.project_status === 'completed').length;
        const totalValue = ordersList.reduce((sum, o) => sum + (o.order_value || o.total_amount || 0), 0);
        
        setStats({ 
          total: ordersList.length, 
          pending, 
          accepted, 
          inProgress, 
          completed, 
          totalValue 
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const orderStatus = order.project_status || 'pending';
    const matchesStatus = !statusFilter || orderStatus === statusFilter;
    const matchesCategory = !categoryFilter || order.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get status configuration
  const getStatusConfig = (status) => {
    const normalizedStatus = status?.toLowerCase().replace(' ', '_') || 'pending';
    return PROJECT_STATUS[normalizedStatus] || PROJECT_STATUS.pending;
  };

  // Accept order as project
  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;
    
    setAccepting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders/${selectedOrder.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...timelineData,
          project_status: 'accepted'
        })
      });
      
      if (response.ok) {
        toast.success(`Order ${selectedOrder.order_no} accepted as project`);
        setShowAcceptModal(false);
        setSelectedOrder(null);
        setTimelineData({ start_date: '', end_date: '', deadline: '', project_manager: '', notes: '' });
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Error accepting order');
    } finally {
      setAccepting(false);
    }
  };

  // Update project timeline
  const handleUpdateTimeline = async () => {
    if (!selectedOrder) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders/${selectedOrder.id}/timeline`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(timelineData)
      });
      
      if (response.ok) {
        toast.success('Timeline updated successfully');
        setShowTimelineModal(false);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update timeline');
      }
    } catch (error) {
      console.error('Error updating timeline:', error);
      toast.error('Error updating timeline');
    } finally {
      setSaving(false);
    }
  };

  // Update project status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ project_status: newStatus })
      });
      
      if (response.ok) {
        toast.success('Status updated');
        fetchOrders();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  // Open accept modal
  const openAcceptModal = (order) => {
    setSelectedOrder(order);
    setTimelineData({
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      deadline: order.delivery_date || '',
      project_manager: '',
      notes: ''
    });
    setShowAcceptModal(true);
  };

  // Open timeline modal
  const openTimelineModal = (order) => {
    setSelectedOrder(order);
    setTimelineData({
      start_date: order.timeline?.start_date || '',
      end_date: order.timeline?.end_date || '',
      deadline: order.timeline?.deadline || order.delivery_date || '',
      project_manager: order.timeline?.project_manager || '',
      notes: order.timeline?.notes || ''
    });
    setShowTimelineModal(true);
  };

  // Open raise request modal
  const openRaiseRequestModal = (order, type = 'material') => {
    setSelectedOrder(order);
    setRequestType(type);
    setRequestData(initialRequestData);
    setShowRaiseRequestModal(true);
  };

  // Fetch requests for an order
  const fetchProjectRequests = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/by-order/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjectRequests(data.requests || {});
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  // Open requests view modal
  const openRequestsModal = async (order) => {
    setSelectedOrder(order);
    await fetchProjectRequests(order.id);
    setShowRequestsModal(true);
  };

  // Submit material request
  const handleSubmitMaterialRequest = async () => {
    if (!selectedOrder) return;
    if (!requestData.items.some(item => item.description)) {
      toast.error('Please add at least one item');
      return;
    }
    
    setSubmittingRequest(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          order_no: selectedOrder.order_no,
          project_name: selectedOrder.project_name,
          customer_name: selectedOrder.customer_name,
          items: requestData.items.filter(item => item.description),
          required_by: requestData.required_by,
          priority: requestData.priority,
          notes: requestData.notes
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Material request ${data.request.request_no} created`);
        setShowRaiseRequestModal(false);
        setRequestData(initialRequestData);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create request');
      }
    } catch (error) {
      toast.error('Error creating request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Submit vendor request
  const handleSubmitVendorRequest = async () => {
    if (!selectedOrder) return;
    if (!requestData.description) {
      toast.error('Please provide a description');
      return;
    }
    
    setSubmittingRequest(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          order_no: selectedOrder.order_no,
          project_name: selectedOrder.project_name,
          customer_name: selectedOrder.customer_name,
          service_type: requestData.service_type,
          description: requestData.description,
          estimated_cost: requestData.estimated_cost,
          required_by: requestData.required_by,
          priority: requestData.priority,
          notes: requestData.notes
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Vendor request ${data.request.request_no} created`);
        setShowRaiseRequestModal(false);
        setRequestData(initialRequestData);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create request');
      }
    } catch (error) {
      toast.error('Error creating request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Submit payment request
  const handleSubmitPaymentRequest = async () => {
    if (!selectedOrder) return;
    if (!requestData.payee || !requestData.amount) {
      toast.error('Please provide payee and amount');
      return;
    }
    
    setSubmittingRequest(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          order_no: selectedOrder.order_no,
          project_name: selectedOrder.project_name,
          customer_name: selectedOrder.customer_name,
          payment_type: requestData.payment_type,
          payee: requestData.payee,
          amount: requestData.amount,
          due_date: requestData.due_date,
          bank_details: requestData.bank_details,
          priority: requestData.priority,
          notes: requestData.notes
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Payment request ${data.request.request_no} created`);
        setShowRaiseRequestModal(false);
        setRequestData(initialRequestData);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create request');
      }
    } catch (error) {
      toast.error('Error creating request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Add material item
  const addMaterialItem = () => {
    setRequestData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit: 'Nos', estimated_cost: 0 }]
    }));
  };

  // Update material item
  const updateMaterialItem = (index, field, value) => {
    const newItems = [...requestData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setRequestData(prev => ({ ...prev, items: newItems }));
  };

  // Remove material item
  const removeMaterialItem = (index) => {
    if (requestData.items.length <= 1) return;
    setRequestData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6" data-testid="project-management">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FolderKanban className="text-violet-600" />
              Project Management
            </h2>
            <p className="text-sm text-slate-500">Accept orders and manage project timelines</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PID, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending Acceptance</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{key} - {config.label}</option>
              ))}
            </select>

            {/* Refresh */}
            <button onClick={fetchOrders} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={20} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-sm text-slate-500">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-slate-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.accepted}</p>
            <p className="text-sm text-slate-500">Accepted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-600">{stats.inProgress}</p>
            <p className="text-sm text-slate-500">In Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-slate-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalValue)}</p>
            <p className="text-sm text-slate-500">Total Value</p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-slate-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 mb-1">No orders found</h3>
            <p className="text-sm text-slate-500">Orders from Order Management will appear here</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const status = order.project_status || 'pending';
            const statusConfig = getStatusConfig(status);
            const StatusIcon = statusConfig.icon;
            const categoryConfig = CATEGORY_CONFIG[order.category] || CATEGORY_CONFIG.PSS;
            const isPending = status === 'pending';
            
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* PID & Customer */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-violet-600">{order.order_no || order.pid_no}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${categoryConfig.color}-100 text-${categoryConfig.color}-700`}>
                        {order.category || 'PSS'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} flex items-center gap-1`}>
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate">
                      <Building2 size={14} className="inline mr-1" />
                      {order.customer_name}
                      {order.project_name && <span className="text-slate-400"> • {order.project_name}</span>}
                    </p>
                  </div>

                  {/* Order Value */}
                  <div className="text-center px-4">
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(order.order_value || order.total_amount)}</p>
                    <p className="text-xs text-slate-500">Order Value</p>
                  </div>

                  {/* Timeline */}
                  <div className="text-center px-4 border-l border-slate-100">
                    {order.timeline?.start_date ? (
                      <>
                        <p className="text-sm font-medium text-slate-700">
                          {formatDate(order.timeline.start_date)} - {formatDate(order.timeline.end_date)}
                        </p>
                        <p className="text-xs text-slate-500">Timeline</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-400">Not set</p>
                        <p className="text-xs text-slate-500">Timeline</p>
                      </>
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="text-center px-4 border-l border-slate-100">
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(order.timeline?.deadline || order.delivery_date)}
                    </p>
                    <p className="text-xs text-slate-500">Deadline</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                    {isPending ? (
                      <button
                        onClick={() => openAcceptModal(order)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                      >
                        <Check size={16} />
                        Accept
                      </button>
                    ) : (
                      <>
                        {/* Raise Request Dropdown */}
                        <div className="relative group">
                          <button
                            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1 text-sm font-medium"
                            title="Raise Request"
                          >
                            <Plus size={14} />
                            Request
                          </button>
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                            <button
                              onClick={() => openRaiseRequestModal(order, 'material')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 flex items-center gap-2"
                            >
                              <Package size={14} className="text-amber-600" />
                              Material Request
                            </button>
                            <button
                              onClick={() => openRaiseRequestModal(order, 'vendor')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                            >
                              <Truck size={14} className="text-blue-600" />
                              Vendor Request
                            </button>
                            <button
                              onClick={() => openRaiseRequestModal(order, 'payment')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2"
                            >
                              <CreditCard size={14} className="text-green-600" />
                              Payment Request
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => openRequestsModal(order)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                          title="View Requests"
                        >
                          <ClipboardList size={18} />
                        </button>
                        <button
                          onClick={() => openTimelineModal(order)}
                          className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                          title="Edit Timeline"
                        >
                          <Calendar size={18} />
                        </button>
                        <select
                          value={status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          className="px-2 py-1 text-sm border border-slate-200 rounded-lg"
                        >
                          <option value="accepted">Accepted</option>
                          <option value="in_progress">In Progress</option>
                          <option value="on_hold">On Hold</option>
                          <option value="completed">Completed</option>
                        </select>
                      </>
                    )}
                    <button
                      onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Accept Order Modal */}
      {showAcceptModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Accept Order as Project</h3>
                <p className="text-sm text-slate-500">{selectedOrder.order_no}</p>
              </div>
              <button onClick={() => setShowAcceptModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm"><strong>Customer:</strong> {selectedOrder.customer_name}</p>
                <p className="text-sm"><strong>Order Value:</strong> {formatCurrency(selectedOrder.order_value || selectedOrder.total_amount)}</p>
              </div>

              <h4 className="font-medium text-slate-700 flex items-center gap-2">
                <Calendar size={16} />
                Set Project Timeline
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={timelineData.start_date}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={timelineData.end_date}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={timelineData.deadline}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager</label>
                  <input
                    type="text"
                    value={timelineData.project_manager}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, project_manager: e.target.value }))}
                    placeholder="Assign manager"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={timelineData.notes}
                  onChange={(e) => setTimelineData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any notes for project execution..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptOrder}
                  disabled={accepting || !timelineData.start_date}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {accepting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Accept & Start Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Timeline Modal */}
      {showTimelineModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Edit Project Timeline</h3>
                <p className="text-sm text-slate-500">{selectedOrder.order_no}</p>
              </div>
              <button onClick={() => setShowTimelineModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={timelineData.start_date}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={timelineData.end_date}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={timelineData.deadline}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager</label>
                  <input
                    type="text"
                    value={timelineData.project_manager}
                    onChange={(e) => setTimelineData(prev => ({ ...prev, project_manager: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={timelineData.notes}
                  onChange={(e) => setTimelineData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowTimelineModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTimeline}
                  disabled={saving}
                  className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Timeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Order Details</h3>
                <p className="text-sm text-violet-600 font-mono">{selectedOrder.order_no}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Customer</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Order Value</p>
                  <p className="font-medium text-green-600">{formatCurrency(selectedOrder.order_value || selectedOrder.total_amount)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Category</p>
                  <p className="font-medium">{selectedOrder.category} - {CATEGORY_CONFIG[selectedOrder.category]?.label}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Project Status</p>
                  <p className="font-medium">{getStatusConfig(selectedOrder.project_status).label}</p>
                </div>
              </div>

              {selectedOrder.timeline && (
                <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                  <h4 className="font-medium text-violet-800 mb-3 flex items-center gap-2">
                    <Calendar size={16} />
                    Project Timeline
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Start Date</p>
                      <p className="font-medium">{formatDate(selectedOrder.timeline.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">End Date</p>
                      <p className="font-medium">{formatDate(selectedOrder.timeline.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Deadline</p>
                      <p className="font-medium">{formatDate(selectedOrder.timeline.deadline)}</p>
                    </div>
                  </div>
                  {selectedOrder.timeline.project_manager && (
                    <p className="text-sm mt-2"><strong>Project Manager:</strong> {selectedOrder.timeline.project_manager}</p>
                  )}
                </div>
              )}

              {selectedOrder.financials && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <DollarSign size={16} />
                    Budget Allocation
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Purchase Budget</p>
                      <p className="font-medium">{formatCurrency(selectedOrder.financials.purchase_budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Execution Budget</p>
                      <p className="font-medium">{formatCurrency(selectedOrder.financials.execution_budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Others Budget</p>
                      <p className="font-medium">{formatCurrency(selectedOrder.financials.others_budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Target Profit</p>
                      <p className="font-medium text-green-600">{formatCurrency(selectedOrder.financials.target_profit)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
