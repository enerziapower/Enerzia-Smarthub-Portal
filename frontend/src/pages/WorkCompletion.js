import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck, Plus, Eye, Download, Trash2, Edit2, X, Save, Loader2, 
  Calendar, ClipboardList, Building2, User, MapPin, DollarSign, Paperclip, FileText, Upload,
  ArrowLeft
} from 'lucide-react';
import { projectsAPI, departmentTeamAPI, workCompletionAPI, projectsAPI as uploadAPI } from '../services/api';
import { DatePicker } from '../components/ui/date-picker';

const WorkCompletion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, teamRes, certRes] = await Promise.all([
        projectsAPI.getAll(),
        departmentTeamAPI.getTeam('projects'),
        workCompletionAPI.getAll(),
      ]);
      
      setProjects(projectsRes.data);
      setTeamMembers(teamRes.data.filter(e => e.is_active !== false));
      setCertificates(certRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (certificateId) => {
    try {
      const response = await workCompletionAPI.downloadPDF(certificateId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `work_completion_certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const handleDeleteCertificate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this certificate?')) return;
    try {
      await workCompletionAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting certificate:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} certificate(s)?`)) return;
    
    setDeletingBulk(true);
    try {
      await Promise.all(selectedItems.map(id => workCompletionAPI.delete(id)));
      setSelectedItems([]);
      loadData();
    } catch (error) {
      console.error('Error deleting certificates:', error);
      alert('Failed to delete some certificates');
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
    if (selectedItems.length === certificates.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(certificates.map(c => c.id));
    }
  };

  const handleEdit = (cert) => {
    setSelectedCertificate(cert);
    setShowEditModal(true);
  };

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
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Go Back"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Work Completion Certificates</h1>
            <p className="text-sm text-slate-500">Manage work completion certificates for invoicing completed projects</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Certificate
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
              <p className="text-sm text-slate-500">Total Certificates</p>
              <p className="text-2xl font-bold text-slate-900">{certificates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <FileCheck size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Draft</p>
              <p className="text-2xl font-bold text-amber-600">
                {certificates.filter(c => c.status === 'Draft').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <FileCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Submitted</p>
              <p className="text-2xl font-bold text-blue-600">
                {certificates.filter(c => c.status === 'Submitted').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <FileCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-emerald-600">
                {certificates.filter(c => c.status === 'Approved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Certificates List */}
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
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={certificates.length > 0 && selectedItems.length === certificates.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Document No</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed On</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {certificates.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-slate-500">
                  <FileCheck size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No certificates created yet</p>
                  <p className="text-sm mt-1">Create your first work completion certificate</p>
                </td>
              </tr>
            ) : (
              certificates.map(cert => (
                <tr key={cert.id} className={`hover:bg-slate-50 ${selectedItems.includes(cert.id) ? 'bg-blue-50' : ''}`}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(cert.id)}
                      onChange={() => toggleSelectItem(cert.id)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-semibold text-slate-900">{cert.document_no}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{cert.pid_no}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{cert.project_name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-700">{cert.customer_name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-700">{cert.completed_on}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-slate-900">
                      ₹{(cert.billed_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      cert.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : cert.status === 'Submitted'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {cert.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedCertificate(cert);
                          setShowViewModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(cert)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(cert.id)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCertificate(cert.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create Certificate Modal */}
      {showCreateModal && (
        <CertificateFormModal
          mode="create"
          projects={projects.filter(p => 
            p.status === 'Completed' || 
            p.status === 'Invoiced' || 
            p.status === 'Partially Invoiced'
          )}
          teamMembers={teamMembers}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* Edit Certificate Modal */}
      {showEditModal && selectedCertificate && (
        <CertificateFormModal
          mode="edit"
          certificate={selectedCertificate}
          projects={projects}
          teamMembers={teamMembers}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCertificate(null);
          }}
          onSaved={() => {
            setShowEditModal(false);
            setSelectedCertificate(null);
            loadData();
          }}
        />
      )}

      {/* View Certificate Modal */}
      {showViewModal && selectedCertificate && (
        <ViewCertificateModal
          certificate={selectedCertificate}
          onClose={() => {
            setShowViewModal(false);
            setSelectedCertificate(null);
          }}
          onDownloadPDF={() => handleDownloadPDF(selectedCertificate.id)}
          onEdit={() => {
            setShowViewModal(false);
            setShowEditModal(true);
          }}
        />
      )}
    </div>
  );
};

// Certificate Form Modal Component (Create & Edit)
const CertificateFormModal = ({ mode, certificate, projects, teamMembers, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    project_id: certificate?.project_id || '',
    work_started_on: certificate?.work_started_on || '',
    completed_on: certificate?.completed_on || '',
    order_no: certificate?.order_no || '',
    order_dated: certificate?.order_dated || '',
    order_amount: certificate?.order_amount || 0,
    billed_amount: certificate?.billed_amount || 0,
    customer_representative: certificate?.customer_representative || '',
    customer_address: certificate?.customer_address || '',
    executed_by: certificate?.executed_by || '',
    supervised_by: certificate?.supervised_by || '',
    work_items: certificate?.work_items || [],
    quality_compliance: certificate?.quality_compliance || 'Complied',
    as_built_drawings: certificate?.as_built_drawings || 'Submitted',
    statutory_compliance: certificate?.statutory_compliance || 'Submitted',
    site_measurements: certificate?.site_measurements || 'Completed',
    snag_points: certificate?.snag_points || 'None',
    feedback_comments: certificate?.feedback_comments || '',
    annexures: certificate?.annexures || [],
    status: certificate?.status || 'Draft',
  });

  useEffect(() => {
    if (mode === 'edit' && certificate) {
      const project = projects.find(p => p.id === certificate.project_id);
      setSelectedProject(project || null);
    }
  }, [mode, certificate, projects]);

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setFormData({
        ...formData,
        project_id: projectId,
        order_no: project.po_number || '',
        order_amount: project.po_amount || 0,
        billed_amount: project.invoiced_amount || 0,
        executed_by: project.engineer_in_charge || '',
        work_started_on: project.project_date || '',
        completed_on: project.completion_date || '',
      });
    }
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    // Convert DD/MM/YYYY to YYYY-MM-DD for input type="date"
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const formatDateForStorage = (dateStr) => {
    if (!dateStr) return '';
    // Convert YYYY-MM-DD to DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const addWorkItem = () => {
    const newItem = {
      sno: formData.work_items.length + 1,
      description: '',
      unit: 'NOS',
      order_quantity: 0,
      billed_quantity: 0,
      unit_rate: 0,
      total_amount: 0,
      status: 'Completed',
      remarks: ''
    };
    setFormData({
      ...formData,
      work_items: [...formData.work_items, newItem]
    });
  };

  const updateWorkItem = (index, field, value) => {
    const items = [...formData.work_items];
    items[index][field] = value;
    // Auto-calculate total
    if (field === 'billed_quantity' || field === 'unit_rate') {
      items[index].total_amount = items[index].billed_quantity * items[index].unit_rate;
    }
    // Update serial numbers
    items.forEach((item, idx) => {
      item.sno = idx + 1;
    });
    setFormData({ ...formData, work_items: items });
  };

  const removeWorkItem = (index) => {
    const items = formData.work_items.filter((_, i) => i !== index);
    // Re-number items
    items.forEach((item, idx) => {
      item.sno = idx + 1;
    });
    setFormData({ ...formData, work_items: items });
  };

  const calculateTotalAmount = () => {
    return formData.work_items.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  };

  // Annexure handling functions
  const addAnnexure = () => {
    const newAnnexure = {
      type: 'delivery_challan',
      description: '',
      number: '',
      dated: '',
      attachment_url: ''
    };
    setFormData({
      ...formData,
      annexures: [...formData.annexures, newAnnexure]
    });
  };

  const updateAnnexure = (index, field, value) => {
    const items = [...formData.annexures];
    items[index][field] = value;
    setFormData({ ...formData, annexures: items });
  };

  const removeAnnexure = (index) => {
    const items = formData.annexures.filter((_, i) => i !== index);
    setFormData({ ...formData, annexures: items });
  };

  const handleAnnexureFileUpload = async (index, file) => {
    if (!file) return;
    
    // Validate file type (PDF only)
    if (!file.type.includes('pdf')) {
      alert('Only PDF files are allowed for annexure attachments');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await uploadAPI.uploadPO(file);
      
      if (response.data && response.data.filename) {
        updateAnnexure(index, 'attachment_url', `/api/uploads/${response.data.filename}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleSubmit = async () => {
    if (!formData.project_id && mode === 'create') {
      alert('Please select a project');
      return;
    }
    if (!formData.work_started_on || !formData.completed_on) {
      alert('Please enter work start and completion dates');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await workCompletionAPI.create(formData);
      } else {
        await workCompletionAPI.update(certificate.id, formData);
      }
      onSaved();
    } catch (error) {
      console.error('Error saving certificate:', error);
      alert('Failed to save certificate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'create' ? 'Create Work Completion Certificate' : 'Edit Certificate'}
            </h2>
            {mode === 'edit' && (
              <p className="text-sm text-slate-500">{certificate?.document_no}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Project Selection (only for create mode) */}
          {mode === 'create' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <label className="block text-sm font-semibold text-blue-800 mb-2">Select Project *</label>
              <select
                value={formData.project_id}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full px-3 py-2.5 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Completed/Invoiced Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.pid_no} - {p.project_name} ({p.client})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedProject || mode === 'edit') && (
            <>
              {/* Project Info Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Building2 size={16} />
                  Project Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">PID:</span>
                    <span className="ml-2 font-semibold text-slate-900">
                      {selectedProject?.pid_no || certificate?.pid_no}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Customer:</span>
                    <span className="ml-2 font-semibold text-slate-900">
                      {selectedProject?.client || certificate?.customer_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span>
                    <span className="ml-2 font-semibold text-slate-900">
                      {selectedProject?.location || certificate?.site_location}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">PO Amount:</span>
                    <span className="ml-2 font-semibold text-slate-900">
                      ₹{(selectedProject?.po_amount || certificate?.order_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates with Calendar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Work Started *
                  </label>
                  <DatePicker
                    value={formatDateForInput(formData.work_started_on)}
                    onChange={(val) => setFormData({ ...formData, work_started_on: formatDateForStorage(val) })}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Completed On *
                  </label>
                  <DatePicker
                    value={formatDateForInput(formData.completed_on)}
                    onChange={(val) => setFormData({ ...formData, completed_on: formatDateForStorage(val) })}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order No</label>
                  <input
                    type="text"
                    value={formData.order_no}
                    onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Order Dated
                  </label>
                  <DatePicker
                    value={formatDateForInput(formData.order_dated)}
                    onChange={(val) => setFormData({ ...formData, order_dated: formatDateForStorage(val) })}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                    <input
                      type="number"
                      value={formData.order_amount}
                      onChange={(e) => setFormData({ ...formData, order_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Billed Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                    <input
                      type="number"
                      value={formData.billed_amount}
                      onChange={(e) => setFormData({ ...formData, billed_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer Representative</label>
                  <input
                    type="text"
                    value={formData.customer_representative}
                    onChange={(e) => setFormData({ ...formData, customer_representative: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer Address</label>
                  <input
                    type="text"
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Executed By / Supervised By */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <User size={14} className="inline mr-1" />
                    Executed By
                  </label>
                  <select
                    value={formData.executed_by}
                    onChange={(e) => setFormData({ ...formData, executed_by: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select Team Member</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <User size={14} className="inline mr-1" />
                    Supervised By
                  </label>
                  <select
                    value={formData.supervised_by}
                    onChange={(e) => setFormData({ ...formData, supervised_by: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select Supervisor</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Work Items / Work Summary */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardList size={16} />
                    Work Summary / Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={addWorkItem}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white text-slate-900 rounded-lg hover:bg-slate-100 font-medium"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>
                
                {formData.work_items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-12">S.No</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 min-w-[200px]">Description</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-20">Unit</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-20">Qty</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-24">Rate (₹)</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-28">Amount (₹)</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-24">Status</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.work_items.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <textarea
                                value={item.description}
                                onChange={(e) => updateWorkItem(index, 'description', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm resize-none"
                                rows={2}
                                placeholder="Enter work description..."
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.unit}
                                onChange={(e) => updateWorkItem(index, 'unit', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                              >
                                <option value="NOS">NOS</option>
                                <option value="SQ.FT.">SQ.FT.</option>
                                <option value="SQ.M.">SQ.M.</option>
                                <option value="RMT">RMT</option>
                                <option value="LS">LS</option>
                                <option value="KG">KG</option>
                                <option value="MT">MT</option>
                                <option value="SET">SET</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={item.billed_quantity}
                                onChange={(e) => updateWorkItem(index, 'billed_quantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={item.unit_rate}
                                onChange={(e) => updateWorkItem(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.total_amount.toLocaleString('en-IN')}
                                readOnly
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 text-right font-medium"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.status}
                                onChange={(e) => updateWorkItem(index, 'status', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                              >
                                <option value="Completed">Completed</option>
                                <option value="Pending">Pending</option>
                                <option value="Partial">Partial</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => removeWorkItem(index)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan="5" className="py-3 px-3 text-right font-semibold text-slate-700">
                            TOTAL AMOUNT:
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 text-right">
                            ₹{calculateTotalAmount().toLocaleString('en-IN')}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />
                    <p>No work items added yet</p>
                    <p className="text-sm">Click "Add Line Item" to add work summary</p>
                  </div>
                )}
              </div>

              {/* List of Annexure Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Paperclip size={16} />
                    List of Annexure
                  </h3>
                  <button
                    type="button"
                    onClick={addAnnexure}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white text-emerald-700 rounded-lg hover:bg-slate-100 font-medium"
                  >
                    <Plus size={14} /> Add Annexure
                  </button>
                </div>
                
                {formData.annexures.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-12">S.No</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-40">Type</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 min-w-[180px]">Description</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-32">Reference No.</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-28">Dated</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-40">Attachment</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.annexures.map((annexure, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <span className="w-6 h-6 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={annexure.type}
                                onChange={(e) => updateAnnexure(index, 'type', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                              >
                                <option value="delivery_challan">Delivery Challan</option>
                                <option value="drawing_ref">Drawing Reference</option>
                                <option value="transport_details">Transport Details</option>
                                <option value="eway_bill">E-Way Bill</option>
                                <option value="other_document">Other Document</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={annexure.description}
                                onChange={(e) => updateAnnexure(index, 'description', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                                placeholder="Enter description..."
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={annexure.number}
                                onChange={(e) => updateAnnexure(index, 'number', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                                placeholder="Ref #"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <DatePicker
                                value={formatDateForInput(annexure.dated)}
                                onChange={(val) => updateAnnexure(index, 'dated', formatDateForStorage(val))}
                                placeholder="Select"
                                className="h-8 border-slate-200 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {annexure.attachment_url ? (
                                  <div className="flex items-center gap-1">
                                    <FileText size={14} className="text-emerald-600" />
                                    <span className="text-xs text-emerald-600 truncate max-w-[80px]">Attached</span>
                                    <button
                                      type="button"
                                      onClick={() => updateAnnexure(index, 'attachment_url', '')}
                                      className="text-red-400 hover:text-red-600"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded cursor-pointer hover:bg-slate-200">
                                    <Upload size={12} />
                                    <span>Upload PDF</span>
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      className="hidden"
                                      onChange={(e) => handleAnnexureFileUpload(index, e.target.files[0])}
                                    />
                                  </label>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => removeAnnexure(index)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <Paperclip size={32} className="mx-auto mb-2 text-slate-300" />
                    <p>No annexures added yet</p>
                    <p className="text-sm">Click "Add Annexure" to add delivery challans, drawings, e-way bills, etc.</p>
                  </div>
                )}
              </div>

              {/* Compliance */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quality Compliance</label>
                  <select
                    value={formData.quality_compliance}
                    onChange={(e) => setFormData({ ...formData, quality_compliance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Complied">Complied</option>
                    <option value="Partially Complied">Partially Complied</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">As-Built Drawings</label>
                  <select
                    value={formData.as_built_drawings}
                    onChange={(e) => setFormData({ ...formData, as_built_drawings: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Pending">Pending</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Statutory Compliance</label>
                  <select
                    value={formData.statutory_compliance}
                    onChange={(e) => setFormData({ ...formData, statutory_compliance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Pending">Pending</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Measurements</label>
                  <select
                    value={formData.site_measurements}
                    onChange={(e) => setFormData({ ...formData, site_measurements: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Snag Points</label>
                  <input
                    type="text"
                    value={formData.snag_points}
                    onChange={(e) => setFormData({ ...formData, snag_points: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="None / List any pending items"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Certificate Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feedback & Comments</label>
                <textarea
                  rows={3}
                  value={formData.feedback_comments}
                  onChange={(e) => setFormData({ ...formData, feedback_comments: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Enter any feedback or comments..."
                />
              </div>
            </>
          )}
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
            disabled={saving || (!formData.project_id && mode === 'create')}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {mode === 'create' ? 'Create Certificate' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// View Certificate Modal Component
const ViewCertificateModal = ({ certificate, onClose, onDownloadPDF, onEdit }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">Work Completion Certificate</h2>
            <p className="text-sm text-slate-300">{certificate.document_no}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-slate-900 rounded-lg hover:bg-slate-100 font-medium"
            >
              <Edit2 size={16} />
              Edit
            </button>
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
            >
              <Download size={16} />
              PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Project Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Project Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Project Name:</span>
                  <span className="font-medium text-slate-900">{certificate.project_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">PID No:</span>
                  <span className="font-medium text-slate-900">{certificate.pid_no}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium text-slate-900">{certificate.customer_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-medium text-slate-900">{certificate.site_location}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Work Started:</span>
                  <span className="font-medium text-slate-900">{certificate.work_started_on}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Completed On:</span>
                  <span className="font-medium text-slate-900">{certificate.completed_on}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Order Amount:</span>
                  <span className="font-medium text-slate-900">₹{(certificate.order_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Billed Amount:</span>
                  <span className="font-medium text-emerald-600">₹{(certificate.billed_amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Work Items */}
          {certificate.work_items && certificate.work_items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Work Summary</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">S.No</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Description</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">Qty</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Amount</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certificate.work_items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-medium">{i + 1}</td>
                        <td className="py-2 px-3">{item.description}</td>
                        <td className="py-2 px-3 text-center">{item.billed_quantity} {item.unit}</td>
                        <td className="py-2 px-3 text-right font-medium">₹{(item.total_amount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100">
                    <tr>
                      <td colSpan="3" className="py-2 px-3 text-right font-semibold">Total:</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{certificate.work_items.reduce((sum, item) => sum + (item.total_amount || 0), 0).toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* Compliance */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Compliance Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Quality Compliance</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  certificate.quality_compliance === 'Complied' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {certificate.quality_compliance}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">As-Built Drawings</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  certificate.as_built_drawings === 'Submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {certificate.as_built_drawings}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Site Measurements</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  certificate.site_measurements === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {certificate.site_measurements}
                </span>
              </div>
            </div>
          </div>

          {/* Executed By */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Executed By</p>
              <p className="font-semibold text-slate-900">{certificate.executed_by || '-'}</p>
              <p className="text-sm text-slate-500">{certificate.vendor_name}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Supervised By</p>
              <p className="font-semibold text-slate-900">{certificate.supervised_by || '-'}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg text-white">
            <span className="text-sm">Certificate Status</span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              certificate.status === 'Approved'
                ? 'bg-emerald-500'
                : certificate.status === 'Submitted'
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
            }`}>
              {certificate.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkCompletion;
