/**
 * Payment Management - Business Hub Tab
 * 
 * Consolidates: Payment requests from all departments
 * Purpose: Central view for all payment request workflows
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, DollarSign, Clock, CheckCircle, AlertTriangle, X,
  Search, Filter, RefreshCw, Eye, Check, XCircle, Building2,
  Calendar, FileText, User, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle }
};

const DEPARTMENT_COLORS = {
  projects: 'violet',
  sales: 'blue',
  purchase: 'amber',
  finance: 'green',
  accounts: 'rose',
  hr: 'orange',
  exports: 'cyan',
  operations: 'slate'
};

const PaymentManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, total_amount: 0 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payment-requests/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || data || []);
        
        // Calculate stats
        const allRequests = data.requests || data || [];
        const pending = allRequests.filter(r => r.status === 'pending').length;
        const approved = allRequests.filter(r => r.status === 'approved').length;
        const totalAmount = allRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
        setStats({ total: allRequests.length, pending, approved, total_amount: totalAmount });
      }
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchTerm || 
      req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.request_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || req.status === statusFilter;
    const matchesDept = !deptFilter || req.department?.toLowerCase() === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const handleApprove = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payment-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Payment request approved');
        fetchRequests();
        setShowDetailModal(false);
      } else {
        toast.error('Failed to approve');
      }
    } catch (error) {
      toast.error('Error approving request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payment-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Payment request rejected');
        fetchRequests();
        setShowDetailModal(false);
      } else {
        toast.error('Failed to reject');
      }
    } catch (error) {
      toast.error('Error rejecting request');
    }
  };

  const getDeptColor = (dept) => DEPARTMENT_COLORS[dept?.toLowerCase()] || 'slate';

  return (
    <div className="space-y-6" data-testid="payment-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Payment Management</h2>
            <p className="text-sm text-slate-500">Track and approve payment requests</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Departments</option>
              {Object.keys(DEPARTMENT_COLORS).map(dept => (
                <option key={dept} value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
              ))}
            </select>

            <button
              onClick={fetchRequests}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-slate-500" />
            <span className="text-sm text-slate-600">Total Requests</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-amber-600" />
            <span className="text-sm text-amber-700">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm text-green-700">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-blue-600" />
            <span className="text-sm text-blue-700">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">₹{(stats.total_amount / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No payment requests found</h3>
          <p className="text-sm text-slate-500">Payment requests from all departments will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Request</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor/Payee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((request) => {
                const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                const deptColor = getDeptColor(request.department);
                
                return (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{request.title || request.request_id}</p>
                        <p className="text-xs text-slate-500">{request.date || request.created_at?.split('T')[0]}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${deptColor}-100 text-${deptColor}-700`}>
                        {request.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{request.vendor_name || request.payee || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      ₹{(request.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="p-1.5 hover:bg-green-100 rounded text-green-600"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="p-1.5 hover:bg-red-100 rounded text-red-600"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Payment Request Details</h3>
                <p className="text-sm text-slate-500">{selectedRequest.request_id || selectedRequest.id}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Title</label>
                  <p className="font-medium text-slate-800">{selectedRequest.title || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Department</label>
                  <p className="font-medium text-slate-800">{selectedRequest.department}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Vendor/Payee</label>
                  <p className="font-medium text-slate-800">{selectedRequest.vendor_name || selectedRequest.payee || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Amount</label>
                  <p className="font-bold text-xl text-slate-800">₹{(selectedRequest.amount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedRequest.status]?.color}`}>
                    {STATUS_CONFIG[selectedRequest.status]?.label}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Date</label>
                  <p className="font-medium text-slate-800">{selectedRequest.date || selectedRequest.created_at?.split('T')[0]}</p>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <label className="text-sm text-slate-500">Description</label>
                  <p className="text-slate-700">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
