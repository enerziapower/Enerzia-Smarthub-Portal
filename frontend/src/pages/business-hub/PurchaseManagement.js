/**
 * Purchase Management - Business Hub
 * 
 * Handles:
 * - Material Requests from Project Management
 * - Vendor Requests from Project Management
 * - Purchase Orders
 * - Goods Received Notes (GRN)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, RefreshCw, Eye, CheckCircle, X,
  Clock, AlertTriangle, Truck, Building2, DollarSign,
  ShoppingCart, ClipboardList, FileCheck, Check, XCircle,
  ExternalLink, Calendar, FileText, Plus, Loader2, Send
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: Check },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700', icon: X }
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-amber-100 text-amber-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' }
};

const PurchaseManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('project_materials');
  const [materialRequests, setMaterialRequests] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const [poFormData, setPOFormData] = useState({
    vendor_name: '',
    vendor_contact: '',
    delivery_date: '',
    payment_terms: '',
    notes: ''
  });
  const [stats, setStats] = useState({ 
    materials_pending: 0, 
    vendors_pending: 0, 
    orders: 0, 
    total_value: 0 
  });

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch material requests from projects
      const matResponse = await fetch(`${API_URL}/api/project-requests/materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (matResponse.ok) {
        const matData = await matResponse.json();
        setMaterialRequests(matData.requests || []);
      }
      
      // Fetch vendor requests from projects
      const vendorResponse = await fetch(`${API_URL}/api/project-requests/vendors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (vendorResponse.ok) {
        const vendorData = await vendorResponse.json();
        setVendorRequests(vendorData.requests || []);
      }
      
      // Fetch existing purchase orders
      const poResponse = await fetch(`${API_URL}/api/purchase/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (poResponse.ok) {
        const poData = await poResponse.json();
        setPurchaseOrders(poData || []);
      }
      
      // Calculate stats
      const matPending = materialRequests.filter(r => r.status === 'pending').length;
      const vendorPending = vendorRequests.filter(r => r.status === 'pending').length;
      const totalValue = [...materialRequests, ...vendorRequests].reduce((sum, r) => sum + (r.estimated_cost || r.amount || 0), 0);
      
      setStats({
        materials_pending: matPending,
        vendors_pending: vendorPending,
        orders: purchaseOrders.length,
        total_value: totalValue
      });
      
    } catch (error) {
      console.error('Error fetching purchase data:', error);
      toast.error('Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  }, [materialRequests, vendorRequests, purchaseOrders.length]);

  useEffect(() => {
    fetchData();
  }, []);

  // Update request status
  const handleUpdateStatus = async (requestId, newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        toast.success(`Status updated to ${newStatus}`);
        fetchData();
        setShowDetailModal(false);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  // Filter requests based on search and status
  const filterRequests = (requests) => {
    return requests.filter(req => {
      const matchesSearch = !searchTerm || 
        req.request_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const subTabs = [
    { id: 'project_materials', label: 'Material Requests', icon: Package, count: materialRequests.filter(r => r.status === 'pending').length },
    { id: 'project_vendors', label: 'Vendor Requests', icon: Truck, count: vendorRequests.filter(r => r.status === 'pending').length },
    { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart, count: purchaseOrders.length },
    { id: 'grn', label: 'Goods Received', icon: FileCheck, count: 0 },
  ];

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const getPriorityConfig = (priority) => PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <div className="space-y-6" data-testid="purchase-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="text-amber-600" />
              Purchase Management
            </h2>
            <p className="text-sm text-slate-500">Process material and vendor requests from projects</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg" title="Refresh">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Material Requests</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{materialRequests.length}</p>
          <p className="text-xs text-amber-600">{materialRequests.filter(r => r.status === 'pending').length} pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={18} className="text-blue-600" />
            <span className="text-sm text-slate-600">Vendor Requests</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{vendorRequests.length}</p>
          <p className="text-xs text-blue-600">{vendorRequests.filter(r => r.status === 'pending').length} pending</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={18} className="text-purple-600" />
            <span className="text-sm text-slate-600">Purchase Orders</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{purchaseOrders.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-600">Total Est. Value</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency([...materialRequests, ...vendorRequests].reduce((sum, r) => sum + (r.estimated_cost || 0), 0))}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-4">
          <div className="flex gap-1">
            {subTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeSubTab === tab.id
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeSubTab === tab.id ? 'bg-amber-100' : 'bg-slate-100'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-amber-500" size={32} />
            </div>
          ) : (
            <>
              {/* Material Requests Tab */}
              {activeSubTab === 'project_materials' && (
                <div className="space-y-3">
                  {filterRequests(materialRequests).length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Package size={48} className="mx-auto text-slate-300 mb-4" />
                      <p>No material requests found</p>
                      <p className="text-sm mt-2">Material requests from Project Management will appear here</p>
                    </div>
                  ) : (
                    filterRequests(materialRequests).map(request => {
                      const statusConfig = getStatusConfig(request.status);
                      const StatusIcon = statusConfig.icon;
                      const priorityConfig = getPriorityConfig(request.priority);
                      
                      return (
                        <div key={request.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono font-bold text-amber-600">{request.request_no}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color} flex items-center gap-1`}>
                                  <StatusIcon size={12} />
                                  {statusConfig.label}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig.color}`}>
                                  {priorityConfig.label}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">
                                <Building2 size={14} className="inline mr-1" />
                                {request.customer_name} • {request.order_no}
                              </p>
                            </div>
                            
                            <div className="text-center px-4">
                              <p className="text-lg font-bold text-slate-800">{request.total_items} items</p>
                              <p className="text-xs text-slate-500">Est. {formatCurrency(request.estimated_cost)}</p>
                            </div>
                            
                            <div className="text-center px-4 border-l border-slate-100">
                              <p className="text-sm font-medium text-slate-700">{formatDate(request.required_by)}</p>
                              <p className="text-xs text-slate-500">Required By</p>
                            </div>
                            
                            <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                                  >
                                    <Check size={14} /> Accept
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm"
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <button
                                  onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                                >
                                  <RefreshCw size={14} /> Start
                                </button>
                              )}
                              {request.status === 'in_progress' && (
                                <button
                                  onClick={() => handleUpdateStatus(request.id, 'completed')}
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 text-sm"
                                >
                                  <CheckCircle size={14} /> Complete
                                </button>
                              )}
                              <button
                                onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
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
              )}

              {/* Vendor Requests Tab */}
              {activeSubTab === 'project_vendors' && (
                <div className="space-y-3">
                  {filterRequests(vendorRequests).length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Truck size={48} className="mx-auto text-slate-300 mb-4" />
                      <p>No vendor requests found</p>
                      <p className="text-sm mt-2">Vendor requests from Project Management will appear here</p>
                    </div>
                  ) : (
                    filterRequests(vendorRequests).map(request => {
                      const statusConfig = getStatusConfig(request.status);
                      const StatusIcon = statusConfig.icon;
                      const priorityConfig = getPriorityConfig(request.priority);
                      
                      return (
                        <div key={request.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono font-bold text-blue-600">{request.request_no}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color} flex items-center gap-1`}>
                                  <StatusIcon size={12} />
                                  {statusConfig.label}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{request.service_type}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig.color}`}>
                                  {priorityConfig.label}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">
                                <Building2 size={14} className="inline mr-1" />
                                {request.customer_name} • {request.order_no}
                              </p>
                              <p className="text-sm text-slate-500 mt-1 truncate max-w-md">{request.description}</p>
                            </div>
                            
                            <div className="text-center px-4">
                              <p className="text-lg font-bold text-slate-800">{formatCurrency(request.estimated_cost)}</p>
                              <p className="text-xs text-slate-500">Estimated</p>
                            </div>
                            
                            <div className="text-center px-4 border-l border-slate-100">
                              <p className="text-sm font-medium text-slate-700">{formatDate(request.required_by)}</p>
                              <p className="text-xs text-slate-500">Required By</p>
                            </div>
                            
                            <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                                  >
                                    <Check size={14} /> Accept
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm"
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <button
                                  onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                                >
                                  <RefreshCw size={14} /> Start
                                </button>
                              )}
                              {request.status === 'in_progress' && (
                                <button
                                  onClick={() => handleUpdateStatus(request.id, 'completed')}
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 text-sm"
                                >
                                  <CheckCircle size={14} /> Complete
                                </button>
                              )}
                              <button
                                onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
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
              )}

              {/* Purchase Orders Tab */}
              {activeSubTab === 'orders' && (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
                  <p>Purchase Orders</p>
                  <p className="text-sm mt-2">{purchaseOrders.length} orders from existing Purchase Module</p>
                </div>
              )}

              {/* GRN Tab */}
              {activeSubTab === 'grn' && (
                <div className="text-center py-12 text-slate-500">
                  <FileCheck size={48} className="mx-auto text-slate-300 mb-4" />
                  <p>Goods Received Notes</p>
                  <p className="text-sm mt-2">GRN tracking will be displayed here</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Request Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className={`flex items-center justify-between p-4 border-b border-slate-200 ${
              selectedRequest.request_type === 'material' ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-gradient-to-r from-blue-50 to-cyan-50'
            }`}>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  {selectedRequest.request_type === 'material' ? <Package size={20} className="text-amber-600" /> : <Truck size={20} className="text-blue-600" />}
                  {selectedRequest.request_no}
                </h3>
                <p className="text-sm text-slate-500">{selectedRequest.order_no} • {selectedRequest.customer_name}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Status & Priority */}
              <div className="flex gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(selectedRequest.status).color}`}>
                  {getStatusConfig(selectedRequest.status).label}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityConfig(selectedRequest.priority).color}`}>
                  {getPriorityConfig(selectedRequest.priority).label} Priority
                </span>
              </div>
              
              {/* Material Items */}
              {selectedRequest.request_type === 'material' && selectedRequest.items && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-3">Material Items</h4>
                  <div className="space-y-2">
                    {selectedRequest.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white rounded-lg p-2 border border-amber-100">
                        <span className="font-medium">{item.description}</span>
                        <span className="text-sm text-slate-600">
                          {item.quantity} {item.unit} • {formatCurrency(item.estimated_cost * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-200 flex justify-between">
                    <span className="font-medium">Total Estimated</span>
                    <span className="font-bold text-amber-700">{formatCurrency(selectedRequest.estimated_cost)}</span>
                  </div>
                </div>
              )}
              
              {/* Vendor Details */}
              {selectedRequest.request_type === 'vendor' && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-3">Vendor Requirement</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Service Type:</span>
                      <span className="font-medium">{selectedRequest.service_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Estimated Cost:</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedRequest.estimated_cost)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm text-slate-700">{selectedRequest.description}</p>
                  </div>
                </div>
              )}
              
              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                    <Calendar size={14} />
                    Required By
                  </div>
                  <p className="font-medium">{formatDate(selectedRequest.required_by)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                    <Clock size={14} />
                    Created
                  </div>
                  <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>
              
              {/* Notes */}
              {selectedRequest.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}
              
              {/* Status History */}
              {selectedRequest.status_history && selectedRequest.status_history.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Status History</h4>
                  <div className="space-y-2">
                    {selectedRequest.status_history.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusConfig(entry.status).color}`}>
                          {getStatusConfig(entry.status).label}
                        </span>
                        <span className="text-slate-500">{formatDate(entry.timestamp)}</span>
                        {entry.comments && <span className="text-slate-600">- {entry.comments}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
              <a
                href={`/business-hub/projects`}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg flex items-center gap-2 text-sm"
              >
                <ExternalLink size={14} /> View Project
              </a>
              <div className="flex gap-2">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                      disabled={updating}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                    >
                      <X size={16} /> Reject
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                      disabled={updating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Check size={16} /> Accept
                    </button>
                  </>
                )}
                {selectedRequest.status !== 'pending' && (
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseManagement;
