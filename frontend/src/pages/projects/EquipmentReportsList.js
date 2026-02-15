import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, Filter, FileText, Calendar, 
  User, MapPin, Edit, Trash2, Download, Copy,
  CheckCircle, AlertCircle, Clock, Loader2, Mail, X, Send
} from 'lucide-react';
import { EQUIPMENT_TYPES } from './EquipmentTestReports';
import { testReportsAPI } from '../../services/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Equipment types that use the new template-based service report form
const SERVICE_REPORT_EQUIPMENT = ['acb', 'mccb', 'vcb', 'dg', 'ups', 'electrical-panel', 'lightning-arrestor', 'relay', 'apfc', 'earth-pit', 'energy-meter', 'voltmeter', 'ammeter', 'battery'];

// Email Modal Component
const SendEmailModal = ({ isOpen, onClose, report, onSend, equipmentId }) => {
  const [toEmail, setToEmail] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (report) {
      // Pre-fill customer email if available
      setToEmail(report.contact_email || report.customer_email || '');
      // Pre-fill CC with engineer email
      setCcEmails(report.engineer_email || '');
    }
  }, [report]);

  const handleSend = async () => {
    if (!toEmail.trim()) {
      setError('Please enter recipient email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      // Use transformer-specific endpoint for transformer, generic endpoint for others
      const endpoint = equipmentId === 'transformer' 
        ? `${API_URL}/api/transformer-report/${report.id}/send-email`
        : `${API_URL}/api/equipment-report/${equipmentId}/${report.id}/send-email`;
      
      const response = await fetch(endpoint, {
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
      
      // Reset form
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Send Report via Email</h3>
              <p className="text-sm text-slate-500">{report?.report_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* To Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              To (Customer Email) <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="customer@company.com"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* CC Emails */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              CC (Engineer/Manager Emails)
            </label>
            <input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="engineer@company.com, manager@company.com"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">Separate multiple emails with commas</p>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Custom Message (Optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal note to the customer..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Email Preview */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Email Preview</p>
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-medium">Subject:</span> Transformer Test Report - {report?.report_no} | Enerzia Power Solutions</p>
              <p><span className="font-medium">Attachment:</span> Transformer_Test_Report_{report?.report_no?.replace(/\//g, '_')}.pdf</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const EquipmentReportsList = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [cloningId, setCloningId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);

  const equipment = EQUIPMENT_TYPES.find(e => e.id === equipmentId);
  const Icon = equipment?.icon;

  useEffect(() => {
    fetchReports();
  }, [equipmentId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await testReportsAPI.getByEquipment(equipmentId);
      setReports(response.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.report_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReports(filteredReports.map(r => r.id));
      setSelectAll(true);
    } else {
      setSelectedReports([]);
      setSelectAll(false);
    }
  };

  const handleSelectReport = (reportId) => {
    setSelectedReports(prev => {
      if (prev.includes(reportId)) {
        return prev.filter(id => id !== reportId);
      } else {
        return [...prev, reportId];
      }
    });
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeletingId(reportId);
      await testReportsAPI.delete(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      setSelectedReports(prev => prev.filter(id => id !== reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0) {
      alert('Please select at least one report to delete');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedReports.length} report(s)? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setDeletingId('bulk');
      for (const reportId of selectedReports) {
        await testReportsAPI.delete(reportId);
      }
      setReports(prev => prev.filter(r => !selectedReports.includes(r.id)));
      setSelectedReports([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error deleting reports:', error);
      alert('Failed to delete some reports. Please refresh and try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloneReport = async (report) => {
    try {
      setCloningId(report.id);
      
      // Create a copy of the report with modified fields
      const clonedData = {
        ...report,
        id: undefined,
        report_no: undefined,
        status: 'draft',
        created_at: undefined,
        updated_at: undefined,
        engineer_signature_date: new Date().toISOString().split('T')[0],
        customer_signature_date: '',
        customer_signature_name: ''
      };
      
      // Remove the id and other auto-generated fields
      delete clonedData.id;
      delete clonedData.report_no;
      delete clonedData._id;
      
      const response = await testReportsAPI.create(clonedData);
      
      if (response.data) {
        alert(`Report cloned successfully! New report: ${response.data.report_no}`);
        // Navigate to edit the cloned report
        if (equipmentId === 'transformer') {
          navigate(`/projects/project-reports/equipment/transformer/${response.data.id}/edit`);
        } else if (SERVICE_REPORT_EQUIPMENT.includes(equipmentId)) {
          navigate(`/projects/project-reports/service/${equipmentId}/${response.data.id}/edit`);
        } else {
          navigate(`/projects/project-reports/equipment/${equipmentId}/${response.data.id}/edit`);
        }
      }
    } catch (error) {
      console.error('Error cloning report:', error);
      alert('Failed to clone report. Please try again.');
    } finally {
      setCloningId(null);
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
            <AlertCircle size={12} /> Pending Review
          </span>
        );
      default:
        return null;
    }
  };

  const handleDownloadPDF = async (reportId, reportNo) => {
    try {
      setDownloadingId(reportId);
      const token = localStorage.getItem('token');
      
      // Use dedicated PDF endpoints for specific equipment types
      let endpoint;
      if (equipmentId === 'transformer') {
        endpoint = `${API_URL}/api/transformer-report/${reportId}/pdf`;
      } else {
        endpoint = `${API_URL}/api/equipment-report/${equipmentId}/${reportId}/pdf`;
      }
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportNo?.replace(/\//g, '_') || 'report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Email handlers
  const handleOpenEmailModal = (report) => {
    setSelectedReportForEmail(report);
    setEmailModalOpen(true);
  };

  const handleEmailSent = (result) => {
    alert(`Email sent successfully to ${result.to}${result.cc?.length ? ` (CC: ${result.cc.join(', ')})` : ''}`);
  };

  if (!equipment) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Equipment type not found</p>
        <Link to="/projects/project-reports/equipment" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Equipment Test Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects/project-reports/equipment')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`${equipment.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
              <Icon className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{equipment.name} Reports</h1>
              <p className="text-slate-500">{equipment.description}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            // Use dedicated form for transformer test reports
            if (equipmentId === 'transformer') {
              navigate('/projects/project-reports/equipment/transformer/new');
            } else if (SERVICE_REPORT_EQUIPMENT.includes(equipmentId)) {
              navigate(`/projects/project-reports/service/${equipmentId}/new`);
            } else {
              navigate(`/projects/project-reports/equipment/${equipmentId}/new`);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 ${equipment.color} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
          data-testid="create-new-report"
        >
          <Plus size={18} />
          New Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by report no, project, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>
          {selectedReports.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deletingId === 'bulk'}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === 'bulk' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Trash2 size={18} />
              )}
              Delete Selected ({selectedReports.length})
            </button>
          )}
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <div className={`${equipment.lightColor} w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center`}>
              <FileText size={32} className={equipment.textColor} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Reports Found</h3>
            <p className="text-slate-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'No reports match your search criteria'
                : `Start by creating your first ${equipment.name} test report`
              }
            </p>
            <button
              onClick={() => {
                if (equipmentId === 'transformer') {
                  navigate('/projects/project-reports/equipment/transformer/new');
                } else {
                  navigate(`/projects/project-reports/equipment/${equipmentId}/new`);
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 ${equipment.color} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
            >
              <Plus size={18} />
              Create First Report
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Report No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project / Site</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tested By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className={`hover:bg-slate-50 transition-colors ${selectedReports.includes(report.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report.id)}
                        onChange={() => handleSelectReport(report.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-800">{report.report_no}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-600">{report.project_name || report.customer_name || '-'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin size={14} />
                        <span>{report.location || report.site_location || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar size={14} />
                        <span>{report.test_date || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-slate-500">
                        <User size={14} />
                        <span>{report.tested_by || report.engineer_name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Clone Report Button */}
                        <button
                          onClick={() => handleCloneReport(report)}
                          disabled={cloningId === report.id}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Clone Report"
                        >
                          {cloningId === report.id ? (
                            <Loader2 size={16} className="text-blue-500 animate-spin" />
                          ) : (
                            <Copy size={16} className="text-blue-500" />
                          )}
                        </button>
                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            if (equipmentId === 'transformer') {
                              navigate(`/projects/project-reports/equipment/transformer/${report.id}/edit`);
                            } else if (SERVICE_REPORT_EQUIPMENT.includes(equipmentId)) {
                              navigate(`/projects/project-reports/service/${equipmentId}/${report.id}/edit`);
                            } else {
                              navigate(`/projects/project-reports/equipment/${equipmentId}/${report.id}/edit`);
                            }
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Report"
                        >
                          <Edit size={16} className="text-slate-500" />
                        </button>
                        {/* Send Email Button - Available for all equipment types */}
                        <button
                          onClick={() => handleOpenEmailModal(report)}
                          className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Send via Email"
                          data-testid={`send-email-btn-${report.id}`}
                        >
                          <Mail size={16} className="text-purple-500" />
                        </button>
                        {/* Download PDF Button */}
                        <button
                          onClick={() => handleDownloadPDF(report.id, report.report_no)}
                          disabled={downloadingId === report.id}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === report.id ? (
                            <Loader2 size={16} className="text-green-500 animate-spin" />
                          ) : (
                            <Download size={16} className="text-green-500" />
                          )}
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deletingId === report.id}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Report"
                        >
                          {deletingId === report.id ? (
                            <Loader2 size={16} className="text-red-500 animate-spin" />
                          ) : (
                            <Trash2 size={16} className="text-red-500" />
                          )}
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

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setSelectedReportForEmail(null);
        }}
        report={selectedReportForEmail}
        onSend={handleEmailSent}
        equipmentId={equipmentId}
      />
    </div>
  );
};

export default EquipmentReportsList;
