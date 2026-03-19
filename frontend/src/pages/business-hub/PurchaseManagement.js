/**
 * Purchase Management - Business Hub
 * 
 * PID-Centric Consolidated View
 * Shows all PIDs with their:
 * - Financials (PO Amount, Budget, Available, Profit)
 * - Material Requests
 * - Vendor Requests  
 * - Payment Requests
 * - Expenses (with bills missing count)
 * 
 * Note: Purchase Orders managed in Zoho Books
 * Note: Payment approval auto-creates expense entry
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, RefreshCw, Eye, CheckCircle, X,
  Clock, AlertTriangle, Truck, Building2, DollarSign,
  ShoppingCart, ClipboardList, Check, XCircle,
  Calendar, Loader2, MapPin, User, FileText, Receipt,
  TrendingUp, TrendingDown, Wallet, CreditCard, ChevronDown,
  ChevronUp, AlertCircle, Plus, ExternalLink
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

const CATEGORY_COLORS = {
  PSS: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  AS: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  OSS: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  CS: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' }
};

const PurchaseManagement = () => {
  const [pids, setPids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPid, setExpandedPid] = useState(null);
  const [pidDetails, setPidDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('materials');
  
  // Stats
  const [stats, setStats] = useState({
    totalPids: 0,
    pendingRequests: 0,
    totalExpenses: 0,
    billsMissing: 0
  });
  
  // Update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    status: '',
    vendor_name: '',
    expected_delivery: '',
    tracking_info: '',
    remarks: ''
  });

  // Budget warning for payment approvals
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [loadingBudgetCheck, setLoadingBudgetCheck] = useState(false);

  // Vendors for dropdown
  const [vendors, setVendors] = useState([]);

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

  const fetchPids = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/project-requests/consolidated/by-pid?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPids(data.pids || []);
        
        // Calculate stats
        const allPids = data.pids || [];
        const pending = allPids.reduce((sum, p) => 
          sum + (p.materials?.pending || 0) + (p.vendors?.pending || 0) + (p.payments?.pending || 0), 0);
        const expenses = allPids.reduce((sum, p) => sum + (p.expenses?.value || 0), 0);
        const bills = allPids.reduce((sum, p) => sum + (p.expenses?.bills_missing || 0), 0);
        
        setStats({
          totalPids: allPids.length,
          pendingRequests: pending,
          totalExpenses: expenses,
          billsMissing: bills
        });
      }
    } catch (error) {
      console.error('Error fetching PIDs:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const fetchPidDetails = async (orderId) => {
    try {
      setLoadingDetails(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/project-requests/consolidated/pid/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPidDetails(data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching PID details:', error);
      toast.error('Failed to load details');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchPids();
    fetchVendors();
  }, [fetchPids, fetchVendors]);

  // Filter PIDs
  const filteredPids = pids.filter(pid => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (pid.order_no || '').toLowerCase().includes(search) ||
      (pid.customer_name || '').toLowerCase().includes(search) ||
      (pid.project_name || '').toLowerCase().includes(search)
    );
  });

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
        body: JSON.stringify(updateFormData)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.expense_created) {
          toast.success(`Approved! Expense ${result.expense_no} auto-created (bill pending)`);
        } else {
          toast.success(`Status updated to ${STATUS_CONFIG[updateFormData.status]?.label || updateFormData.status}`);
        }
        fetchPids();
        if (pidDetails) {
          fetchPidDetails(pidDetails.order_id);
        }
        setShowUpdateModal(false);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  // Check budget for payment request
  const checkBudgetForPayment = async (requestId) => {
    try {
      setLoadingBudgetCheck(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/${requestId}/budget-check`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBudgetWarning(data);
      }
    } catch (error) {
      console.error('Error checking budget:', error);
    } finally {
      setLoadingBudgetCheck(false);
    }
  };

  const openUpdateModal = (request) => {
    setSelectedRequest(request);
    setUpdateFormData({
      status: request.status || 'pending',
      vendor_name: request.vendor_name || '',
      expected_delivery: request.expected_delivery || '',
      tracking_info: request.tracking_info || '',
      remarks: request.remarks || ''
    });
    setBudgetWarning(null); // Reset budget warning
    
    // Fetch budget info for payment requests
    if (request.request_type === 'payment') {
      checkBudgetForPayment(request.id);
    }
    
    setShowUpdateModal(true);
  };

  // Render PID Card
  const renderPidCard = (pid) => {
    const colors = CATEGORY_COLORS[pid.category] || CATEGORY_COLORS.PSS;
    const hasPending = (pid.materials?.pending || 0) + (pid.vendors?.pending || 0) + (pid.payments?.pending || 0) > 0;
    const isExpanded = expandedPid === pid.order_id;
    
    return (
      <div 
        key={pid.order_id} 
        className={`bg-white border rounded-xl overflow-hidden transition-all ${
          hasPending ? 'border-amber-300 shadow-amber-100 shadow-md' : 'border-slate-200'
        }`}
        data-testid={`pid-card-${pid.order_no}`}
      >
        {/* Card Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                {pid.category || 'PSS'}
              </span>
              <div>
                <h3 className="font-semibold text-slate-800">{pid.order_no}</h3>
                <p className="text-sm text-slate-500 truncate max-w-[250px]">{pid.customer_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pid.budget_warning === 'no_budget' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                  <AlertCircle size={12} />
                  No Budget
                </span>
              )}
              {pid.budget_warning === 'over_budget' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                  <AlertTriangle size={12} />
                  Over Budget
                </span>
              )}
              {hasPending && (
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Card Body - 3 Column Layout */}
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {/* Column 1: Financials */}
          <div className="p-4">
            <h4 className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1">
              <DollarSign size={12} />
              Financials
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">PO Amount</span>
                <span className="font-medium">{formatCurrency(pid.po_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Budget</span>
                <span className="font-medium text-blue-700">{formatCurrency(pid.budget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expenses</span>
                <span className="font-medium text-rose-600">{formatCurrency(pid.total_expenses)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">Available</span>
                <span className={`font-bold ${pid.available_budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pid.available_budget)}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Requests */}
          <div className="p-4">
            <h4 className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1">
              <ClipboardList size={12} />
              Requests
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-600">
                  <Package size={12} className="text-amber-500" />
                  Material
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pid.materials?.total || 0}</span>
                  {(pid.materials?.pending || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                      {pid.materials.pending} ⏳
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-600">
                  <Truck size={12} className="text-blue-500" />
                  Vendor
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pid.vendors?.total || 0}</span>
                  {(pid.vendors?.pending || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                      {pid.vendors.pending} ⏳
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-600">
                  <CreditCard size={12} className="text-green-500" />
                  Payment
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pid.payments?.total || 0}</span>
                  {(pid.payments?.pending || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                      {pid.payments.pending} ⏳
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Expenses & Profit */}
          <div className="p-4">
            <h4 className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1">
              <Receipt size={12} />
              Expenses & Profit
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Expenses</span>
                <span className="font-medium">{formatCurrency(pid.total_expenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Entries</span>
                <span className="font-medium">{pid.expenses?.total || 0}</span>
              </div>
              {(pid.expenses?.bills_missing || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-amber-600">Bills Missing</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                    {pid.expenses.bills_missing} ⚠️
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">Profit</span>
                <span className={`font-bold ${pid.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pid.profit)} ({pid.profit_percent}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Est. Value: {formatCurrency((pid.materials?.value || 0) + (pid.vendors?.value || 0) + (pid.payments?.value || 0))}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPidDetails(pid.order_id)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
              data-testid={`view-details-${pid.order_no}`}
            >
              <Eye size={14} />
              View Details
            </button>
            <button
              onClick={() => setExpandedPid(isExpanded ? null : pid.order_id)}
              className="p-1.5 hover:bg-slate-200 rounded-lg"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render request item in detail modal
  const renderRequestItem = (request, type) => {
    const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;
    
    return (
      <div key={request.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-mono text-sm text-amber-600">{request.request_number}</span>
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
              <StatusIcon size={10} className="inline mr-1" />
              {statusConfig.label}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_CONFIG[request.priority]?.color || 'bg-slate-100'}`}>
            {request.priority || 'medium'}
          </span>
        </div>
        
        <p className="text-sm text-slate-700 mb-2">
          {type === 'material' 
            ? request.items?.map(i => `${i.description} (${i.quantity} ${i.unit})`).join(', ')
            : type === 'payment'
            ? `${request.payment_type}: ${request.payee} - ${formatCurrency(request.amount)}`
            : request.description
          }
        </p>
        
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Required: {formatDate(request.required_by)}</span>
          <button
            onClick={() => openUpdateModal(request)}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Update Status →
          </button>
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
            <p className="text-sm text-slate-500">PID-centric view: Requests, Expenses & Payments per Project</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PIDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
                data-testid="search-input"
              />
            </div>
            <button onClick={fetchPids} className="p-2 hover:bg-slate-100 rounded-lg" title="Refresh">
              <RefreshCw size={20} className={loading ? 'animate-spin text-amber-600' : 'text-slate-600'} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={18} className="text-violet-600" />
            <span className="text-sm text-slate-600">Active PIDs</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalPids}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Pending Requests</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.pendingRequests}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={18} className="text-rose-600" />
            <span className="text-sm text-slate-600">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-rose-700">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${stats.billsMissing > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className={stats.billsMissing > 0 ? 'text-amber-600' : 'text-green-600'} />
            <span className="text-sm text-slate-600">Bills Missing</span>
          </div>
          <p className={`text-2xl font-bold ${stats.billsMissing > 0 ? 'text-amber-700' : 'text-green-700'}`}>
            {stats.billsMissing}
          </p>
        </div>
      </div>

      {/* PID Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-amber-500" size={32} />
        </div>
      ) : filteredPids.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No PIDs found with requests</p>
          <p className="text-sm text-slate-400">Requests raised from P&S will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPids.map(pid => renderPidCard(pid))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && pidDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="detail-modal">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{pidDetails.order_no}</h3>
                  <p className="text-sm text-slate-500">{pidDetails.customer_name}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              {/* Financial Summary */}
              <div className="grid grid-cols-5 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500">PO Amount</p>
                  <p className="font-bold text-slate-800">{formatCurrency(pidDetails.po_amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Budget</p>
                  <p className="font-bold text-blue-700">{formatCurrency(pidDetails.budget)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Expenses</p>
                  <p className="font-bold text-rose-600">{formatCurrency(pidDetails.total_expenses)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Available</p>
                  <p className={`font-bold ${pidDetails.available_budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(pidDetails.available_budget)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Profit</p>
                  <p className={`font-bold ${pidDetails.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(pidDetails.profit)} ({pidDetails.profit_percent}%)
                  </p>
                </div>
              </div>
              
              {/* Budget Warning */}
              {pidDetails.budget_warning && (
                <div className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${
                  pidDetails.budget_warning === 'no_budget' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  <AlertTriangle size={16} />
                  {pidDetails.budget_warning === 'no_budget' 
                    ? 'No budget allocated for this PID. Set budget in Order Management.'
                    : 'Budget exceeded! Expenses are over the allocated budget.'
                  }
                </div>
              )}
              
              {/* Bills Missing Warning */}
              {(pidDetails.expenses?.bills_missing || 0) > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-amber-100 text-amber-700 text-sm flex items-center gap-2">
                  <FileText size={16} />
                  {pidDetails.expenses.bills_missing} expense(s) pending bill upload
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 px-6">
              <div className="flex gap-1">
                {['materials', 'vendors', 'payments', 'expenses'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveDetailTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeDetailTab === tab
                        ? 'border-amber-500 text-amber-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeDetailTab === tab ? 'bg-amber-100' : 'bg-slate-100'
                    }`}>
                      {pidDetails[tab]?.total || pidDetails[tab]?.items?.length || 0}
                    </span>
                    {(pidDetails[tab]?.pending || 0) > 0 && (
                      <span className="ml-1 w-2 h-2 bg-amber-500 rounded-full inline-block" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingDetails ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="animate-spin text-amber-500" size={24} />
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDetailTab === 'materials' && (
                    pidDetails.materials?.items?.length > 0 
                      ? pidDetails.materials.items.map(r => renderRequestItem(r, 'material'))
                      : <p className="text-center text-slate-400 py-8">No material requests</p>
                  )}
                  {activeDetailTab === 'vendors' && (
                    pidDetails.vendors?.items?.length > 0 
                      ? pidDetails.vendors.items.map(r => renderRequestItem(r, 'vendor'))
                      : <p className="text-center text-slate-400 py-8">No vendor requests</p>
                  )}
                  {activeDetailTab === 'payments' && (
                    pidDetails.payments?.items?.length > 0 
                      ? pidDetails.payments.items.map(r => renderRequestItem(r, 'payment'))
                      : <p className="text-center text-slate-400 py-8">No payment requests</p>
                  )}
                  {activeDetailTab === 'expenses' && (
                    pidDetails.expenses?.items?.length > 0 
                      ? pidDetails.expenses.items.map(expense => (
                          <div key={expense.id} className="border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="font-mono text-sm text-rose-600">{expense.expense_no}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                  expense.approval_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {expense.approval_status}
                                </span>
                                {expense.pending_bill && (
                                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                    ⚠️ Bill Pending
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-slate-800">{formatCurrency(expense.amount)}</span>
                            </div>
                            <p className="text-sm text-slate-700">{expense.description}</p>
                            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                              <span>{expense.vendor} • {expense.date}</span>
                              <span>{expense.category}</span>
                            </div>
                          </div>
                        ))
                      : <p className="text-center text-slate-400 py-8">No expenses recorded</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showUpdateModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" data-testid="update-modal">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Update Request</h3>
              <p className="text-sm text-slate-500">{selectedRequest.request_number}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Budget Warning for Payment Requests */}
              {selectedRequest.request_type === 'payment' && budgetWarning && (
                <div data-testid="budget-warning-section">
                  {loadingBudgetCheck ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" />
                      Checking budget...
                    </div>
                  ) : budgetWarning.warning ? (
                    <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      budgetWarning.warning === 'over_budget' ? 'bg-red-50 text-red-700 border border-red-200' :
                      budgetWarning.warning === 'no_budget' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}>
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{budgetWarning.warning_message}</p>
                        {budgetWarning.warning !== 'no_budget' && (
                          <p className="text-xs mt-1 opacity-80">
                            Budget: {formatCurrency(budgetWarning.budget)} | 
                            Spent: {formatCurrency(budgetWarning.total_expenses)} | 
                            Available: {formatCurrency(budgetWarning.available_budget)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200 flex items-center gap-2">
                      <CheckCircle size={16} />
                      <span>
                        Budget OK - {formatCurrency(budgetWarning.available_budget)} available after this payment
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                <select
                  value={updateFormData.status}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="ordered">Ordered (PO in Zoho)</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                {selectedRequest.request_type === 'payment' && updateFormData.status === 'approved' && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Expense entry will be auto-created when approved
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                <select
                  value={updateFormData.vendor_name}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={updateFormData.expected_delivery}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tracking Info</label>
                <input
                  type="text"
                  value={updateFormData.tracking_info}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, tracking_info: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Courier, tracking number..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={updateFormData.remarks}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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
