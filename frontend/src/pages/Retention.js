import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, Plus, Search, Upload, Trash2, Edit2, X, RefreshCw, 
  CheckCircle, AlertCircle, DollarSign
} from 'lucide-react';
import { accountsAPI } from '../services/api';

const Retention = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [formData, setFormData] = useState({
    invoice_no: '',
    customer_name: '',
    category: '',
    date: '',
    due_date: '',
    amount: 0,
    balance_due: 0,
    status: 'pending',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.getRetention();
      setInvoices(response.data);
    } catch (err) {
      console.error('Error fetching retention invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInvoice) {
        await accountsAPI.updateRetention(editingInvoice.id, formData);
      } else {
        await accountsAPI.createRetention(formData);
      }
      setShowAddModal(false);
      setEditingInvoice(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await accountsAPI.deleteRetention(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Failed to delete');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      const result = await accountsAPI.importRetention(formData);
      alert(`Successfully imported ${result.data.imported} records`);
      setShowImportModal(false);
      setImportFile(null);
      fetchData();
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
      customer_name: '',
      category: '',
      date: '',
      due_date: '',
      amount: 0,
      balance_due: 0,
      status: 'pending',
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

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterStatus || inv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalBalanceDue = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  const pendingCount = invoices.filter(inv => inv.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retention Invoices</h1>
          <p className="text-slate-500 mt-1">Manage retention payment records</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => { resetForm(); setEditingInvoice(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            Add Record
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Records</p>
              <p className="text-xl font-bold text-slate-900">{invoices.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Release</p>
              <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Balance Due</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalBalanceDue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="released">Released</option>
        </select>
        <button
          onClick={fetchData}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
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
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Balance Due</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                    No retention records found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{invoice.invoice_no}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{invoice.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{invoice.category || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{invoice.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{invoice.due_date}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(invoice.amount)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">{formatCurrency(invoice.balance_due)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        invoice.status === 'released' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(invoice)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
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
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingInvoice ? 'Edit Retention Record' : 'Add Retention Record'}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Balance Due</label>
                  <input
                    type="number"
                    value={formData.balance_due}
                    onChange={(e) => setFormData({...formData, balance_due: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="released">Released</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  {editingInvoice ? 'Update' : 'Create'}
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
              {importFile && <p className="text-sm text-slate-600">Selected: {importFile.name}</p>}
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button onClick={handleImport} disabled={!importFile || importing} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
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

export default Retention;
