import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, RefreshCw, Users, Phone, Mail, MapPin, Star } from 'lucide-react';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({ company_name: '', contact_person: '', email: '', phone: '', address: '', city: '', gst_no: '', category: 'materials', rating: 3, notes: '' });

  const categories = ['Materials', 'Equipment', 'Services', 'Logistics', 'Other'];

  useEffect(() => {
    setTimeout(() => {
      setVendors([
        { id: '1', company_name: 'ABC Suppliers', contact_person: 'Raj Kumar', email: 'raj@abc.com', phone: '+91 98765 43210', city: 'Chennai', gst_no: '33AABCA1234C1ZV', category: 'Materials', rating: 4, total_orders: 25, total_value: 4500000 },
        { id: '2', company_name: 'XYZ Logistics', contact_person: 'Priya Sharma', email: 'priya@xyz.com', phone: '+91 98765 43211', city: 'Mumbai', gst_no: '27AABCX5678D1ZW', category: 'Logistics', rating: 5, total_orders: 18, total_value: 2200000 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSubmit = (e) => { e.preventDefault(); if (editingVendor) { setVendors(vendors.map(v => v.id === editingVendor.id ? { ...v, ...formData } : v)); } else { setVendors([...vendors, { ...formData, id: Date.now().toString(), total_orders: 0, total_value: 0 }]); } setShowAddModal(false); setEditingVendor(null); resetForm(); };
  const handleDelete = (id) => { if (window.confirm('Are you sure?')) setVendors(vendors.filter(v => v.id !== id)); };
  const resetForm = () => setFormData({ company_name: '', contact_person: '', email: '', phone: '', address: '', city: '', gst_no: '', category: 'materials', rating: 3, notes: '' });
  const openEditModal = (vendor) => { setEditingVendor(vendor); setFormData({ ...vendor }); setShowAddModal(true); };
  const filteredVendors = vendors.filter(v => v.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Vendor Management</h1><p className="text-slate-500 mt-1">Manage supplier database</p></div>
        <button onClick={() => { resetForm(); setEditingVendor(null); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"><Plus className="w-4 h-4" /> Add Vendor</button>
      </div>
      <div className="flex items-center gap-4"><div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div><button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-5 h-5" /></button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full text-center py-8 text-slate-500">Loading...</div> : filteredVendors.length === 0 ? <div className="col-span-full text-center py-8 text-slate-500">No vendors found</div> : filteredVendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3"><div><h3 className="font-semibold text-slate-900">{vendor.company_name}</h3><p className="text-sm text-slate-500">{vendor.contact_person}</p></div><span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{vendor.category}</span></div>
            <div className="space-y-2 text-sm text-slate-600"><div className="flex items-center gap-2"><Mail className="w-4 h-4" />{vendor.email}</div><div className="flex items-center gap-2"><Phone className="w-4 h-4" />{vendor.phone}</div><div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{vendor.city}</div><div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < vendor.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />)}</div></div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center"><div><p className="text-xs text-slate-500">Total Orders: {vendor.total_orders}</p><p className="text-sm font-medium text-slate-900">{formatCurrency(vendor.total_value)}</p></div><div className="flex items-center gap-2"><button onClick={() => openEditModal(vendor)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(vendor.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></div>
          </div>
        ))}
      </div>
      {showAddModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between p-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-900">{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h3><button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label><input type="text" required value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label><input type="text" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">City</label><input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg">{categories.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}</select></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">GST No</label><input type="text" value={formData.gst_no} onChange={(e) => setFormData({...formData, gst_no: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div><div className="flex justify-end gap-3 pt-4 border-t border-slate-200"><button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button><button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">{editingVendor ? 'Update' : 'Create'}</button></div></form></div></div>}
    </div>
  );
};

export default Vendors;
