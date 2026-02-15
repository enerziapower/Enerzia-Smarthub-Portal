import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Headphones, Plus, Eye, Download, Trash2, Edit2, X, Save, Loader2, Copy, Send,
  Calendar, ClipboardList, Building2, User, Phone, Mail, AlertTriangle, CheckCircle, Clock, Zap, Wind, Flame, Camera, Snowflake, Lightbulb, Cog, Activity, Briefcase, ArrowLeft
} from 'lucide-react';
import { customerServiceAPI, settingsAPI, departmentTeamAPI } from '../../services/api';
import { DatePicker } from '../../components/ui/date-picker';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Service Category Icons
const SERVICE_CATEGORY_ICONS = {
  'Electrical': Zap,
  'HVAC Systems': Wind,
  'Fire Protection Systems': Flame,
  'CCTV Systems': Camera,
  'Air Condition': Snowflake,
  'Lighting': Lightbulb,
  'Diesel Generator': Cog,
  'General Services': Briefcase,
};

const SERVICE_CATEGORIES = ['Electrical', 'HVAC Systems', 'Fire Protection Systems', 'CCTV Systems', 'Air Condition', 'Lighting', 'Diesel Generator', 'General Services'];
const REQUEST_TYPES = ['Maintenance', 'Breakdown', 'Repair', 'Service Call', 'Complaint', 'Warranty', 'AMC', 'Other'];

