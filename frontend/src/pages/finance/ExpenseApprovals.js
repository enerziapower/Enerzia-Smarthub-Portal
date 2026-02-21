import React, { useState, useEffect } from 'react';
import { 
  Receipt, CheckCircle, XCircle, Clock, IndianRupee, Eye,
  User, FileText, Loader2, Search, FileSpreadsheet, ChevronDown,
  ChevronRight, Calendar, Building2, CreditCard, X, Check,
  AlertCircle, DollarSign, Wallet, Plus, Users, ArrowDownCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ExpenseApprovals = () => {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('expenses'); // expenses, advances
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [expandedSheet, setExpandedSheet] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    payment_mode: 'Bank Transfer',
    payment_reference: '',
    paid_amount: 0
  });
  
  // Advance management state
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [advanceStats, setAdvanceStats] = useState({});
  const [advanceFilter, setAdvanceFilter] = useState('pending');
  const [advanceBalances, setAdvanceBalances] = useState([]);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [showDirectAdvanceModal, setShowDirectAdvanceModal] = useState(false);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    paid_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer',
    payment_reference: '',
    remarks: ''
  });
  const [directAdvanceForm, setDirectAdvanceForm] = useState({
    user_id: '',
    user_name: '',
    emp_id: '',
    department: '',
    amount: '',
    purpose: '',
    project_name: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    payment_reference: '',
    remarks: ''
  });
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (mainTab === 'expenses') {
      fetchSheets();
    } else {
      fetchAdvanceRequests();
      fetchAdvanceBalances();
      fetchEmployees();
    }
  }, [mainTab, filter, advanceFilter]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/finance/employees');
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchSheets = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/employee/expense-sheets${params}`);
      setSheets(res.data.sheets || []);
    } catch (error) {
      console.error('Error fetching expense sheets:', error);
      toast.error('Failed to load expense sheets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvanceRequests = async () => {
    try {
      setLoading(true);
      const params = advanceFilter !== 'all' ? `?status=${advanceFilter}` : '';
      const res = await api.get(`/finance/advance-requests${params}`);
      setAdvanceRequests(res.data.requests || []);
      setAdvanceStats(res.data.stats || {});
    } catch (error) {
      console.error('Error fetching advance requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvanceBalances = async () => {
    try {
      const res = await api.get('/finance/advances/balances');
      setAdvanceBalances(res.data.balances || []);
    } catch (error) {
      console.error('Error fetching advance balances:', error);
    }
  };

  const handleApproveAdvance = async (requestId) => {
    try {
      setProcessingId(requestId);
      await api.put(`/finance/advance-requests/${requestId}/approve?approved_by=${encodeURIComponent(user?.name || 'Finance')}`);
      toast.success('Advance request approved. Please record payment details.');
      fetchAdvanceRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectAdvance = async (requestId, reason) => {
    try {
      setProcessingId(requestId);
      await api.put(`/finance/advance-requests/${requestId}/reject?rejected_by=${encodeURIComponent(user?.name || 'Finance')}&reason=${encodeURIComponent(reason || 'Request rejected')}`);
      toast.success('Advance request rejected');
      fetchAdvanceRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayAdvance = async () => {
    if (!selectedAdvance) return;
    try {
      setProcessingId(selectedAdvance.id);
      await api.put(
        `/finance/advance-requests/${selectedAdvance.id}/pay?paid_by=${encodeURIComponent(user?.name || 'Finance')}`,
        advancePaymentForm
      );
      toast.success('Advance payment recorded');
      setShowAdvancePaymentModal(false);
      setSelectedAdvance(null);
      fetchAdvanceRequests();
      fetchAdvanceBalances();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDirectAdvancePayment = async (e) => {
    e.preventDefault();
    try {
      setProcessingId('direct');
      await api.post(
        `/finance/advances/direct?paid_by=${encodeURIComponent(user?.name || 'Finance')}`,
        directAdvanceForm
      );
      toast.success('Direct advance payment recorded');
      setShowDirectAdvanceModal(false);
      setDirectAdvanceForm({
        user_id: '', user_name: '', emp_id: '', department: '',
        amount: '', purpose: '', project_name: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'Cash', payment_reference: '', remarks: ''
      });
      fetchAdvanceRequests();
      fetchAdvanceBalances();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setProcessingId(null);
    }
  };

  const openAdvancePaymentModal = (advance) => {
    setSelectedAdvance(advance);
    setAdvancePaymentForm({
      paid_amount: advance.amount || 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'Bank Transfer',
      payment_reference: '',
      remarks: ''
    });
    setShowAdvancePaymentModal(true);
  };

  const handleEmployeeSelect = (e) => {
    const emp = employees.find(em => em.id === e.target.value);
    if (emp) {
      setDirectAdvanceForm({
        ...directAdvanceForm,
        user_id: emp.id,
        user_name: emp.name || emp.email,
        emp_id: emp.emp_id || emp.id,
        department: emp.department || ''
      });
    }
  };

  const handleVerify = async (sheetId) => {
    try {
      setProcessingId(sheetId);
      await api.put(`/finance/expense-sheets/${sheetId}/verify?verified_by=${encodeURIComponent(user?.name || 'Finance')}`);
      toast.success('Expense sheet verified');
      fetchSheets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async () => {
    if (!selectedSheet) return;
    try {
      setProcessingId(selectedSheet.id);
      await api.put(`/finance/expense-sheets/${selectedSheet.id}/approve?approved_by=${encodeURIComponent(user?.name || 'Finance')}`);
      toast.success('Expense sheet approved');
      setShowApprovalModal(false);
      setSelectedSheet(null);
      fetchSheets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedSheet) return;
    try {
      setProcessingId(selectedSheet.id);
      await api.put(`/finance/expense-sheets/${selectedSheet.id}/reject?rejected_by=${encodeURIComponent(user?.name || 'Finance')}&reason=${encodeURIComponent(rejectionReason)}`);
      toast.success('Expense sheet rejected');
      setShowApprovalModal(false);
      setSelectedSheet(null);
      setRejectionReason('');
      fetchSheets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedSheet) return;
    try {
      setProcessingId(selectedSheet.id);
      await api.put(`/finance/expense-sheets/${selectedSheet.id}/pay`, {
        ...paymentDetails,
        paid_by: user?.name || 'Finance'
      });
      toast.success('Payment recorded');
      setShowApprovalModal(false);
      setSelectedSheet(null);
      fetchSheets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setProcessingId(null);
    }
  };

  const openApprovalModal = (sheet, action) => {
    setSelectedSheet(sheet);
    setApprovalAction(action);
    setPaymentDetails({
      payment_mode: 'Bank Transfer',
      payment_reference: '',
      paid_amount: sheet.net_claim_amount || 0
    });
    setShowApprovalModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: FileText },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
      verified: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Eye },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: DollarSign }
    };
    return badges[status] || badges.pending;
  };

  const filteredSheets = sheets.filter(sheet => 
    sheet.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.sheet_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.month_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const pendingCount = sheets.filter(s => s.status === 'pending').length;
  const pendingAmount = sheets.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.net_claim_amount || 0), 0);
  const verifiedCount = sheets.filter(s => s.status === 'verified').length;
  const verifiedAmount = sheets.filter(s => s.status === 'verified').reduce((sum, s) => sum + (s.net_claim_amount || 0), 0);
  const approvedCount = sheets.filter(s => s.status === 'approved').length;
  const approvedAmount = sheets.filter(s => s.status === 'approved').reduce((sum, s) => sum + (s.net_claim_amount || 0), 0);
  const paidCount = sheets.filter(s => s.status === 'paid').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="expense-approvals">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finance Management</h1>
          <p className="text-slate-500 mt-1">Manage expense sheets and employee advances</p>
        </div>
        {mainTab === 'advances' && (
          <button
            onClick={() => setShowDirectAdvanceModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            data-testid="direct-advance-btn"
          >
            <Plus className="w-4 h-4" />
            Record Direct Advance
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          <button
            onClick={() => setMainTab('expenses')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              mainTab === 'expenses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Expense Sheets
          </button>
          <button
            onClick={() => setMainTab('advances')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              mainTab === 'advances'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Advance Management
            {advanceStats.pending_count > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {advanceStats.pending_count}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Expense Sheets Tab Content */}
      {mainTab === 'expenses' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${filter === 'pending' ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`} onClick={() => setFilter('pending')}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Review</p>
              <p className="text-xl font-bold text-slate-800">{pendingCount}</p>
              <p className="text-sm text-amber-600">₹{pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${filter === 'verified' ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`} onClick={() => setFilter('verified')}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Verified</p>
              <p className="text-xl font-bold text-slate-800">{verifiedCount}</p>
              <p className="text-sm text-blue-600">₹{verifiedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${filter === 'approved' ? 'border-green-400 bg-green-50' : 'border-slate-200'}`} onClick={() => setFilter('approved')}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved (Unpaid)</p>
              <p className="text-xl font-bold text-slate-800">{approvedCount}</p>
              <p className="text-sm text-green-600">₹{approvedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${filter === 'paid' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`} onClick={() => setFilter('paid')}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-xl font-bold text-slate-800">{paidCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee, department, sheet no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Expense Sheets List */}
      <div className="space-y-4">
        {filteredSheets.length > 0 ? (
          filteredSheets.map(sheet => (
            <div key={sheet.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Sheet Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-800">{sheet.user_name}</h3>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{sheet.department}</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {sheet.sheet_no} • {sheet.month_name} {sheet.year} • {sheet.item_count} items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Net Claim</p>
                    <p className={`font-bold text-lg ${sheet.net_claim_amount >= 0 ? 'text-blue-600' : 'text-green-600'}`}>
                      ₹{(sheet.net_claim_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  {(() => {
                    const badge = getStatusBadge(sheet.status);
                    return (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                        <badge.icon className="w-4 h-4" />
                        {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
                      </span>
                    );
                  })()}
                  {expandedSheet === sheet.id ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSheet === sheet.id && (
                <div className="border-t border-slate-200">
                  {/* Summary */}
                  <div className="p-4 bg-slate-50 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Total Expenses</p>
                      <p className="font-semibold text-slate-800">₹{(sheet.total_amount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Advance Received</p>
                      <p className="font-semibold text-green-600">₹{(sheet.advance_received || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Previous Due</p>
                      <p className="font-semibold text-amber-600">₹{(sheet.previous_due || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Submitted</p>
                      <p className="font-semibold text-slate-800">
                        {sheet.submitted_at ? new Date(sheet.submitted_at).toLocaleDateString('en-IN') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Employee ID</p>
                      <p className="font-semibold text-slate-800">{sheet.emp_id || '-'}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  {sheet.items && sheet.items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">S.No</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Project</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Bill Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Place</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Mode</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Amount</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sheet.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-600">{idx + 1}</td>
                              <td className="px-3 py-2 text-slate-800">
                                {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-800">{item.project_name || '-'}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">{item.bill_type}</span>
                              </td>
                              <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={item.description}>
                                {item.description || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{item.place || '-'}</td>
                              <td className="px-3 py-2 text-slate-600">{item.mode || '-'}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-800">₹{(item.amount || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-center">
                                {item.receipt_url ? (
                                  <a
                                    href={item.receipt_url.startsWith('http') ? item.receipt_url : `${API_URL}${item.receipt_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                    title="View Receipt"
                                  >
                                    <Eye className="w-4 h-4 inline" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                          <tr>
                            <td colSpan={7} className="px-3 py-2 text-right font-semibold text-slate-700">Total:</td>
                            <td className="px-3 py-2 text-right font-bold text-blue-600 text-lg">₹{(sheet.total_amount || 0).toLocaleString()}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    {sheet.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleVerify(sheet.id)}
                          disabled={processingId === sheet.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {processingId === sheet.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                          Verify
                        </button>
                        <button
                          onClick={() => openApprovalModal(sheet, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                    {sheet.status === 'verified' && (
                      <>
                        <button
                          onClick={() => openApprovalModal(sheet, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => openApprovalModal(sheet, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                    {sheet.status === 'approved' && (
                      <button
                        onClick={() => openApprovalModal(sheet, 'pay')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" /> Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No expense sheets found</p>
            <p className="text-sm text-slate-400 mt-1">
              {filter !== 'all' ? `No ${filter} expense sheets at the moment` : 'Expense sheets will appear here when employees submit them'}
            </p>
          </div>
        )}
      </div>

      {/* Approval/Rejection Modal */}
      {showApprovalModal && selectedSheet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {approvalAction === 'approve' && 'Approve Expense Sheet'}
                {approvalAction === 'reject' && 'Reject Expense Sheet'}
                {approvalAction === 'pay' && 'Record Payment'}
              </h3>
              <button onClick={() => setShowApprovalModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Sheet Info */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-600"><strong>Employee:</strong> {selectedSheet.user_name}</p>
                <p className="text-sm text-slate-600"><strong>Sheet:</strong> {selectedSheet.sheet_no}</p>
                <p className="text-sm text-slate-600"><strong>Period:</strong> {selectedSheet.month_name} {selectedSheet.year}</p>
                <p className="text-sm text-slate-600"><strong>Net Claim:</strong> ₹{(selectedSheet.net_claim_amount || 0).toLocaleString()}</p>
              </div>

              {approvalAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Rejection *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    rows={3}
                    placeholder="Please provide a reason for rejection"
                    required
                  />
                </div>
              )}

              {approvalAction === 'pay' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={paymentDetails.payment_mode}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, payment_mode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Reference/Transaction ID</label>
                    <input
                      type="text"
                      value={paymentDetails.payment_reference}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, payment_reference: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="e.g., TXN123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={paymentDetails.paid_amount}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, paid_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </>
              )}

              {approvalAction === 'approve' && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="text-green-700 text-sm">
                    Approving this expense sheet will authorize the payment of <strong>₹{(selectedSheet.net_claim_amount || 0).toLocaleString()}</strong> to {selectedSheet.user_name}.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              {approvalAction === 'approve' && (
                <button
                  onClick={handleApprove}
                  disabled={processingId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
              )}
              {approvalAction === 'reject' && (
                <button
                  onClick={handleReject}
                  disabled={processingId || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
              )}
              {approvalAction === 'pay' && (
                <button
                  onClick={handleMarkPaid}
                  disabled={processingId}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box - Expenses */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-2">📋 Expense Approval Workflow</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li><strong>Pending:</strong> Employee submitted, waiting for verification</li>
            <li><strong>Verify:</strong> Check receipts, advance balance, and accuracy</li>
            <li><strong>Approve:</strong> Authorize payment after verification</li>
            <li><strong>Pay:</strong> Record payment details when disbursed</li>
          </ul>
        </div>
      </div>
        </>
      )}

      {/* Advance Management Tab Content */}
      {mainTab === 'advances' && (
        <>
          {/* Advance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${advanceFilter === 'pending' ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`} onClick={() => setAdvanceFilter('pending')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending Requests</p>
                  <p className="text-xl font-bold text-slate-800">{advanceStats.pending_count || 0}</p>
                  <p className="text-sm text-amber-600">₹{(advanceStats.pending_amount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${advanceFilter === 'approved' ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`} onClick={() => setAdvanceFilter('approved')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Approved (Unpaid)</p>
                  <p className="text-xl font-bold text-slate-800">{advanceStats.approved_count || 0}</p>
                  <p className="text-sm text-blue-600">₹{(advanceStats.approved_amount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${advanceFilter === 'paid' ? 'border-green-400 bg-green-50' : 'border-slate-200'}`} onClick={() => setAdvanceFilter('paid')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Paid</p>
                  <p className="text-xl font-bold text-slate-800">{advanceStats.paid_count || 0}</p>
                  <p className="text-sm text-green-600">₹{(advanceStats.paid_amount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${advanceFilter === 'all' ? 'border-purple-400 bg-purple-50' : 'border-slate-200'}`} onClick={() => setAdvanceFilter('all')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">All Requests</p>
                  <p className="text-xl font-bold text-slate-800">{advanceRequests.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Advance Requests List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Advance Requests</h3>
            </div>
            
            {advanceRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Wallet className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No advance requests found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {advanceRequests.map((request) => (
                  <div key={request.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{request.user_name}</p>
                          <p className="text-sm text-slate-500">{request.department} • {request.emp_id}</p>
                          <p className="text-sm text-slate-600 mt-1">{request.purpose}</p>
                          {request.project_name && (
                            <p className="text-xs text-slate-500">Project: {request.project_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-800">₹{(request.amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(request.requested_at).toLocaleDateString('en-IN')}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          request.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          request.status === 'paid' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 mt-3">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveAdvance(request.id)}
                            disabled={processingId === request.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectAdvance(request.id, 'Request not approved')}
                            disabled={processingId === request.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <button
                          onClick={() => openAdvancePaymentModal(request)}
                          disabled={processingId === request.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <DollarSign className="w-4 h-4" />
                          Record Payment
                        </button>
                      )}
                      {request.status === 'paid' && (
                        <div className="text-sm text-slate-500">
                          Paid on {request.payment_date ? new Date(request.payment_date).toLocaleDateString('en-IN') : '-'} 
                          {request.payment_reference && ` • Ref: ${request.payment_reference}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employee Advance Balances */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Employee Advance Balances</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                {advanceBalances.filter(b => b.running_balance > 0).length} employees with outstanding advances
              </div>
            </div>
            
            {advanceBalances.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>No advance balances found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Advances</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Used</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Running Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Last Advance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advanceBalances.map((balance) => (
                      <tr key={balance.user_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{balance.user_name}</p>
                          <p className="text-sm text-slate-500">{balance.department}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          ₹{(balance.total_advances || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">
                          ₹{(balance.total_used || 0).toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${balance.running_balance > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                          ₹{(balance.running_balance || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-500">
                          {balance.last_advance_date ? new Date(balance.last_advance_date).toLocaleDateString('en-IN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Box - Advances */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-800">
              <p className="font-medium mb-2">💰 Advance Management Workflow</p>
              <ul className="list-disc list-inside space-y-1 text-purple-700">
                <li><strong>Request:</strong> Employee requests advance from their Expense Claims page</li>
                <li><strong>Approve:</strong> Finance reviews and approves valid requests</li>
                <li><strong>Pay:</strong> Record payment details (mode, reference, date)</li>
                <li><strong>Track:</strong> Balance auto-updates when expenses are settled</li>
                <li><strong>Direct Payment:</strong> Use "Record Direct Advance" for walk-in/urgent cases</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Advance Payment Modal */}
      {showAdvancePaymentModal && selectedAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Record Advance Payment</h3>
              <button onClick={() => setShowAdvancePaymentModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800">
                  <strong>{selectedAdvance.user_name}</strong> • {selectedAdvance.department}
                </p>
                <p className="text-sm text-purple-700 mt-1">{selectedAdvance.purpose}</p>
                <p className="text-lg font-bold text-purple-800 mt-2">
                  Requested: ₹{(selectedAdvance.amount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  value={advancePaymentForm.paid_amount}
                  onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, paid_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={advancePaymentForm.payment_date}
                  onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode *</label>
                <select
                  value={advancePaymentForm.payment_mode}
                  onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, payment_mode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference/Transaction ID</label>
                <input
                  type="text"
                  value={advancePaymentForm.payment_reference}
                  onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, payment_reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g., TXN123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={advancePaymentForm.remarks}
                  onChange={(e) => setAdvancePaymentForm({ ...advancePaymentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowAdvancePaymentModal(false)}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayAdvance}
                disabled={processingId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Advance Payment Modal */}
      {showDirectAdvanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Record Direct Advance Payment</h3>
              <button onClick={() => setShowDirectAdvanceModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDirectAdvancePayment} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Direct Advance:</strong> Use this for urgent/walk-in cases where employee needs advance immediately without prior request.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={directAdvanceForm.user_id}
                  onChange={handleEmployeeSelect}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || emp.email} ({emp.department || 'No Dept'})
                    </option>
                  ))}
                </select>
              </div>

              {directAdvanceForm.user_id && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-slate-500">Employee:</span> {directAdvanceForm.user_name}
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-slate-500">Department:</span> {directAdvanceForm.department || 'N/A'}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={directAdvanceForm.amount}
                    onChange={(e) => setDirectAdvanceForm({ ...directAdvanceForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="Enter amount"
                    min="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={directAdvanceForm.payment_date}
                    onChange={(e) => setDirectAdvanceForm({ ...directAdvanceForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose *</label>
                <input
                  type="text"
                  value={directAdvanceForm.purpose}
                  onChange={(e) => setDirectAdvanceForm({ ...directAdvanceForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g., Site visit expenses, Material purchase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={directAdvanceForm.project_name}
                  onChange={(e) => setDirectAdvanceForm({ ...directAdvanceForm, project_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g., Indospace Polivakkam"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode *</label>
                  <select
                    value={directAdvanceForm.payment_mode}
                    onChange={(e) => setDirectAdvanceForm({ ...directAdvanceForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reference/TXN ID</label>
                  <input
                    type="text"
                    value={directAdvanceForm.payment_reference}
                    onChange={(e) => setDirectAdvanceForm({ ...directAdvanceForm, payment_reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., TXN123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={directAdvanceForm.remarks}
                  onChange={(e) => setDirectAdvanceForm({ ...directAdvanceForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                  placeholder="Any additional notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDirectAdvanceModal(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === 'direct' || !directAdvanceForm.user_id}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {processingId === 'direct' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseApprovals;
