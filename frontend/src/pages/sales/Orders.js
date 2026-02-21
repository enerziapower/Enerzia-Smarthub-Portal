import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Eye, X, RefreshCw, ShoppingCart,
  ChevronDown, Filter, CheckCircle, Truck, CreditCard, Package,
  Calendar, Building2, DollarSign, FileText, Link2, FolderKanban
} from 'lucide-react';
import { toast } from 'sonner';
import AddProjectModal from '../../components/AddProjectModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectPrefillData, setProjectPrefillData] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [stats, setStats] = useState({
    total: 0, pending: 0, confirmed: 0, delivered: 0, total_value: 0, paid_value: 0
  });
  
  const [formData, setFormData] = useState({
    customer_id: '',  // Link to customer record
    customer_name: '',
    customer_address: '',
    customer_gst: '',
    customer_contact: '',
    customer_phone: '',
    customer_email: '',
    date: new Date().toLocaleDateString('en-GB'),
    delivery_date: '',
    po_number: '',
    po_date: '',
    items: [{ id: '1', sno: 1, description: '', unit: 'Nos', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    gst_percent: 18,
    gst_amount: 0,
    total_amount: 0,
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    category: ''
  });

  const orderStatuses = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
    { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-700' },
    { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  ];

  const paymentStatuses = [
    { value: 'unpaid', label: 'Unpaid', color: 'bg-red-100 text-red-700' },
    { value: 'partial', label: 'Partial', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-700' },
  ];

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/sales/orders?`;
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
      const response = await fetch(`${API_URL}/api/sales/orders/stats`, {
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

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders]);

  const calculateTotals = (items, gstPercent) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const gstAmount = subtotal * (gstPercent / 100);
    const totalAmount = subtotal + gstAmount;
    return { subtotal, gstAmount, totalAmount };
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    const { subtotal, gstAmount, totalAmount } = calculateTotals(newItems, formData.gst_percent);
    
    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      gst_amount: gstAmount,
      total_amount: totalAmount
    });
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      sno: formData.items.length + 1,
      description: '',
      unit: 'Nos',
      quantity: 1,
      unit_price: 0,
      total: 0
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sno: i + 1 }));
    const { subtotal, gstAmount, totalAmount } = calculateTotals(newItems, formData.gst_percent);
    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      gst_amount: gstAmount,
      total_amount: totalAmount
    });
  };

  const handleGstChange = (gstPercent) => {
    const { subtotal, gstAmount, totalAmount } = calculateTotals(formData.items, gstPercent);
    setFormData({
      ...formData,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      total_amount: totalAmount
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingOrder 
        ? `${API_URL}/api/sales/orders/${editingOrder.id}`
        : `${API_URL}/api/sales/orders`;
      
      const method = editingOrder ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to save order');
      
      toast.success(editingOrder ? 'Order updated!' : 'Order created!');
      setShowAddModal(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/sales/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
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

  const handlePaymentStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/sales/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ payment_status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update payment status');
      
      toast.success('Payment status updated!');
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/sales/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete order');
      
      toast.success('Order deleted!');
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_address: '',
      customer_gst: '',
      customer_contact: '',
      customer_phone: '',
      customer_email: '',
      date: new Date().toLocaleDateString('en-GB'),
      delivery_date: '',
      po_number: '',
      po_date: '',
      items: [{ id: '1', sno: 1, description: '', unit: 'Nos', quantity: 1, unit_price: 0, total: 0 }],
      subtotal: 0,
      gst_percent: 18,
      gst_amount: 0,
      total_amount: 0,
      payment_terms: '',
      delivery_terms: '',
      notes: '',
      category: ''
    });
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setFormData({
      customer_name: order.customer_name || '',
      customer_address: order.customer_address || '',
      customer_gst: order.customer_gst || '',
      customer_contact: order.customer_contact || '',
      customer_phone: order.customer_phone || '',
      customer_email: order.customer_email || '',
      date: order.date || '',
      delivery_date: order.delivery_date || '',
      po_number: order.po_number || '',
      po_date: order.po_date || '',
      items: order.items?.length ? order.items : [{ id: '1', sno: 1, description: '', unit: 'Nos', quantity: 1, unit_price: 0, total: 0 }],
      subtotal: order.subtotal || 0,
      gst_percent: order.gst_percent || 18,
      gst_amount: order.gst_amount || 0,
      total_amount: order.total_amount || 0,
      payment_terms: order.payment_terms || '',
      delivery_terms: order.delivery_terms || '',
      notes: order.notes || '',
      category: order.category || ''
    });
    setShowAddModal(true);
  };

  const openViewModal = (order) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  const getStatusColor = (status) => {
    const found = orderStatuses.find(s => s.value === status);
    return found ? found.color : 'bg-slate-100 text-slate-700';
  };

  const getPaymentColor = (status) => {
    const found = paymentStatuses.find(s => s.value === status);
    return found ? found.color : 'bg-slate-100 text-slate-700';
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards = [
    { title: 'Total Orders', value: stats.total, icon: ShoppingCart, color: 'bg-slate-50 border-slate-200' },
    { title: 'Pending', value: stats.pending, icon: Package, color: 'bg-yellow-50 border-yellow-200' },
    { title: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'bg-blue-50 border-blue-200' },
    { title: 'Delivered', value: stats.delivered, icon: Truck, color: 'bg-green-50 border-green-200' },
    { title: 'Total Value', value: formatCurrency(stats.total_value), icon: DollarSign, color: 'bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="space-y-6" data-testid="orders-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Orders</h1>
          <p className="text-slate-500 mt-1">Manage customer orders and deliveries</p>
        </div>
        <button 
          onClick={() => { resetForm(); setEditingOrder(null); setShowAddModal(true); }} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          data-testid="add-order-btn"
        >
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className={`p-4 rounded-xl border ${card.color}`}>
            <div className="flex items-center gap-2">
              <card.icon className="w-4 h-4 text-slate-500" />
              <p className="text-sm text-slate-500">{card.title}</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

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
            {orderStatuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { fetchOrders(); fetchStats(); }}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-20">FY</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase w-20">Category</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase w-44">Order No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[160px]">Customer</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase w-28">Order Date</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase w-28">Delivery</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase w-28">Taxable Amt</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase w-28">Gross Amt</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase w-28">Status</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  // Extract financial year from quotation_no or order date
                  const extractFY = () => {
                    if (order.quotation_no) {
                      const match = order.quotation_no.match(/\/(\d{2}-\d{2})\//);
                      if (match) return match[1];
                    }
                    // Fallback: extract from order date or po_date
                    const dateStr = order.po_date || order.date;
                    if (dateStr) {
                      const date = new Date(dateStr.split('/').reverse().join('-'));
                      const month = date.getMonth() + 1;
                      const year = date.getFullYear();
                      if (month >= 4) {
                        return `${year % 100}-${(year + 1) % 100}`;
                      } else {
                        return `${(year - 1) % 100}-${year % 100}`;
                      }
                    }
                    return '-';
                  };
                  
                  return (
                    <tr key={order.id} className="hover:bg-slate-50" data-testid={`order-row-${order.id}`}>
                      {/* Financial Year */}
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono whitespace-nowrap">{extractFY()}</td>
                      
                      {/* Category */}
                      <td className="px-3 py-3">
                        {order.category ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                            {order.category}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      
                      {/* Order No - Fixed width with text wrap */}
                      <td className="px-3 py-3 max-w-[180px]">
                        <div className="break-words">
                          <span className="font-medium text-slate-900 text-sm">{order.order_no}</span>
                          {order.quotation_no && (
                            <div className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                              <Link2 className="w-3 h-3 flex-shrink-0" /> <span className="truncate">From {order.quotation_no}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Customer */}
                      <td className="px-4 py-3 text-sm text-slate-600">{order.customer_name}</td>
                      
                      {/* Order Date (PO Date) */}
                      <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{order.po_date || order.date || '-'}</td>
                      
                      {/* Delivery Date */}
                      <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{order.delivery_date || '-'}</td>
                      
                      {/* Taxable Amount (Subtotal) */}
                      <td className="px-3 py-3 text-sm text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrency(order.subtotal || 0)}
                      </td>
                      
                      {/* Gross Amount (Total) */}
                      <td className="px-3 py-3 text-sm text-right font-medium text-slate-900">
                        {formatCurrency(order.total_amount || 0)}
                      </td>
                      
                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <div className="relative inline-block">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded-full appearance-none cursor-pointer pr-6 ${getStatusColor(order.status)}`}
                          >
                            {orderStatuses.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => openViewModal(order)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditModal(order)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(order.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingOrder ? 'Edit Order' : 'New Order'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingOrder(null); resetForm(); }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
              {/* Customer Information */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                <h4 className="font-medium text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                    <input
                      type="text"
                      value={formData.customer_gst}
                      onChange={(e) => setFormData({...formData, customer_gst: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    rows={2}
                    value={formData.customer_address}
                    onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.customer_contact}
                      onChange={(e) => setFormData({...formData, customer_contact: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order Date *</label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/YYYY"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Date</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={formData.po_number}
                    onChange={(e) => setFormData({...formData, po_number: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PO Date</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={formData.po_date}
                    onChange={(e) => setFormData({...formData, po_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">Order Items</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-12">S.No</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-20">Unit</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 w-20">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 w-28">Unit Price</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 w-28">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-sm text-slate-600">{item.sno}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                              placeholder="Item description"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                            >
                              <option value="Nos">Nos</option>
                              <option value="Set">Set</option>
                              <option value="Lot">Lot</option>
                              <option value="M">M</option>
                              <option value="Sqm">Sqm</option>
                              <option value="Kg">Kg</option>
                              <option value="LS">LS</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-medium text-slate-900">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-3 py-2">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">GST</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={formData.gst_percent}
                        onChange={(e) => handleGstChange(parseFloat(e.target.value))}
                        className="px-2 py-1 border border-slate-200 rounded text-sm"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                      <span className="font-medium w-24 text-right">{formatCurrency(formData.gst_amount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span className="text-slate-900">{formatCurrency(formData.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                  <textarea
                    rows={2}
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Terms</label>
                  <textarea
                    rows={2}
                    value={formData.delivery_terms}
                    onChange={(e) => setFormData({...formData, delivery_terms: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingOrder(null); resetForm(); }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{viewingOrder.order_no}</h3>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(viewingOrder.status)}`}>
                    {orderStatuses.find(s => s.value === viewingOrder.status)?.label}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPaymentColor(viewingOrder.payment_status)}`}>
                    {paymentStatuses.find(s => s.value === viewingOrder.payment_status)?.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="font-medium">{viewingOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Order Date</p>
                  <p className="font-medium">{viewingOrder.date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Delivery Date</p>
                  <p className="font-medium">{viewingOrder.delivery_date || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PO Number</p>
                  <p className="font-medium">{viewingOrder.po_number || '-'}</p>
                </div>
              </div>

              {viewingOrder.items?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Items</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingOrder.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <div className="w-60 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span>{formatCurrency(viewingOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GST ({viewingOrder.gst_percent}%)</span>
                    <span>{formatCurrency(viewingOrder.gst_amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(viewingOrder.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => { setShowViewModal(false); openEditModal(viewingOrder); }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => {
                    // Prepare prefill data for project
                    setProjectPrefillData({
                      order_id: viewingOrder.id,
                      order_no: viewingOrder.order_no,
                      customer_name: viewingOrder.customer_name,
                      customer_address: viewingOrder.customer_address || '',
                      total_amount: viewingOrder.total_amount,
                      po_number: viewingOrder.po_number || viewingOrder.order_no,
                      category: viewingOrder.category || '',
                    });
                    setShowViewModal(false);
                    setShowProjectModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <FolderKanban className="w-4 h-4" /> Create Project
                </button>
              </div>
            </div>
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
        }}
        prefillData={projectPrefillData}
      />
    </div>
  );
};

export default Orders;
