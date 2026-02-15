import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, Filter, FileText, Calendar, 
  User, MapPin, Eye, Edit, Trash2, Download, ClipboardCheck, Copy, Mail, X, Send, Loader2,
  CheckCircle, Clock, AlertCircle, Shield, Flame
} from 'lucide-react';
import { testReportsAPI } from '../../services/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Audit report types including IR Thermography
const AUDIT_TYPES = [
  { id: 'ir-thermography', name: 'IR Thermography', icon: Flame, color: 'bg-rose-500', prefix: 'IR', description: 'Thermal imaging and hotspot analysis reports' },
  { id: 'electrical-safety', name: 'Electrical Safety Audit', icon: Shield, color: 'bg-red-500', prefix: 'ESA', description: 'Electrical safety compliance audits' },
  { id: 'energy-audit', name: 'Energy Audit', icon: ClipboardCheck, color: 'bg-green-500', prefix: 'EA', description: 'Energy consumption and efficiency audits' },
  { id: 'compliance-audit', name: 'Compliance Audit', icon: FileText, color: 'bg-blue-500', prefix: 'CA', description: 'Regulatory compliance audits' },
  { id: 'fire-safety', name: 'Fire Safety Audit', icon: AlertCircle, color: 'bg-orange-500', prefix: 'FSA', description: 'Fire safety compliance audits' },
];

