/**
 * Project Management - Business Hub
 * 
 * Three views:
 * 1. Pending Orders - Orders from Order Management waiting to be accepted
 * 2. Live Projects - Active projects from Project & Services
 * 3. Completed Projects - Completed projects from Project & Services
 * 
 * When order is "Accepted" → Creates project in Project & Services
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Search, RefreshCw, Eye, X,
  CheckCircle, Clock, DollarSign, Calendar,
  TrendingUp, Play, Pause, Check, XCircle,
  Building2, Save, Loader2, Plus, Package, Truck, CreditCard,
  ClipboardList, Users, AlertCircle, FileCheck, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

// Project status configuration
const PROJECT_STATUS = {
  'need to start': { label: 'Need to Start', color: 'bg-amber-100 text-amber-700', icon: Clock },
  'ongoing': { label: 'Ongoing', color: 'bg-blue-100 text-blue-700', icon: Play },
  'on hold': { label: 'On Hold', color: 'bg-slate-100 text-slate-700', icon: Pause },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  'invoiced': { label: 'Invoiced', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
};

// Category configuration
const CATEGORY_CONFIG = {
  PSS: { label: 'Projects & Services', color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-700' },
  AS: { label: 'Asset Services', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  OSS: { label: 'Other Sales & Services', color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  CS: { label: 'Commercial Sales', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-100' }
};

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeView, setActiveView] = useState('pending'); // 'pending', 'live', 'completed'
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRaiseRequestModal, setShowRaiseRequestModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [requestType, setRequestType] = useState('material');
  const [projectRequests, setProjectRequests] = useState([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [accepting, setAccepting] = useState(false);
  
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0,
    live: 0,
    completed: 0,
    totalValue: 0,
    totalInvoiced: 0
  });

  // Accept form data
  const [acceptData, setAcceptData] = useState({
    start_date: '',
    end_date: '',
    deadline: '',
    project_manager: '',
    notes: ''
  });

  // Raise Request form data
  const initialRequestData = {
    items: [{ description: '', quantity: 1, unit: 'Nos', estimated_cost: 0 }],
    service_type: 'Subcontractor',
    description: '',
    estimated_cost: 0,
    payment_type: 'Advance',
    payee: '',
    amount: 0,
    due_date: '',
    bank_details: '',
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

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch projects from Project & Services
      const projectsRes = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let projectsList = [];
      if (projectsRes.ok) {
        projectsList = await projectsRes.json();
        setProjects(projectsList || []);
      }

      // Fetch pending orders from Order Management
      const ordersRes = await fetch(`${API_URL}/api/order-lifecycle/orders?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let pendingList = [];
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        // Filter only pending orders (not yet accepted)
        pendingList = (data.orders || []).filter(o => 
          !o.project_status || o.project_status === 'pending' || o.project_status === ''
        );
        setPendingOrders(pendingList);
      }

      // Calculate stats
      const completedStatuses = ['completed', 'invoiced'];
      const liveProjects = projectsList.filter(p => !completedStatuses.includes(p.status?.toLowerCase()));
      const completedProjects = projectsList.filter(p => completedStatuses.includes(p.status?.toLowerCase()));
      const totalValue = projectsList.reduce((sum, p) => sum + (p.po_amount || 0), 0);
      const totalInvoiced = projectsList.reduce((sum, p) => sum + (p.invoiced_amount || 0), 0);
      
      setStats({ 
        total: projectsList.length, 
        pending: pendingList.length,
        live: liveProjects.length,
        completed: completedProjects.length,
        totalValue,
        totalInvoiced
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const projectStatus = project.status?.toLowerCase() || 'need to start';
    const projectCategory = project.category?.toUpperCase() || 'PSS';
    const matchesCategory = !categoryFilter || projectCategory === categoryFilter;
    
    const completedStatuses = ['completed', 'invoiced'];
    const isCompleted = completedStatuses.includes(projectStatus);
    const matchesView = activeView === 'live' ? !isCompleted : isCompleted;
    
    return matchesSearch && matchesCategory && matchesView;
  });

  // Filter pending orders
  const filteredPendingOrders = pendingOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const orderCategory = order.category?.toUpperCase() || 'PSS';
    const matchesCategory = !categoryFilter || orderCategory === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Get status configuration
  const getStatusConfig = (status) => {
    const normalizedStatus = status?.toLowerCase() || 'need to start';
    return PROJECT_STATUS[normalizedStatus] || PROJECT_STATUS['need to start'];
  };

  // Get category configuration
  const getCategoryConfig = (category) => {
    const normalizedCategory = category?.toUpperCase() || 'PSS';
    return CATEGORY_CONFIG[normalizedCategory] || CATEGORY_CONFIG.PSS;
  };

  // Open accept modal
  const openAcceptModal = (order) => {
    setSelectedOrder(order);
    setAcceptData({
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      deadline: order.delivery_date || '',
      project_manager: '',
      notes: ''
    });
    setShowAcceptModal(true);
  };

  // Accept order and create project
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
        body: JSON.stringify(acceptData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Order ${selectedOrder.pid_no} accepted and synced to Project & Services`);
        setShowAcceptModal(false);
        setSelectedOrder(null);
        setActiveView('live'); // Switch to live projects to see the new project
        fetchData();
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

  // Open detail modal
  const openDetailModal = (project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  // Open raise request modal
  const openRaiseRequestModal = (project, type = 'material') => {
    setSelectedProject(project);
    setRequestType(type);
    setRequestData(initialRequestData);
    setShowRaiseRequestModal(true);
  };

  // Fetch requests for a project
  const fetchProjectRequests = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/by-order/${projectId}`, {
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
  const openRequestsModal = async (project) => {
    setSelectedProject(project);
    await fetchProjectRequests(project.id);
    setShowRequestsModal(true);
  };

  // Submit material request
  const handleSubmitMaterialRequest = async () => {
    if (!selectedProject) return;
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
          order_id: selectedProject.id,
          order_no: selectedProject.pid_no,
          project_name: selectedProject.project_name,
          customer_name: selectedProject.client,
          items: requestData.items.filter(item => item.description),
          required_by: requestData.required_by,
          priority: requestData.priority,
          notes: requestData.notes
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Material Request ${data.request.request_number} created`);
        setShowRaiseRequestModal(false);
        setSelectedProject(null);
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
    if (!selectedProject) return;
    if (!requestData.description) {
      toast.error('Please enter a description');
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
          order_id: selectedProject.id,
          order_no: selectedProject.pid_no,
          project_name: selectedProject.project_name,
          customer_name: selectedProject.client,
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
        toast.success(`Vendor Request ${data.request.request_number} created`);
        setShowRaiseRequestModal(false);
        setSelectedProject(null);
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
    if (!selectedProject) return;
    if (!requestData.payee || !requestData.amount) {
      toast.error('Please enter payee and amount');
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
          order_id: selectedProject.id,
          order_no: selectedProject.pid_no,
          project_name: selectedProject.project_name,
          customer_name: selectedProject.client,
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
        toast.success(`Payment Request ${data.request.request_number} created`);
        setShowRaiseRequestModal(false);
        setSelectedProject(null);
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

  // Add/update/remove material items
  const addMaterialItem = () => {
    setRequestData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit: 'Nos', estimated_cost: 0 }]
    }));
  };

  const updateMaterialItem = (index, field, value) => {
    setRequestData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const removeMaterialItem = (index) => {
    if (requestData.items.length > 1) {
      setRequestData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Calculate completion percentage
  const getCompletionPercent = (project) => {
    if (project.po_amount && project.po_amount > 0) {
      return Math.round((project.invoiced_amount || 0) / project.po_amount * 100);
    }
    return 0;
  };

  return (
    <div className="space-y-6" data-testid="project-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FolderKanban className="text-violet-600" />
              Project Management
            </h2>
            <p className="text-sm text-slate-500">Accept orders, manage projects, raise requests</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            data-testid="refresh-btn"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} />
            <span className="text-sm opacity-90">Pending</span>
          </div>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>
        
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <FolderKanban size={20} />
            <span className="text-sm opacity-90">Total Projects</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Play size={18} className="text-blue-600" />
            <span className="text-sm text-slate-600">Live</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{stats.live}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm text-slate-600">Completed</span>
          </div>
          <p className="text-xl font-bold text-green-700">{stats.completed}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-600">PO Value</span>
          </div>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(stats.totalValue)}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Invoiced</span>
          </div>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(stats.totalInvoiced)}</p>
        </div>
      </div>

      {/* View Tabs & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('pending')}
            data-testid="pending-tab"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeView === 'pending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle size={16} />
            Pending Orders
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeView === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {stats.pending}
            </span>
          </button>
          <button
            onClick={() => setActiveView('live')}
            data-testid="live-tab"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeView === 'live'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play size={16} />
            Live Projects
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeView === 'live' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {stats.live}
            </span>
          </button>
          <button
            onClick={() => setActiveView('completed')}
            data-testid="completed-tab"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeView === 'completed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle size={16} />
            Completed
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeView === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {stats.completed}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PID, client, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-violet-500" size={32} />
          </div>
        ) : activeView === 'pending' ? (
          /* Pending Orders Tab */
          <>
            <div className="p-4 border-b border-slate-200 bg-orange-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-600" />
                Orders Waiting for Acceptance
              </h3>
              <p className="text-xs text-slate-500 mt-1">Accept orders to create projects in Project & Services</p>
            </div>
            
            {filteredPendingOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileCheck size={48} className="mx-auto text-slate-300 mb-4" />
                <p>No pending orders</p>
                <p className="text-sm mt-2">All orders have been accepted</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">PID</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Project / Customer</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Order Value</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Delivery Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Created</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPendingOrders.map(order => {
                      const categoryConfig = getCategoryConfig(order.category);
                      
                      return (
                        <tr key={order.id} className="hover:bg-orange-50/50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-medium text-slate-800">{order.pid_no}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 text-sm truncate max-w-[200px]">{order.project_name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{order.customer_name}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig.bgColor} ${categoryConfig.textColor}`}>
                              {order.category?.toUpperCase() || 'PSS'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {formatCurrency(order.order_value || order.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {formatDate(order.delivery_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openAcceptModal(order)}
                              data-testid={`accept-btn-${order.id}`}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto"
                            >
                              <Check size={16} />
                              Accept
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {filteredPendingOrders.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
                {filteredPendingOrders.length} pending orders
              </div>
            )}
          </>
        ) : (
          /* Live/Completed Projects Tab */
          <>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FolderKanban size={48} className="mx-auto text-slate-300 mb-4" />
                <p>No {activeView} projects found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">PID</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Project / Client</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">PO Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Invoiced</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Progress</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Engineer</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map(project => {
                      const statusConfig = getStatusConfig(project.status);
                      const categoryConfig = getCategoryConfig(project.category);
                      const completion = getCompletionPercent(project);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <tr key={project.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-medium text-slate-800">{project.pid_no}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 text-sm truncate max-w-[200px]">{project.project_name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{project.client}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig.bgColor} ${categoryConfig.textColor}`}>
                              {project.category?.toUpperCase() || 'PSS'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                              <StatusIcon size={12} />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {formatCurrency(project.po_amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                            {formatCurrency(project.invoiced_amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    completion >= 100 ? 'bg-green-500' :
                                    completion >= 50 ? 'bg-blue-500' :
                                    completion > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${Math.min(completion, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-600">{completion}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600 truncate max-w-[100px] block">
                              {project.engineer_in_charge || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openDetailModal(project)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => openRequestsModal(project)}
                                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                                title="View Requests"
                              >
                                <ClipboardList size={16} />
                              </button>
                              <button
                                onClick={() => openRaiseRequestModal(project, 'material')}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                title="Raise Request"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && filteredProjects.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
                Showing {filteredProjects.length} of {stats.total} projects
              </div>
            )}
          </>
        )}
      </div>

      {/* Accept Order Modal */}
      {showAcceptModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Check className="text-orange-600" size={20} />
                  Accept Order as Project
                </h3>
                <p className="text-sm text-slate-500">{selectedOrder.pid_no} • {selectedOrder.customer_name}</p>
              </div>
              <button onClick={() => setShowAcceptModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Order Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-700 mb-2">Order Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Project:</span>
                    <p className="font-medium">{selectedOrder.project_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Value:</span>
                    <p className="font-medium text-emerald-600">{formatCurrency(selectedOrder.order_value || selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </div>

              {/* Timeline Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={acceptData.start_date}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={acceptData.end_date}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={acceptData.deadline}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager / Engineer</label>
                  <input
                    type="text"
                    value={acceptData.project_manager}
                    onChange={(e) => setAcceptData(prev => ({ ...prev, project_manager: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Assign engineer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={acceptData.notes}
                  onChange={(e) => setAcceptData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-800">
                  <strong>Note:</strong> This will create a new project in Project & Services with the order details.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptOrder}
                disabled={accepting || !acceptData.start_date}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {accepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Accept & Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {showDetailModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedProject.pid_no}</h3>
                <p className="text-sm text-slate-500">{selectedProject.project_name}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Status & Category */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedProject.status).color}`}>
                  {getStatusConfig(selectedProject.status).label}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryConfig(selectedProject.category).bgColor} ${getCategoryConfig(selectedProject.category).textColor}`}>
                  {getCategoryConfig(selectedProject.category).label}
                </span>
              </div>

              {/* Client Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={16} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Client</span>
                </div>
                <p className="text-slate-800">{selectedProject.client}</p>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">PO Amount</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedProject.po_amount)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Invoiced</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedProject.invoiced_amount)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">This Week Billing</p>
                  <p className="text-lg font-bold text-amber-700">{formatCurrency(selectedProject.this_week_billing)}</p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Completion Progress</span>
                  <span className="font-medium text-slate-800">{getCompletionPercent(selectedProject)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${Math.min(getCompletionPercent(selectedProject), 100)}%` }}
                  />
                </div>
              </div>

              {/* Engineer */}
              {selectedProject.engineer_in_charge && (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-500" />
                  <span className="text-sm text-slate-600">Engineer:</span>
                  <span className="text-sm font-medium text-slate-800">{selectedProject.engineer_in_charge}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDetailModal(false); openRaiseRequestModal(selectedProject, 'material'); }}
                  className="px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center gap-1"
                >
                  <Package size={14} /> Material
                </button>
                <button
                  onClick={() => { setShowDetailModal(false); openRaiseRequestModal(selectedProject, 'vendor'); }}
                  className="px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                >
                  <Truck size={14} /> Vendor
                </button>
                <button
                  onClick={() => { setShowDetailModal(false); openRaiseRequestModal(selectedProject, 'payment'); }}
                  className="px-3 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-1"
                >
                  <CreditCard size={14} /> Payment
                </button>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Request Modal */}
      {showRaiseRequestModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Raise Request</h3>
                <p className="text-sm text-slate-500">{selectedProject.pid_no} • {selectedProject.project_name}</p>
              </div>
              <button onClick={() => setShowRaiseRequestModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setRequestType('material')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    requestType === 'material' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <Package size={16} /> Material
                </button>
                <button
                  onClick={() => setRequestType('vendor')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    requestType === 'vendor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <Truck size={16} /> Vendor
                </button>
                <button
                  onClick={() => setRequestType('payment')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    requestType === 'payment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <CreditCard size={16} /> Payment
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Material Request Form */}
              {requestType === 'material' && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-700">Items Required</label>
                      <button
                        onClick={addMaterialItem}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {requestData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateMaterialItem(index, 'description', e.target.value)}
                            className="col-span-5 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateMaterialItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => updateMaterialItem(index, 'unit', e.target.value)}
                            className="col-span-2 px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                          >
                            <option>Nos</option>
                            <option>Kg</option>
                            <option>Mtr</option>
                            <option>Set</option>
                            <option>Lot</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Est. Cost"
                            value={item.estimated_cost}
                            onChange={(e) => updateMaterialItem(index, 'estimated_cost', parseFloat(e.target.value) || 0)}
                            className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => removeMaterialItem(index)}
                            className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded"
                            disabled={requestData.items.length === 1}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Vendor Request Form */}
              {requestType === 'vendor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
                    <select
                      value={requestData.service_type}
                      onChange={(e) => setRequestData(prev => ({ ...prev, service_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option>Subcontractor</option>
                      <option>Equipment Rental</option>
                      <option>Transportation</option>
                      <option>Testing Services</option>
                      <option>Consulting</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={requestData.description}
                      onChange={(e) => setRequestData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Describe the vendor service required..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost</label>
                    <input
                      type="number"
                      value={requestData.estimated_cost}
                      onChange={(e) => setRequestData(prev => ({ ...prev, estimated_cost: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </>
              )}

              {/* Payment Request Form */}
              {requestType === 'payment' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
                      <select
                        value={requestData.payment_type}
                        onChange={(e) => setRequestData(prev => ({ ...prev, payment_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        <option>Advance</option>
                        <option>Milestone</option>
                        <option>Final</option>
                        <option>Reimbursement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                      <input
                        type="number"
                        value={requestData.amount}
                        onChange={(e) => setRequestData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payee Name</label>
                    <input
                      type="text"
                      value={requestData.payee}
                      onChange={(e) => setRequestData(prev => ({ ...prev, payee: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Vendor/Supplier name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={requestData.due_date}
                        onChange={(e) => setRequestData(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bank Details</label>
                      <input
                        type="text"
                        value={requestData.bank_details}
                        onChange={(e) => setRequestData(prev => ({ ...prev, bank_details: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="Account/IFSC"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Required By</label>
                  <input
                    type="date"
                    value={requestData.required_by}
                    onChange={(e) => setRequestData(prev => ({ ...prev, required_by: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={requestData.priority}
                    onChange={(e) => setRequestData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={requestData.notes}
                  onChange={(e) => setRequestData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowRaiseRequestModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={
                  requestType === 'material' ? handleSubmitMaterialRequest :
                  requestType === 'vendor' ? handleSubmitVendorRequest :
                  handleSubmitPaymentRequest
                }
                disabled={submittingRequest}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submittingRequest ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Requests Modal */}
      {showRequestsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Project Requests</h3>
                <p className="text-sm text-slate-500">{selectedProject.pid_no} • {selectedProject.project_name}</p>
              </div>
              <button onClick={() => setShowRequestsModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Material Requests */}
              <div>
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Package size={18} className="text-amber-600" />
                  Material Requests ({projectRequests.material?.length || 0})
                </h4>
                {projectRequests.material?.length > 0 ? (
                  <div className="space-y-2">
                    {projectRequests.material.map(req => (
                      <div key={req.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-sm text-amber-700">{req.request_number}</span>
                            <p className="text-sm text-slate-600 mt-1">{req.items?.length || 0} items</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No material requests</p>
                )}
              </div>

              {/* Vendor Requests */}
              <div>
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Truck size={18} className="text-blue-600" />
                  Vendor Requests ({projectRequests.vendor?.length || 0})
                </h4>
                {projectRequests.vendor?.length > 0 ? (
                  <div className="space-y-2">
                    {projectRequests.vendor.map(req => (
                      <div key={req.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-sm text-blue-700">{req.request_number}</span>
                            <p className="text-sm text-slate-600 mt-1">{req.service_type}: {req.description?.slice(0, 50)}...</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No vendor requests</p>
                )}
              </div>

              {/* Payment Requests */}
              <div>
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-green-600" />
                  Payment Requests ({projectRequests.payment?.length || 0})
                </h4>
                {projectRequests.payment?.length > 0 ? (
                  <div className="space-y-2">
                    {projectRequests.payment.map(req => (
                      <div key={req.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-sm text-green-700">{req.request_number}</span>
                            <p className="text-sm text-slate-600 mt-1">{req.payee} • {formatCurrency(req.amount)}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No payment requests</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
              <button
                onClick={() => { setShowRequestsModal(false); openRaiseRequestModal(selectedProject, 'material'); }}
                className="px-4 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center gap-1"
              >
                <Plus size={14} /> New Request
              </button>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
