import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, X, RefreshCw, Users, Phone, Mail, MapPin } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '', contact_person: '', email: '', phone: '',
    address: '', city: '', gst_no: '', category: 'regular', notes: ''
  });

  const categories = [
    { value: 'regular', label: 'Regular', color: 'bg-blue-100 text-blue-700' },
    { value: 'premium', label: 'Premium', color: 'bg-purple-100 text-purple-700' },
    { value: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-700' },
  ];

  useEffect(() => {
    setTimeout(() => {
      setCustomers([
        { id: '1', company_name: 'ABC Industries', contact_person: 'John Doe', email: 'john@abc.com', phone: '+91 98765 43210', city: 'Chennai', gst_no: '33AABCA1234C1ZV', category: 'premium', total_orders: 12, total_value: 5600000 },
        { id: '2', company_name: 'XYZ Corp', contact_person: 'Jane Smith', email: 'jane@xyz.com', phone: '+91 98765 43211', city: 'Mumbai', gst_no: '27AABCX5678D1ZW', category: 'regular', total_orders: 5, total_value: 1800000 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCustomer) {
      setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...formData } : c));
    } else {
      setCustomers([...customers, { ...formData, id: Date.now().toString(), total_orders: 0, total_value: 0 }]);
    }
    setShowAddModal(false);
    setEditingCustomer(null);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure?')) setCustomers(customers.filter(c => c.id !== id));
  };

  const resetForm = () => setFormData({ company_name: '', contact_person: '', email: '', phone: '', address: '', city: '', gst_no: '', category: 'regular', notes: '' });

  const openEditModal = (customer) => { setEditingCustomer(customer); setFormData({ ...customer }); setShowAddModal(true); };

  const filteredCustomers = customers.filter(c => 
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (cat) => categories.find(c => c.value === cat)?.color || 'bg-slate-100 text-slate-700';

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-slate-500 mt-1">Manage customer database</p>
        </div>
        <button onClick={() => { resetForm(); setEditingCustomer(null); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-slate-500">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-slate-500">No customers found</div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{customer.company_name}</h3>
                  <p className="text-sm text-slate-500">{customer.contact_person}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(customer.category)}`}>
                  {categories.find(c => c.value === customer.category)?.label || customer.category}
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{customer.email}</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{customer.phone}</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{customer.city}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500">Total Orders: {customer.total_orders}</p>
                  <p className="text-sm font-medium text-slate-900">{formatCurrency(customer.total_value)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(customer)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label><input type="text" required value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label><input type="text" required value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">City</label><input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">GST No</label><input type="text" value={formData.gst_no} onChange={(e) => setFormData({...formData, gst_no: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900">{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Address</label><textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">{editingCustomer ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