// Email Modal Component
const SendEmailModal = ({ isOpen, onClose, report, onSend }) => {
  const [toEmail, setToEmail] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (report) {
      setToEmail(report.contact_email || report.customer_email || '');
      setCcEmails(report.engineer_email || '');
    }
  }, [report]);

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
      const token = localStorage.getItem('token');
      const equipmentType = report.equipment_type || report.audit_type || 'audit';
      const response = await fetch(`${API_URL}/api/equipment-report/${equipmentType}/${report.id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to_email: toEmail.trim(),
          cc_emails: ccEmails.split(',').map(e => e.trim()).filter(e => e),
          custom_message: customMessage.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to send email');
      }

      const result = await response.json();
      onSend(result);
      onClose();
      setToEmail('');
      setCcEmails('');
      setCustomMessage('');
    } catch (err) {
      setError(err.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Mail size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Send Report via Email</h3>
              <p className="text-sm text-slate-500">{report?.report_no}</p>
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CC (comma separated)</label>
            <input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="cc1@example.com, cc2@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Custom Message (optional)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AuditReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Fetch audit reports and IR thermography reports
      const [auditResponse, irResponse] = await Promise.all([
        testReportsAPI.getAll({ report_category: 'audit' }),
        testReportsAPI.getAll({ equipment_type: 'ir-thermography' })
      ]);
      const allReports = [...(auditResponse.data || []), ...(irResponse.data || [])];
      setReports(allReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} /> Completed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
            <Clock size={12} /> Draft
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            <AlertCircle size={12} /> Pending
          </span>
        );
      default:
        return null;
    }
  };

  const getAuditTypeName = (typeId) => {
    const type = AUDIT_TYPES.find(t => t.id === typeId);
    return type ? type.name : typeId;
  };

  const handleClone = async (report) => {
    setActionLoading(prev => ({ ...prev, [report.id]: 'clone' }));
    try {
      const cloneData = { ...report };
      delete cloneData.id;
      delete cloneData.report_no;
      delete cloneData.created_at;
      delete cloneData.updated_at;
      cloneData.status = 'draft';
      
      await testReportsAPI.create(cloneData);
      fetchReports();
      alert('Report cloned successfully!');
    } catch (error) {
      console.error('Error cloning report:', error);
      alert('Failed to clone report');
    } finally {
      setActionLoading(prev => ({ ...prev, [report.id]: null }));
    }
  };

  const handleDownloadPDF = async (report) => {
    setActionLoading(prev => ({ ...prev, [report.id]: 'download' }));
    try {
      const token = localStorage.getItem('token');
      const equipmentType = report.equipment_type || report.audit_type || 'audit';
      
      // Use correct PDF endpoint based on report type
      let pdfUrl;
      if (equipmentType === 'ir-thermography' || report.report_category === 'ir-thermography') {
        pdfUrl = `${API_URL}/api/ir-thermography-report/${report.id}/pdf`;
      } else {
        pdfUrl = `${API_URL}/api/equipment-report/${equipmentType}/${report.id}/pdf`;
      }
      
      const response = await fetch(pdfUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Audit_Report_${report.report_no?.replace(/\//g, '_') || 'report'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setActionLoading(prev => ({ ...prev, [report.id]: null }));
    }
  };

  const handleDelete = async (report) => {
    if (!window.confirm(`Are you sure you want to delete report ${report.report_no}?`)) return;
    
    setActionLoading(prev => ({ ...prev, [report.id]: 'delete' }));
    try {
      await testReportsAPI.delete(report.id);
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    } finally {
      setActionLoading(prev => ({ ...prev, [report.id]: null }));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} report(s)?`)) return;
    
    setDeletingBulk(true);
    try {
      await Promise.all(selectedItems.map(id => testReportsAPI.delete(id)));
      setSelectedItems([]);
      fetchReports();
    } catch (error) {
      console.error('Error deleting reports:', error);
      alert('Failed to delete some reports');
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
    if (selectedItems.length === filteredReports.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredReports.map(r => r.id));
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.report_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.document_details?.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || 
      report.equipment_type === selectedType || 
      report.audit_type === selectedType;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/projects/project-reports"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-green-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Audit Reports</h1>
              <p className="text-slate-500">IR Thermography & Safety compliance audit reports</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/projects/project-reports/audit/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          data-testid="create-audit-report"
        >
          <Plus size={18} />
          New Audit Report
        </button>
      </div>

      {/* Audit Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {AUDIT_TYPES.map((type) => {
          const Icon = type.icon;
          const typeReports = reports.filter(r => r.equipment_type === type.id || r.audit_type === type.id);
          
          // Special handling for IR Thermography - direct to new form
          const handleClick = () => {
            if (type.id === 'ir-thermography') {
              navigate('/projects/project-reports/audit/ir-thermography/new');
            } else {
              navigate(`/projects/project-reports/audit/${type.id}`);
            }
          };
          
          return (
            <button
              key={type.id}
              onClick={handleClick}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-slate-300 transition-all text-left"
            >
              <div className={`${type.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="text-white" size={20} />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">{type.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{type.description}</p>
              <p className="text-lg font-bold text-slate-700 mt-2">{typeReports.length} Reports</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by report no, customer, or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {AUDIT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Bulk Actions Bar */}
        {selectedItems.length > 0 && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-green-700">
              <span className="font-semibold">{selectedItems.length}</span> report(s) selected
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

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-green-50 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <ClipboardCheck size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Audit Reports Found</h3>
            <p className="text-slate-500 mb-6">Start by creating your first audit report</p>
            <button
              onClick={() => navigate('/projects/project-reports/audit/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              <Plus size={18} />
              Create Audit Report
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={filteredReports.length > 0 && selectedItems.length === filteredReports.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Report No</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Customer/Site</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className={`hover:bg-slate-50 ${selectedItems.includes(report.id) ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(report.id)}
                        onChange={() => toggleSelectItem(report.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{report.report_no}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {getAuditTypeName(report.equipment_type || report.audit_type)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>
                        <p className="font-medium">{report.customer_name || report.document_details?.client || '-'}</p>
                        <p className="text-xs text-slate-500">{report.location || report.site_location || report.document_details?.location || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {report.audit_date || report.test_date || report.visit_date || report.document_details?.date_of_ir_study || '-'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleClone(report)}
                          disabled={actionLoading[report.id] === 'clone'}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700"
                          title="Clone"
                        >
                          {actionLoading[report.id] === 'clone' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                        </button>
                        <button 
                          onClick={() => navigate(`/projects/project-reports/audit/${report.equipment_type || report.audit_type}/${report.id}/edit`)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedReport(report);
                            setEmailModalOpen(true);
                          }}
                          className="p-2 hover:bg-purple-100 rounded-lg text-slate-500 hover:text-purple-600"
                          title="Send Email"
                        >
                          <Mail size={16} />
                        </button>
                        <button 
                          onClick={() => handleDownloadPDF(report)}
                          disabled={actionLoading[report.id] === 'download'}
                          className="p-2 hover:bg-green-100 rounded-lg text-slate-500 hover:text-green-600"
                          title="Download PDF"
                        >
                          {actionLoading[report.id] === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        </button>
                        <button 
                          onClick={() => handleDelete(report)}
                          disabled={actionLoading[report.id] === 'delete'}
                          className="p-2 hover:bg-red-100 rounded-lg text-slate-500 hover:text-red-600"
                          title="Delete"
                        >
                          {actionLoading[report.id] === 'delete' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Modal */}
      <SendEmailModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onSend={(result) => {
          alert(`Email sent successfully to ${result.to}`);
        }}
      />
    </div>
  );
};

export { AUDIT_TYPES };
export default AuditReports;
