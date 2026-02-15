import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, RefreshCw, Loader2, Eye, Check, X,
  Clock, CheckCircle2, DollarSign, AlertCircle, TrendingUp
} from 'lucide-react';
import { paymentRequestsAPI } from '../../services/api';

const PR_STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Finance Reviewed': 'bg-blue-100 text-blue-700 border-blue-200',
  'CEO Approved': 'bg-green-100 text-green-700 border-green-200',
  'Paid': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-red-100 text-red-700 border-red-200',
};

const CEOApprovals = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, all
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsRes, statsRes] = await Promise.all([
        paymentRequestsAPI.getAll(),
        paymentRequestsAPI.getStats()
      ]);
      setRequests(requestsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on tab
  const getFilteredRequests = () => {
    let filtered = requests;
    
    if (activeTab === 'pending') {
      filtered = requests.filter(r => r.status === 'Finance Reviewed');
    } else if (activeTab === 'approved') {
      filtered = requests.filter(r => r.status === 'CEO Approved' || r.status === 'Paid');
    }
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.pr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employee_vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredRequests = getFilteredRequests();
  const pendingForApproval = requests.filter(r => r.status === 'Finance Reviewed');
  const totalPendingAmount = pendingForApproval.reduce((sum, r) => sum + (r.amount || 0), 0);

  const handleCEOApprove = async (requestId, action, remarks) => {
    try {
      await paymentRequestsAPI.ceoApprove(requestId, { action, remarks });
      await loadData();
      setShowApproveModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to process approval');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ceo-approvals-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Approvals</h1>
          <p className="text-slate-600 mt-1">Review and approve payment requests forwarded by Finance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Pending Approval</p>
              <p className="text-3xl font-bold mt-1">{pendingForApproval.length}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Clock size={24} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">Pending Amount</p>
              <p className="text-2xl font-bold mt-1">₹{totalPendingAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <DollarSign size={24} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">CEO Approved</p>
              <p className="text-3xl font-bold mt-1">{stats.ceo_approved?.count || 0}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Total Paid</p>
              <p className="text-3xl font-bold mt-1">{stats.paid?.count || 0}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock size={18} />
            Pending Approval ({pendingForApproval.length})
            {pendingForApproval.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingForApproval.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'approved'
                ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 size={18} />
            Approved
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-100 text-slate-700 border-b-2 border-slate-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard size={18} />
            All Requests
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PR No, PID, vendor, purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Requests List */}
        <div className="divide-y divide-slate-200">
          {filteredRequests.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-500">
              <CreditCard size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">
                {activeTab === 'pending' ? 'No pending approvals' : 'No requests found'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div 
                key={req.id} 
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  req.status === 'Finance Reviewed' ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <CreditCard size={24} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">{req.pr_no}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${PR_STATUS_COLORS[req.status]}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{req.purpose}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>{req.pid_no || 'No PID'}</span>
                        <span>•</span>
                        <span>{req.employee_vendor_name}</span>
                        <span>•</span>
                        <span>{req.requested_by_department}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">₹{req.amount?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{req.request_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedRequest(req); setShowViewModal(true); }}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {req.status === 'Finance Reviewed' && (
                        <button
                          onClick={() => { setSelectedRequest(req); setShowApproveModal(true); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          <Check size={16} />
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Finance Remarks */}
                {req.finance_remarks && (
                  <div className="mt-3 ml-16 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Finance Remarks:</p>
                    <p className="text-sm text-blue-800">{req.finance_remarks}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedRequest && (
        <ViewPRModal
          request={selectedRequest}
          onClose={() => { setShowViewModal(false); setSelectedRequest(null); }}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <ApprovePRModal
          request={selectedRequest}
          onClose={() => { setShowApproveModal(false); setSelectedRequest(null); }}
          onApprove={handleCEOApprove}
        />
      )}
    </div>
  );
};

// View PR Modal
const ViewPRModal = ({ request, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Payment Request Details</h2>
            <p className="text-sm text-blue-600 font-bold mt-1">{request.pr_no}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Amount</p>
              <p className="text-2xl font-bold text-slate-900">₹{request.amount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <span className={`text-xs px-2 py-1 rounded-full border ${PR_STATUS_COLORS[request.status]}`}>
                {request.status}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500">PID / Project</p>
            <p className="text-sm text-slate-700">{request.pid_no || '-'}</p>
            {request.project_name && <p className="text-xs text-slate-500">{request.project_name}</p>}
          </div>

          <div>
            <p className="text-xs text-slate-500">Employee/Vendor</p>
            <p className="text-sm text-slate-700">{request.employee_vendor_name}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Purpose</p>
            <p className="text-sm text-slate-700">{request.purpose}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="text-sm text-slate-700">{request.category}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Request Date</p>
              <p className="text-sm text-slate-700">{request.request_date}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500">Requested By</p>
            <p className="text-sm text-slate-700">{request.requested_by} ({request.requested_by_department})</p>
          </div>

          {request.finance_reviewed_by && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">Finance Review</p>
              <p className="text-sm text-blue-800">Reviewed by: {request.finance_reviewed_by}</p>
              {request.finance_remarks && <p className="text-sm text-blue-700 mt-1">{request.finance_remarks}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Approve PR Modal (CEO)
const ApprovePRModal = ({ request, onClose, onApprove }) => {
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action) => {
    setProcessing(true);
    await onApprove(request.id, action, remarks);
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600">
          <div>
            <h2 className="text-xl font-semibold text-white">Approve Payment</h2>
            <p className="text-sm text-green-100 font-medium mt-1">{request.pr_no}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Amount</span>
              <span className="text-2xl font-bold text-slate-900">₹{request.amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-600">Purpose</span>
              <span className="text-sm text-slate-700 text-right max-w-[60%]">{request.purpose}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-600">To</span>
              <span className="text-sm text-slate-700">{request.employee_vendor_name}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-600">PID</span>
              <span className="text-sm text-slate-700">{request.pid_no || '-'}</span>
            </div>
          </div>

          {request.finance_remarks && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">Finance Remarks</p>
              <p className="text-sm text-blue-800">{request.finance_remarks}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CEO Remarks (Optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks or instructions..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl">
          <button
            onClick={() => handleAction('reject')}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            <X size={16} />
            Reject
          </button>
          <button
            onClick={() => handleAction('approve')}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Approve Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default CEOApprovals;
