import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, XCircle, AlertCircle, Clock,
  User, FileText, Loader2, Filter, Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const LeaveApprovals = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await employeeHubAPI.getLeaveRequests(params);
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setProcessingId(requestId);
      await employeeHubAPI.approveLeaveRequest(requestId, user?.name || 'HR Admin');
      toast.success('Leave request approved');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingId(requestId);
      await employeeHubAPI.rejectLeaveRequest(requestId, user?.name || 'HR Admin');
      toast.success('Leave request rejected');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
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

  const filteredRequests = requests.filter(req => 
    req.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leave-approvals">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Approvals</h1>
          <p className="text-slate-500 mt-1">Review and approve employee leave requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-xl font-bold text-slate-800">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-xl font-bold text-slate-800">{approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="text-xl font-bold text-slate-800">{rejectedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Requests</p>
              <p className="text-xl font-bold text-slate-800">{requests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name, department, or leave type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="search-leave-requests"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No leave requests found</p>
            <p className="text-sm text-slate-400">Requests will appear here when employees apply for leave</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-slate-100 rounded-full">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{req.user_name}</p>
                        <p className="text-sm text-slate-500">{req.department}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeBadge(req.type)}`}>
                        {req.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(req.status)}`}>
                        {req.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-11 space-y-1">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Duration:</span> {req.from_date} to {req.to_date} ({req.days} day{req.days > 1 ? 's' : ''})
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Reason:</span> {req.reason}
                      </p>
                      <p className="text-xs text-slate-400">
                        Applied on: {new Date(req.applied_on).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={processingId === req.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        data-testid={`approve-leave-${req.id}`}
                      >
                        {processingId === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={processingId === req.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        data-testid={`reject-leave-${req.id}`}
                      >
                        {processingId === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveApprovals;
