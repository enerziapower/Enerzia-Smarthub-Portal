import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, Search, Filter, RefreshCw, Loader2, Eye, Check, X,
  Clock, CheckCircle2, AlertCircle, DollarSign, Calendar, Building2, User,
  FileText, Trash2, Send
} from 'lucide-react';
import { paymentRequestsAPI, projectsAPI } from '../services/api';

const PR_CATEGORIES = [
  'Site Expenses',
  'Material Purchase', 
  'Vendor Payment',
  'Transport',
  'Employee Expenses',
  'Office Expenses',
  'Utility Bills',
  'Other'
];

const PR_STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Finance Reviewed': 'bg-blue-100 text-blue-700 border-blue-200',
  'CEO Approved': 'bg-green-100 text-green-700 border-green-200',
  'Paid': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-red-100 text-red-700 border-red-200',
};

const DepartmentPaymentRequests = ({ department, departmentLabel }) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [nextPRNo, setNextPRNo] = useState('');

  useEffect(() => {
    loadData();
  }, [department]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsRes, projectsRes, statsRes, prNoRes] = await Promise.all([
        paymentRequestsAPI.getAll({ department }),
        projectsAPI.getAll(),
        paymentRequestsAPI.getStats(),
        paymentRequestsAPI.getNextPRNo()
      ]);
      
      // Filter requests for this department (show all for visibility)
      const allRequests = requestsRes.data;
      setRequests(allRequests);
      setProjects(projectsRes.data);
      setStats(statsRes.data);
      setNextPRNo(prNoRes.data.next_pr_no);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate department-specific stats
  const deptRequests = requests.filter(r => r.requested_by_department === department || !r.requested_by_department);
  const deptPending = deptRequests.filter(r => r.status === 'Pending').length;
  const deptApproved = deptRequests.filter(r => r.status === 'CEO Approved' || r.status === 'Paid').length;
  const deptTotal = deptRequests.reduce((sum, r) => sum + (r.amount || 0), 0);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = searchTerm === '' ||
      req.pr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.employee_vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === '' || req.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this payment request?')) return;
    try {
      await paymentRequestsAPI.delete(requestId);
      await loadData();
    } catch (error) {
      console.error('Error deleting request:', error);
      alert(error.response?.data?.detail || 'Failed to delete request');
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
    <div className="space-y-6" data-testid="dept-payment-requests-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Requests</h1>
          <p className="text-slate-600 mt-1">Create and track payment requests for {departmentLabel}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          data-testid="create-pr-btn"
        >
          <Plus size={18} />
          New Payment Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">My Requests</p>
              <p className="text-2xl font-bold text-slate-900">{deptRequests.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{deptPending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved/Paid</p>
              <p className="text-2xl font-bold text-green-600">{deptApproved}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-xl font-bold text-purple-600">₹{deptTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PR No, PID, vendor, purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                data-testid="search-input"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Finance Reviewed">Finance Reviewed</option>
            <option value="CEO Approved">CEO Approved</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">PR No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">PID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Employee/Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Requested By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                    <CreditCard size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No payment requests found</p>
                    <p className="text-sm mt-1">Click "New Payment Request" to create one</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50" data-testid={`pr-row-${req.id}`}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-blue-600">{req.pr_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{req.pid_no || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">₹{req.amount?.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{req.employee_vendor_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 truncate max-w-[150px] block" title={req.purpose}>{req.purpose}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-700">{req.requested_by}</p>
                        <p className="text-xs text-slate-400">{req.requested_by_department || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${PR_STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-700'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedRequest(req); setShowViewModal(true); }}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {req.status === 'Pending' && (
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Payment Request Workflow</h3>
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <span className="px-2 py-1 bg-yellow-100 rounded">1. Create PR</span>
          <span>→</span>
          <span className="px-2 py-1 bg-blue-100 rounded">2. Finance Review</span>
          <span>→</span>
          <span className="px-2 py-1 bg-green-100 rounded">3. CEO Approval</span>
          <span>→</span>
          <span className="px-2 py-1 bg-emerald-100 rounded">4. Paid</span>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePRModal
          projects={projects}
          nextPRNo={nextPRNo}
          department={department}
          departmentLabel={departmentLabel}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedRequest && (
        <ViewPRModal
          request={selectedRequest}
          onClose={() => { setShowViewModal(false); setSelectedRequest(null); }}
        />
      )}
    </div>
  );
};

// Create PR Modal
const CreatePRModal = ({ projects, nextPRNo, department, departmentLabel, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    pid_no: '',
    project_name: '',
    amount: '',
    employee_vendor_name: '',
    vendor_po_no: '',
    purpose: '',
    customer_site: '',
    category: 'Site Expenses',
    request_date: new Date().toISOString().split('T')[0]
  });

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setFormData({
      ...formData,
      project_id: projectId,
      pid_no: project?.pid_no || '',
      project_name: project?.project_name || '',
      customer_site: project?.location || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.employee_vendor_name || !formData.purpose) {
      alert('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      await paymentRequestsAPI.create({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      onSaved();
    } catch (error) {
      console.error('Error creating PR:', error);
      alert('Failed to create payment request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">New Payment Request</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-blue-600 font-medium">PR No: {nextPRNo}</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{departmentLabel}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Link to Project (Optional)
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="">No specific project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.pid_no} - {p.project_name}</option>
              ))}
            </select>
          </div>

          {/* Amount and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {PR_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Employee/Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Employee/Vendor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.employee_vendor_name}
              onChange={(e) => setFormData({ ...formData, employee_vendor_name: e.target.value })}
              placeholder="Enter employee or vendor name"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              required
            />
          </div>

          {/* Vendor PO No */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vendor PO No (Optional)
            </label>
            <input
              type="text"
              value={formData.vendor_po_no}
              onChange={(e) => setFormData({ ...formData, vendor_po_no: e.target.value })}
              placeholder="Enter vendor PO number if applicable"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Purpose / Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Describe the purpose of this payment request"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none"
              required
            />
          </div>

          {/* Customer Site */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Customer Site (Optional)
            </label>
            <input
              type="text"
              value={formData.customer_site}
              onChange={(e) => setFormData({ ...formData, customer_site: e.target.value })}
              placeholder="Enter customer site location"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Request Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Request Date</label>
            <input
              type="date"
              value={formData.request_date}
              onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
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
              <p className="text-lg font-bold text-slate-900">₹{request.amount?.toLocaleString()}</p>
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

          {request.vendor_po_no && (
            <div>
              <p className="text-xs text-slate-500">Vendor PO No</p>
              <p className="text-sm text-slate-700">{request.vendor_po_no}</p>
            </div>
          )}

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
              <p className="text-xs text-slate-500">Customer Site</p>
              <p className="text-sm text-slate-700">{request.customer_site || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Requested By</p>
              <p className="text-sm text-slate-700">{request.requested_by}</p>
              <p className="text-xs text-slate-400">{request.requested_by_department || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Request Date</p>
              <p className="text-sm text-slate-700">{request.request_date}</p>
            </div>
          </div>

          {request.finance_reviewed_by && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">Finance Review</p>
              <p className="text-sm text-blue-800">Reviewed by: {request.finance_reviewed_by}</p>
              {request.finance_remarks && <p className="text-sm text-blue-700 mt-1">{request.finance_remarks}</p>}
            </div>
          )}

          {request.ceo_approved_by && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600 font-medium">CEO Approval</p>
              <p className="text-sm text-green-800">Approved by: {request.ceo_approved_by}</p>
              {request.ceo_remarks && <p className="text-sm text-green-700 mt-1">{request.ceo_remarks}</p>}
            </div>
          )}

          {request.paid_date && (
            <div className="bg-emerald-50 p-3 rounded-lg">
              <p className="text-xs text-emerald-600 font-medium">Payment Details</p>
              <p className="text-sm text-emerald-800">Paid on: {request.paid_date}</p>
              {request.payment_reference && <p className="text-sm text-emerald-700">Ref: {request.payment_reference}</p>}
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

export default DepartmentPaymentRequests;
