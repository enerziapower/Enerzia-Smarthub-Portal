import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, Search, Check, X, Clock, AlertCircle, 
  RefreshCw, Calendar, User, Building, ChevronDown, ChevronRight,
  Wallet, TrendingUp, FileText, CreditCard
} from 'lucide-react';
import api from '../../services/api';

const AdvancesLoans = () => {
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    emp_id: '',
    amount: '',
    reason: '',
    repayment_months: 1
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-slate-100 text-slate-700'
  };

  useEffect(() => {
    fetchAdvances();
    fetchEmployees();
  }, [filterStatus]);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      let url = '/api/hr/advances';
      if (filterStatus) url += `?status=${filterStatus}`;
      const response = await api.get(url);
      setAdvances(response.data || []);
    } catch (err) {
      console.error('Error fetching advances:', err);
      setError('Failed to load advances');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/hr/employees?status=active');
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.emp_id || !formData.amount || !formData.reason) {
      setError('Please fill all required fields');
      return;
    }

    try {
      await api.post(`/api/hr/advances?emp_id=${formData.emp_id}`, {
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        repayment_months: parseInt(formData.repayment_months)
      });
      setSuccess('Advance request created successfully');
      setShowModal(false);
      setFormData({ emp_id: '', amount: '', reason: '', repayment_months: 1 });
      fetchAdvances();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create advance request');
    }
  };

  const handleApprove = async (advanceId) => {
    try {
      await api.put(`/api/hr/advances/${advanceId}/approve?approved_by=Admin`);
      setSuccess('Advance approved successfully');
      fetchAdvances();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve advance');
    }
  };

  const handleReject = async (advanceId) => {
    if (!window.confirm('Are you sure you want to reject this advance request?')) return;
    
    try {
      await api.put(`/api/hr/advances/${advanceId}/reject?rejected_by=Admin`);
      setSuccess('Advance rejected');
      fetchAdvances();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject advance');
    }
  };

  const filteredAdvances = advances.filter(adv =>
    adv.emp_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adv.emp_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats calculation
  const totalPending = advances.filter(a => a.status === 'pending').length;
  const totalActive = advances.filter(a => a.status === 'active').length;
  const totalAmount = advances.filter(a => a.status === 'active').reduce((sum, a) => sum + (a.remaining_amount || 0), 0);
  const totalDisbursed = advances.filter(a => ['active', 'completed'].includes(a.status)).reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Advances & Loans</h1>
          <p className="text-slate-500 mt-1">Manage employee advance requests and loan repayments</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          data-testid="create-advance-btn"
        >
          <Plus className="w-4 h-4" /> New Advance Request
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
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalPending}</p>
              <p className="text-sm text-slate-500">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalActive}</p>
              <p className="text-sm text-slate-500">Active Loans</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">₹{totalAmount.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Outstanding Balance</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">₹{totalDisbursed.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Total Disbursed</p>
            </div>
          </div>
        </div>
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg"
          data-testid="status-filter"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={fetchAdvances} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Advances Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">EMI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : filteredAdvances.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No advances found</td></tr>
              ) : (
                filteredAdvances.map((advance) => (
                  <tr key={advance.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{advance.emp_name}</p>
                        <p className="text-xs text-slate-500">{advance.emp_id} • {advance.department}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">₹{advance.amount?.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">
                          Remaining: ₹{advance.remaining_amount?.toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600 max-w-[200px] truncate" title={advance.reason}>
                        {advance.reason}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-900">₹{advance.emi_amount?.toLocaleString()}/month</p>
                        <p className="text-xs text-slate-500">{advance.repayment_months} months</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{advance.paid_emis || 0}/{advance.repayment_months}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${((advance.paid_emis || 0) / advance.repayment_months) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[advance.status] || 'bg-slate-100 text-slate-700'}`}>
                        {advance.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {advance.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApprove(advance.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                              data-testid={`approve-${advance.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleReject(advance.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Reject"
                              data-testid={`reject-${advance.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {advance.status === 'active' && (
                          <span className="text-xs text-green-600 font-medium">Active Loan</span>
                        )}
                        {advance.status === 'completed' && (
                          <span className="text-xs text-slate-500">Fully Paid</span>
                        )}
                        {advance.status === 'rejected' && (
                          <span className="text-xs text-red-500">Rejected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Advance Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">New Advance Request</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Enter amount"
                  min="100"
                  required
                  data-testid="amount-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Repayment Period (Months)</label>
                <select
                  value={formData.repayment_months}
                  onChange={(e) => setFormData({...formData, repayment_months: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  data-testid="months-select"
                >
                  {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map(m => (
                    <option key={m} value={m}>{m} {m === 1 ? 'month' : 'months'}</option>
                  ))}
                </select>
                {formData.amount && formData.repayment_months && (
                  <p className="mt-1 text-sm text-slate-500">
                    EMI: ₹{Math.round(parseFloat(formData.amount || 0) / parseInt(formData.repayment_months || 1)).toLocaleString()}/month
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={3}
                  placeholder="Enter reason for advance"
                  required
                  data-testid="reason-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  data-testid="submit-advance-btn"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancesLoans;
