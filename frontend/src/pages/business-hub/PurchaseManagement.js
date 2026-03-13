/**
 * Purchase Management - Business Hub Tab
 * 
 * Migrated from: Purchase → Procurement Module (PurchaseModule.js)
 * Purpose: Material procurement, PO management, GRN tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Search, Filter, RefreshCw, Eye, Edit2, CheckCircle,
  Clock, AlertTriangle, Truck, FileText, Building2, DollarSign,
  ShoppingCart, ClipboardList, FileCheck, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  pending_approval: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  ordered: { label: 'Ordered', color: 'bg-purple-100 text-purple-700' },
  partially_received: { label: 'Partially Received', color: 'bg-cyan-100 text-cyan-700' },
  received: { label: 'Received', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
};

const PurchaseManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('requests');
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ requests: 0, orders: 0, pending: 0, value: 0 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch purchase requests
      const reqResponse = await fetch(`${API_URL}/api/purchase/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reqResponse.ok) {
        const reqData = await reqResponse.json();
        setPurchaseRequests(reqData);
      }
      
      // Fetch purchase orders
      const poResponse = await fetch(`${API_URL}/api/purchase/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (poResponse.ok) {
        const poData = await poResponse.json();
        setPurchaseOrders(poData);
        
        // Calculate stats
        const pending = poData.filter(po => ['pending_approval', 'approved', 'ordered'].includes(po.status)).length;
        const totalValue = poData.reduce((sum, po) => sum + (po.total_amount || 0), 0);
        setStats({
          requests: purchaseRequests.length,
          orders: poData.length,
          pending,
          value: totalValue
        });
      }
    } catch (error) {
      console.error('Error fetching purchase data:', error);
      toast.error('Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  }, [purchaseRequests.length]);

  useEffect(() => {
    fetchData();
  }, []);

  const subTabs = [
    { id: 'requests', label: 'Purchase Requests', icon: ClipboardList },
    { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'grn', label: 'Goods Received', icon: FileCheck },
  ];

  return (
    <div className="space-y-6" data-testid="purchase-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Purchase Management</h2>
            <p className="text-sm text-slate-500">Manage procurement, POs, and deliveries</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>
            <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Requests</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.requests}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={18} className="text-blue-600" />
            <span className="text-sm text-slate-600">Orders</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.orders}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-purple-600" />
            <span className="text-sm text-slate-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{stats.pending}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-600">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">₹{(stats.value / 100000).toFixed(1)}L</p>
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
            <div className="text-center py-12 text-slate-500">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <p>Purchase {activeSubTab} will be displayed here</p>
              <p className="text-sm mt-2">Data is loaded from existing Purchase Module</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseManagement;
