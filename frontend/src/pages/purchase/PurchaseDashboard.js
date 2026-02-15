import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package, Users, FileText, TrendingUp, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';

const PurchaseDashboard = () => {
  const [stats, setStats] = useState({ totalPOs: 0, pendingPOs: 0, totalVendors: 0, monthlySpend: 0, pendingDelivery: 0, inventoryItems: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setStats({ totalPOs: 28, pendingPOs: 8, totalVendors: 45, monthlySpend: 1850000, pendingDelivery: 12, inventoryItems: 156 });
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amt || 0);

  const statCards = [
    { title: 'Total POs', value: stats.totalPOs, icon: FileText, color: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Pending POs', value: stats.pendingPOs, icon: AlertCircle, color: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'Total Vendors', value: stats.totalVendors, icon: Users, color: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Monthly Spend', value: formatCurrency(stats.monthlySpend), icon: DollarSign, color: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Pending Delivery', value: stats.pendingDelivery, icon: Package, color: 'bg-amber-50', textColor: 'text-amber-600' },
    { title: 'Inventory Items', value: stats.inventoryItems, icon: ShoppingBag, color: 'bg-teal-50', textColor: 'text-teal-600' },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Purchase Dashboard</h1><p className="text-slate-500 mt-1">Overview of procurement activities</p></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className={`p-2 rounded-lg ${card.color} inline-block`}><card.icon className={`w-5 h-5 ${card.textColor}`} /></div>
            <div className="mt-4"><p className="text-sm text-slate-500">{card.title}</p><p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/purchase/orders" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><FileText className="w-5 h-5 text-blue-600" /><span className="text-sm font-medium text-slate-700">Purchase Orders</span></a>
            <a href="/purchase/vendors" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Users className="w-5 h-5 text-purple-600" /><span className="text-sm font-medium text-slate-700">Vendors</span></a>
            <a href="/purchase/inventory" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Package className="w-5 h-5 text-teal-600" /><span className="text-sm font-medium text-slate-700">Inventory</span></a>
            <a href="/purchase/reports" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><TrendingUp className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-slate-700">Reports</span></a>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /><div><p className="text-sm font-medium text-slate-900">New PO Created</p><p className="text-xs text-slate-500">PO-2025-028 - ₹85,000</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"><Package className="w-5 h-5 text-green-600" /><div><p className="text-sm font-medium text-slate-900">Delivery Received</p><p className="text-xs text-slate-500">PO-2025-022 - Cable Materials</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg"><Users className="w-5 h-5 text-purple-600" /><div><p className="text-sm font-medium text-slate-900">New Vendor Added</p><p className="text-xs text-slate-500">Steel Suppliers Pvt Ltd</p></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDashboard;
