import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, X, RefreshCw, FileText, Download } from 'lucide-react';

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({ po_no: '', vendor_name: '', date: '', delivery_date: '', items: '', total_amount: 0, status: 'draft', notes: '' });

  const statuses = [
    { value: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-purple-100 text-purple-700' },
    { value: 'partial', label: 'Partial Received', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'received', label: 'Received', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  ];

  useEffect(() => {
    setTimeout(() => {
      setOrders([
        { id: '1', po_no: 'PO-2025-001', vendor_name: 'ABC Suppliers', date: '01/01/2025', delivery_date: '10/01/2025', total_amount: 250000, status: 'confirmed' },
        { id: '2', po_no: 'PO-2025-002', vendor_name: 'XYZ Materials', date: '02/01/2025', delivery_date: '12/01/2025', total_amount: 180000, status: 'sent' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSubmit = (e) => { e.preventDefault(); if (editingOrder) { setOrders(orders.map(o => o.id === editingOrder.id ? { ...o, ...formData } : o)); } else { setOrders([...orders, { ...formData, id: Date.now().toString(), po_no: `PO-2025-${String(orders.length + 1).padStart(3, '0')}` }]); } setShowAddModal(false); setEditingOrder(null); resetForm(); };
  const handleDelete = (id) => { if (window.confirm('Are you sure?')) setOrders(orders.filter(o => o.id !== id)); };
  const resetForm = () => setFormData({ po_no: '', vendor_name: '', date: '', delivery_date: '', items: '', total_amount: 0, status: 'draft', notes: '' });
  const openEditModal = (order) => { setEditingOrder(order); setFormData({ ...order }); setShowAddModal(true); };
  const filteredOrders = orders.filter(o => o.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) || o.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const getStatusColor = (status) => statuses.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-700';
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1><p className="text-slate-500 mt-1">Manage purchase orders</p></div>
        <button onClick={() => { resetForm(); setEditingOrder(null); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"><Plus className="w-4 h-4" /> Create PO</button>
      </div>
      <div className="flex items-center gap-4"><div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div><button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-5 h-5" /></button></div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PO No</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Delivery</th><th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th><th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th><th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr> : filteredOrders.length === 0 ? <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No orders found</td></tr> : filteredOrders.map((order) => (<tr key={order.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{order.po_no}</td><td className="px-4 py-3 text-sm text-slate-600">{order.vendor_name}</td><td className="px-4 py-3 text-sm text-slate-600">{order.date}</td><td className="px-4 py-3 text-sm text-slate-600">{order.delivery_date}</td><td className="px-4 py-3 text-sm text-right font-medium text-slate-900">{formatCurrency(order.total_amount)}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>{statuses.find(s => s.value === order.status)?.label}</span></td><td className="px-4 py-3"><div className="flex items-center justify-center gap-2"><button className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button><button onClick={() => openEditModal(order)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(order.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td></tr>))}</tbody></table></div></div>
      {showAddModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between p-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-900">{editingOrder ? 'Edit PO' : 'Create PO'}</h3><button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name *</label><input type="text" required value={formData.vendor_name} onChange={(e) => setFormData({...formData, vendor_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="text" placeholder="DD/MM/YYYY" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Delivery Date</label><input type="text" placeholder="DD/MM/YYYY" value={formData.delivery_date} onChange={(e) => setFormData({...formData, delivery_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Amount</label><input type="number" value={formData.total_amount} onChange={(e) => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg">{statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div className="flex justify-end gap-3 pt-4 border-t border-slate-200"><button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button><button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">{editingOrder ? 'Update' : 'Create'}</button></div></form></div></div>}
    </div>
  );
};

export default PurchaseOrders;
