import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, CheckCircle, XCircle, AlertCircle,
  Calendar, Clock, MapPin, Car, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const TransportRequests = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Company Vehicle',
    pickup: '',
    drop: '',
    time: '',
    purpose: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await employeeHubAPI.getTransportRequests({ user_id: user?.id });
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching transport requests:', error);
      toast.error('Failed to load transport requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await employeeHubAPI.createTransportRequest(
        formData,
        user?.id,
        user?.name || 'User',
        user?.department || 'Unknown'
      );
      toast.success('Transport request submitted successfully');
      setShowModal(false);
      setFormData({ date: new Date().toISOString().split('T')[0], type: 'Company Vehicle', pickup: '', drop: '', time: '', purpose: '' });
      fetchRequests();
    } catch (error) {
      console.error('Error creating transport request:', error);
      toast.error('Failed to submit transport request');
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
    <div className="space-y-6" data-testid="transport-requests">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transport Requests</h1>
          <p className="text-slate-500 mt-1">Request company vehicle or cab reimbursement</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="request-transport-btn"
        >
          <Plus size={18} />
          Request Transport
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Truck className="text-blue-600" size={24} />
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
              <Car className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-purple-600">Vehicles Used</p>
              <p className="text-2xl font-bold text-purple-700">{requests.filter(r => r.type === 'Company Vehicle' && r.status === 'approved').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">My Transport Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Truck className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No transport requests yet</p>
            <p className="text-sm">Click "Request Transport" to submit a new request</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50" data-testid={`transport-request-${request.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      request.type === 'Company Vehicle' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {request.type === 'Company Vehicle' ? 
                        <Car className="text-blue-600" size={24} /> :
                        <Truck className="text-amber-600" size={24} />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{request.type}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{request.purpose}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(request.date).toLocaleDateString('en-IN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {request.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {request.pickup} → {request.drop}
                        </span>
                      </div>
                    </div>
                  </div>
                  {request.status === 'approved' && (
                    <div className="text-right">
                      {request.vehicle && (
                        <>
                          <p className="text-xs text-slate-400">Assigned Vehicle</p>
                          <p className="text-sm font-medium text-slate-600">{request.vehicle}</p>
                        </>
                      )}
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
              <h2 className="text-xl font-bold text-slate-800">Request Transport</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    data-testid="transport-date-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    data-testid="transport-time-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transport Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>Company Vehicle</option>
                  <option>Cab Reimbursement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Location</label>
                <input
                  type="text"
                  value={formData.pickup}
                  onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                  placeholder="e.g., Office"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="transport-pickup-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Drop Location</label>
                <input
                  type="text"
                  value={formData.drop}
                  onChange={(e) => setFormData({ ...formData, drop: e.target.value })}
                  placeholder="e.g., Client Site - Guindy"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="transport-drop-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  rows={3}
                  placeholder="Purpose of travel..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="transport-purpose-input"
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
                  data-testid="transport-submit-btn"
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

export default TransportRequests;
