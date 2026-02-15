import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, CheckCircle, XCircle, AlertCircle, Clock,
  IndianRupee, FileText, Building2, Loader2, Edit, Trash2, 
  ChevronDown, Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { companyHubAPI } from '../../services/api';
import { toast } from 'sonner';

const CentralPaymentRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Vendor Payment',
    department: user?.department || 'Projects',
    description: '',
    vendor_name: '',
    invoice_number: '',
    due_date: '',
    urgency: 'normal'
  });

  const categories = ['Vendor Payment', 'Reimbursement', 'Salary Advance', 'Petty Cash', 'Other'];
  const departments = ['Projects', 'Accounts', 'Sales', 'Purchase', 'Exports', 'Finance', 'HR', 'Operations'];
  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'text-slate-600 bg-slate-100' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600 bg-blue-100' },
    { value: 'high', label: 'High', color: 'text-amber-600 bg-amber-100' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-100' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedStatus, selectedDepartment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedDepartment !== 'all') params.department = selectedDepartment;
      
      const [requestsRes, statsRes] = await Promise.all([
        companyHubAPI.getPaymentRequests(params),
        companyHubAPI.getPaymentRequestsStats()
      ]);
      
      setRequests(requestsRes.data.requests || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingId) {
        await companyHubAPI.updatePaymentRequest(editingId, data);
        toast.success('Payment request updated');
      } else {
        await companyHubAPI.createPaymentRequest(data, user?.name || 'User', user?.id);
        toast.success('Payment request submitted');
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving request:', error);
      toast.error('Failed to save payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: 'Vendor Payment',
      department: user?.department || 'Projects',
      description: '',
      vendor_name: '',
      invoice_number: '',
      due_date: '',
      urgency: 'normal'
    });
  };

  const handleEdit = (request) => {
    setEditingId(request.id);
    setFormData({
      title: request.title,
      amount: request.amount.toString(),
      category: request.category,
      department: request.department,
      description: request.description,
      vendor_name: request.vendor_name || '',
      invoice_number: request.invoice_number || '',
      due_date: request.due_date || '',
      urgency: request.urgency
    });
    setShowModal(true);
  };

  const handleApprove = async (id) => {
    try {
      await companyHubAPI.approvePaymentRequest(id, user?.name || 'Admin');
      toast.success('Payment request approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await companyHubAPI.rejectPaymentRequest(id, user?.name || 'Admin', reason || '');
      toast.success('Payment request rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const handleProcess = async (id) => {
    const transRef = prompt('Transaction Reference (optional):');
    try {
      await companyHubAPI.processPaymentRequest(id, user?.name || 'Admin', transRef || '');
      toast.success('Payment marked as processed');
      fetchData();
    } catch (error) {
      toast.error('Failed to process');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this payment request?')) {
      try {
        await companyHubAPI.deletePaymentRequest(id);
        toast.success('Payment request deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'processed': return 'bg-blue-100 text-blue-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getUrgencyBadge = (urgency) => {
    const level = urgencyLevels.find(l => l.value === urgency);
    return level?.color || 'bg-slate-100 text-slate-600';
  };

  const pendingAmount = stats?.totals?.pending?.amount || 0;
  const approvedAmount = stats?.totals?.approved?.amount || 0;
  const processedAmount = stats?.totals?.processed?.amount || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="central-payment-requests">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payment Requests</h1>
          <p className="text-slate-500 mt-1">Central repository for all payment requests</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="new-request-btn"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-amber-600">Pending</p>
              <p className="text-xl font-bold text-amber-700">₹{pendingAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-amber-500">{stats?.totals?.pending?.count || 0} requests</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-green-600">Approved</p>
              <p className="text-xl font-bold text-green-700">₹{approvedAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-green-500">{stats?.totals?.approved?.count || 0} requests</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-blue-600">Processed</p>
              <p className="text-xl font-bold text-blue-700">₹{processedAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-blue-500">{stats?.totals?.processed?.count || 0} requests</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="text-slate-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Requests</p>
              <p className="text-xl font-bold text-slate-800">{requests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Filters:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processed">Processed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Payment Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CreditCard className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No payment requests found</p>
            <p className="text-sm">Create a new request to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-slate-50" data-testid={`payment-request-${request.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-800">{request.title}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getUrgencyBadge(request.urgency)}`}>
                        {request.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{request.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {request.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        {request.category}
                      </span>
                      {request.vendor_name && (
                        <span>Vendor: {request.vendor_name}</span>
                      )}
                      {request.invoice_number && (
                        <span>Invoice: {request.invoice_number}</span>
                      )}
                      <span>By: {request.requested_by}</span>
                      <span>{new Date(request.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xl font-bold text-slate-800">₹{request.amount.toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-1">
                      {request.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(request.id)}
                            className="p-1.5 bg-green-100 hover:bg-green-200 rounded text-green-600" 
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            onClick={() => handleReject(request.id)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 rounded text-red-600" 
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <button 
                          onClick={() => handleProcess(request.id)}
                          className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-600 text-xs font-medium" 
                          title="Mark Processed"
                        >
                          Process
                        </button>
                      )}
                      <button 
                        onClick={() => handleEdit(request)}
                        className="p-1.5 hover:bg-slate-200 rounded" 
                        title="Edit"
                      >
                        <Edit size={14} className="text-slate-500" />
                      </button>
                      <button 
                        onClick={() => handleDelete(request.id)}
                        className="p-1.5 hover:bg-red-50 rounded" 
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Payment Request' : 'New Payment Request'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Payment for..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                  data-testid="payment-title-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                    data-testid="payment-amount-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    {urgencyLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Details about this payment..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  required
                  data-testid="payment-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name (optional)</label>
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    placeholder="Vendor name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice # (optional)</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="INV-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                  data-testid="payment-submit-btn"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Update' : 'Submit'} Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralPaymentRequests;
