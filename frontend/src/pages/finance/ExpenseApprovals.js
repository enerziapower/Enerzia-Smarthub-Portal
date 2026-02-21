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
      const res = await api.get('/users');
      setEmployees(res.data.users || []);
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

      {/* Info Box */}
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
    </div>
  );
};

export default ExpenseApprovals;
