import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Shield, ClipboardCheck, FileText, AlertCircle } from 'lucide-react';
import { testReportsAPI, projectsAPI } from '../../services/api';
import { DatePicker } from '../../components/ui/date-picker';

const AUDIT_TYPES = [
  { id: 'electrical-safety', name: 'Electrical Safety Audit', icon: Shield, color: 'bg-red-500' },
  { id: 'energy-audit', name: 'Energy Audit', icon: ClipboardCheck, color: 'bg-green-500' },
  { id: 'compliance-audit', name: 'Compliance Audit', icon: FileText, color: 'bg-blue-500' },
  { id: 'fire-safety', name: 'Fire Safety Audit', icon: AlertCircle, color: 'bg-orange-500' },
];

const CreateAuditReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    equipment_type: 'audit',
    report_category: 'audit',
    audit_type: searchParams.get('type') || 'electrical-safety',
    customer_name: '',
    location: '',
    project_id: '',
    audit_date: new Date().toISOString().split('T')[0],
    auditor_name: '',
    auditor_qualification: '',
    scope_of_audit: '',
    findings: [],
    non_conformities: [],
    recommendations: '',
    overall_rating: 'satisfactory',
    status: 'draft'
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProjectSelect = (e) => {
    const projectId = e.target.value;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setFormData(prev => ({
        ...prev,
        project_id: projectId,
        customer_name: project.client || '',
        location: project.location || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, project_id: '' }));
    }
  };

  const addFinding = () => {
    setFormData(prev => ({
      ...prev,
      findings: [...prev.findings, { area: '', observation: '', severity: 'low', recommendation: '' }]
    }));
  };

  const updateFinding = (index, field, value) => {
    const updated = [...formData.findings];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, findings: updated }));
  };

  const removeFinding = (index) => {
    setFormData(prev => ({
      ...prev,
      findings: prev.findings.filter((_, i) => i !== index)
    }));
  };

  const addNonConformity = () => {
    setFormData(prev => ({
      ...prev,
      non_conformities: [...prev.non_conformities, { description: '', category: 'minor', corrective_action: '', deadline: '' }]
    }));
  };

  const updateNonConformity = (index, field, value) => {
    const updated = [...formData.non_conformities];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, non_conformities: updated }));
  };

  const removeNonConformity = (index) => {
    setFormData(prev => ({
      ...prev,
      non_conformities: prev.non_conformities.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await testReportsAPI.create(formData);
      navigate('/projects/project-reports/audit');
    } catch (error) {
      console.error('Error creating audit report:', error);
      alert('Failed to create report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedAuditType = AUDIT_TYPES.find(t => t.id === formData.audit_type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/projects/project-reports/audit"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div className="flex items-center gap-3">
          {selectedAuditType && (
            <div className={`${selectedAuditType.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
              <selectedAuditType.icon className="text-white" size={24} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">New Audit Report</h1>
            <p className="text-slate-500 mt-1">{selectedAuditType?.name || 'Create audit report'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Audit Type *</label>
              <select
                name="audit_type"
                value={formData.audit_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                {AUDIT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project (Optional)</label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleProjectSelect}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.pid_no} - {p.client}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer/Organization *</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location/Site *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Audit Date *</label>
              <DatePicker
                value={formData.audit_date}
                onChange={(val) => handleChange({ target: { name: 'audit_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Auditor Name</label>
              <input
                type="text"
                name="auditor_name"
                value={formData.auditor_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Auditor Qualification</label>
              <input
                type="text"
                name="auditor_qualification"
                value={formData.auditor_qualification}
                onChange={handleChange}
                placeholder="e.g., Certified Energy Auditor, Licensed Electrical Engineer"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Scope */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Audit Scope</h2>
          <textarea
            name="scope_of_audit"
            value={formData.scope_of_audit}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Define the scope and boundaries of this audit..."
          />
        </div>

        {/* Findings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Audit Findings</h2>
            <button
              type="button"
              onClick={addFinding}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"
            >
              <Plus size={16} /> Add Finding
            </button>
          </div>
          {formData.findings.length === 0 ? (
            <p className="text-slate-500 text-sm">No findings added. Click "Add Finding" to start.</p>
          ) : (
            <div className="space-y-4">
              {formData.findings.map((finding, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Area/Location"
                      value={finding.area}
                      onChange={(e) => updateFinding(index, 'area', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <select
                      value={finding.severity}
                      onChange={(e) => updateFinding(index, 'severity', e.target.value)}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeFinding(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea
                    placeholder="Observation"
                    value={finding.observation}
                    onChange={(e) => updateFinding(index, 'observation', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Recommendation"
                    value={finding.recommendation}
                    onChange={(e) => updateFinding(index, 'recommendation', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Non-Conformities */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Non-Conformities</h2>
            <button
              type="button"
              onClick={addNonConformity}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              <Plus size={16} /> Add NC
            </button>
          </div>
          {formData.non_conformities.length === 0 ? (
            <p className="text-slate-500 text-sm">No non-conformities recorded.</p>
          ) : (
            <div className="space-y-4">
              {formData.non_conformities.map((nc, index) => (
                <div key={index} className="p-4 bg-red-50 rounded-lg space-y-3">
                  <div className="flex gap-3">
                    <select
                      value={nc.category}
                      onChange={(e) => updateNonConformity(index, 'category', e.target.value)}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="minor">Minor</option>
                      <option value="major">Major</option>
                      <option value="critical">Critical</option>
                    </select>
                    <DatePicker
                      value={nc.deadline}
                      onChange={(val) => updateNonConformity(index, 'deadline', val)}
                      placeholder="Deadline"
                      className="w-40 h-10 border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeNonConformity(index)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea
                    placeholder="Description of non-conformity"
                    value={nc.description}
                    onChange={(e) => updateNonConformity(index, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Corrective Action Required"
                    value={nc.corrective_action}
                    onChange={(e) => updateNonConformity(index, 'corrective_action', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations & Rating */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Overall Assessment</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recommendations</label>
              <textarea
                name="recommendations"
                value={formData.recommendations}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Overall recommendations based on audit findings..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overall Rating</label>
              <select
                name="overall_rating"
                value={formData.overall_rating}
                onChange={handleChange}
                className="w-full md:w-64 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="excellent">Excellent - Fully Compliant</option>
                <option value="good">Good - Minor Issues</option>
                <option value="satisfactory">Satisfactory - Some Improvements Needed</option>
                <option value="needs-improvement">Needs Improvement - Major Issues</option>
                <option value="critical">Critical - Immediate Action Required</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status & Submit */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Report Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Link
                to="/projects/project-reports/audit"
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
                data-testid="save-audit-report"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Report
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateAuditReport;
