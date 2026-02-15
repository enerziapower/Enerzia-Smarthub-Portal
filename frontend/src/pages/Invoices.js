import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Plus, Search, Filter, Upload, Download, Trash2, Edit2, 
  X, AlertCircle, CheckCircle, Eye, RefreshCw
} from 'lucide-react';
import { accountsAPI } from '../services/api';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [formData, setFormData] = useState({
    invoice_no: '',
    invoice_type: 'domestic',
    customer_name: '',
    date: '',
    gst_no: '',
    basic: 0,
    sgst: 0,
    cgst: 0,
    igst: 0,
    round_off: 0,
    amount: 0,
  });

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const [invoicesRes, overdueRes] = await Promise.all([
        accountsAPI.getInvoices({ invoice_type: filterType || undefined }),
        accountsAPI.getOverdueInvoices()
      ]);
      setInvoices(invoicesRes.data);
      setOverdueInvoices(overdueRes.data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInvoice) {
        await accountsAPI.updateInvoice(editingInvoice.id, formData);
      } else {
        await accountsAPI.createInvoice(formData);
      }
      setShowAddModal(false);
      setEditingInvoice(null);
      resetForm();
      fetchInvoices();
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert('Failed to save invoice');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await accountsAPI.deleteInvoice(id);
      fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Failed to delete invoice');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      
      const endpoint = activeTab === 'overdue' ? accountsAPI.importOverdue : accountsAPI.importInvoices;
      const result = await endpoint(formData);
      
      alert(`Successfully imported ${result.data.imported} records`);
      setShowImportModal(false);
      setImportFile(null);
      fetchInvoices();
    } catch (err) {
      console.error('Error importing:', err);
      alert('Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_no: '',
      invoice_type: 'domestic',
      customer_name: '',
      date: '',
      gst_no: '',
      basic: 0,
      sgst: 0,
      cgst: 0,
      igst: 0,
      round_off: 0,
      amount: 0,
    });
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setFormData({ ...invoice });
    setShowAddModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const filteredInvoices = (activeTab === 'overdue' ? overdueInvoices : invoices).filter(inv => {
    const matchesSearch = inv.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'overdue') return matchesSearch;
    return matchesSearch && inv.invoice_type === activeTab;
  });

  const tabs = [
    { id: 'all', label: 'All Invoices', count: invoices.length },
    { id: 'domestic', label: 'Domestic', count: invoices.filter(i => i.invoice_type === 'domestic').length },
    { id: 'export', label: 'Export', count: invoices.filter(i => i.invoice_type === 'export').length },
    { id: 'sez', label: 'SEZ', count: invoices.filter(i => i.invoice_type === 'sez').length },
    { id: 'cancelled', label: 'Cancelled', count: invoices.filter(i => i.invoice_type === 'cancelled').length },
    { id: 'overdue', label: 'Overdue', count: overdueInvoices.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage all invoice records</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => { resetForm(); setEditingInvoice(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Invoice
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'border-slate-900 text-slate-900' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <button
          onClick={fetchInvoices}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Basic</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">GST</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{invoice.invoice_no}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{invoice.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{invoice.date || invoice.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        invoice.invoice_type === 'domestic' ? 'bg-green-100 text-green-700' :
                        invoice.invoice_type === 'export' ? 'bg-purple-100 text-purple-700' :
                        invoice.invoice_type === 'sez' ? 'bg-blue-100 text-blue-700' :
                        invoice.invoice_type === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {invoice.invoice_type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(invoice.basic)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {formatCurrency((invoice.sgst || 0) + (invoice.cgst || 0) + (invoice.igst || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                      {formatCurrency(invoice.amount || invoice.balance_due)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(invoice)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingInvoice ? 'Edit Invoice' : 'Add Invoice'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice No *</label>
                  <input
                    type="text"
                    required
                    value={formData.invoice_no}
                    onChange={(e) => setFormData({...formData, invoice_no: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.invoice_type}
                    onChange={(e) => setFormData({...formData, invoice_type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="domestic">Domestic</option>
                    <option value="export">Export</option>
                    <option value="sez">SEZ</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="credit_note">Credit Note</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST No</label>
                  <input
                    type="text"
                    value={formData.gst_no}
                    onChange={(e) => setFormData({...formData, gst_no: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Basic Amount</label>
                  <input
                    type="number"
                    value={formData.basic}
                    onChange={(e) => setFormData({...formData, basic: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SGST</label>
                  <input
                    type="number"
                    value={formData.sgst}
                    onChange={(e) => setFormData({...formData, sgst: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CGST</label>
                  <input
                    type="number"
                    value={formData.cgst}
                    onChange={(e) => setFormData({...formData, cgst: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IGST</label>
                  <input
                    type="number"
                    value={formData.igst}
                    onChange={(e) => setFormData({...formData, igst: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Round Off</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.round_off}
                    onChange={(e) => setFormData({...formData, round_off: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {editingInvoice ? 'Update' : 'Create'} Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Import from Excel</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-2">Upload Excel file (.xlsx, .xls)</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full"
                />
              </div>
              {importFile && (
                <p className="text-sm text-slate-600">Selected: {importFile.name}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
