/**
 * Order Management - Business Hub
 * 
 * Displays orders in table format (one line per order) - same as Sales Order Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Search, Filter, RefreshCw, X, Eye, ChevronRight,
  Target, Wallet, Truck, FileText, Receipt, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

// Status configuration - same as Sales OrderLifecycle
const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-slate-100 text-slate-700', icon: FileText },
  procurement: { label: 'Procurement', color: 'bg-blue-100 text-blue-700', icon: Package },
  execution: { label: 'Execution', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  invoiced: { label: 'Invoiced', color: 'bg-amber-100 text-amber-700', icon: Receipt },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: Wallet },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700', icon: CheckCircle }
};

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch orders from correct endpoint
      const ordersResponse = await fetch(`${API_URL}/api/order-lifecycle/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch dashboard stats
      const statsResponse = await fetch(`${API_URL}/api/order-lifecycle/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      }
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData || null);
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
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.lifecycle_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle status change
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/order-lifecycle/orders/${orderId}/lifecycle/status?status=${newStatus}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
        fetchOrders();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating status');
    }
  };

  return (
    <div className="space-y-6" data-testid="order-management">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Order Management</h2>
            <p className="text-sm text-slate-500">Track orders from sales to completion</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders..."
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
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            <button onClick={fetchOrders} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{stats.total_orders || orders.length}</p>
              <p className="text-sm text-slate-500">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_order_value)}</p>
              <p className="text-sm text-slate-500">Total Value</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.total_expenses)}</p>
              <p className="text-sm text-slate-500">Total Expenses</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${(stats.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.total_profit)}
              </p>
              <p className="text-sm text-slate-500">Total Profit</p>
            </div>
          </div>
        )}
      </div>

      {/* Orders List - Table Format */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-slate-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 mb-1">No orders found</h3>
            <p className="text-sm text-slate-500">Orders will appear here when created from Sales</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.lifecycle_status] || STATUS_CONFIG.new;
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
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
                    <p className="text-sm text-slate-600 truncate">{order.customer_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{order.date}</p>
                  </div>

                  {/* Financials - Grid */}
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
                      <p className={`font-semibold ${(order.financials?.actual_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(order.financials?.actual_profit)} ({order.financials?.profit_margin || 0}%)
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar - Lifecycle Status */}
                {order.lifecycle && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {Object.entries(STATUS_CONFIG).map(([key, config], idx) => {
                        const isActive = key === order.lifecycle_status;
                        const isPast = Object.keys(STATUS_CONFIG).indexOf(key) < Object.keys(STATUS_CONFIG).indexOf(order.lifecycle_status);
                        const Icon = config.icon;
                        
                        return (
                          <React.Fragment key={key}>
                            <button
                              onClick={() => handleStatusChange(order.id, key)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                                isActive ? config.color + ' font-semibold' : 
                                isPast ? 'bg-green-100 text-green-700' : 
                                'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </button>
                            {idx < Object.keys(STATUS_CONFIG).length - 1 && (
                              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
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

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedOrder.order_no}</h3>
                <p className="text-sm text-slate-500">{selectedOrder.customer_name}</p>
              </div>
              <button
                onClick={() => setShowOrderDetail(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Status</label>
                  <p className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedOrder.lifecycle_status]?.color || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_CONFIG[selectedOrder.lifecycle_status]?.label || 'New'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Order Date</label>
                  <p className="font-medium text-slate-800">{selectedOrder.date || '-'}</p>
                </div>
              </div>

              {/* Financials */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Order Value</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Purchase</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedOrder.financials?.purchase_actual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Expenses</p>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(selectedOrder.financials?.execution_actual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Profit</p>
                    <p className={`text-lg font-bold ${(selectedOrder.financials?.actual_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedOrder.financials?.actual_profit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Budget Info */}
              {selectedOrder.lifecycle && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">Budget Allocation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-600">Purchase Budget</p>
                      <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedOrder.financials?.purchase_budget)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Execution Budget</p>
                      <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedOrder.financials?.execution_budget)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Target Profit</p>
                      <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedOrder.financials?.target_profit)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Profit Margin</p>
                      <p className="text-lg font-bold text-blue-800">{selectedOrder.financials?.profit_margin || 0}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{item.description}</p>
                          <p className="text-sm text-slate-500">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                        </div>
                        <p className="font-semibold text-slate-800">{formatCurrency(item.total_price)}</p>
                      </div>
                    ))}
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

export default OrderManagement;
