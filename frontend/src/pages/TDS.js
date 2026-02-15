import React, { useState, useEffect, useCallback } from 'react';
import { 
  Percent, Plus, Search, Trash2, Edit2, X, RefreshCw, 
  CheckCircle, AlertCircle, Calendar
} from 'lucide-react';
import { accountsAPI } from '../services/api';

const TDS = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [formData, setFormData] = useState({
    month: '',
    section: '194C',
    party_name: '',
    pan_no: '',
    tds_rate: 0,
    gross_amount: 0,
    tds_amount: 0,
    date_of_deduction: '',
    date_of_deposit: '',
    challan_no: '',
    status: 'pending',
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const sections = ['194C', '194I', '194J', '194H', '194A', '194Q', '195', '206C'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.getTDS({ 
        month: filterMonth || undefined,
        status: filterStatus || undefined 
      });
      setRecords(response.data);
    } catch (err) {
      console.error('Error fetching TDS records:', err);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await accountsAPI.updateTDS(editingRecord.id, formData);
      } else {
        await accountsAPI.createTDS(formData);
      }
      setShowAddModal(false);
      setEditingRecord(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error saving TDS record:', err);
      alert('Failed to save TDS record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this TDS record?')) return;
    try {
      await accountsAPI.deleteTDS(id);
      fetchData();
    } catch (err) {
      console.error('Error deleting TDS record:', err);
      alert('Failed to delete TDS record');
    }
  };

  const resetForm = () => {
    setFormData({
      month: '',
      section: '194C',
      party_name: '',
      pan_no: '',
      tds_rate: 0,
      gross_amount: 0,
      tds_amount: 0,
      date_of_deduction: '',
      date_of_deposit: '',
      challan_no: '',
      status: 'pending',
    });
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({ ...record });
    setShowAddModal(true);
  };

  const calculateTDS = () => {
    const tds = (formData.gross_amount * formData.tds_rate) / 100;
    setFormData({...formData, tds_amount: Math.round(tds * 100) / 100});
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.pan_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.section?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalTDS = records.reduce((sum, r) => sum + (r.tds_amount || 0), 0);
  const pendingTDS = records.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.tds_amount || 0), 0);
  const depositedTDS = records.filter(r => r.status === 'deposited').reduce((sum, r) => sum + (r.tds_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">TDS Management</h1>
          <p className="text-slate-500 mt-1">Track TDS deductions and deposits</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingRecord(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Add TDS Record
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Percent className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total TDS</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalTDS)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Deposit</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(pendingTDS)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Deposited</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(depositedTDS)}</p>
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
            placeholder="Search by party, PAN, or section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="deposited">Deposited</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Month</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Party Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PAN</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Gross Amt</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">TDS Amt</th>
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
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                    No TDS records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{record.month}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                        {record.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{record.party_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.pan_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(record.gross_amount)}</td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600">{record.tds_rate}%</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-indigo-600">{formatCurrency(record.tds_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        record.status === 'deposited' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(record)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
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
                {editingRecord ? 'Edit TDS Record' : 'Add TDS Record'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month *</label>
                  <select
                    required
                    value={formData.month}
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Select Month</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Section *</label>
                  <select
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  value={formData.party_name}
                  onChange={(e) => setFormData({...formData, party_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PAN No</label>
                  <input
                    type="text"
                    value={formData.pan_no}
                    onChange={(e) => setFormData({...formData, pan_no: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TDS Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tds_rate}
                    onChange={(e) => setFormData({...formData, tds_rate: parseFloat(e.target.value) || 0})}
                    onBlur={calculateTDS}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gross Amount</label>
                  <input
                    type="number"
                    value={formData.gross_amount}
                    onChange={(e) => setFormData({...formData, gross_amount: parseFloat(e.target.value) || 0})}
                    onBlur={calculateTDS}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TDS Amount</label>
                  <input
                    type="number"
                    value={formData.tds_amount}
                    onChange={(e) => setFormData({...formData, tds_amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Deduction</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={formData.date_of_deduction}
                    onChange={(e) => setFormData({...formData, date_of_deduction: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Deposit</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={formData.date_of_deposit}
                    onChange={(e) => setFormData({...formData, date_of_deposit: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Challan No</label>
                  <input
                    type="text"
                    value={formData.challan_no}
                    onChange={(e) => setFormData({...formData, challan_no: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="pending">Pending</option>
                    <option value="deposited">Deposited</option>
                  </select>
                </div>
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
                  {editingRecord ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TDS;
