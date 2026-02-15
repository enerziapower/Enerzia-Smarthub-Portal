import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Phone, Mail, X, RefreshCw } from 'lucide-react';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '', contact_person: '', email: '', phone: '',
    source: 'website', status: 'new', notes: '', expected_value: 0
  });

  const sources = ['Website', 'Referral', 'Cold Call', 'Trade Show', 'Social Media', 'Other'];
  const statuses = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-700' },
    { value: 'proposal', label: 'Proposal Sent', color: 'bg-orange-100 text-orange-700' },
    { value: 'negotiation', label: 'Negotiation', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
  ];

  useEffect(() => {
    setTimeout(() => {
      setLeads([
        { id: '1', company_name: 'ABC Industries', contact_person: 'John Doe', email: 'john@abc.com', phone: '+91 98765 43210', source: 'Website', status: 'new', expected_value: 500000, created_at: '2025-01-01' },
        { id: '2', company_name: 'XYZ Corp', contact_person: 'Jane Smith', email: 'jane@xyz.com', phone: '+91 98765 43211', source: 'Referral', status: 'qualified', expected_value: 750000, created_at: '2025-01-01' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingLead) {
      setLeads(leads.map(l => l.id === editingLead.id ? { ...l, ...formData } : l));
    } else {
      setLeads([...leads, { ...formData, id: Date.now().toString(), created_at: new Date().toISOString().split('T')[0] }]);
    }
    setShowAddModal(false);
    setEditingLead(null);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure?')) setLeads(leads.filter(l => l.id !== id));
  };

  const resetForm = () => setFormData({ company_name: '', contact_person: '', email: '', phone: '', source: 'website', status: 'new', notes: '', expected_value: 0 });

  const openEditModal = (lead) => { setEditingLead(lead); setFormData({ ...lead }); setShowAddModal(true); };

  const filteredLeads = leads.filter(l => 
    l.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => statuses.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-700';

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads & Enquiries</h1>
          <p className="text-slate-500 mt-1">Manage sales leads and enquiries</p>
        </div>
        <button onClick={() => { resetForm(); setEditingLead(null); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <button onClick={() => {}} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Expected Value</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No leads found</td></tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lead.company_name}</p>
                      <p className="text-sm text-slate-500">{lead.created_at}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">{lead.contact_person}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3 h-3" />{lead.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{lead.source}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                        {statuses.find(s => s.value === lead.status)?.label || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">{formatCurrency(lead.expected_value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditModal(lead)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{editingLead ? 'Edit Lead' : 'Add Lead'}</h3>
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
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Source</label><select value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900">{sources.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900">{statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Expected Value</label><input type="number" value={formData.expected_value} onChange={(e) => setFormData({...formData, expected_value: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">{editingLead ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
