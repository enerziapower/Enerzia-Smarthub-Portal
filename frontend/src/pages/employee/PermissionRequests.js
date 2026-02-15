import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, CheckCircle, XCircle, AlertCircle,
  Calendar, User, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const PermissionRequests = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Late Coming',
    time: '',
    duration: '',
    reason: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await employeeHubAPI.getPermissionRequests({ user_id: user?.id });
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching permission requests:', error);
      toast.error('Failed to load permission requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await employeeHubAPI.createPermissionRequest(
        formData,
        user?.id,
        user?.name || 'User',
        user?.department || 'Unknown'
      );
      toast.success('Permission request submitted successfully');
      setShowModal(false);
      setFormData({ date: new Date().toISOString().split('T')[0], type: 'Late Coming', time: '', duration: '', reason: '' });
      fetchRequests();
    } catch (error) {
      console.error('Error creating permission request:', error);
      toast.error('Failed to submit permission request');
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
    switch (type) {
      case 'Late Coming': return 'bg-blue-100 text-blue-700';
      case 'Early Leaving': return 'bg-purple-100 text-purple-700';
      case 'Short Leave': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="permission-requests">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Permission Requests</h1>
          <p className="text-slate-500 mt-1">Request permission for late coming, early leaving or short leave</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="request-permission-btn"
        >
          <Plus size={18} />
          Request Permission
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Requests</p>
              <p className="text-2xl font-bold text-slate-800">{requests.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-amber-600">Pending</p>
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-green-600">Approved</p>
              <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-purple-600">This Month</p>
              <p className="text-2xl font-bold text-purple-700">{requests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">My Permission Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Clock className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No permission requests yet</p>
            <p className="text-sm">Click "Request Permission" to submit a new request</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50" data-testid={`permission-request-${request.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Clock className="text-slate-600" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{request.type}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeBadge(request.type)}`}>
                          {request.duration}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{request.reason}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(request.date).toLocaleDateString('en-IN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {request.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  {request.status === 'approved' && request.approved_by && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Approved by</p>
                      <p className="text-sm text-slate-600">{request.approved_by}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Request Permission</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="permission-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Permission Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Late Coming</option>
                  <option>Early Leaving</option>
                  <option>Short Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    data-testid="permission-time-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select duration</option>
                    <option value="30 min">30 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="2 hours">2 hours</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  placeholder="Reason for permission..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="permission-reason-input"
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
                  data-testid="permission-submit-btn"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionRequests;
