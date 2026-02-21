import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, Search, Check, X, AlertCircle, RefreshCw,
  Calendar, User, Building, Edit2, Trash2, Download,
  TrendingUp, Users, DollarSign, UserCheck, FileText, Bell
} from 'lucide-react';
import api from '../../services/api';

const OvertimeManagement = () => {
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved'
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingRate, setLoadingRate] = useState(false);
  const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState(null);

  // OT Rate Constants
  const WORKING_HOURS_PER_MONTH = 208; // 26 days × 8 hours
  const OT_MULTIPLIER = 2.0;

  const [formData, setFormData] = useState({
    emp_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    reason: '',
    rate_per_hour: 0,
    gross_salary: 0,
    hourly_rate: 0
  });

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  useEffect(() => {
    fetchOvertimeRecords();
    fetchEmployees();
  }, [filterMonth, filterYear]);

  const fetchOvertimeRecords = async () => {
    try {
      setLoading(true);
      const url = `/hr/overtime?month=${filterMonth}&year=${filterYear}`;
      const response = await api.get(url);
      const records = response.data || [];
      setOvertimeRecords(records);
      
      // Separate pending requests (from employees)
      const pending = records.filter(r => r.status === 'pending');
      setPendingRequests(pending);
    } catch (err) {
      console.error('Error fetching overtime records:', err);
      setOvertimeRecords([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees?status=active');
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.emp_id || !formData.hours || !formData.date) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        hours: parseFloat(formData.hours),
        rate_per_hour: parseFloat(formData.rate_per_hour),
        amount: parseFloat(formData.hours) * parseFloat(formData.rate_per_hour)
      };

      if (editingRecord) {
        await api.put(`/hr/overtime/${editingRecord.id}`, payload);
        setSuccess('Overtime record updated successfully');
      } else {
        await api.post('/hr/overtime', payload);
        setSuccess('Overtime record created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchOvertimeRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save overtime record');
    }
  };

  const handleApprove = async (recordId, ratePerHour = null) => {
    try {
      // If rate is provided, update the record first
      if (ratePerHour) {
        const record = overtimeRecords.find(r => r.id === recordId);
        if (record) {
          await api.put(`/hr/overtime/${recordId}`, {
            rate_per_hour: parseFloat(ratePerHour),
            amount: record.hours * parseFloat(ratePerHour)
          });
        }
      }
      
      await api.put(`/hr/overtime/${recordId}/approve`);
      setSuccess('Overtime approved - will be included in payroll');
      fetchOvertimeRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve overtime');
    }
  };

  const handleReject = async (recordId) => {
    if (!window.confirm('Are you sure you want to reject this overtime request?')) return;
    
    try {
      await api.put(`/hr/overtime/${recordId}/reject`);
      setSuccess('Overtime rejected');
      fetchOvertimeRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject overtime');
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    
    try {
      await api.delete(`/hr/overtime/${recordId}`);
      setSuccess('Record deleted');
      fetchOvertimeRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete record');
    }
  };

  const resetForm = () => {
    setFormData({
      emp_id: '',
      date: new Date().toISOString().split('T')[0],
      hours: '',
      reason: '',
      rate_per_hour: 100
    });
    setEditingRecord(null);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      emp_id: record.emp_id,
      date: record.date,
      hours: record.hours,
      reason: record.reason || '',
      rate_per_hour: record.rate_per_hour || 100
    });
    setShowModal(true);
  };

  // Filter records based on active tab
  const getFilteredRecords = () => {
    let records = overtimeRecords;
    
    if (activeTab === 'pending') {
      records = records.filter(r => r.status === 'pending');
    } else if (activeTab === 'approved') {
      records = records.filter(r => r.status === 'approved');
    }
    
    return records.filter(rec =>
      rec.emp_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.emp_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredRecords = getFilteredRecords();

  // Stats calculation
  const totalHours = overtimeRecords.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.hours || 0), 0);
  const totalAmount = overtimeRecords.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount || 0), 0);
  const pendingCount = pendingRequests.length;
  const uniqueEmployees = new Set(overtimeRecords.filter(r => r.status === 'approved').map(r => r.emp_id)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overtime Management</h1>
          <p className="text-slate-500 mt-1">Approve employee requests & track overtime hours for payroll</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          data-testid="add-overtime-btn"
        >
          <Plus className="w-4 h-4" /> Add Overtime
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <Check className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${pendingCount > 0 ? 'bg-yellow-100' : 'bg-slate-100'}`}>
              <Bell className={`w-5 h-5 ${pendingCount > 0 ? 'text-yellow-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-yellow-600' : 'text-slate-900'}`}>{pendingCount}</p>
              <p className="text-sm text-slate-500">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</p>
              <p className="text-sm text-slate-500">Approved Hours</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">₹{totalAmount.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Total OT Amount</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{uniqueEmployees}</p>
              <p className="text-sm text-slate-500">Employees with OT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {[
            { id: 'all', label: 'All Records', count: overtimeRecords.length },
            { id: 'pending', label: 'Pending Approval', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'approved', label: 'Approved', count: overtimeRecords.filter(r => r.status === 'approved').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                tab.highlight ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            data-testid="search-input"
          />
        </div>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg"
        >
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg"
        >
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={fetchOvertimeRecords} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Overtime Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Hours</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Rate/Hr</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Source</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                  {activeTab === 'pending' ? 'No pending requests' : 'No overtime records found'}
                </td></tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className={`hover:bg-slate-50 ${record.status === 'pending' ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{record.emp_name}</p>
                        <p className="text-xs text-slate-500">{record.emp_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {record.date}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-slate-900">{record.hours}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">
                      ₹{record.rate_per_hour || 100}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-green-600">₹{record.amount?.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600 max-w-[150px] truncate" title={record.reason}>
                        {record.reason || '-'}
                      </p>
                      {record.project && (
                        <p className="text-xs text-slate-400">Project: {record.project}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.source === 'employee_request' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                          <User className="w-3 h-3" /> Employee
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-50 text-slate-600 rounded-full">
                          <UserCheck className="w-3 h-3" /> HR Entry
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[record.status] || 'bg-slate-100 text-slate-700'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {record.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApprove(record.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                              data-testid={`approve-${record.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleReject(record.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Reject"
                              data-testid={`reject-${record.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => openEditModal(record)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                          data-testid={`edit-${record.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                          data-testid={`delete-${record.id}`}
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

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Overtime → Payroll Flow</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>Employee Request:</strong> Employees submit OT requests from their workspace</li>
              <li><strong>HR Approval:</strong> Review and approve/reject requests, adjust rate if needed</li>
              <li><strong>Payroll:</strong> Approved OT is automatically added to the employee's salary</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add/Edit Overtime Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingRecord ? 'Edit Overtime Record' : 'Add Overtime (HR Entry)'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
                <select
                  value={formData.emp_id}
                  onChange={(e) => setFormData({...formData, emp_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                  disabled={editingRecord}
                  data-testid="employee-select"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.emp_id} value={emp.emp_id}>
                      {emp.name} ({emp.emp_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                  data-testid="date-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hours *</label>
                  <input
                    type="number"
                    value={formData.hours}
                    onChange={(e) => setFormData({...formData, hours: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., 2.5"
                    step="0.5"
                    min="0.5"
                    max="12"
                    required
                    data-testid="hours-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rate/Hour (₹)</label>
                  <input
                    type="number"
                    value={formData.rate_per_hour}
                    onChange={(e) => setFormData({...formData, rate_per_hour: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    min="0"
                    data-testid="rate-input"
                  />
                </div>
              </div>

              {formData.hours && formData.rate_per_hour && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Total Amount: </span>
                    ₹{(parseFloat(formData.hours || 0) * parseFloat(formData.rate_per_hour || 0)).toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                  placeholder="e.g., Project deadline, Urgent maintenance"
                  data-testid="reason-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  data-testid="submit-overtime-btn"
                >
                  {editingRecord ? 'Update' : 'Add'} Overtime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeManagement;
