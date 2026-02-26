import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, CheckCircle, XCircle, AlertCircle,
  Calendar, User, FileText, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const OvertimeRequests = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    reason: '',
    project: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await employeeHubAPI.getOvertimeRequests({ user_id: user?.id });
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
      toast.error('Failed to load overtime requests');
    } finally {
      setLoading(false);
    }
  };

  const totalApprovedHours = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.hours || 0), 0);
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await employeeHubAPI.createOvertimeRequest(
        { ...formData, hours: parseFloat(formData.hours) },
        user?.id,
        user?.name || 'User',
        user?.department || 'Unknown'
      );
      toast.success('Overtime request submitted successfully');
      setShowModal(false);
      setFormData({ date: new Date().toISOString().split('T')[0], hours: '', reason: '', project: '' });
      fetchRequests();
    } catch (error) {
      console.error('Error creating overtime request:', error);
      toast.error('Failed to submit overtime request');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="overtime-requests">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Overtime Requests</h1>
          <p className="text-slate-500 mt-1">Submit and track your overtime hours</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="request-ot-btn"
        >
          <Plus size={18} />
          Request OT
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
        <div className="bg-green-50 rounded-xl border border-green-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-green-600">Approved Hours</p>
              <p className="text-2xl font-bold text-green-700">{totalApprovedHours}h</p>
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
              <p className="text-2xl font-bold text-amber-700">{pendingRequests}</p>
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
              <p className="text-2xl font-bold text-purple-700">{totalApprovedHours}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box - Payroll Connection */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="text-blue-600" size={18} />
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Overtime Works</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Submit your OT request with date, hours, and reason</li>
              <li>HR reviews and approves/rejects your request</li>
              <li>Approved OT is automatically added to your monthly salary</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">My OT Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Clock className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No overtime requests yet</p>
            <p className="text-sm">Click "Request OT" to submit your first request</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50" data-testid={`ot-request-${request.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      request.status === 'approved' ? 'bg-green-100' : 
                      request.status === 'rejected' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <Clock className={`${
                        request.status === 'approved' ? 'text-green-600' :
                        request.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                      }`} size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{request.hours} Hours OT</h4>
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
                          <FileText size={12} />
                          {request.project}
                        </span>
                      </div>
                    </div>
                  </div>
                  {request.status === 'approved' && (
                    <div className="text-right">
                      <p className="text-sm text-green-600 font-medium">Added to payroll</p>
                    </div>
                  )}
                  {request.status === 'pending' && (
                    <div className="text-right">
                      <p className="text-sm text-amber-600 font-medium">Pending HR Approval</p>
                    </div>
                  )}
                  {request.status === 'rejected' && (
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-medium">Rejected</p>
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
              <h2 className="text-xl font-bold text-slate-800">Request Overtime</h2>
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
                  data-testid="ot-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="e.g., 2.5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="ot-hours-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project/Task</label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="Project name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="ot-project-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  placeholder="Reason for overtime..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="ot-reason-input"
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
                  data-testid="ot-submit-btn"
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

export default OvertimeRequests;
