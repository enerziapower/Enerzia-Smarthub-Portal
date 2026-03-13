/**
 * Order Management - Business Hub Tab
 * 
 * Migrated from: Sales → Order Management (OrderLifecycle.js)
 * Purpose: Order lifecycle, budget allocation, payment tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Plus, Search, Filter, RefreshCw, X, Edit2, Eye, ChevronDown,
  Target, Wallet, Truck, FileText, Building2, Calendar, Percent,
  ArrowRight, PiggyBank, Receipt, CreditCard, AlertCircle, ChevronRight, FolderKanban,
  Save, Users
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

// Status configuration
const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-slate-100 text-slate-700', icon: FileText },
  procurement: { label: 'Procurement', color: 'bg-blue-100 text-blue-700', icon: Package },
  execution: { label: 'Execution', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  invoiced: { label: 'Invoiced', color: 'bg-amber-100 text-amber-700', icon: Receipt },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: Wallet },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700', icon: CheckCircle }
};

const EXPENSE_CATEGORIES = [
  { value: 'material_purchase', label: 'Material Purchase' },
  { value: 'labor', label: 'Labor / Manpower' },
  { value: 'transport', label: 'Transport & Logistics' },
  { value: 'site_expenses', label: 'Site Expenses' },
  { value: 'subcontractor', label: 'Subcontractor Payments' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'misc', label: 'Miscellaneous' }
];

const OrderManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/order-lifecycle`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setStats(data.stats || null);
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
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate order metrics
  const calculateMetrics = (order) => {
    const orderValue = order.total_amount || 0;
    const purchaseBudget = order.purchase_budget?.amount || 0;
    const executionBudget = order.execution_budget?.amount || 0;
    const actualExpenses = order.actual_expenses || 0;
    const targetProfit = order.target_profit?.amount || 0;
    const actualProfit = orderValue - actualExpenses;
    const profitMargin = orderValue > 0 ? ((actualProfit / orderValue) * 100) : 0;

    return {
      orderValue,
      purchaseBudget,
      executionBudget,
      actualExpenses,
      targetProfit,
      actualProfit,
      profitMargin,
      budgetUtilization: purchaseBudget > 0 ? ((actualExpenses / purchaseBudget) * 100) : 0
    };
  };

  // Render stats cards
  const renderStatsCards = () => {
    if (!stats) return null;

    const cards = [
      { label: 'Total Orders', value: stats.total_orders || 0, icon: Package, color: 'blue' },
      { label: 'Total Value', value: `₹${((stats.total_value || 0) / 100000).toFixed(1)}L`, icon: DollarSign, color: 'emerald' },
      { label: 'In Progress', value: stats.in_progress || 0, icon: Clock, color: 'amber' },
      { label: 'Completed', value: stats.completed || 0, icon: CheckCircle, color: 'green' },
      { label: 'Avg. Margin', value: `${(stats.avg_margin || 0).toFixed(1)}%`, icon: TrendingUp, color: 'violet' },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`bg-${card.color}-50 border border-${card.color}-200 rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className={`text-${card.color}-600`} />
                <span className="text-sm text-slate-600">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold text-${card.color}-700`}>{card.value}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // Render order card
  const renderOrderCard = (order) => {
    const metrics = calculateMetrics(order);
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
    const StatusIcon = statusConfig.icon;

    return (
      <div 
        key={order.id}
        className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
        onClick={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800">{order.order_no || 'N/A'}</h3>
            <p className="text-sm text-slate-500">{order.customer_name}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <span className="text-slate-500">Order Value</span>
            <p className="font-semibold text-slate-800">₹{metrics.orderValue.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <span className="text-slate-500">Actual Profit</span>
            <p className={`font-semibold ${metrics.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{metrics.actualProfit.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Expenses</span>
            <p className="font-semibold text-slate-800">₹{metrics.actualExpenses.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <span className="text-slate-500">Margin</span>
            <p className={`font-semibold ${metrics.profitMargin >= 20 ? 'text-green-600' : metrics.profitMargin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
              {metrics.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Budget utilization bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Budget Utilization</span>
            <span className="font-medium">{metrics.budgetUtilization.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                metrics.budgetUtilization > 100 ? 'bg-red-500' : 
                metrics.budgetUtilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(metrics.budgetUtilization, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="order-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
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

            {/* Refresh */}
            <button
              onClick={fetchOrders}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No orders found</h3>
          <p className="text-sm text-slate-500">Orders will appear here once created from Sales</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => renderOrderCard(order))}
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Order Details - {selectedOrder.order_no}
                </h3>
                <p className="text-sm text-slate-500">{selectedOrder.customer_name}</p>
              </div>
              <button
                onClick={() => setShowOrderDetail(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Order details content */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 border-b pb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Value:</span>
                      <span className="font-medium">₹{(selectedOrder.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedOrder.status]?.color}`}>
                        {STATUS_CONFIG[selectedOrder.status]?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Date:</span>
                      <span className="font-medium">{selectedOrder.order_date || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 border-b pb-2">Financial Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Purchase Budget:</span>
                      <span className="font-medium">₹{(selectedOrder.purchase_budget?.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Actual Expenses:</span>
                      <span className="font-medium">₹{(selectedOrder.actual_expenses || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Profit:</span>
                      <span className="font-medium">₹{(selectedOrder.target_profit?.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
