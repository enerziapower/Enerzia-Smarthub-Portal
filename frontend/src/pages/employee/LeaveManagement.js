import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, CheckCircle, XCircle, AlertCircle,
  Clock, FileText, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState({
    casual: { total: 12, used: 0, balance: 12 },
    sick: { total: 6, used: 0, balance: 6 },
    earned: { total: 15, used: 0, balance: 15 },
    compOff: { total: 2, used: 0, balance: 2 }
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Casual Leave',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const [requestsRes, balanceRes] = await Promise.all([
        employeeHubAPI.getLeaveRequests({ user_id: user?.id }),
        employeeHubAPI.getLeaveBalance(user?.id)
      ]);
      setRequests(requestsRes.data.requests || []);
      if (balanceRes.data.balance) {
        setBalance(balanceRes.data.balance);
      }
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await employeeHubAPI.createLeaveRequest(
        formData,
        user?.id,
        user?.name || 'User',
        user?.department || 'Unknown'
      );
      toast.success('Leave request submitted successfully');
      setShowModal(false);
      setFormData({ type: 'Casual Leave', from_date: new Date().toISOString().split('T')[0], to_date: new Date().toISOString().split('T')[0], reason: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating leave request:', error);
      toast.error('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getTypeBadge = (type) => {
    if (type?.includes('Casual')) return 'bg-blue-100 text-blue-700';
    if (type?.includes('Sick')) return 'bg-red-100 text-red-700';
    if (type?.includes('Earned')) return 'bg-green-100 text-green-700';
    if (type?.includes('Comp')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  };

  const totalBalance = Object.values(balance).reduce((sum, b) => sum + b.balance, 0);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leave-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
          <p className="text-slate-500 mt-1">Apply for leave and track your leave balance</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="apply-leave-btn"
        >
          <Plus size={18} />
          Apply Leave
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-blue-100 text-sm">Casual Leave</p>
          <p className="text-3xl font-bold mt-1">{balance.casual?.balance || 0}</p>
          <p className="text-blue-200 text-xs mt-1">{balance.casual?.used || 0} used of {balance.casual?.total || 12}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <p className="text-red-100 text-sm">Sick Leave</p>
          <p className="text-3xl font-bold mt-1">{balance.sick?.balance || 0}</p>
          <p className="text-red-200 text-xs mt-1">{balance.sick?.used || 0} used of {balance.sick?.total || 6}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-sm">Earned Leave</p>
          <p className="text-3xl font-bold mt-1">{balance.earned?.balance || 0}</p>
          <p className="text-green-200 text-xs mt-1">{balance.earned?.used || 0} used of {balance.earned?.total || 15}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-sm">Comp Off</p>
          <p className="text-3xl font-bold mt-1">{balance.compOff?.balance || 0}</p>
          <p className="text-purple-200 text-xs mt-1">{balance.compOff?.used || 0} used of {balance.compOff?.total || 2}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 text-white">
          <p className="text-slate-300 text-sm">Total Balance</p>
          <p className="text-3xl font-bold mt-1">{totalBalance}</p>
          <p className="text-slate-400 text-xs mt-1">{pendingCount} pending requests</p>
        </div>
      </div>

      {/* Info Box - Leave Flow */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="text-blue-600" size={18} />
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Leave Works</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Submit your leave request with dates and reason</li>
              <li>HR reviews and approves/rejects your request</li>
              <li>Approved leaves are deducted from your balance</li>
              <li>If balance exhausted, excess days marked as Loss of Pay (LOP)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">My Leave Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Calendar className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No leave requests yet</p>
            <p className="text-sm">Click "Apply Leave" to submit a new request</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <div key={request.id} className={`p-4 hover:bg-slate-50 ${request.status === 'pending' ? 'bg-amber-50/30' : ''}`} data-testid={`leave-request-${request.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      request.status === 'approved' ? 'bg-green-100' :
                      request.status === 'rejected' ? 'bg-red-100' :
                      request.type?.includes('Casual') ? 'bg-blue-100' :
                      request.type?.includes('Sick') ? 'bg-red-100' :
                      request.type?.includes('Earned') ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      <Calendar size={24} className={
                        request.status === 'approved' ? 'text-green-600' :
                        request.status === 'rejected' ? 'text-red-600' :
                        request.type?.includes('Casual') ? 'text-blue-600' :
                        request.type?.includes('Sick') ? 'text-red-600' :
                        request.type?.includes('Earned') ? 'text-green-600' : 'text-purple-600'
                      } />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{request.type}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeBadge(request.type)}`}>
                          {request.days} day{request.days > 1 ? 's' : ''}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                        {request.lop_days > 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            {request.lop_days} LOP
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{request.reason}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(request.from_date).toLocaleDateString('en-IN')} - {new Date(request.to_date).toLocaleDateString('en-IN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          Applied: {new Date(request.applied_on).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {request.status === 'approved' && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">Approved</p>
                      {request.approved_by && <p className="text-xs text-slate-500">by {request.approved_by}</p>}
                      {request.lop_days > 0 && (
                        <p className="text-xs text-orange-600 mt-1">{request.lop_days} days as LOP</p>
                      )}
                    </div>
                  )}
                  {request.status === 'pending' && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-amber-600">Pending HR Approval</p>
                    </div>
                  )}
                  {request.status === 'rejected' && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">Rejected</p>
                      {request.rejection_reason && (
                        <p className="text-xs text-slate-500">{request.rejection_reason}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Apply for Leave</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Earned Leave</option>
                  <option>Comp Off</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={formData.from_date}
                    onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    data-testid="leave-from-date-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={formData.to_date}
                    onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    data-testid="leave-to-date-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  placeholder="Reason for leave..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="leave-reason-input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                  data-testid="leave-submit-btn"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Apply Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