// Email Modal Component for Service Requests
const SendServiceEmailModal = ({ request, onClose, onSend }) => {
  const [toEmail, setToEmail] = useState(request?.contact_email || '');
  const [ccEmails, setCcEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!toEmail.trim()) {
      setError('Please enter recipient email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);
    setError('');

    try {
      await onSend({
        to_email: toEmail.trim(),
        cc_emails: ccEmails.split(',').map(e => e.trim()).filter(e => e),
        custom_message: customMessage.trim()
      });
    } catch (err) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Mail size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Send Service Report via Email</h3>
              <p className="text-sm text-slate-500">{request?.srn_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Email *</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CC (comma separated)</label>
            <input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
              placeholder="cc1@example.com, cc2@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Custom Message (optional)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
              placeholder="Add a personal message to the email..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerService = () => {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Map URL category ID to category name
  const CATEGORY_ID_MAP = {
    'electrical': 'Electrical',
    'hvac-systems': 'HVAC Systems',
    'fire-protection': 'Fire Protection Systems',
    'cctv-systems': 'CCTV Systems',
    'air-condition': 'Air Condition',
    'lighting': 'Lighting',
    'diesel-generator': 'Diesel Generator',
    'general': 'General Services'
  };

  // Get the category name from URL
  const urlCategoryName = categoryId ? CATEGORY_ID_MAP[categoryId] : null;

  useEffect(() => {
    loadData();
    // Auto-open create modal if action=new in URL
    if (searchParams.get('action') === 'new') {
      setShowCreateModal(true);
    }
  }, []);

  // Set filter from URL category
  useEffect(() => {
    if (urlCategoryName) {
      setFilterCategory(urlCategoryName);
    }
  }, [urlCategoryName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsRes, clientsRes, teamRes] = await Promise.all([
        customerServiceAPI.getAll(),
        settingsAPI.getClients(),
        departmentTeamAPI.getTeam('projects'),
      ]);
      
      setServiceRequests(requestsRes.data || []);
      setClients(clientsRes.data || []);
      setTeamMembers(teamRes.data?.filter(e => e.is_active !== false) || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (requestId) => {
    try {
      const response = await customerServiceAPI.downloadPDF(requestId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const request = serviceRequests.find(r => r.id === requestId);
      link.download = `FSR_${request?.srn_no?.replace(/\//g, '_') || 'report'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service request?')) return;
    try {
      await customerServiceAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} service request(s)?`)) return;
    
    setDeletingBulk(true);
    try {
      await Promise.all(selectedItems.map(id => customerServiceAPI.delete(id)));
      setSelectedItems([]);
      loadData();
    } catch (error) {
      console.error('Error deleting requests:', error);
      alert('Failed to delete some requests');
    } finally {
      setDeletingBulk(false);
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredRequests.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredRequests.map(r => r.id));
    }
  };

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setShowEditModal(true);
  };

  const handleClone = async (request) => {
    setActionLoading(prev => ({ ...prev, [request.id]: 'clone' }));
    try {
      const cloneData = { ...request };
      delete cloneData.id;
      delete cloneData.srn_no;
      delete cloneData.created_at;
      delete cloneData.updated_at;
      cloneData.status = 'Pending';
      
      await customerServiceAPI.create(cloneData);
      loadData();
      alert('Service request cloned successfully!');
    } catch (error) {
      console.error('Error cloning request:', error);
      alert('Failed to clone service request');
    } finally {
      setActionLoading(prev => ({ ...prev, [request.id]: null }));
    }
  };

  const handleSendEmail = async (emailData) => {
    if (!selectedRequest) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/customer-service/${selectedRequest.id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to send email');
      }

      const result = await response.json();
      alert(`Email sent successfully to ${result.to}`);
      setShowEmailModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error sending email:', error);
      alert(error.message || 'Failed to send email');
    }
  };

  // Filter requests first (for category from URL or dropdown)
  const categoryFilteredRequests = urlCategoryName 
    ? serviceRequests.filter(r => r.service_category === urlCategoryName)
    : filterCategory 
      ? serviceRequests.filter(r => r.service_category === filterCategory)
      : serviceRequests;

  // Stats based on category-filtered requests
  const stats = {
    total: categoryFilteredRequests.length,
    pending: categoryFilteredRequests.filter(r => r.status === 'Pending').length,
    inProgress: categoryFilteredRequests.filter(r => r.status === 'In Progress').length,
    completed: categoryFilteredRequests.filter(r => r.status === 'Completed').length,
  };

  const filteredRequests = categoryFilteredRequests.filter(request => {
    if (filterStatus && request.status !== filterStatus) return false;
    if (filterType && request.request_type !== filterType) return false;
    // Skip category filter if already filtered by URL category
    if (!urlCategoryName && filterCategory && request.service_category !== filterCategory) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        request.srn_no?.toLowerCase().includes(search) ||
        request.customer_name?.toLowerCase().includes(search) ||
        request.subject?.toLowerCase().includes(search) ||
        request.contact_person?.toLowerCase().includes(search) ||
        request.equipment_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {(categoryId || urlCategoryName) && (
            <Link
              to="/projects/customer-service"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {urlCategoryName ? urlCategoryName : 'All Service Requests'}
            </h1>
            <p className="text-sm text-slate-500">
              {urlCategoryName 
                ? `Manage ${urlCategoryName.toLowerCase()} service calls and complaints`
                : 'Manage service calls and complaints from existing customers'
              }
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          data-testid="new-service-request"
        >
          <Plus size={18} />
          New Service Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded-lg">
              <ClipboardList size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Headphones size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search by SRN, customer, equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">All Types</option>
            {REQUEST_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">All Categories</option>
            {SERVICE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Bulk Actions Bar */}
        {selectedItems.length > 0 && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              <span className="font-semibold">{selectedItems.length}</span> item(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deletingBulk ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete Selected
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredRequests.length > 0 && selectedItems.length === filteredRequests.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SRN No</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipment</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reported Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500">
                    <Headphones size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No service requests found</p>
                    <p className="text-sm mt-1">Create your first service request</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(request => {
                  const CategoryIcon = SERVICE_CATEGORY_ICONS[request.service_category] || Zap;
                  return (
                    <tr key={request.id} className={`hover:bg-slate-50 ${selectedItems.includes(request.id) ? 'bg-blue-50' : ''}`}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(request.id)}
                          onChange={() => toggleSelectItem(request.id)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-blue-600">{request.srn_no}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{request.customer_name}</p>
                          <p className="text-xs text-slate-500">{request.site_location}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          request.request_type === 'Breakdown'
                            ? 'bg-red-100 text-red-700'
                            : request.request_type === 'Complaint'
                              ? 'bg-orange-100 text-orange-700'
                              : request.request_type === 'Maintenance'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          {request.request_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <CategoryIcon size={14} className="text-slate-500" />
                          <span className="text-sm text-slate-700">{request.service_category || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-700">{request.equipment_name || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-700">{request.reported_date}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-700">{request.assigned_to || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          request.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : request.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-700'
                              : request.status === 'Pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleClone(request)}
                            disabled={actionLoading[request.id] === 'clone'}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Clone"
                          >
                            {actionLoading[request.id] === 'clone' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowViewModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(request)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowEmailModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Send Email"
                          >
                            <Mail size={16} />
                          </button>
                          {request.status === 'Completed' && (
                            <button
                              onClick={() => handleDownloadPDF(request.id)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download Field Service Report PDF"
                            >
                              <Download size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRequest(request.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ServiceRequestFormModal
          mode="create"
          clients={clients}
          teamMembers={teamMembers}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRequest && (
        <ServiceRequestFormModal
          mode="edit"
          request={selectedRequest}
          clients={clients}
          teamMembers={teamMembers}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRequest(null);
          }}
          onSaved={() => {
            setShowEditModal(false);
            setSelectedRequest(null);
            loadData();
          }}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedRequest && (
        <ViewServiceRequestModal
          request={selectedRequest}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
          onDownloadPDF={() => handleDownloadPDF(selectedRequest.id)}
          onEdit={() => {
            setShowViewModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && selectedRequest && (
        <SendServiceEmailModal
          request={selectedRequest}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedRequest(null);
          }}
          onSend={handleSendEmail}
        />
      )}
    </div>
  );
};

// Default test measurements structure for each category
const getDefaultTestMeasurements = (category) => {
  switch (category) {
    case 'Electrical':
      return {
        line_voltage_ry: '', line_voltage_yb: '', line_voltage_br: '',
        phase_voltage_rn: '', phase_voltage_yn: '', phase_voltage_bn: '',
        phase_current_r: '', phase_current_y: '', phase_current_b: '',
        neutral_current: '', neutral_earth_voltage: '',
        insulation_phase_phase: '', insulation_phase_earth: '', insulation_phase_neutral: '', insulation_neutral_earth: '',
        applied_voltage: '500V'
      };
    case 'HVAC Systems':
      return {
        supply_air_temp: '', return_air_temp: '', ambient_temp: '',
        suction_pressure: '', discharge_pressure: '',
        compressor_current: '', fan_motor_current: '',
        airflow_rate: '', humidity_level: '',
        system_voltage: '', system_current: '', time_switched_on: ''
      };
    case 'Fire Protection Systems':
      return {
        panel_battery_voltage: '', panel_ac_voltage: '',
        smoke_detector_status: '', heat_detector_status: '',
        sprinkler_pressure: '', alarm_test_result: '',
        emergency_light_status: '', exit_sign_status: ''
      };
    case 'CCTV Systems':
      return {
        camera_resolution: '', recording_status: '', storage_capacity: '',
        night_vision_status: '', ptz_function: '',
        network_connectivity: '', dvr_nvr_status: '', backup_power: ''
      };
    case 'Air Condition':
      return {
        cooling_capacity: '', supply_temp: '', return_temp: '',
        compressor_current: '', condenser_temp: '', evaporator_temp: '',
        refrigerant_level: '', filter_condition: '', thermostat_setting: ''
      };
    case 'Lighting':
      return {
        lux_level: '', color_temp: '', power_consumption: '',
        driver_status: '', dimmer_function: '', sensor_status: '',
        emergency_backup: '', fixture_condition: ''
      };
    case 'Diesel Generator':
      return {
        engine_rpm: '', frequency_hz: '', output_voltage: '',
        load_percentage: '', fuel_level: '', coolant_temp: '',
        oil_pressure: '', battery_voltage: '', running_hours: ''
      };
    case 'General Services':
      // General services don't require test measurements - return fields for Infrastructure, Interior, Building
      return {
        // Infrastructure
        infrastructure_condition: '',
        parking_status: '',
        road_access: '',
        drainage_system: '',
        water_supply: '',
        // Interior
        flooring_condition: '',
        wall_condition: '',
        ceiling_condition: '',
        doors_windows: '',
        painting_status: '',
        // Building
        structural_integrity: '',
        roof_condition: '',
        plumbing_status: '',
        ventilation: '',
        general_cleanliness: ''
      };
    default:
      return {};
  }
};

// Service Request Form Modal Component
const ServiceRequestFormModal = ({ mode, request, clients, teamMembers, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: request?.customer_id || '',
    customer_name: request?.customer_name || '',
    contact_person: request?.contact_person || '',
    contact_phone: request?.contact_phone || '',
    contact_email: request?.contact_email || '',
    site_location: request?.site_location || '',
    po_ref: request?.po_ref || '',
    call_raised_by: request?.call_raised_by || '',
    call_raised_datetime: request?.call_raised_datetime || '',
    // Equipment Details - Support multiple equipment with individual test measurements
    equipment_list: request?.equipment_list?.length > 0 
      ? request.equipment_list.map(eq => ({
          ...eq,
          test_measurements: eq.test_measurements || getDefaultTestMeasurements(request?.service_category || 'Electrical')
        }))
      : [
          { 
            equipment_name: request?.equipment_name || '', 
            equipment_location: request?.equipment_make || request?.equipment_location || '', 
            make_model: request?.equipment_model || request?.make_model || '', 
            equipment_serial: request?.equipment_serial || '',
            test_measurements: request?.test_measurements || getDefaultTestMeasurements(request?.service_category || 'Electrical')
          }
        ],
    // Legacy single equipment fields (for backward compatibility)
    equipment_name: request?.equipment_name || '',
    equipment_make: request?.equipment_make || '',
    equipment_model: request?.equipment_model || '',
    equipment_serial: request?.equipment_serial || '',
    // Request Details
    request_type: request?.request_type || 'Maintenance',
    service_category: request?.service_category || 'Electrical',
    subject: request?.subject || '',
    description: request?.description || '',
    reported_date: request?.reported_date || new Date().toISOString().split('T')[0].split('-').reverse().join('/'),
    assigned_to: request?.assigned_to || '',
    technician_email: request?.technician_email || '',
    technician_phone: request?.technician_phone || '',
    service_date: request?.service_date || '',
    completion_date: request?.completion_date || '',
    // Test Instruments Used
    test_instruments: request?.test_instruments || [],
    // Test Measurements (legacy - kept for backward compatibility)
    test_measurements: request?.test_measurements || getDefaultTestMeasurements('Electrical'),
    // Spares Used
    spares_used: request?.spares_used || false,
    spares_list: request?.spares_list || [],
    // Service Report
    work_performed: request?.work_performed || '',
    observations: request?.observations || '',
    recommendations: request?.recommendations || '',
    customer_feedback: request?.customer_feedback || '',
    // Photos
    problem_photos: request?.problem_photos || [],
    rectified_photos: request?.rectified_photos || [],
    // Signatures
    technician_signature: request?.technician_signature || '',
    customer_signature: request?.customer_signature || '',
    status: request?.status || 'Pending',
  });

  // Signature pad refs
  const techSignatureRef = useRef(null);
  const custSignatureRef = useRef(null);
  const [isDrawingTech, setIsDrawingTech] = useState(false);
  const [isDrawingCust, setIsDrawingCust] = useState(false);

  // Photo upload states
  const [problemPhotos, setProblemPhotos] = useState(request?.problem_photos || []);
  const [rectifiedPhotos, setRectifiedPhotos] = useState(request?.rectified_photos || []);

  // Handle photo upload
  const handlePhotoUpload = (files, type) => {
    const photoArray = Array.from(files).slice(0, 3); // Limit to 3 photos
    
    photoArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoData = {
          name: file.name,
          data: e.target.result,
          size: file.size,
          type: file.type
        };
        
        if (type === 'problem') {
          setProblemPhotos(prev => [...prev.slice(0, 2), photoData]);
          setFormData(prev => ({
            ...prev,
            problem_photos: [...prev.problem_photos.slice(0, 2), photoData]
          }));
        } else {
          setRectifiedPhotos(prev => [...prev.slice(0, 2), photoData]);
          setFormData(prev => ({
            ...prev,
            rectified_photos: [...prev.rectified_photos.slice(0, 2), photoData]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove photo
  const removePhoto = (index, type) => {
    if (type === 'problem') {
      const newPhotos = problemPhotos.filter((_, i) => i !== index);
      setProblemPhotos(newPhotos);
      setFormData(prev => ({ ...prev, problem_photos: newPhotos }));
    } else {
      const newPhotos = rectifiedPhotos.filter((_, i) => i !== index);
      setRectifiedPhotos(newPhotos);
      setFormData(prev => ({ ...prev, rectified_photos: newPhotos }));
    }
  };

  // Update test measurements when category changes
  useEffect(() => {
    if (mode === 'create' && !request) {
      setFormData(prev => ({
        ...prev,
        test_measurements: getDefaultTestMeasurements(prev.service_category)
      }));
    }
  }, [formData.service_category, mode, request]);

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        customer_id: clientId,
        customer_name: client.name,
        contact_person: client.contact_person || '',
        contact_phone: client.phone || '',
        contact_email: client.email || '',
        site_location: client.address || '',
      });
    }
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const formatDateForStorage = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const addTestInstrument = () => {
    setFormData({
      ...formData,
      test_instruments: [...formData.test_instruments, { name: '', make: '', model: '', serial: '' }]
    });
  };

  const updateTestInstrument = (index, field, value) => {
    const updated = [...formData.test_instruments];
    updated[index][field] = value;
    setFormData({ ...formData, test_instruments: updated });
  };

  const removeTestInstrument = (index) => {
    setFormData({
      ...formData,
      test_instruments: formData.test_instruments.filter((_, i) => i !== index)
    });
  };

  // Equipment list management functions
  const addEquipment = () => {
    setFormData({
      ...formData,
      equipment_list: [...formData.equipment_list, { 
        equipment_name: '', 
        equipment_location: '', 
        make_model: '', 
        equipment_serial: '',
        test_measurements: getDefaultTestMeasurements(formData.service_category)
      }]
    });
  };

  const updateEquipment = (index, field, value) => {
    const updated = [...formData.equipment_list];
    updated[index][field] = value;
    setFormData({ ...formData, equipment_list: updated });
  };

  const updateEquipmentMeasurement = (equipIndex, measurementKey, value) => {
    const updated = [...formData.equipment_list];
    if (!updated[equipIndex].test_measurements) {
      updated[equipIndex].test_measurements = getDefaultTestMeasurements(formData.service_category);
    }
    updated[equipIndex].test_measurements[measurementKey] = value;
    setFormData({ ...formData, equipment_list: updated });
  };

  const removeEquipment = (index) => {
    if (formData.equipment_list.length > 1) {
      setFormData({
        ...formData,
        equipment_list: formData.equipment_list.filter((_, i) => i !== index)
      });
    }
  };

  const addSpare = () => {
    setFormData({
      ...formData,
      spares_list: [...formData.spares_list, { name: '', make: '', model: '', qty: '' }]
    });
  };

  const updateSpare = (index, field, value) => {
    const updated = [...formData.spares_list];
    updated[index][field] = value;
    setFormData({ ...formData, spares_list: updated });
  };

  const removeSpare = (index) => {
    setFormData({
      ...formData,
      spares_list: formData.spares_list.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    if (!formData.customer_name) {
      alert('Please select or enter a customer');
      return;
    }
    if (!formData.subject) {
      alert('Please enter a subject');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await customerServiceAPI.create(formData);
      } else {
        await customerServiceAPI.update(request.id, formData);
      }
      onSaved();
    } catch (error) {
      console.error('Error saving service request:', error);
      alert('Failed to save service request');
    } finally {
      setSaving(false);
    }
  };

  const renderTestMeasurementsFields = () => {
    const category = formData.service_category;
    const measurements = formData.test_measurements || {};

    const updateMeasurement = (field, value) => {
      setFormData({
        ...formData,
        test_measurements: { ...measurements, [field]: value }
      });
    };

    switch (category) {
      case 'Electrical':
        return (
          <div className="space-y-4">
            {/* Line Voltage */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Line Voltage (V)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">R-Y</label>
                  <input type="text" value={measurements.line_voltage_ry || ''} onChange={(e) => updateMeasurement('line_voltage_ry', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Y-B</label>
                  <input type="text" value={measurements.line_voltage_yb || ''} onChange={(e) => updateMeasurement('line_voltage_yb', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">B-R</label>
                  <input type="text" value={measurements.line_voltage_br || ''} onChange={(e) => updateMeasurement('line_voltage_br', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="V" />
                </div>
              </div>
            </div>
            {/* Phase Voltage */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phase Voltage (V)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">R-N</label>
                  <input type="text" value={measurements.phase_voltage_rn || ''} onChange={(e) => updateMeasurement('phase_voltage_rn', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Y-N</label>
                  <input type="text" value={measurements.phase_voltage_yn || ''} onChange={(e) => updateMeasurement('phase_voltage_yn', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">B-N</label>
                  <input type="text" value={measurements.phase_voltage_bn || ''} onChange={(e) => updateMeasurement('phase_voltage_bn', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="V" />
                </div>
              </div>
            </div>
            {/* Phase Current */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phase Current (A)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">R</label>
                  <input type="text" value={measurements.phase_current_r || ''} onChange={(e) => updateMeasurement('phase_current_r', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="A" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Y</label>
                  <input type="text" value={measurements.phase_current_y || ''} onChange={(e) => updateMeasurement('phase_current_y', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="A" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">B</label>
                  <input type="text" value={measurements.phase_current_b || ''} onChange={(e) => updateMeasurement('phase_current_b', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="A" />
                </div>
              </div>
            </div>
            {/* Neutral & Earth */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Neutral Flow Current (A)</label>
                <input type="text" value={measurements.neutral_current || ''} onChange={(e) => updateMeasurement('neutral_current', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Neutral - Earth (V)</label>
                <input type="text" value={measurements.neutral_earth_voltage || ''} onChange={(e) => updateMeasurement('neutral_earth_voltage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="V" />
              </div>
            </div>
            {/* Insulation Resistance */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Insulation Resistance Values (Applied: {measurements.applied_voltage || '500V'})</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Phase/Phase</label>
                  <input type="text" value={measurements.insulation_phase_phase || ''} onChange={(e) => updateMeasurement('insulation_phase_phase', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="MΩ" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Phase/Earth</label>
                  <input type="text" value={measurements.insulation_phase_earth || ''} onChange={(e) => updateMeasurement('insulation_phase_earth', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="MΩ" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Phase/Neutral</label>
                  <input type="text" value={measurements.insulation_phase_neutral || ''} onChange={(e) => updateMeasurement('insulation_phase_neutral', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="MΩ" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Neutral/Earth</label>
                  <input type="text" value={measurements.insulation_neutral_earth || ''} onChange={(e) => updateMeasurement('insulation_neutral_earth', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="MΩ" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'HVAC Systems':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supply Air Temp (°C)</label>
              <input type="text" value={measurements.supply_air_temp || ''} onChange={(e) => updateMeasurement('supply_air_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Return Air Temp (°C)</label>
              <input type="text" value={measurements.return_air_temp || ''} onChange={(e) => updateMeasurement('return_air_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ambient Temp (°C)</label>
              <input type="text" value={measurements.ambient_temp || ''} onChange={(e) => updateMeasurement('ambient_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discharge Pressure (PSI)</label>
              <input type="text" value={measurements.discharge_pressure || measurements.refrigerant_pressure_high || ''} onChange={(e) => updateMeasurement('discharge_pressure', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Suction Pressure (PSI)</label>
              <input type="text" value={measurements.suction_pressure || measurements.refrigerant_pressure_low || ''} onChange={(e) => updateMeasurement('suction_pressure', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Compressor Current (A)</label>
              <input type="text" value={measurements.compressor_current || ''} onChange={(e) => updateMeasurement('compressor_current', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fan Motor Current (A)</label>
              <input type="text" value={measurements.fan_motor_current || ''} onChange={(e) => updateMeasurement('fan_motor_current', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Airflow Rate (CFM)</label>
              <input type="text" value={measurements.airflow_rate || ''} onChange={(e) => updateMeasurement('airflow_rate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Humidity Level (%)</label>
              <input type="text" value={measurements.humidity_level || ''} onChange={(e) => updateMeasurement('humidity_level', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">System Voltage (V)</label>
              <input type="text" value={measurements.system_voltage || ''} onChange={(e) => updateMeasurement('system_voltage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">System Current (A)</label>
              <input type="text" value={measurements.system_current || ''} onChange={(e) => updateMeasurement('system_current', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time Switched ON</label>
              <input type="text" value={measurements.time_switched_on || ''} onChange={(e) => updateMeasurement('time_switched_on', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g., 08:30 AM" />
            </div>
          </div>
        );

      case 'Fire Systems':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Panel Battery Voltage (V)</label>
              <input type="text" value={measurements.panel_battery_voltage || ''} onChange={(e) => updateMeasurement('panel_battery_voltage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Panel AC Voltage (V)</label>
              <input type="text" value={measurements.panel_ac_voltage || ''} onChange={(e) => updateMeasurement('panel_ac_voltage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Smoke Detector Status</label>
              <select value={measurements.smoke_detector_status || ''} onChange={(e) => updateMeasurement('smoke_detector_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Heat Detector Status</label>
              <select value={measurements.heat_detector_status || ''} onChange={(e) => updateMeasurement('heat_detector_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sprinkler Pressure (PSI)</label>
              <input type="text" value={measurements.sprinkler_pressure || ''} onChange={(e) => updateMeasurement('sprinkler_pressure', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alarm Test Result</label>
              <select value={measurements.alarm_test_result || ''} onChange={(e) => updateMeasurement('alarm_test_result', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Light Status</label>
              <select value={measurements.emergency_light_status || ''} onChange={(e) => updateMeasurement('emergency_light_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exit Sign Status</label>
              <select value={measurements.exit_sign_status || ''} onChange={(e) => updateMeasurement('exit_sign_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
          </div>
        );

      case 'CCTV Systems':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Camera Resolution</label>
              <input type="text" value={measurements.camera_resolution || ''} onChange={(e) => updateMeasurement('camera_resolution', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g., 1080p, 4K" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recording Status</label>
              <select value={measurements.recording_status || ''} onChange={(e) => updateMeasurement('recording_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Not Recording">Not Recording</option>
                <option value="Intermittent">Intermittent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Storage Capacity</label>
              <input type="text" value={measurements.storage_capacity || ''} onChange={(e) => updateMeasurement('storage_capacity', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g., 2TB, 80% used" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Night Vision Status</label>
              <select value={measurements.night_vision_status || ''} onChange={(e) => updateMeasurement('night_vision_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PTZ Function</label>
              <select value={measurements.ptz_function || ''} onChange={(e) => updateMeasurement('ptz_function', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Network Connectivity</label>
              <select value={measurements.network_connectivity || ''} onChange={(e) => updateMeasurement('network_connectivity', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Unstable">Unstable</option>
                <option value="No Connection">No Connection</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DVR/NVR Status</label>
              <select value={measurements.dvr_nvr_status || ''} onChange={(e) => updateMeasurement('dvr_nvr_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Backup Power</label>
              <select value={measurements.backup_power || ''} onChange={(e) => updateMeasurement('backup_power', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Low Battery">Low Battery</option>
                <option value="No Backup">No Backup</option>
              </select>
            </div>
          </div>
        );

      case 'Air Condition':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cooling Capacity (TR/BTU)</label>
              <input type="text" value={measurements.cooling_capacity || ''} onChange={(e) => updateMeasurement('cooling_capacity', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supply Temp (°C)</label>
              <input type="text" value={measurements.supply_temp || ''} onChange={(e) => updateMeasurement('supply_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Return Temp (°C)</label>
              <input type="text" value={measurements.return_temp || ''} onChange={(e) => updateMeasurement('return_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Compressor Current (A)</label>
              <input type="text" value={measurements.compressor_current || ''} onChange={(e) => updateMeasurement('compressor_current', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condenser Temp (°C)</label>
              <input type="text" value={measurements.condenser_temp || ''} onChange={(e) => updateMeasurement('condenser_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Evaporator Temp (°C)</label>
              <input type="text" value={measurements.evaporator_temp || ''} onChange={(e) => updateMeasurement('evaporator_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Refrigerant Level</label>
              <select value={measurements.refrigerant_level || ''} onChange={(e) => updateMeasurement('refrigerant_level', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Low">Low</option>
                <option value="Refilled">Refilled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter Condition</label>
              <select value={measurements.filter_condition || ''} onChange={(e) => updateMeasurement('filter_condition', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="Clean">Clean</option>
                <option value="Dirty">Dirty</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thermostat Setting (°C)</label>
              <input type="text" value={measurements.thermostat_setting || ''} onChange={(e) => updateMeasurement('thermostat_setting', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
        );

      case 'Lighting':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lux Level</label>
              <input type="text" value={measurements.lux_level || ''} onChange={(e) => updateMeasurement('lux_level', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Lux" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color Temperature (K)</label>
              <input type="text" value={measurements.color_temp || ''} onChange={(e) => updateMeasurement('color_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g., 4000K" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Power Consumption (W)</label>
              <input type="text" value={measurements.power_consumption || ''} onChange={(e) => updateMeasurement('power_consumption', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Driver Status</label>
              <select value={measurements.driver_status || ''} onChange={(e) => updateMeasurement('driver_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dimmer Function</label>
              <select value={measurements.dimmer_function || ''} onChange={(e) => updateMeasurement('dimmer_function', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sensor Status</label>
              <select value={measurements.sensor_status || ''} onChange={(e) => updateMeasurement('sensor_status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Faulty">Faulty</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Backup</label>
              <select value={measurements.emergency_backup || ''} onChange={(e) => updateMeasurement('emergency_backup', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="OK">OK</option>
                <option value="Low Battery">Low Battery</option>
                <option value="Faulty">Faulty</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fixture Condition</label>
              <select value={measurements.fixture_condition || ''} onChange={(e) => updateMeasurement('fixture_condition', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">Select</option>
                <option value="Good">Good</option>
                <option value="Damaged">Damaged</option>
                <option value="Replaced">Replaced</option>
              </select>
            </div>
          </div>
        );

      case 'Diesel Generator':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Engine RPM</label>
              <input type="text" value={measurements.engine_rpm || ''} onChange={(e) => updateMeasurement('engine_rpm', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency (Hz)</label>
              <input type="text" value={measurements.frequency_hz || ''} onChange={(e) => updateMeasurement('frequency_hz', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Output Voltage (V)</label>
              <input type="text" value={measurements.output_voltage || ''} onChange={(e) => updateMeasurement('output_voltage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Load (%)</label>
              <input type="text" value={measurements.load_percentage || ''} onChange={(e) => updateMeasurement('load_percentage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Level (%)</label>
              <input type="text" value={measurements.fuel_level || ''} onChange={(e) => updateMeasurement('fuel_level', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coolant Temp (°C)</label>
              <input type="text" value={measurements.coolant_temp || ''} onChange={(e) => updateMeasurement('coolant_temp', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Oil Pressure (PSI)</label>
              <input type="text" value={measurements.oil_pressure || ''} onChange={(e) => updateMeasurement('oil_pressure', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Battery Voltage (V)</label>
              <input type="text" value={measurements.battery_voltage || ''} onChange={(e) => updateMeasurement('battery_voltage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Running Hours</label>
              <input type="text" value={measurements.running_hours || ''} onChange={(e) => updateMeasurement('running_hours', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render test measurements for a specific equipment in the equipment_list
  const renderTestMeasurementsForEquipment = (measurements, equipIndex) => {
    const category = formData.service_category;
    
    const updateMeas = (field, value) => {
      updateEquipmentMeasurement(equipIndex, field, value);
    };

    switch (category) {
      case 'Electrical':
        return (
          <div className="space-y-3">
            {/* Line Voltage */}
            <div>
              <label className="text-xs font-medium text-amber-700 mb-1 block">Line Voltage (V)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500">R-Y</label>
                  <input type="text" value={measurements.line_voltage_ry || ''} onChange={(e) => updateMeas('line_voltage_ry', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Y-B</label>
                  <input type="text" value={measurements.line_voltage_yb || ''} onChange={(e) => updateMeas('line_voltage_yb', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">B-R</label>
                  <input type="text" value={measurements.line_voltage_br || ''} onChange={(e) => updateMeas('line_voltage_br', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="V" />
                </div>
              </div>
            </div>
            {/* Phase Voltage */}
            <div>
              <label className="text-xs font-medium text-amber-700 mb-1 block">Phase Voltage (V)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500">R-N</label>
                  <input type="text" value={measurements.phase_voltage_rn || ''} onChange={(e) => updateMeas('phase_voltage_rn', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Y-N</label>
                  <input type="text" value={measurements.phase_voltage_yn || ''} onChange={(e) => updateMeas('phase_voltage_yn', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="V" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">B-N</label>
                  <input type="text" value={measurements.phase_voltage_bn || ''} onChange={(e) => updateMeas('phase_voltage_bn', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="V" />
                </div>
              </div>
            </div>
            {/* Phase Current */}
            <div>
              <label className="text-xs font-medium text-amber-700 mb-1 block">Phase Current (A)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500">R</label>
                  <input type="text" value={measurements.phase_current_r || ''} onChange={(e) => updateMeas('phase_current_r', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="A" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Y</label>
                  <input type="text" value={measurements.phase_current_y || ''} onChange={(e) => updateMeas('phase_current_y', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="A" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">B</label>
                  <input type="text" value={measurements.phase_current_b || ''} onChange={(e) => updateMeas('phase_current_b', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="A" />
                </div>
              </div>
            </div>
            {/* Neutral & Earth */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">Neutral Flow Current (A)</label>
                <input type="text" value={measurements.neutral_current || ''} onChange={(e) => updateMeas('neutral_current', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Neutral - Earth (V)</label>
                <input type="text" value={measurements.neutral_earth_voltage || ''} onChange={(e) => updateMeas('neutral_earth_voltage', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
            </div>
            {/* Insulation Resistance */}
            <div>
              <label className="text-xs font-medium text-amber-700 mb-1 block">Insulation Resistance (MΩ)</label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Ph/Ph</label>
                  <input type="text" value={measurements.insulation_phase_phase || ''} onChange={(e) => updateMeas('insulation_phase_phase', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="MΩ" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Ph/E</label>
                  <input type="text" value={measurements.insulation_phase_earth || ''} onChange={(e) => updateMeas('insulation_phase_earth', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="MΩ" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Ph/N</label>
                  <input type="text" value={measurements.insulation_phase_neutral || ''} onChange={(e) => updateMeas('insulation_phase_neutral', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="MΩ" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">N/E</label>
                  <input type="text" value={measurements.insulation_neutral_earth || ''} onChange={(e) => updateMeas('insulation_neutral_earth', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="MΩ" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'HVAC Systems':
        return (
          <div className="space-y-3">
            {/* Temperature Readings */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-600">Supply Air Temp (°C)</label>
                <input type="text" value={measurements.supply_air_temp || ''} onChange={(e) => updateMeas('supply_air_temp', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Return Air Temp (°C)</label>
                <input type="text" value={measurements.return_air_temp || ''} onChange={(e) => updateMeas('return_air_temp', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Ambient Temp (°C)</label>
                <input type="text" value={measurements.ambient_temp || ''} onChange={(e) => updateMeas('ambient_temp', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
            </div>
            {/* Pressure & Humidity */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-600">Discharge Pressure (PSI)</label>
                <input type="text" value={measurements.discharge_pressure || ''} onChange={(e) => updateMeas('discharge_pressure', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Suction Pressure (PSI)</label>
                <input type="text" value={measurements.suction_pressure || ''} onChange={(e) => updateMeas('suction_pressure', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Humidity Level (%)</label>
                <input type="text" value={measurements.humidity_level || ''} onChange={(e) => updateMeas('humidity_level', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
            </div>
            {/* Current Readings */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">Compressor Current (A)</label>
                <input type="text" value={measurements.compressor_current || ''} onChange={(e) => updateMeas('compressor_current', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Fan Motor Current (A)</label>
                <input type="text" value={measurements.fan_motor_current || ''} onChange={(e) => updateMeas('fan_motor_current', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
            </div>
            {/* Additional Readings */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-slate-600">Airflow Rate (CFM)</label>
                <input type="text" value={measurements.airflow_rate || ''} onChange={(e) => updateMeas('airflow_rate', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">System Voltage (V)</label>
                <input type="text" value={measurements.system_voltage || ''} onChange={(e) => updateMeas('system_voltage', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">System Current (A)</label>
                <input type="text" value={measurements.system_current || ''} onChange={(e) => updateMeas('system_current', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">Time Switched ON</label>
                <input type="text" value={measurements.time_switched_on || ''} onChange={(e) => updateMeas('time_switched_on', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="HH:MM" />
              </div>
            </div>
          </div>
        );

      case 'General Services':
        // General Services - Infrastructure, Interior, Building parameters
        return (
          <div className="space-y-4">
            {/* Infrastructure */}
            <div>
              <h5 className="text-xs font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1">Infrastructure</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-600">Infrastructure Condition</label>
                  <select value={measurements.infrastructure_condition || ''} onChange={(e) => updateMeas('infrastructure_condition', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Needs Repair">Needs Repair</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Parking Status</label>
                  <select value={measurements.parking_status || ''} onChange={(e) => updateMeas('parking_status', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Available">Available</option>
                    <option value="Limited">Limited</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Road Access</label>
                  <select value={measurements.road_access || ''} onChange={(e) => updateMeas('road_access', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Restricted">Restricted</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Drainage System</label>
                  <select value={measurements.drainage_system || ''} onChange={(e) => updateMeas('drainage_system', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Functional">Functional</option>
                    <option value="Partially Blocked">Partially Blocked</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Needs Cleaning">Needs Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Water Supply</label>
                  <select value={measurements.water_supply || ''} onChange={(e) => updateMeas('water_supply', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Available">Available</option>
                    <option value="Intermittent">Intermittent</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Interior */}
            <div>
              <h5 className="text-xs font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1">Interior</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-600">Flooring Condition</label>
                  <select value={measurements.flooring_condition || ''} onChange={(e) => updateMeas('flooring_condition', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Wall Condition</label>
                  <select value={measurements.wall_condition || ''} onChange={(e) => updateMeas('wall_condition', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Cracks">Cracks</option>
                    <option value="Dampness">Dampness</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Ceiling Condition</label>
                  <select value={measurements.ceiling_condition || ''} onChange={(e) => updateMeas('ceiling_condition', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Leakage">Leakage</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Doors & Windows</label>
                  <select value={measurements.doors_windows || ''} onChange={(e) => updateMeas('doors_windows', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Repair">Needs Repair</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Painting Status</label>
                  <select value={measurements.painting_status || ''} onChange={(e) => updateMeas('painting_status', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Faded">Faded</option>
                    <option value="Peeling">Peeling</option>
                    <option value="Needs Repaint">Needs Repaint</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Building */}
            <div>
              <h5 className="text-xs font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1">Building</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-600">Structural Integrity</label>
                  <select value={measurements.structural_integrity || ''} onChange={(e) => updateMeas('structural_integrity', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Concerns">Concerns</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Roof Condition</label>
                  <select value={measurements.roof_condition || ''} onChange={(e) => updateMeas('roof_condition', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Leakage">Leakage</option>
                    <option value="Needs Repair">Needs Repair</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Plumbing Status</label>
                  <select value={measurements.plumbing_status || ''} onChange={(e) => updateMeas('plumbing_status', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Minor Issues">Minor Issues</option>
                    <option value="Leakage">Leakage</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Ventilation</label>
                  <select value={measurements.ventilation || ''} onChange={(e) => updateMeas('ventilation', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">General Cleanliness</label>
                  <select value={measurements.general_cleanliness || ''} onChange={(e) => updateMeas('general_cleanliness', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                    <option value="">Select</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Attention">Needs Attention</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        // For General Services or other categories without test measurements
        const defaultMeasurements = getDefaultTestMeasurements(category);
        if (!defaultMeasurements) {
          return (
            <div className="text-sm text-slate-500 italic">
              No test measurements required for {category}
            </div>
          );
        }
        // For other categories, show a simple key-value grid
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.keys(defaultMeasurements).map((key) => (
              <div key={key}>
                <label className="text-xs text-slate-600">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                <input 
                  type="text" 
                  value={measurements[key] || ''} 
                  onChange={(e) => updateMeas(key, e.target.value)} 
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" 
                />
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'create' ? 'New Field Service Request' : 'Edit Field Service Request'}
            </h2>
            {mode === 'edit' && (
              <p className="text-sm text-slate-500">{request?.srn_no}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Service Type Selection */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">Request Type *</label>
                <select
                  value={formData.request_type}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {REQUEST_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">Service Category *</label>
                <select
                  value={formData.service_category}
                  onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
                  className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">Reported Date</label>
                <DatePicker
                  value={formatDateForInput(formData.reported_date)}
                  onChange={(val) => setFormData({ ...formData, reported_date: formatDateForStorage(val) })}
                  placeholder="Select date"
                  className="h-10 border-amber-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Customer Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-semibold text-blue-800 mb-2">Select Customer *</label>
            <select
              value={formData.customer_id}
              onChange={(e) => handleClientSelect(e.target.value)}
              className="w-full px-3 py-2.5 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Existing Customer --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-blue-600 mt-2">Or enter customer details manually below</p>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site Location</label>
              <input
                type="text"
                value={formData.site_location}
                onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">P.O. Ref #</label>
              <input
                type="text"
                value={formData.po_ref}
                onChange={(e) => setFormData({ ...formData, po_ref: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Call Raised By</label>
              <input
                type="text"
                value={formData.call_raised_by}
                onChange={(e) => setFormData({ ...formData, call_raised_by: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* 3. Service Provider Details */}
          <div className="border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Service Provider Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To / Attended By</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => {
                    const selectedMemberName = e.target.value;
                    const selectedMember = teamMembers.find(member => member.name === selectedMemberName);
                    
                    setFormData({ 
                      ...formData, 
                      assigned_to: selectedMemberName,
                      technician_email: selectedMember?.email || formData.technician_email,
                      technician_phone: selectedMember?.phone || formData.technician_phone
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Select Team Member</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Date</label>
                <DatePicker
                  value={formatDateForInput(formData.service_date)}
                  onChange={(val) => setFormData({ ...formData, service_date: formatDateForStorage(val) })}
                  placeholder="Select date"
                  className="h-10 border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Completion Date</label>
                <DatePicker
                  value={formatDateForInput(formData.completion_date)}
                  onChange={(val) => setFormData({ ...formData, completion_date: formatDateForStorage(val) })}
                  placeholder="Select date"
                  className="h-10 border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Technician Email</label>
                <input
                  type="email"
                  value={formData.technician_email}
                  onChange={(e) => setFormData({ ...formData, technician_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Technician Mobile</label>
                <input
                  type="text"
                  value={formData.technician_phone}
                  onChange={(e) => setFormData({ ...formData, technician_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* 4. Nature of Problem */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nature of Problem / Service *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Brief description of the issue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="Detailed description of the issue..."
            />
          </div>

          {/* 5. Test Instruments Used */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Test Instruments Used</h3>
              <button
                type="button"
                onClick={addTestInstrument}
                className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                + Add Instrument
              </button>
            </div>
            {formData.test_instruments.length > 0 ? (
              <div className="space-y-2">
                {formData.test_instruments.map((inst, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" value={inst.name} onChange={(e) => updateTestInstrument(idx, 'name', e.target.value)} placeholder="Equipment Name" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" value={inst.make} onChange={(e) => updateTestInstrument(idx, 'make', e.target.value)} placeholder="Make" className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" value={inst.model} onChange={(e) => updateTestInstrument(idx, 'model', e.target.value)} placeholder="Model#" className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" value={inst.serial} onChange={(e) => updateTestInstrument(idx, 'serial', e.target.value)} placeholder="Serial#" className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <button type="button" onClick={() => removeTestInstrument(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No test instruments added</p>
            )}
          </div>

          {/* 6. Equipment Details - Multiple Equipment Support with Integrated Test Measurements */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Zap size={16} />
                {formData.service_category === 'General Services' 
                  ? 'Site Inspection Details (Infrastructure / Interior / Building)'
                  : 'Equipment Details & Test Measurements'
                }
              </h3>
              <button
                type="button"
                onClick={addEquipment}
                className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium"
              >
                + Add {formData.service_category === 'General Services' ? 'Inspection Area' : 'Equipment'}
              </button>
            </div>
            {formData.service_category === 'General Services' && (
              <p className="text-xs text-slate-500 mb-3">
                Add areas to inspect with Infrastructure, Interior, and Building parameters.
              </p>
            )}
            <div className="space-y-4">
              {formData.equipment_list.map((equip, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {/* Equipment Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      Equipment #{idx + 1}
                    </span>
                    {formData.equipment_list.length > 1 && (
                      <button type="button" onClick={() => removeEquipment(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-1 text-xs">
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {/* Equipment Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Equipment / Feeder Name</label>
                      <input
                        type="text"
                        value={equip.equipment_name || ''}
                        onChange={(e) => updateEquipment(idx, 'equipment_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="e.g., Transformer, AHU"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Equipment Location</label>
                      <input
                        type="text"
                        value={equip.equipment_location || ''}
                        onChange={(e) => updateEquipment(idx, 'equipment_location', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="e.g., Floor 2, Room 101"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Make/Model No.</label>
                      <input
                        type="text"
                        value={equip.make_model || ''}
                        onChange={(e) => updateEquipment(idx, 'make_model', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="e.g., Carrier 30RB"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Serial No.</label>
                      <input
                        type="text"
                        value={equip.equipment_serial || ''}
                        onChange={(e) => updateEquipment(idx, 'equipment_serial', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Test Measurements for this Equipment - Hidden for General Services */}
                  {formData.service_category !== 'General Services' ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <Activity size={14} />
                        Test Measurements - {formData.service_category}
                      </h4>
                      {renderTestMeasurementsForEquipment(equip.test_measurements || {}, idx)}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Activity size={14} />
                        Site Inspection Parameters
                      </h4>
                      {renderTestMeasurementsForEquipment(equip.test_measurements || {}, idx)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 7. Spares / Consumables Used */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-semibold text-slate-700">Spares / Consumables Used</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.spares_used}
                    onChange={(e) => setFormData({ ...formData, spares_used: e.target.checked })}
                    className="rounded"
                  />
                  <span>Yes</span>
                </label>
              </div>
              {formData.spares_used && (
                <button
                  type="button"
                  onClick={addSpare}
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  + Add Spare
                </button>
              )}
            </div>
            {formData.spares_used && formData.spares_list.length > 0 && (
              <div className="space-y-2">
                {formData.spares_list.map((spare, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" value={spare.name} onChange={(e) => updateSpare(idx, 'name', e.target.value)} placeholder="Name of Spare" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" value={spare.make} onChange={(e) => updateSpare(idx, 'make', e.target.value)} placeholder="Make" className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" value={spare.model} onChange={(e) => updateSpare(idx, 'model', e.target.value)} placeholder="Model#" className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" value={spare.qty} onChange={(e) => updateSpare(idx, 'qty', e.target.value)} placeholder="Qty" className="w-16 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <button type="button" onClick={() => removeSpare(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service Report Details */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Description of Service / Solutions Undertaken</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Root Cause Analysis</label>
                <textarea
                  rows={3}
                  value={formData.work_performed}
                  onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Describe the root cause analysis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Performed</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Describe the work performed..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recommendations</label>
                <textarea
                  rows={2}
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Any recommendations for the customer..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Feedback / Suggestions</label>
                <textarea
                  rows={2}
                  value={formData.customer_feedback}
                  onChange={(e) => setFormData({ ...formData, customer_feedback: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Customer feedback on the service..."
                />
              </div>
            </div>
          </div>

          {/* Photo Documentation Section */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">📸 Photo Documentation</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Problem Photos */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Before Service (Problem Photos)</label>
                <div className="border border-slate-200 rounded-lg p-3">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files, 'problem')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">Max 3 photos, 5MB each</p>
                  {problemPhotos.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {problemPhotos.map((photo, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <img src={photo.data} alt="Problem" className="w-8 h-8 object-cover rounded" />
                            <span className="text-slate-600 truncate max-w-32">{photo.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(idx, 'problem')}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Rectified Photos */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">After Service (Rectified Photos)</label>
                <div className="border border-slate-200 rounded-lg p-3">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files, 'rectified')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">Max 3 photos, 5MB each</p>
                  {rectifiedPhotos.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {rectifiedPhotos.map((photo, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <img src={photo.data} alt="Rectified" className="w-8 h-8 object-cover rounded" />
                            <span className="text-slate-600 truncate max-w-32">{photo.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(idx, 'rectified')}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Signatures</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Technician Signature */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Technician Signature</label>
                <div className="border border-slate-300 rounded-lg bg-white relative">
                  <canvas
                    ref={techSignatureRef}
                    width={300}
                    height={120}
                    className="w-full h-32 cursor-crosshair touch-none"
                    onMouseDown={(e) => {
                      setIsDrawingTech(true);
                      const canvas = techSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext('2d');
                      ctx.strokeStyle = '#000000';
                      ctx.lineWidth = 2;
                      ctx.lineCap = 'round';
                      ctx.beginPath();
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    }}
                    onMouseMove={(e) => {
                      if (!isDrawingTech) return;
                      const canvas = techSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext('2d');
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onMouseUp={() => {
                      setIsDrawingTech(false);
                      const canvas = techSignatureRef.current;
                      setFormData({ ...formData, technician_signature: canvas.toDataURL() });
                    }}
                    onMouseLeave={() => setIsDrawingTech(false)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setIsDrawingTech(true);
                      const canvas = techSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      const ctx = canvas.getContext('2d');
                      ctx.strokeStyle = '#000000';
                      ctx.lineWidth = 3;
                      ctx.lineCap = 'round';
                      ctx.beginPath();
                      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      if (!isDrawingTech) return;
                      const canvas = techSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      const ctx = canvas.getContext('2d');
                      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setIsDrawingTech(false);
                      const canvas = techSignatureRef.current;
                      setFormData({ ...formData, technician_signature: canvas.toDataURL() });
                    }}
                  />
                  {formData.technician_signature && (
                    <div className="mt-2 p-2 border border-green-200 rounded bg-green-50">
                      <p className="text-xs text-green-700 mb-1">✓ Signature captured</p>
                      <img src={formData.technician_signature} alt="Tech Signature Preview" className="w-full h-16 object-contain border rounded" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const canvas = techSignatureRef.current;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    setFormData({ ...formData, technician_signature: '' });
                  }}
                  className="mt-1 text-xs text-red-600 hover:text-red-700"
                >
                  Clear Signature
                </button>
              </div>

              {/* Customer Signature */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer Signature</label>
                <div className="border border-slate-300 rounded-lg bg-white relative">
                  <canvas
                    ref={custSignatureRef}
                    width={300}
                    height={120}
                    className="w-full h-32 cursor-crosshair touch-none"
                    onMouseDown={(e) => {
                      setIsDrawingCust(true);
                      const canvas = custSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext('2d');
                      ctx.strokeStyle = '#000000';
                      ctx.lineWidth = 2;
                      ctx.lineCap = 'round';
                      ctx.beginPath();
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    }}
                    onMouseMove={(e) => {
                      if (!isDrawingCust) return;
                      const canvas = custSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext('2d');
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onMouseUp={() => {
                      setIsDrawingCust(false);
                      const canvas = custSignatureRef.current;
                      setFormData({ ...formData, customer_signature: canvas.toDataURL() });
                    }}
                    onMouseLeave={() => setIsDrawingCust(false)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setIsDrawingCust(true);
                      const canvas = custSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      const ctx = canvas.getContext('2d');
                      ctx.strokeStyle = '#000000';
                      ctx.lineWidth = 3;
                      ctx.lineCap = 'round';
                      ctx.beginPath();
                      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      if (!isDrawingCust) return;
                      const canvas = custSignatureRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      const ctx = canvas.getContext('2d');
                      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setIsDrawingCust(false);
                      const canvas = custSignatureRef.current;
                      setFormData({ ...formData, customer_signature: canvas.toDataURL() });
                    }}
                  />
                  {formData.customer_signature && (
                    <div className="mt-2 p-2 border border-green-200 rounded bg-green-50">
                      <p className="text-xs text-green-700 mb-1">✓ Signature captured</p>
                      <img src={formData.customer_signature} alt="Customer Signature Preview" className="w-full h-16 object-contain border rounded" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const canvas = custSignatureRef.current;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    setFormData({ ...formData, customer_signature: '' });
                  }}
                  className="mt-1 text-xs text-red-600 hover:text-red-700"
                >
                  Clear Signature
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Use your finger on mobile/tablet or mouse to sign</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {mode === 'create' ? 'Create Request' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// View Service Request Modal
const ViewServiceRequestModal = ({ request, onClose, onDownloadPDF, onEdit }) => {
  const CategoryIcon = SERVICE_CATEGORY_ICONS[request.service_category] || Zap;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">Field Service Report</h2>
            <p className="text-sm text-slate-300">{request.srn_no}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-slate-900 rounded-lg hover:bg-slate-100 font-medium"
            >
              <Edit2 size={16} />
              Edit
            </button>
            {request.status === 'Completed' && (
              <button
                onClick={onDownloadPDF}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
              >
                <Download size={16} />
                Download FSR
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Service Type Badge */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
              request.request_type === 'Breakdown'
                ? 'bg-red-100 text-red-700'
                : request.request_type === 'Maintenance'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-700'
            }`}>
              {request.request_type}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-amber-100 text-amber-700">
              <CategoryIcon size={14} />
              {request.service_category}
            </span>
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
              request.status === 'Completed'
                ? 'bg-emerald-100 text-emerald-700'
                : request.status === 'In Progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              {request.status}
            </span>
          </div>

          {/* Equipment Details & Test Measurements Combined */}
          {(request.equipment_list?.length > 0 || request.equipment_name) && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Equipment Details & Test Measurements</h3>
              {request.equipment_list?.length > 0 ? (
                <div className="space-y-4">
                  {request.equipment_list.map((equip, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
                      {/* Equipment Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        <span className="font-semibold text-slate-900">{equip.equipment_name || `Equipment #${idx + 1}`}</span>
                      </div>
                      
                      {/* Equipment Details Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3 pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-slate-500 text-xs">Location:</span>
                          <p className="font-medium text-slate-900">{equip.equipment_location || '-'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Make/Model:</span>
                          <p className="font-medium text-slate-900">{equip.make_model || '-'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Serial No:</span>
                          <p className="font-medium text-slate-900">{equip.equipment_serial || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Test Measurements for this Equipment */}
                      {equip.test_measurements && Object.keys(equip.test_measurements).some(k => equip.test_measurements[k]) && (
                        <div className="bg-amber-50 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-amber-700 mb-2">Test Measurements</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {Object.entries(equip.test_measurements).map(([key, value]) => {
                              if (!value) return null;
                              const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                              return (
                                <div key={key}>
                                  <span className="text-amber-700 text-xs">{label}:</span>
                                  <p className="font-medium text-amber-900">{value}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Equipment/Feeder:</span>
                    <p className="font-medium text-slate-900">{request.equipment_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Equipment Location:</span>
                    <p className="font-medium text-slate-900">{request.equipment_make || request.equipment_location || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Make/Model No.:</span>
                    <p className="font-medium text-slate-900">{request.equipment_model || request.make_model || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Serial No.:</span>
                    <p className="font-medium text-slate-900">{request.equipment_serial || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer & Service Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Company:</span>
                  <span className="font-medium text-slate-900">{request.customer_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Site Location:</span>
                  <span className="font-medium text-slate-900">{request.site_location || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Contact Person:</span>
                  <span className="font-medium text-slate-900">{request.contact_person || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-900">{request.contact_phone || '-'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Service Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Reported Date:</span>
                  <span className="font-medium text-slate-900">{request.reported_date}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Service Date:</span>
                  <span className="font-medium text-slate-900">{request.service_date || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Assigned To:</span>
                  <span className="font-medium text-slate-900">{request.assigned_to || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Completion Date:</span>
                  <span className="font-medium text-slate-900">{request.completion_date || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nature of Problem */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Nature of Problem / Service</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-semibold text-slate-900 mb-2">{request.subject}</p>
              <p className="text-sm text-slate-600">{request.description || 'No detailed description provided.'}</p>
            </div>
          </div>

          {/* Legacy Test Measurements - Only shown if no equipment_list but has test_measurements */}
          {(!request.equipment_list || request.equipment_list.length === 0) && request.test_measurements && Object.keys(request.test_measurements).some(k => request.test_measurements[k]) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Test Measurements / Values Observed</h3>
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {Object.entries(request.test_measurements).map(([key, value]) => {
                    if (!value) return null;
                    const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                      <div key={key}>
                        <span className="text-emerald-700 text-xs">{label}:</span>
                        <p className="font-medium text-emerald-900">{value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Service Report */}
          {(request.work_performed || request.observations || request.recommendations) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Service Report</h3>
              <div className="space-y-3">
                {request.work_performed && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Root Cause Analysis</p>
                    <p className="text-sm text-blue-900">{request.work_performed}</p>
                  </div>
                )}
                {request.observations && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Work Performed</p>
                    <p className="text-sm text-amber-900">{request.observations}</p>
                  </div>
                )}
                {request.recommendations && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Recommendations</p>
                    <p className="text-sm text-purple-900">{request.recommendations}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spares Used */}
          {request.spares_used && request.spares_list?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Spares / Consumables Used</h3>
              <div className="bg-slate-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Name</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Make</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Model</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.spares_list.map((spare, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="py-2 px-3">{spare.name}</td>
                        <td className="py-2 px-3">{spare.make || '-'}</td>
                        <td className="py-2 px-3">{spare.model || '-'}</td>
                        <td className="py-2 px-3">{spare.qty || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerService;
