/**
 * Purchase Management - Business Hub
 * 
 * Handles:
 * - Material Requests from P&S (Raise Request)
 * - Vendor Requests from P&S (Raise Request)
 * - Follow-up status and delivery tracking
 * 
 * Note: Purchase Orders are managed in Zoho Books (external)
 * Note: GRN removed - not needed for current workflow
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, RefreshCw, Eye, CheckCircle, X,
  Clock, AlertTriangle, Truck, Building2, DollarSign,
  ShoppingCart, ClipboardList, Check, XCircle,
  Calendar, Loader2, MapPin, Phone, User, FileText
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  ordered: { label: 'Ordered', color: 'bg-violet-100 text-violet-700', icon: ShoppingCart },
  dispatched: { label: 'Dispatched', color: 'bg-cyan-100 text-cyan-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: Check },
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
  const [activeSubTab, setActiveSubTab] = useState('materials');
  const [materialRequests, setMaterialRequests] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Update form data
  const [updateFormData, setUpdateFormData] = useState({
    status: '',
    vendor_id: '',
    vendor_name: '',
    expected_delivery: '',
    tracking_info: '',
    remarks: ''
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
      let matList = [];
      if (matResponse.ok) {
        const matData = await matResponse.json();
        matList = matData.requests || [];
        setMaterialRequests(matList);
      }
      
      // Fetch vendor requests from projects
      const vendorResponse = await fetch(`${API_URL}/api/project-requests/vendors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let vendorList = [];
      if (vendorResponse.ok) {
        const vendorData = await vendorResponse.json();
        vendorList = vendorData.requests || [];
        setVendorRequests(vendorList);
      }
      
      // Fetch vendors for dropdown
      const vendorsRes = await fetch(`${API_URL}/api/settings/vendors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        setVendors(vendorsData || []);
      }
      
    } catch (error) {
      console.error('Error fetching purchase data:', error);
      toast.error('Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update request status
  const handleUpdateStatus = async () => {
    if (!selectedRequest || !updateFormData.status) {
      toast.error('Please select a status');
      return;
    }
    
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: updateFormData.status,
          vendor_id: updateFormData.vendor_id,
          vendor_name: updateFormData.vendor_name,
          expected_delivery: updateFormData.expected_delivery,
          tracking_info: updateFormData.tracking_info,
          remarks: updateFormData.remarks
        })
      });
      
      if (response.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[updateFormData.status]?.label || updateFormData.status}`);
        fetchData();
        setShowUpdateModal(false);
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

  // Quick status update
  const handleQuickStatusUpdate = async (requestId, newStatus) => {
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
        toast.success(`Status updated`);
        fetchData();
      } else {
        toast.error('Failed to update');
      }
    } catch (error) {
      toast.error('Error updating');
    } finally {
      setUpdating(false);
    }
  };

  // Open update modal
  const openUpdateModal = (request) => {
    setSelectedRequest(request);
    setUpdateFormData({
      status: request.status || 'pending',
      vendor_id: request.vendor_id || '',
      vendor_name: request.vendor_name || '',
      expected_delivery: request.expected_delivery || '',
      tracking_info: request.tracking_info || '',
      remarks: request.remarks || ''
    });
    setShowUpdateModal(true);
  };

  // Filter requests
  const filterRequests = (requests) => {
    return requests.filter(req => {
      const matchesSearch = !searchTerm || 
        req.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredMaterials = filterRequests(materialRequests);
  const filteredVendors = filterRequests(vendorRequests);

  const subTabs = [
    { id: 'materials', label: 'Material Requests', icon: Package, count: materialRequests.length, pending: materialRequests.filter(r => r.status === 'pending').length },
    { id: 'vendors', label: 'Vendor Requests', icon: Truck, count: vendorRequests.length, pending: vendorRequests.filter(r => r.status === 'pending').length },
  ];

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const getPriorityConfig = (priority) => PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  // Render request card
  const renderRequestCard = (request, type) => {
    const statusConfig = getStatusConfig(request.status);
    const priorityConfig = getPriorityConfig(request.priority);
    const StatusIcon = statusConfig.icon;
    
    return (
      <div key={request.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-amber-600">{request.request_number}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig.color}`}>
                {priorityConfig.label}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{request.order_no}</p>
          </div>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <StatusIcon size={12} />
            {statusConfig.label}
          </span>
        </div>
        
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-800 line-clamp-2">
            {type === 'material' 
              ? request.items?.map(i => `${i.description} (${i.quantity} ${i.unit})`).join(', ')
              : request.description
            }
          </p>
          <p className="text-xs text-slate-500 mt-1">
            <Building2 size={12} className="inline mr-1" />
            {request.customer_name}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            Required: {formatDate(request.required_by)}
          </span>
          <span className="font-semibold text-slate-700">
            {formatCurrency(type === 'material' 
              ? request.items?.reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
              : request.estimated_cost
            )}
          </span>
        </div>
        
        {/* Delivery tracking info */}
        {(request.vendor_name || request.expected_delivery) && (
          <div className="bg-slate-50 rounded-lg p-2 mb-3 text-xs">
            {request.vendor_name && (
              <p className="text-slate-600"><User size={10} className="inline mr-1" />Vendor: {request.vendor_name}</p>
            )}
            {request.expected_delivery && (
              <p className="text-slate-600"><Truck size={10} className="inline mr-1" />Expected: {formatDate(request.expected_delivery)}</p>
            )}
            {request.tracking_info && (
              <p className="text-slate-600"><MapPin size={10} className="inline mr-1" />{request.tracking_info}</p>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={() => openUpdateModal(request)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg"
          >
            <RefreshCw size={14} />
            Update
          </button>
          {request.status === 'pending' && (
            <button
              onClick={() => handleQuickStatusUpdate(request.id, 'approved')}
              className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg"
              disabled={updating}
            >
              <Check size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

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
            <p className="text-sm text-slate-500">Track material and vendor requests from P&S projects</p>
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
                data-testid="search-input"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              data-testid="status-filter"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg" title="Refresh">
              <RefreshCw size={20} className={loading ? 'animate-spin text-amber-600' : 'text-slate-600'} />
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
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-violet-600" />
            <span className="text-sm text-slate-600">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-violet-700">
            {[...materialRequests, ...vendorRequests].filter(r => ['approved', 'ordered', 'dispatched', 'in_progress'].includes(r.status)).length}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-600">Total Est. Value</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {formatCurrency([...materialRequests, ...vendorRequests].reduce((sum, r) => {
              if (r.items) return sum + r.items.reduce((s, i) => s + (i.estimated_cost || 0), 0);
              return sum + (r.estimated_cost || 0);
            }, 0))}
          </p>
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
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon size={16} />
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeSubTab === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                  {tab.pending > 0 && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-amber-500" size={32} />
            </div>
          ) : (
            <>
              {/* Material Requests */}
              {activeSubTab === 'materials' && (
                filteredMaterials.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No material requests found</p>
                    <p className="text-sm text-slate-400">Requests raised from P&S will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMaterials.map(req => renderRequestCard(req, 'material'))}
                  </div>
                )
              )}

              {/* Vendor Requests */}
              {activeSubTab === 'vendors' && (
                filteredVendors.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No vendor requests found</p>
                    <p className="text-sm text-slate-400">Requests raised from P&S will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVendors.map(req => renderRequestCard(req, 'vendor'))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="detail-modal">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Request Details</h3>
                <p className="text-sm text-amber-600 font-mono">{selectedRequest.request_number}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Project / PID</label>
                  <p className="font-medium text-slate-800">{selectedRequest.order_no}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Customer</label>
                  <p className="font-medium text-slate-800">{selectedRequest.customer_name}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusConfig(selectedRequest.status).color}`}>
                    {getStatusConfig(selectedRequest.status).label}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Priority</label>
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getPriorityConfig(selectedRequest.priority).color}`}>
                    {getPriorityConfig(selectedRequest.priority).label}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Required By</label>
                  <p className="font-medium text-slate-800">{formatDate(selectedRequest.required_by)}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Created</label>
                  <p className="font-medium text-slate-800">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>

              {/* Items (for material requests) */}
              {selectedRequest.items && (
                <div>
                  <label className="text-xs text-slate-500">Items</label>
                  <div className="mt-1 space-y-2">
                    {selectedRequest.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 rounded-lg p-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.description}</p>
                          <p className="text-xs text-slate-500">{item.quantity} {item.unit}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{formatCurrency(item.estimated_cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description (for vendor requests) */}
              {selectedRequest.description && !selectedRequest.items && (
                <div>
                  <label className="text-xs text-slate-500">Description</label>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selectedRequest.description}</p>
                </div>
              )}

              {/* Delivery Info */}
              {(selectedRequest.vendor_name || selectedRequest.expected_delivery || selectedRequest.tracking_info) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <label className="text-xs text-blue-600 font-medium">Delivery Tracking</label>
                  <div className="mt-2 space-y-1 text-sm">
                    {selectedRequest.vendor_name && <p><strong>Vendor:</strong> {selectedRequest.vendor_name}</p>}
                    {selectedRequest.expected_delivery && <p><strong>Expected:</strong> {formatDate(selectedRequest.expected_delivery)}</p>}
                    {selectedRequest.tracking_info && <p><strong>Tracking:</strong> {selectedRequest.tracking_info}</p>}
                  </div>
                </div>
              )}

              {selectedRequest.notes && (
                <div>
                  <label className="text-xs text-slate-500">Notes</label>
                  <p className="text-sm text-slate-700">{selectedRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => { setShowDetailModal(false); openUpdateModal(selectedRequest); }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showUpdateModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="update-modal">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Update Request</h3>
              <p className="text-sm text-slate-500">{selectedRequest.request_number}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                <select
                  value={updateFormData.status}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  data-testid="update-status"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="ordered">Ordered (PO Created in Zoho)</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                <select
                  value={updateFormData.vendor_id}
                  onChange={(e) => {
                    const vendor = vendors.find(v => v.id === e.target.value);
                    setUpdateFormData(prev => ({ 
                      ...prev, 
                      vendor_id: e.target.value,
                      vendor_name: vendor?.name || ''
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  data-testid="update-vendor"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
                {!updateFormData.vendor_id && (
                  <input
                    type="text"
                    value={updateFormData.vendor_name}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mt-2"
                    placeholder="Or enter vendor name manually"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={updateFormData.expected_delivery}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  data-testid="update-delivery"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tracking Info</label>
                <input
                  type="text"
                  value={updateFormData.tracking_info}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, tracking_info: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Courier, tracking number, etc."
                  data-testid="update-tracking"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={updateFormData.remarks}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Additional notes..."
                  data-testid="update-remarks"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                data-testid="submit-update"
              >
                {updating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseManagement;
