/**
 * Billing Management - Business Hub
 * 
 * Enhanced billing and invoicing with:
 * - Order Items (milestones/phases) with completion tracking
 * - Invoice generation based on completion percentage
 * - Bi-directional sync with Projects WeeklyBilling
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Calendar, TrendingUp, FileText, RefreshCw, Plus,
  ChevronLeft, ChevronRight, Download, Filter, Search, Eye, X,
  CheckCircle, Clock, AlertTriangle, BarChart3, Percent, Save,
  Loader2, Package, Receipt, Building2, Edit2, ClipboardList,
  Send, Printer
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

// Category configuration (from existing projects)
const CATEGORY_CONFIG = {
  PSS: { label: 'Projects & Services', color: 'violet' },
  AS: { label: 'Asset Services', color: 'blue' },
  OSS: { label: 'Other Sales & Services', color: 'amber' },
  CS: { label: 'Commercial Sales', color: 'green' }
};

const INVOICE_STATUSES = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' }
};

const BillingManagement = () => {
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones', 'invoices', 'weekly'
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [weeklyBilling, setWeeklyBilling] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [stats, setStats] = useState({
    total_billing: 0,
    total_invoiced: 0,
    total_paid: 0,
    pending_invoices: 0,
    by_category: {}
  });

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_type: 'Progress',
    items: [],
    subtotal: 0,
    cgst_percent: 9,
    sgst_percent: 9,
    igst_percent: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_amount: 0,
    payment_terms: 'Net 30',
    due_date: '',
    notes: ''
  });

  // Get current week number and year
  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000);
    const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
    return { week, year: now.getFullYear() };
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch orders with items (milestones)
      const ordersRes = await fetch(`${API_URL}/api/order-lifecycle/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let ordersList = [];
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        ordersList = data.orders || [];
        setOrders(ordersList);
      }

      // Fetch invoices
      const invoicesRes = await fetch(`${API_URL}/api/project-requests/invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let invoicesList = [];
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        invoicesList = data.invoices || [];
        setInvoices(invoicesList);
      }

      // Fetch projects for weekly billing sync
      const projectsRes = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        // Filter projects with this_week_billing > 0
        const withBilling = projects.filter(p => (p.this_week_billing || 0) > 0);
        setWeeklyBilling(withBilling);
      }

      // Calculate stats
      const totalInvoiced = invoicesList.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = invoicesList.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const pendingInvoices = invoicesList.filter(i => ['draft', 'sent'].includes(i.status)).length;
      
      const byCategory = {};
      Object.keys(CATEGORY_CONFIG).forEach(cat => {
        byCategory[cat] = ordersList
          .filter(o => o.category === cat)
          .reduce((sum, o) => sum + (o.order_value || o.total_amount || 0), 0);
      });

      setStats({
        total_billing: ordersList.reduce((sum, o) => sum + (o.order_value || o.total_amount || 0), 0),
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        pending_invoices: pendingInvoices,
        by_category: byCategory
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateWeek = (direction) => {
    setSelectedWeek(prev => {
      let newWeek = prev.week + direction;
      let newYear = prev.year;
      
      if (newWeek > 52) {
        newWeek = 1;
        newYear += 1;
      } else if (newWeek < 1) {
        newWeek = 52;
        newYear -= 1;
      }
      
      return { week: newWeek, year: newYear };
    });
  };

  // Open milestone update modal
  const openMilestoneModal = (order) => {
    setSelectedOrder(order);
    setShowMilestoneModal(true);
  };

  // Update milestone completion
  const handleUpdateMilestone = async (itemIndex, newCompletion) => {
    if (!selectedOrder) return;
    
    try {
      const token = localStorage.getItem('token');
      const updatedItems = [...(selectedOrder.items || [])];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        completion_percentage: Math.min(100, Math.max(0, newCompletion))
      };

      const response = await fetch(`${API_URL}/api/order-lifecycle/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: updatedItems })
      });

      if (response.ok) {
        toast.success('Milestone updated');
        // Update local state
        setSelectedOrder(prev => ({ ...prev, items: updatedItems }));
        fetchData();
      } else {
        toast.error('Failed to update milestone');
      }
    } catch (error) {
      toast.error('Error updating milestone');
    }
  };

  // Open invoice creation modal
  const openInvoiceModal = (order) => {
    setSelectedOrder(order);
    
    // Pre-fill invoice items from order items with completion
    const items = (order.items || []).map(item => ({
      description: item.description,
      quantity: item.quantity || 1,
      unit: item.unit || 'Nos',
      rate: item.unit_price || 0,
      completion_percentage: item.completion_percentage || 0,
      amount: (item.quantity || 1) * (item.unit_price || 0) * ((item.completion_percentage || 0) / 100),
      hsn_code: ''
    }));

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const cgstAmount = subtotal * 0.09;
    const sgstAmount = subtotal * 0.09;

    setInvoiceForm({
      invoice_type: 'Progress',
      items: items,
      subtotal: subtotal,
      cgst_percent: 9,
      sgst_percent: 9,
      igst_percent: 0,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: 0,
      total_amount: subtotal + cgstAmount + sgstAmount,
      payment_terms: 'Net 30',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });

    setShowInvoiceModal(true);
  };

  // Calculate invoice totals
  const recalculateInvoice = (items, gstType = 'cgst_sgst') => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

    if (gstType === 'cgst_sgst') {
      cgstAmount = subtotal * (invoiceForm.cgst_percent / 100);
      sgstAmount = subtotal * (invoiceForm.sgst_percent / 100);
    } else {
      igstAmount = subtotal * (invoiceForm.igst_percent / 100);
    }

    setInvoiceForm(prev => ({
      ...prev,
      items,
      subtotal,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: subtotal + cgstAmount + sgstAmount + igstAmount
    }));
  };

  // Update invoice item
  const updateInvoiceItem = (index, field, value) => {
    const newItems = [...invoiceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amount if rate, quantity, or completion changes
    if (['rate', 'quantity', 'completion_percentage'].includes(field)) {
      const item = newItems[index];
      const completion = item.completion_percentage || 100;
      newItems[index].amount = (item.quantity || 1) * (item.rate || 0) * (completion / 100);
    }
    
    recalculateInvoice(newItems);
  };

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!selectedOrder) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/project-requests/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          invoice_type: invoiceForm.invoice_type,
          items: invoiceForm.items,
          subtotal: invoiceForm.subtotal,
          cgst_percent: invoiceForm.cgst_percent,
          sgst_percent: invoiceForm.sgst_percent,
          igst_percent: invoiceForm.igst_percent,
          cgst_amount: invoiceForm.cgst_amount,
          sgst_amount: invoiceForm.sgst_amount,
          igst_amount: invoiceForm.igst_amount,
          total_amount: invoiceForm.total_amount,
          payment_terms: invoiceForm.payment_terms,
          due_date: invoiceForm.due_date,
          notes: invoiceForm.notes
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Invoice ${data.invoice.invoice_number} created`);
        setShowInvoiceModal(false);
        setSelectedOrder(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create invoice');
      }
    } catch (error) {
      toast.error('Error creating invoice');
    } finally {
      setSaving(false);
    }
  };

  // Update invoice status
  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/invoices/${invoiceId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success(`Invoice status updated to ${newStatus}`);
        fetchData();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  // Filter orders by search
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.pid_no?.toLowerCase().includes(search) ||
      order.order_no?.toLowerCase().includes(search) ||
      order.customer_name?.toLowerCase().includes(search) ||
      order.project_name?.toLowerCase().includes(search)
    );
  });

  // Calculate overall completion for an order
  const getOrderCompletion = (order) => {
    const items = order.items || [];
    if (items.length === 0) return 0;
    const totalCompletion = items.reduce((sum, item) => sum + (item.completion_percentage || 0), 0);
    return Math.round(totalCompletion / items.length);
  };

  return (
    <div className="space-y-6" data-testid="billing-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="text-emerald-600" />
              Billing Management
            </h2>
            <p className="text-sm text-slate-500">Track milestones, generate invoices, weekly billing</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} />
            <span className="text-sm opacity-90">Total Value</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.total_billing)}</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-blue-600" />
            <span className="text-sm text-slate-600">Invoiced</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(stats.total_invoiced)}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm text-slate-600">Collected</span>
          </div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(stats.total_paid)}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Pending</span>
          </div>
          <p className="text-xl font-bold text-amber-700">{stats.pending_invoices}</p>
        </div>

        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-violet-600" />
            <span className="text-sm text-slate-600">Outstanding</span>
          </div>
          <p className="text-xl font-bold text-violet-700">{formatCurrency(stats.total_invoiced - stats.total_paid)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'milestones'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={16} />
          Order Items & Milestones
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'invoices'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt size={16} />
          Invoices
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
            {invoices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'weekly'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} />
          Weekly Billing
          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs">
            {weeklyBilling.length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by PID, customer, project..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      {/* Content based on active tab */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : activeTab === 'milestones' ? (
        /* Milestones Tab - Order Items with Completion */
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Order Items & Completion Tracking</h3>
            <p className="text-xs text-slate-500 mt-1">Track project phases/milestones and generate invoices based on completion</p>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map(order => {
                const completion = getOrderCompletion(order);
                const items = order.items || [];
                const catConfig = CATEGORY_CONFIG[order.category] || CATEGORY_CONFIG.PSS;
                
                return (
                  <div key={order.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-slate-800">{order.pid_no || order.order_no}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${catConfig.color}-100 text-${catConfig.color}-700`}>
                            {order.category}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{order.customer_name}</p>
                        <p className="text-xs text-slate-500">{order.project_name}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(order.order_value || order.total_amount)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                completion >= 100 ? 'bg-green-500' :
                                completion >= 50 ? 'bg-blue-500' :
                                completion > 0 ? 'bg-amber-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{completion}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    {items.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 mb-2">
                          <div className="col-span-5">Item/Milestone</div>
                          <div className="col-span-2 text-center">Qty</div>
                          <div className="col-span-2 text-right">Value</div>
                          <div className="col-span-3 text-center">Completion</div>
                        </div>
                        {items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 text-sm py-1.5 border-t border-slate-200">
                            <div className="col-span-5 truncate">{item.description}</div>
                            <div className="col-span-2 text-center text-slate-600">{item.quantity} {item.unit}</div>
                            <div className="col-span-2 text-right font-medium">{formatCurrency(item.total || (item.quantity * item.unit_price))}</div>
                            <div className="col-span-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                (item.completion_percentage || 0) >= 100 ? 'bg-green-100 text-green-700' :
                                (item.completion_percentage || 0) > 0 ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {item.completion_percentage || 0}%
                              </span>
                            </div>
                          </div>
                        ))}
                        {items.length > 3 && (
                          <p className="text-xs text-slate-400 mt-2 text-center">+{items.length - 3} more items</p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openMilestoneModal(order)}
                        className="px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                        data-testid={`update-milestones-btn-${order.id}`}
                      >
                        <Percent size={14} /> Update Completion
                      </button>
                      <button
                        onClick={() => openInvoiceModal(order)}
                        className="px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1"
                        data-testid={`generate-invoice-btn-${order.id}`}
                      >
                        <Receipt size={14} /> Generate Invoice
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'invoices' ? (
        /* Invoices Tab */
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Generated Invoices</h3>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
              <p>No invoices yet</p>
              <p className="text-sm mt-2">Generate invoices from the Milestones tab</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map(invoice => {
                const statusConfig = INVOICE_STATUSES[invoice.status] || INVOICE_STATUSES.draft;
                
                return (
                  <div key={invoice.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-emerald-600">{invoice.invoice_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          {invoice.invoice_type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{invoice.customer_name}</p>
                      <p className="text-xs text-slate-500">{invoice.order_no} • {formatDate(invoice.invoice_date)}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">{formatCurrency(invoice.total_amount)}</p>
                      {invoice.due_date && (
                        <p className="text-xs text-slate-500">Due: {formatDate(invoice.due_date)}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                      <button
                        onClick={() => { setSelectedInvoice(invoice); setShowInvoiceDetailModal(true); }}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'sent')}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Mark as Sent"
                        >
                          <Send size={18} />
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                          className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                          title="Mark as Paid"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Weekly Billing Tab */
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Weekly Billing Summary</h3>
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-white rounded-lg">
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 font-medium text-slate-700">
                  Week {selectedWeek.week}, {selectedWeek.year}
                </span>
                <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-white rounded-lg">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Weekly Summary */}
          {weeklyBilling.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No billing this week</h3>
              <p className="text-sm text-slate-500">Projects with weekly billing will sync here automatically</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">PO Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">This Week</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Invoiced</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyBilling.map((project) => {
                    const catConfig = CATEGORY_CONFIG[project.category] || CATEGORY_CONFIG.PSS;
                    const invoiceProgress = project.po_amount > 0 
                      ? ((project.invoiced_amount || 0) / project.po_amount) * 100 
                      : 0;
                    
                    return (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{project.pid_no}</td>
                        <td className="px-4 py-3">
                          <p className="text-slate-800">{project.project_name}</p>
                          <p className="text-xs text-slate-500">{project.engineer_in_charge}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{project.client}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${catConfig.color}-100 text-${catConfig.color}-700`}>
                            {project.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatCurrency(project.po_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          {formatCurrency(project.this_week_billing)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div>
                            <span className="text-slate-700">{formatCurrency(project.invoiced_amount)}</span>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
                              <div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(invoiceProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            project.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {project.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-semibold text-slate-700">
                      Total ({weeklyBilling.length} projects)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 text-lg">
                      {formatCurrency(weeklyBilling.reduce((sum, p) => sum + (p.this_week_billing || 0), 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Category Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Billing by Category</h3>
            <div className="space-y-4">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const amount = stats.by_category[key] || 0;
                const percentage = stats.total_billing > 0 ? (amount / stats.total_billing) * 100 : 0;
                
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{config.label}</span>
                      <span className="text-slate-600">
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-${config.color}-500 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Milestone Update Modal */}
      {showMilestoneModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Update Milestone Completion</h3>
                <p className="text-sm text-slate-500">
                  {selectedOrder.pid_no || selectedOrder.order_no} • {selectedOrder.customer_name}
                </p>
              </div>
              <button onClick={() => setShowMilestoneModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">S.No</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Item/Milestone</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Value</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 w-40">Completion %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-center">{item.sno || idx + 1}</td>
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total || (item.quantity * item.unit_price))}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={item.completion_percentage || 0}
                              onChange={(e) => handleUpdateMilestone(idx, parseInt(e.target.value))}
                              className="flex-1"
                            />
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.completion_percentage || 0}
                              onChange={(e) => handleUpdateMilestone(idx, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm"
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Overall Completion:</span>
                  <span className="text-xl font-bold text-blue-700">{getOrderCompletion(selectedOrder)}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Receipt className="text-emerald-600" size={20} />
                  Generate Invoice
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedOrder.pid_no || selectedOrder.order_no} • {selectedOrder.customer_name}
                </p>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Invoice Type */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Type</label>
                  <select
                    value={invoiceForm.invoice_type}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Progress">Progress Invoice</option>
                    <option value="Final">Final Invoice</option>
                    <option value="Proforma">Proforma Invoice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={invoiceForm.payment_terms}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, payment_terms: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="e.g., Net 30"
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Invoice Items (Based on Completion)</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Description</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 w-16">Qty</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 w-16">Unit</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 w-24">Rate</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 w-24">Completion</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceForm.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.rate)}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.completion_percentage || 0}
                              onChange={(e) => updateInvoiceItem(idx, 'completion_percentage', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-center text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* GST & Totals */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">GST Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="w-20 text-sm text-slate-600">CGST %</label>
                      <input
                        type="number"
                        value={invoiceForm.cgst_percent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const cgstAmt = invoiceForm.subtotal * (val / 100);
                          setInvoiceForm(prev => ({
                            ...prev,
                            cgst_percent: val,
                            cgst_amount: cgstAmt,
                            total_amount: prev.subtotal + cgstAmt + prev.sgst_amount + prev.igst_amount
                          }));
                        }}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                      <span className="text-sm text-slate-600">= {formatCurrency(invoiceForm.cgst_amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="w-20 text-sm text-slate-600">SGST %</label>
                      <input
                        type="number"
                        value={invoiceForm.sgst_percent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const sgstAmt = invoiceForm.subtotal * (val / 100);
                          setInvoiceForm(prev => ({
                            ...prev,
                            sgst_percent: val,
                            sgst_amount: sgstAmt,
                            total_amount: prev.subtotal + prev.cgst_amount + sgstAmt + prev.igst_amount
                          }));
                        }}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                      <span className="text-sm text-slate-600">= {formatCurrency(invoiceForm.sgst_amount)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(invoiceForm.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">CGST:</span>
                      <span>{formatCurrency(invoiceForm.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">SGST:</span>
                      <span>{formatCurrency(invoiceForm.sgst_amount)}</span>
                    </div>
                    <div className="border-t border-emerald-300 pt-2 flex justify-between">
                      <span className="font-semibold text-slate-800">Total:</span>
                      <span className="text-xl font-bold text-emerald-700">{formatCurrency(invoiceForm.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Additional notes for the invoice..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={saving || invoiceForm.subtotal <= 0}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showInvoiceDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedInvoice.invoice_number}</h3>
                <p className="text-sm text-slate-500">{selectedInvoice.customer_name} • {selectedInvoice.order_no}</p>
              </div>
              <button onClick={() => setShowInvoiceDetailModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Invoice Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.invoice_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                </div>
                <div className={`rounded-lg p-3 ${INVOICE_STATUSES[selectedInvoice.status]?.color || 'bg-slate-100'}`}>
                  <p className="text-xs opacity-75">Status</p>
                  <p className="font-medium">{INVOICE_STATUSES[selectedInvoice.status]?.label || selectedInvoice.status}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Invoice Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Description</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Qty</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Rate</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedInvoice.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.rate)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-sm">Subtotal:</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(selectedInvoice.subtotal)}</td>
                      </tr>
                      {selectedInvoice.cgst_amount > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-sm">CGST ({selectedInvoice.cgst_percent}%):</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(selectedInvoice.cgst_amount)}</td>
                        </tr>
                      )}
                      {selectedInvoice.sgst_amount > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-sm">SGST ({selectedInvoice.sgst_percent}%):</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(selectedInvoice.sgst_amount)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total:</td>
                        <td className="px-3 py-2 text-right text-lg font-bold text-emerald-600">{formatCurrency(selectedInvoice.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
              <div className="flex gap-2">
                {selectedInvoice.status === 'draft' && (
                  <button
                    onClick={() => { updateInvoiceStatus(selectedInvoice.id, 'sent'); setShowInvoiceDetailModal(false); }}
                    className="px-4 py-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-2"
                  >
                    <Send size={16} /> Mark as Sent
                  </button>
                )}
                {selectedInvoice.status === 'sent' && (
                  <button
                    onClick={() => { updateInvoiceStatus(selectedInvoice.id, 'paid'); setShowInvoiceDetailModal(false); }}
                    className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-2"
                  >
                    <CheckCircle size={16} /> Mark as Paid
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowInvoiceDetailModal(false)}
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

export default BillingManagement;
