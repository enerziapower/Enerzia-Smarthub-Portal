import React, { useState, useEffect, useRef } from 'react';
import { 
  UsersRound, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, 
  Building2, Loader2, Download, Upload, X, Save, AlertCircle, FileSpreadsheet,
  CheckSquare, Square, MoreHorizontal, Home
} from 'lucide-react';
import { settingsAPI } from '../services/api';
import * as XLSX from 'xlsx';

const DomesticCustomers = () => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const fileInputRef = useRef(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gst_number: '',
    customer_type: 'domestic',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await settingsAPI.getDomesticClients();
      setClients(res.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      showMessage('error', 'Failed to load domestic customers');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddClient = async () => {
    if (!formData.name.trim()) {
      showMessage('error', 'Customer name is required');
      return;
    }
    try {
      const res = await settingsAPI.createClient({ ...formData, customer_type: 'domestic' });
      setClients([...clients, res.data]);
      setShowAddModal(false);
      resetForm();
      showMessage('success', 'Domestic customer added successfully');
    } catch (error) {
      showMessage('error', 'Failed to add customer');
    }
  };

  const handleUpdateClient = async () => {
    try {
      const res = await settingsAPI.updateClient(selectedClient.id, { ...formData, customer_type: 'domestic' });
      setClients(clients.map(c => c.id === selectedClient.id ? res.data : c));
      setShowEditModal(false);
      setSelectedClient(null);
      resetForm();
      showMessage('success', 'Customer updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update customer');
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await settingsAPI.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
      showMessage('success', 'Customer deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete customer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      gst_number: '',
      customer_type: 'domestic',
    });
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      gst_number: client.gst_number || '',
      customer_type: 'domestic',
    });
    setShowEditModal(true);
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map(c => c.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected customers?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => settingsAPI.deleteClient(id)));
      setClients(clients.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      showMessage('success', `${selectedIds.length} customers deleted`);
    } catch (error) {
      showMessage('error', 'Failed to delete some customers');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Excel Export
  const handleExport = () => {
    const exportData = clients.map(c => ({
      'Customer Name': c.name,
      'Contact Person': c.contact_person || '',
      'Email': c.email || '',
      'Phone': c.phone || '',
      'Address': c.address || '',
      'GST Number': c.gst_number || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Domestic Customers');
    XLSX.writeFile(wb, 'domestic_customers.xlsx');
  };

  // Excel Import
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const preview = data.map(row => ({
        name: row['Customer Name'] || row['name'] || '',
        contact_person: row['Contact Person'] || row['contact_person'] || '',
        email: row['Email'] || row['email'] || '',
        phone: row['Phone'] || row['phone'] || '',
        address: row['Address'] || row['address'] || '',
        gst_number: row['GST Number'] || row['gst_number'] || '',
      })).filter(item => item.name);

      setImportPreview(preview);
      setShowImportModal(true);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      for (const item of importPreview) {
        await settingsAPI.createClient({ ...item, customer_type: 'domestic' });
      }
      await loadClients();
      setShowImportModal(false);
      setImportPreview([]);
      showMessage('success', `${importPreview.length} customers imported`);
    } catch (error) {
      showMessage('error', 'Failed to import some customers');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="domestic-customers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Home className="text-emerald-600" size={24} />
            </div>
            Domestic Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage customers within India</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Upload size={16} />
            Import Excel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Download size={16} />
            Export Excel
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            data-testid="add-domestic-customer-btn"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <AlertCircle size={16} />
          {message.text}
        </div>
      )}

      {/* Stats & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
            <span className="text-sm text-emerald-600">Total: </span>
            <span className="font-bold text-emerald-700">{clients.length}</span>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{selectedIds.length} selected</span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"
              >
                {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Selected
              </button>
            </div>
          )}
        </div>
        <div className="relative w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                  {selectedIds.length === filteredClients.length && filteredClients.length > 0 ? 
                    <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact Person</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">GST Number</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <UsersRound size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">No domestic customers found</p>
                  <p className="text-sm text-slate-400 mt-1">Add your first domestic customer</p>
                </td>
              </tr>
            ) : (
              filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50" data-testid={`customer-row-${client.id}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelectOne(client.id)} className="text-slate-400 hover:text-slate-600">
                      {selectedIds.includes(client.id) ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-emerald-600 font-semibold">{client.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-slate-900">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{client.contact_person || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{client.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{client.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{client.gst_number || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {showEditModal ? 'Edit Domestic Customer' : 'Add Domestic Customer'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter customer name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="GST Number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Full address"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdateClient : handleAddClient}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                <Save size={16} />
                {showEditModal ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Import Preview</h2>
              <button onClick={() => { setShowImportModal(false); setImportPreview([]); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{importPreview.length} customers to import</p>
            <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Contact</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importPreview.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.contact_person}</td>
                      <td className="px-3 py-2">{item.email}</td>
                      <td className="px-3 py-2">{item.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowImportModal(false); setImportPreview([]); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import {importPreview.length} Customers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomesticCustomers;
