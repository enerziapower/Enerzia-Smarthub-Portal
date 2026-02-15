import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Plus, Search, Filter, RefreshCw, X, Edit2, Eye, Trash2, ChevronDown,
  FileText, Building2, Calendar, Truck, ClipboardList, BarChart3,
  ArrowRight, PiggyBank, Receipt, ShoppingCart, Scale, Check, Target
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PurchaseModule = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [savingsData, setSavingsData] = useState(null);
  
  // Data states
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  
  // Form states
  const [requestForm, setRequestForm] = useState({
    sales_order_id: '',
    title: '',
    items: [{ id: '1', description: '', quantity: 1, unit: 'Nos', estimated_price: 0 }],
    required_by: '',
    priority: 'normal',
    notes: ''
  });
  
  const [quoteForm, setQuoteForm] = useState({
    vendor_name: '',
    items: [],
    total_amount: 0,
    delivery_days: 7,
    validity_days: 30,
    payment_terms: '',
    quote_date: new Date().toISOString().split('T')[0],
    quote_ref: '',
    notes: ''
  });
  
  const [poForm, setPOForm] = useState({
    vendor_name: '',
    vendor_address: '',
    vendor_gst: '',
    vendor_contact: '',
    vendor_phone: '',
    vendor_email: '',
    date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    items: [{ description: '', quantity: 1, unit: 'Nos', unit_price: 0, total: 0 }],
    subtotal: 0,
    gst_percent: 18,
    gst_amount: 0,
    total_amount: 0,
    payment_terms: '',
    delivery_terms: '',
    notes: ''
  });
  
  const [grnForm, setGRNForm] = useState({
    received_date: new Date().toISOString().split('T')[0],
    received_by: '',
    items: [],
    delivery_challan_no: '',
    vehicle_no: '',
    notes: ''
  });

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' }
  ];

  const requestStatuses = [
    { value: 'pending', label: 'Pending', color: 'bg-slate-100 text-slate-700' },
    { value: 'quoted', label: 'Quoted', color: 'bg-blue-100 text-blue-700' },
    { value: 'approved', label: 'Approved', color: 'bg-purple-100 text-purple-700' },
    { value: 'ordered', label: 'Ordered', color: 'bg-green-100 text-green-700' },
    { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-700' }
  ];

  const poStatuses = [
    { value: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-purple-100 text-purple-700' },
    { value: 'partial', label: 'Partial', color: 'bg-amber-100 text-amber-700' },
    { value: 'received', label: 'Received', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' }
  ];

  const unitOptions = ['Nos', 'Set', 'Lot', 'M', 'Sqm', 'Kg', 'LS', 'KM', 'Ltr', 'Pcs', 'Job'];

  // Fetch functions
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/dashboard/stats`, {
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

  const fetchSavings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/dashboard/savings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSavingsData(data);
      }
    } catch (error) {
      console.error('Error fetching savings:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/requests`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/orders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchGRNs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/grn`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGrns(data.grns || []);
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/vendors`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
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
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchSavings(),
        fetchRequests(),
        fetchOrders(),
        fetchGRNs(),
        fetchVendors(),
        fetchSalesOrders()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Request handlers
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestForm)
      });
      
      if (!response.ok) throw new Error('Failed to create request');
      
      toast.success('Purchase request created!');
      setShowRequestModal(false);
      resetRequestForm();
      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create request');
    }
  };

  const resetRequestForm = () => {
    setRequestForm({
      sales_order_id: '',
      title: '',
      items: [{ id: '1', description: '', quantity: 1, unit: 'Nos', estimated_price: 0 }],
      required_by: '',
      priority: 'normal',
      notes: ''
    });
  };

  // Compare quotes
  const handleCompareQuotes = async (requestId) => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/quotes/compare/${requestId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
        setShowCompareModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load comparison');
    }
  };

  // Create PO from quote
  const handleCreatePOFromQuote = async (quoteId) => {
    try {
      const response = await fetch(`${API_URL}/api/purchase-module/orders/from-quote/${quoteId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to create PO');
      
      toast.success('Purchase order created from quote!');
      setShowCompareModal(false);
      fetchOrders();
      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create PO');
    }
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Purchase Requests</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.purchase_requests?.total || 0}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.purchase_requests?.pending || 0} pending
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Purchase Orders</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.purchase_orders?.total || 0}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.purchase_orders?.confirmed || 0} confirmed
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total PO Value</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.purchase_orders?.total_value)}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {formatCurrency(stats?.purchase_orders?.received_value)} received
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Deliveries</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.pending_deliveries || 0}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.grn_count || 0} GRNs created
          </div>
        </div>
      </div>

      {/* Savings Analysis */}
      {savingsData && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-green-600" /> Purchase Savings Analysis
            </h3>
            <div className="text-right">
              <p className="text-sm text-slate-500">Total Savings</p>
              <p className={`text-2xl font-bold ${savingsData.summary?.total_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(savingsData.summary?.total_savings)} ({savingsData.summary?.savings_percent}%)
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Budget Target</p>
              <p className="text-lg font-bold text-blue-900">{formatCurrency(savingsData.summary?.total_budget)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Actual Purchase</p>
              <p className="text-lg font-bold text-purple-900">{formatCurrency(savingsData.summary?.total_actual)}</p>
            </div>
            <div className={`p-3 rounded-lg ${savingsData.summary?.total_savings >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm ${savingsData.summary?.total_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>Savings</p>
              <p className={`text-lg font-bold ${savingsData.summary?.total_savings >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(savingsData.summary?.total_savings)}
              </p>
            </div>
          </div>

          {savingsData.details?.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Order</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Customer</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Budget</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Actual</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savingsData.details.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium text-slate-900">{item.order_no}</td>
                      <td className="px-3 py-2 text-slate-600">{item.customer}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.purchase_budget)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.actual_purchase)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${item.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.savings)} ({item.savings_percent}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => { resetRequestForm(); setShowRequestModal(true); }}
          className="p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-left"
        >
          <Plus className="w-6 h-6 text-blue-600 mb-2" />
          <p className="font-medium text-blue-900">New PR</p>
          <p className="text-xs text-blue-600">Create purchase request</p>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className="p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors text-left"
        >
          <Scale className="w-6 h-6 text-purple-600 mb-2" />
          <p className="font-medium text-purple-900">Compare Quotes</p>
          <p className="text-xs text-purple-600">Analyze vendor pricing</p>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className="p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors text-left"
        >
          <ShoppingCart className="w-6 h-6 text-green-600 mb-2" />
          <p className="font-medium text-green-900">View POs</p>
          <p className="text-xs text-green-600">Manage purchase orders</p>
        </button>
        <button
          onClick={() => setActiveTab('grn')}
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left"
        >
          <Truck className="w-6 h-6 text-amber-600 mb-2" />
          <p className="font-medium text-amber-900">Record GRN</p>
          <p className="text-xs text-amber-600">Goods receipt notes</p>
        </button>
      </div>
    </div>
  );

  // Requests Tab
  const RequestsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Purchase Requests</h3>
        <button
          onClick={() => { resetRequestForm(); setShowRequestModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No purchase requests yet</p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{req.pr_no}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      requestStatuses.find(s => s.value === req.status)?.color || 'bg-slate-100 text-slate-700'
                    }`}>
                      {requestStatuses.find(s => s.value === req.status)?.label || req.status}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      priorities.find(p => p.value === req.priority)?.color || 'bg-slate-100 text-slate-700'
                    }`}>
                      {req.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{req.title}</p>
                  {req.order_no && (
                    <p className="text-xs text-blue-600 mt-1">Linked to: {req.order_no}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(req.total_estimated)}</p>
                  <p className="text-xs text-slate-500">{req.items?.length || 0} items</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => { setSelectedRequest(req); setShowQuoteModal(true); }}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  Add Quote
                </button>
                <button
                  onClick={() => handleCompareQuotes(req.id)}
                  className="px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                >
                  Compare
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Orders Tab
  const OrdersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Purchase Orders</h3>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PO No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Received</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                  No purchase orders yet
                </td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{po.po_no}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{po.vendor_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{po.date}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(po.total_amount)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(po.received_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      poStatuses.find(s => s.value === po.status)?.color || 'bg-slate-100 text-slate-700'
                    }`}>
                      {poStatuses.find(s => s.value === po.status)?.label || po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setSelectedOrder(po); setShowGRNModal(true); }}
                        className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Create GRN"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // GRN Tab
  const GRNTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Goods Receipt Notes</h3>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">GRN No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PO No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Received Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grns.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                  No GRNs yet
                </td>
              </tr>
            ) : (
              grns.map((grn) => (
                <tr key={grn.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{grn.grn_no}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{grn.po_no}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{grn.vendor_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{grn.received_date}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(grn.total_received_value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="purchase-module-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Module</h1>
          <p className="text-slate-500 mt-1">Manage procurement with budget tracking and vendor comparison</p>
        </div>
        <button
          onClick={() => { resetRequestForm(); setShowRequestModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> New Purchase Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {['dashboard', 'requests', 'orders', 'grn'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'grn' ? 'GRN' : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading...
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'grn' && <GRNTab />}
        </>
      )}

      {/* Create Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-900">New Purchase Request</h3>
              <button onClick={() => setShowRequestModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRequest} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Link to Sales Order</label>
                  <select
                    value={requestForm.sales_order_id}
                    onChange={(e) => setRequestForm({ ...requestForm, sales_order_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">-- Select Order (Optional) --</option>
                    {salesOrders.map(o => (
                      <option key={o.id} value={o.id}>{o.order_no} - {o.customer_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={requestForm.title}
                  onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g., Materials for Project XYZ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Required By</label>
                <input
                  type="date"
                  value={requestForm.required_by}
                  onChange={(e) => setRequestForm({ ...requestForm, required_by: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Items</label>
                  <button
                    type="button"
                    onClick={() => setRequestForm({
                      ...requestForm,
                      items: [...requestForm.items, { id: Date.now().toString(), description: '', quantity: 1, unit: 'Nos', estimated_price: 0 }]
                    })}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {requestForm.items.map((item, idx) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const items = [...requestForm.items];
                          items[idx].description = e.target.value;
                          setRequestForm({ ...requestForm, items });
                        }}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...requestForm.items];
                          items[idx].quantity = parseFloat(e.target.value) || 0;
                          setRequestForm({ ...requestForm, items });
                        }}
                        className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => {
                          const items = [...requestForm.items];
                          items[idx].unit = e.target.value;
                          setRequestForm({ ...requestForm, items });
                        }}
                        className="w-20 px-2 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input
                        type="number"
                        placeholder="Est. Price"
                        value={item.estimated_price}
                        onChange={(e) => {
                          const items = [...requestForm.items];
                          items[idx].estimated_price = parseFloat(e.target.value) || 0;
                          setRequestForm({ ...requestForm, items });
                        }}
                        className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      {requestForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const items = requestForm.items.filter((_, i) => i !== idx);
                            setRequestForm({ ...requestForm, items });
                          }}
                          className="p-2 text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Comparison Modal */}
      {showCompareModal && comparisonData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Compare Vendor Quotes</h3>
                <p className="text-sm text-slate-500">{comparisonData.request?.pr_no} - {comparisonData.request?.title}</p>
              </div>
              <button onClick={() => setShowCompareModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {comparisonData.quotes?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Scale className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No quotes received yet</p>
                  <p className="text-sm">Add vendor quotes to compare pricing</p>
                </div>
              ) : (
                <>
                  {/* Total Comparison */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-3">Total Quote Comparison</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {comparisonData.comparison?.totals?.map((t, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-lg border-2 ${
                            t.vendor_name === comparisonData.comparison?.lowest_total?.vendor_name 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-900">{t.vendor_name}</span>
                            {t.vendor_name === comparisonData.comparison?.lowest_total?.vendor_name && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Lowest</span>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{formatCurrency(t.total_amount)}</p>
                          <p className="text-sm text-slate-500">{t.delivery_days} days delivery</p>
                          <button
                            onClick={() => {
                              const quote = comparisonData.quotes.find(q => q.vendor_name === t.vendor_name);
                              if (quote) handleCreatePOFromQuote(quote.id);
                            }}
                            className="mt-3 w-full px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                          >
                            Create PO
                          </button>
                        </div>
                      ))}
                    </div>
                    {comparisonData.comparison?.savings_potential > 0 && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg text-center">
                        <p className="text-green-800">
                          <strong>Potential Savings:</strong> {formatCurrency(comparisonData.comparison.savings_potential)} by choosing lowest quote
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {showQuoteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Vendor Quote</h3>
                <p className="text-sm text-slate-500">{selectedRequest.pr_no}</p>
              </div>
              <button onClick={() => setShowQuoteModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Build items with quoted prices
                const items = selectedRequest.items.map((item, idx) => ({
                  item_id: item.id,
                  quoted_price: quoteForm.items[idx]?.quoted_price || 0,
                  delivery_days: quoteForm.delivery_days
                }));
                
                const total = items.reduce((sum, i, idx) => 
                  sum + (i.quoted_price * (selectedRequest.items[idx]?.quantity || 1)), 0);
                
                const response = await fetch(`${API_URL}/api/purchase-module/quotes?request_id=${selectedRequest.id}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({
                    ...quoteForm,
                    items,
                    total_amount: total
                  })
                });
                
                if (!response.ok) throw new Error('Failed to add quote');
                
                toast.success('Quote added!');
                setShowQuoteModal(false);
                fetchRequests();
              } catch (error) {
                console.error('Error:', error);
                toast.error('Failed to add quote');
              }
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  list="vendor-list"
                  value={quoteForm.vendor_name}
                  onChange={(e) => setQuoteForm({ ...quoteForm, vendor_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
                <datalist id="vendor-list">
                  {vendors.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quote Date</label>
                  <input
                    type="date"
                    value={quoteForm.quote_date}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quote_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Days</label>
                  <input
                    type="number"
                    value={quoteForm.delivery_days}
                    onChange={(e) => setQuoteForm({ ...quoteForm, delivery_days: parseInt(e.target.value) || 7 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Item Prices */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Item Pricing</label>
                <div className="space-y-2">
                  {selectedRequest.items?.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.description}</p>
                        <p className="text-xs text-slate-500">{item.quantity} {item.unit}</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Price"
                          value={quoteForm.items[idx]?.quoted_price || ''}
                          onChange={(e) => {
                            const items = [...(quoteForm.items || [])];
                            items[idx] = { ...items[idx], quoted_price: parseFloat(e.target.value) || 0 };
                            setQuoteForm({ ...quoteForm, items });
                          }}
                          className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Add Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {showGRNModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Create GRN</h3>
                <p className="text-sm text-slate-500">{selectedOrder.po_no} - {selectedOrder.vendor_name}</p>
              </div>
              <button onClick={() => setShowGRNModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const items = selectedOrder.items?.map((item, idx) => ({
                  description: item.description,
                  received_qty: grnForm.items[idx]?.received_qty || 0,
                  accepted_qty: grnForm.items[idx]?.accepted_qty || grnForm.items[idx]?.received_qty || 0,
                  rejected_qty: grnForm.items[idx]?.rejected_qty || 0
                })) || [];
                
                const response = await fetch(`${API_URL}/api/purchase-module/grn`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({
                    purchase_order_id: selectedOrder.id,
                    received_date: grnForm.received_date,
                    received_by: grnForm.received_by,
                    items,
                    delivery_challan_no: grnForm.delivery_challan_no,
                    vehicle_no: grnForm.vehicle_no,
                    notes: grnForm.notes
                  })
                });
                
                if (!response.ok) throw new Error('Failed to create GRN');
                
                toast.success('GRN created!');
                setShowGRNModal(false);
                setGRNForm({
                  received_date: new Date().toISOString().split('T')[0],
                  received_by: '',
                  items: [],
                  delivery_challan_no: '',
                  vehicle_no: '',
                  notes: ''
                });
                fetchGRNs();
                fetchOrders();
                fetchStats();
              } catch (error) {
                console.error('Error:', error);
                toast.error('Failed to create GRN');
              }
            }} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Received Date *</label>
                  <input
                    type="date"
                    required
                    value={grnForm.received_date}
                    onChange={(e) => setGRNForm({ ...grnForm, received_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
                  <input
                    type="text"
                    value={grnForm.received_by}
                    onChange={(e) => setGRNForm({ ...grnForm, received_by: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Challan No.</label>
                  <input
                    type="text"
                    value={grnForm.delivery_challan_no}
                    onChange={(e) => setGRNForm({ ...grnForm, delivery_challan_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle No.</label>
                  <input
                    type="text"
                    value={grnForm.vehicle_no}
                    onChange={(e) => setGRNForm({ ...grnForm, vehicle_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Items Received */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Items Received</label>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900 mb-2">{item.description}</p>
                      <p className="text-xs text-slate-500 mb-2">Ordered: {item.quantity} {item.unit}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500">Received Qty</label>
                          <input
                            type="number"
                            value={grnForm.items[idx]?.received_qty || ''}
                            onChange={(e) => {
                              const items = [...(grnForm.items || [])];
                              items[idx] = { 
                                ...items[idx], 
                                received_qty: parseFloat(e.target.value) || 0,
                                accepted_qty: parseFloat(e.target.value) || 0
                              };
                              setGRNForm({ ...grnForm, items });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Accepted Qty</label>
                          <input
                            type="number"
                            value={grnForm.items[idx]?.accepted_qty || ''}
                            onChange={(e) => {
                              const items = [...(grnForm.items || [])];
                              items[idx] = { ...items[idx], accepted_qty: parseFloat(e.target.value) || 0 };
                              setGRNForm({ ...grnForm, items });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowGRNModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Create GRN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseModule;
