import React, { useState, useEffect, useRef } from 'react';
import { 
  UsersRound, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, 
  Building2, Loader2, Download, Upload, X, Save, AlertCircle, FileSpreadsheet,
  CheckSquare, Square, MoreHorizontal
} from 'lucide-react';
import { settingsAPI } from '../services/api';
import * as XLSX from 'xlsx';

const Customers = () => {
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
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await settingsAPI.getClients();
      setClients(res.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      showMessage('error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddClient = async () => {
    try {
      const res = await settingsAPI.createClient(formData);
      setClients([...clients, res.data]);
      setShowAddModal(false);
      resetForm();
      showMessage('success', 'Customer added successfully');
    } catch (error) {
      showMessage('error', 'Failed to add customer');
    }
  };

  const handleUpdateClient = async () => {
    try {
      const res = await settingsAPI.updateClient(selectedClient.id, formData);
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
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      showMessage('success', 'Customer deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete customer');
    }
  };

  // Bulk Selection Functions
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map(c => c.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmMsg = `Are you sure you want to delete ${selectedIds.length} customer(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await settingsAPI.deleteClient(id);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error deleting customer:', id, error);
      }
    }

    setBulkDeleting(false);
    setSelectedIds([]);
    setShowBulkActions(false);
    loadClients();

    if (errorCount > 0) {
      showMessage('success', `Deleted ${successCount} customers. ${errorCount} failed.`);
    } else {
      showMessage('success', `Successfully deleted ${successCount} customers`);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setShowBulkActions(false);
  };

  // Download Excel Template
  const downloadTemplate = () => {
    const templateData = [
      {
        'Company Name': 'Example Company',
        'Contact Person': 'John Doe',
        'Email': 'john@example.com',
        'Phone': '9876543210',
        'Address': '123 Main Street, City',
        'GST Number': '29ABCDE1234F1Z5'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 25 }, 
      { wch: 15 }, { wch: 40 }, { wch: 20 }
    ];
    
    XLSX.writeFile(wb, 'customers_template.xlsx');
    showMessage('success', 'Template downloaded successfully');
  };

  // Export Customers to Excel
  const exportToExcel = () => {
    const dataToExport = selectedIds.length > 0 
      ? clients.filter(c => selectedIds.includes(c.id))
      : clients;

    if (dataToExport.length === 0) {
      showMessage('error', 'No customers to export');
      return;
    }

    const exportData = dataToExport.map(c => ({
      'Company Name': c.name || '',
      'Contact Person': c.contact_person || '',
      'Email': c.email || '',
      'Phone': c.phone || '',
      'Address': c.address || '',
      'GST Number': c.gst_number || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 25 }, 
      { wch: 15 }, { wch: 40 }, { wch: 20 }
    ];
    
    XLSX.writeFile(wb, `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    showMessage('success', `Exported ${dataToExport.length} customers successfully`);
  };

  // Handle File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const mappedData = data.map(row => ({
          name: row['Company Name'] || row['name'] || '',
          contact_person: row['Contact Person'] || row['contact_person'] || '',
          email: row['Email'] || row['email'] || '',
          phone: String(row['Phone'] || row['phone'] || ''),
          address: row['Address'] || row['address'] || '',
          gst_number: row['GST Number'] || row['gst_number'] || ''
        })).filter(row => row.name);

        setImportPreview(mappedData);
        setShowImportModal(true);
      } catch (error) {
        console.error('Error parsing file:', error);
        showMessage('error', 'Failed to parse Excel file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Import Customers from Preview
  const handleImport = async () => {
    if (importPreview.length === 0) {
      showMessage('error', 'No data to import');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const customer of importPreview) {
      try {
        await settingsAPI.createClient(customer);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error importing customer:', customer.name, error);
      }
    }

    setImporting(false);
    setShowImportModal(false);
    setImportPreview([]);
    loadClients();
    
    if (errorCount > 0) {
      showMessage('success', `Imported ${successCount} customers. ${errorCount} failed.`);
    } else {
      showMessage('success', `Successfully imported ${successCount} customers`);
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
    });
    setShowEditModal(true);
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = filteredClients.length > 0 && selectedIds.length === filteredClients.length;
  const isSomeSelected = selectedIds.length > 0;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <UsersRound className="text-emerald-600" size={28} />
            Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage all your customers in one place</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={downloadTemplate}
            className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            title="Download Excel Template"
          >
            <FileSpreadsheet size={16} />
            Template
          </button>
          <button
            onClick={exportToExcel}
            className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            title={selectedIds.length > 0 ? `Export ${selectedIds.length} selected` : "Export all to Excel"}
          >
            <Download size={16} />
            Export {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-2"
          >
            <Upload size={16} />
            Import from Excel
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
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

      {/* Bulk Actions Bar */}
      {isSomeSelected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-emerald-800">
              {selectedIds.length} customer{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-emerald-600 hover:text-emerald-800 underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToExcel}
              className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 flex items-center gap-2"
            >
              <Download size={14} />
              Export Selected
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
            >
              {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Search and Select All */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {filteredClients.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            {isAllSelected ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />}
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">Total Customers</p>
          <p className="text-2xl font-bold text-emerald-600">{clients.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">With Email</p>
          <p className="text-2xl font-bold text-blue-600">{clients.filter(c => c.email).length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">With GST</p>
          <p className="text-2xl font-bold text-violet-600">{clients.filter(c => c.gst_number).length}</p>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => {
          const isSelected = selectedIds.includes(client.id);
          return (
            <div 
              key={client.id} 
              className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer ${
                isSelected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
              }`}
              onClick={(e) => {
                // Don't toggle selection when clicking buttons
                if (e.target.closest('button')) return;
                toggleSelectOne(client.id);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-emerald-500' : 'bg-emerald-100'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare size={20} className="text-white" />
                    ) : (
                      <Building2 size={20} className="text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{client.name}</h3>
                    {client.contact_person && (
                      <p className="text-xs text-slate-500">{client.contact_person}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>
                )}
                {client.gst_number && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                      GST: {client.gst_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <UsersRound size={40} className="mx-auto mb-3 text-slate-300" />
            <p>No customers found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {showEditModal ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter contact person name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter GST number"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdateClient : handleAddClient}
                disabled={!formData.name}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {showEditModal ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl p-6 m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Import Preview</h2>
                <p className="text-sm text-slate-500">{importPreview.length} customers ready to import</p>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Company Name</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Contact Person</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Email</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">Phone</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-600">GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">{row.contact_person}</td>
                      <td className="px-4 py-2">{row.email}</td>
                      <td className="px-4 py-2">{row.phone}</td>
                      <td className="px-4 py-2">{row.gst_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || importPreview.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {importing ? 'Importing...' : `Import ${importPreview.length} Customers`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
