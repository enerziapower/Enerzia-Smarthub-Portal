import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Upload, Image, FileText,
  Thermometer, AlertTriangle, CheckCircle, Info, Users,
  Calendar, Building2, MapPin, X, Eye, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '../../components/ui/date-picker';

const API = process.env.REACT_APP_BACKEND_URL;

// Risk category colors and labels
const RISK_CATEGORIES = {
  Critical: { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  Warning: { label: 'Warning', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
  'Check & Monitor': { label: 'Check & Monitor', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  Normal: { label: 'Normal', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' }
};

// Calculate risk category based on Delta T (Updated Standards)
// ΔT ≤ 1°C → Normal
// ΔT > 1°C and < 4°C → Check & Monitor  
// ΔT ≥ 4°C and < 15°C → Warning
// ΔT ≥ 15°C → Critical
const calculateRiskCategory = (deltaT) => {
  if (deltaT >= 15) return 'Critical';
  if (deltaT >= 4) return 'Warning';
  if (deltaT > 1) return 'Check & Monitor';
  return 'Normal';
};

const IRThermographyForm = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const isEdit = Boolean(reportId);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const calibrationInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    report_type: 'pre-thermography',
    project_id: '',
    document_details: {
      revision_no: '00',
      submission_date: '',
      comments: '',
      client: '',
      location: '',
      work_order_number: '',
      work_order_date: '',
      work_done: 'Infrared Thermography Survey',
      date_of_ir_study: '',
      coordinating_person: '',
      thermography_inspection_by: '',
      report_prepared_by: '',
      report_reviewed_by: '',
      date_of_submission: ''
    },
    inspection_items: [],
    calibration_certificate: null,
    status: 'draft'
  });

  useEffect(() => {
    fetchProjects();
    fetchTeamMembers();
    if (isEdit) {
      fetchReport();
    }
  }, [reportId]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : (data.projects || []));
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch engineers (project team members)
      const response = await fetch(`${API}/api/settings/engineers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Map engineers to team members format
        const members = (Array.isArray(data) ? data : [])
          .filter(e => e.is_active !== false)
          .map(e => ({
            id: e.id,
            name: e.name
          }));
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/ir-thermography/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFormData({
          report_type: data.report_type || 'pre-thermography',
          project_id: data.project_id || '',
          document_details: data.document_details || formData.document_details,
          inspection_items: data.inspection_items || [],
          calibration_certificate: data.calibration_certificate || null,
          status: data.status || 'draft'
        });
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      document_details: {
        ...prev.document_details,
        [field]: value
      }
    }));
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      document_details: {
        ...prev.document_details,
        client: project?.client || '',
        location: project?.location || ''
      }
    }));
  };

  const addInspectionItem = () => {
    setFormData(prev => ({
      ...prev,
      inspection_items: [
        {
          item_id: `item_${Date.now()}`,
          location: '',
          panel: '',
          feeder: '',
          original_image: null,
          thermal_image: null,
          max_temperature: '',
          min_temperature: '',
          ambient_temperature: '',
          delta_t: 0,
          risk_category: 'Normal',
          recommended_action: 'No action required',
          analyzed_by: '',
          comments: ''
        },
        ...prev.inspection_items  // New item at the beginning, existing items after
      ]
    }));
  };

  const updateInspectionItem = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.inspection_items];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-calculate Delta T and Risk Category
      if (field === 'max_temperature' || field === 'min_temperature') {
        const maxTemp = parseFloat(field === 'max_temperature' ? value : updated[index].max_temperature) || 0;
        const minTemp = parseFloat(field === 'min_temperature' ? value : updated[index].min_temperature) || 0;
        const deltaT = maxTemp - minTemp;
        
        updated[index].delta_t = Math.round(deltaT * 10) / 10;
        updated[index].risk_category = calculateRiskCategory(deltaT);
        
        // Set recommended action based on risk
        const riskActions = {
          'Critical': 'Major discrepancy; repair immediately',
          'Warning': 'Indicates probable deficiency; repair as time permits',
          'Check & Monitor': 'Possible deficiency; warrants investigation',
          'Normal': 'No action required'
        };
        updated[index].recommended_action = riskActions[updated[index].risk_category];
      }
      
      return { ...prev, inspection_items: updated };
    });
  };

  const removeInspectionItem = (index) => {
    setFormData(prev => ({
      ...prev,
      inspection_items: prev.inspection_items.filter((_, i) => i !== index)
    }));
  };

  const cloneInspectionItem = (index) => {
    setFormData(prev => {
      const itemToClone = prev.inspection_items[index];
      const clonedItem = {
        ...itemToClone,
        item_id: `item_${Date.now()}` // Generate new unique ID
      };
      // Insert cloned item right after the original
      const newItems = [...prev.inspection_items];
      newItems.splice(index, 0, clonedItem);
      return { ...prev, inspection_items: newItems };
    });
    toast.success('Inspection item cloned');
  };

  // Drag and drop handlers for images
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, index, imageType) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageUpload(index, imageType, file);
      } else {
        toast.error('Please drop an image file');
      }
    }
  };

  const handleImageUpload = async (index, imageType, file) => {
    if (!file) return;
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      updateInspectionItem(index, imageType === 'original' ? 'original_image' : 'thermal_image', e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCalibrationUpload = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({
        ...prev,
        calibration_certificate: e.target.result
      }));
      toast.success('Calibration certificate uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.document_details.client) {
      toast.error('Please enter client name');
      return;
    }
    
    if (!formData.document_details.date_of_ir_study) {
      toast.error('Please enter date of IR study');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEdit ? `${API}/api/ir-thermography/${reportId}` : `${API}/api/ir-thermography`;
      const method = isEdit ? 'PUT' : 'POST';
      
      console.log('Saving IR Thermography report:', { url, method, formData });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Save successful:', result);
        toast.success(isEdit ? 'Report updated successfully' : 'Report created successfully');
        navigate('/projects/project-reports/audit');
      } else {
        const error = await response.json();
        console.error('Save error:', error);
        toast.error(error.detail || 'Failed to save report');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/ir-thermography-report/${reportId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `IR_Thermography_Report_${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  // Calculate summary statistics
  const getSummary = () => {
    const items = formData.inspection_items;
    return {
      total: items.length,
      critical: items.filter(i => i.risk_category === 'Critical').length,
      warning: items.filter(i => i.risk_category === 'Warning').length,
      check_monitor: items.filter(i => i.risk_category === 'Check & Monitor').length,
      normal: items.filter(i => i.risk_category === 'Normal').length
    };
  };

  const summary = getSummary();

  const tabs = [
    { id: 'details', name: 'Document Details', icon: FileText },
    { id: 'inspections', name: 'Inspection Items', icon: Thermometer },
    { id: 'calibration', name: 'Calibration Certificate', icon: FileText },
    { id: 'summary', name: 'Summary', icon: Info }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ir-thermography-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects/project-reports/audit')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEdit ? 'Edit IR Thermography Report' : 'New IR Thermography Report'}
            </h1>
            <p className="text-slate-500 mt-1">
              {formData.report_type === 'pre-thermography' ? 'Pre-Thermography' : 'Post-Thermography'} Inspection Report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <FileText size={20} />
              Download PDF
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Items</p>
          <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-sm text-red-600">Critical</p>
          <p className="text-2xl font-bold text-red-700">{summary.critical}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-sm text-amber-600">Warning</p>
          <p className="text-2xl font-bold text-amber-700">{summary.warning}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-600">Check & Monitor</p>
          <p className="text-2xl font-bold text-blue-700">{summary.check_monitor}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-600">Normal</p>
          <p className="text-2xl font-bold text-green-700">{summary.normal}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Document Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Report Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
                  <select
                    value={formData.report_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, report_type: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="pre-thermography">Pre-Thermography</option>
                    <option value="post-thermography">Post-Thermography</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Project</label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Select a project (optional)</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.pid_no} - {project.project_name} ({project.client})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.document_details.client}
                    onChange={(e) => handleDocumentChange('client', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.document_details.location}
                    onChange={(e) => handleDocumentChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="Site location"
                  />
                </div>
              </div>

              {/* Work Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Order Number</label>
                  <input
                    type="text"
                    value={formData.document_details.work_order_number}
                    onChange={(e) => handleDocumentChange('work_order_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="WO-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Order Date</label>
                  <DatePicker
                    value={formData.document_details.work_order_date}
                    onChange={(val) => handleDocumentChange('work_order_date', val)}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date of IR Study <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.document_details.date_of_ir_study}
                    onChange={(val) => handleDocumentChange('date_of_ir_study', val)}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-rose-500"
                    data-testid="date-of-ir-study"
                  />
                </div>
              </div>

              {/* Personnel Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Coordinating Person</label>
                  <input
                    type="text"
                    value={formData.document_details.coordinating_person}
                    onChange={(e) => handleDocumentChange('coordinating_person', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="Name of coordinating person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thermography Inspection By</label>
                  <input
                    type="text"
                    value={formData.document_details.thermography_inspection_by}
                    onChange={(e) => handleDocumentChange('thermography_inspection_by', e.target.value)}
                    placeholder="Enter inspector name/details"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Report Prepared By</label>
                  <input
                    type="text"
                    value={formData.document_details.report_prepared_by}
                    onChange={(e) => handleDocumentChange('report_prepared_by', e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Report Reviewed By</label>
                  <input
                    type="text"
                    value={formData.document_details.report_reviewed_by}
                    onChange={(e) => handleDocumentChange('report_reviewed_by', e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Submission Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Revision No.</label>
                  <input
                    type="text"
                    value={formData.document_details.revision_no}
                    onChange={(e) => handleDocumentChange('revision_no', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Submission</label>
                  <DatePicker
                    value={formData.document_details.date_of_submission}
                    onChange={(val) => handleDocumentChange('date_of_submission', val)}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                    <option value="submitted">Submitted</option>
                  </select>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comments</label>
                <textarea
                  value={formData.document_details.comments}
                  onChange={(e) => handleDocumentChange('comments', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                  placeholder="Additional comments or notes..."
                />
              </div>
            </div>
          )}

          {/* Inspection Items Tab */}
          {activeTab === 'inspections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Inspection Items</h3>
                <button
                  type="button"
                  onClick={addInspectionItem}
                  className="flex items-center gap-2 px-3 py-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  <Plus size={18} />
                  Add Inspection Item
                </button>
              </div>

              {formData.inspection_items.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <Thermometer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No inspection items added yet</p>
                  <button
                    type="button"
                    onClick={addInspectionItem}
                    className="mt-3 text-rose-600 hover:underline"
                  >
                    Add your first inspection item
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.inspection_items.map((item, index) => {
                    const riskInfo = RISK_CATEGORIES[item.risk_category] || RISK_CATEGORIES['Normal'];
                    // Calculate item number: newest is at index 0, oldest at end
                    // In PDF, Item #1 = oldest (last in array), so reverse the numbering for display
                    const itemNumber = formData.inspection_items.length - index;
                    
                    return (
                      <div key={item.item_id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 text-sm font-medium rounded">
                              Item #{itemNumber}
                            </span>
                            <span className={`px-2 py-1 ${riskInfo.bgLight} ${riskInfo.textColor} text-sm font-medium rounded`}>
                              {riskInfo.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeInspectionItem(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        {/* Location Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                            <input
                              type="text"
                              value={item.location}
                              onChange={(e) => updateInspectionItem(index, 'location', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                              placeholder="e.g., Main Electrical Room"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Panel</label>
                            <input
                              type="text"
                              value={item.panel}
                              onChange={(e) => updateInspectionItem(index, 'panel', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                              placeholder="e.g., MDB-01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Feeder</label>
                            <input
                              type="text"
                              value={item.feeder}
                              onChange={(e) => updateInspectionItem(index, 'feeder', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                              placeholder="e.g., Incomer ACB"
                            />
                          </div>
                        </div>

                        {/* Image Uploads */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Original Image</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-rose-400 transition-colors">
                              {item.original_image ? (
                                <div className="relative">
                                  <img 
                                    src={item.original_image} 
                                    alt="Original" 
                                    className="max-h-40 mx-auto rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateInspectionItem(index, 'original_image', null)}
                                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer">
                                  <Image className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-500">Click to upload original image</p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(index, 'original', e.target.files[0])}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Thermal Image</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-rose-400 transition-colors">
                              {item.thermal_image ? (
                                <div className="relative">
                                  <img 
                                    src={item.thermal_image} 
                                    alt="Thermal" 
                                    className="max-h-40 mx-auto rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateInspectionItem(index, 'thermal_image', null)}
                                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer">
                                  <Thermometer className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-500">Click to upload thermal image</p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(index, 'thermal', e.target.files[0])}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Temperature Data */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Max Temp (°C)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.max_temperature}
                              onChange={(e) => updateInspectionItem(index, 'max_temperature', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                              placeholder="0.0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Min Temp (°C)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.min_temperature}
                              onChange={(e) => updateInspectionItem(index, 'min_temperature', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                              placeholder="0.0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Delta T (°C)</label>
                            <input
                              type="text"
                              value={item.delta_t || 0}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ambient (°C)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.ambient_temperature}
                              onChange={(e) => updateInspectionItem(index, 'ambient_temperature', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                              placeholder="25.0"
                            />
                          </div>
                        </div>

                        {/* Recommended Action */}
                        <div className={`p-3 rounded-lg ${riskInfo.bgLight} mb-4`}>
                          <p className={`text-sm font-medium ${riskInfo.textColor}`}>
                            Recommended Action: {item.recommended_action}
                          </p>
                        </div>

                        {/* Analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Analyzed By</label>
                            <input
                              type="text"
                              value={item.analyzed_by}
                              onChange={(e) => updateInspectionItem(index, 'analyzed_by', e.target.value)}
                              placeholder="Enter name"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Comments</label>
                            <input
                              type="text"
                              value={item.comments}
                              onChange={(e) => updateInspectionItem(index, 'comments', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500"
                              placeholder="Additional comments"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Calibration Certificate Tab */}
          {activeTab === 'calibration' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Calibration Certificate</h3>
              <p className="text-sm text-slate-500">
                Upload the calibration certificate PDF for the thermal camera used in this inspection.
              </p>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-rose-400 transition-colors">
                {formData.calibration_certificate ? (
                  <div className="space-y-4">
                    <FileText className="w-16 h-16 text-green-500 mx-auto" />
                    <p className="text-green-600 font-medium">Calibration certificate uploaded</p>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = formData.calibration_certificate;
                          link.download = 'calibration_certificate.pdf';
                          link.click();
                        }}
                        className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <Eye size={18} className="inline mr-2" />
                        View PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, calibration_certificate: null }))}
                        className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 size={18} className="inline mr-2" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Click to upload calibration certificate</p>
                    <p className="text-sm text-slate-400 mt-1">PDF format recommended</p>
                    <input
                      ref={calibrationInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => handleCalibrationUpload(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Executive Summary</h3>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-slate-800">{summary.total}</p>
                  <p className="text-sm text-slate-500">Total Feeders Scanned</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-slate-800">
                    {formData.inspection_items.filter(i => i.thermal_image).length}
                  </p>
                  <p className="text-sm text-slate-500">Thermal Images Captured</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{summary.critical + summary.warning}</p>
                  <p className="text-sm text-slate-500">Issues Identified</p>
                </div>
              </div>

              {/* Risk Distribution */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-medium text-slate-700 mb-4">Risk Level Distribution</h4>
                <div className="space-y-3">
                  {Object.entries(RISK_CATEGORIES).map(([key, info]) => {
                    const count = summary[key] || 0;
                    const percentage = summary.total > 0 ? (count / summary.total) * 100 : 0;
                    
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded ${info.color}`}></div>
                        <span className="w-32 text-sm text-slate-600">{info.label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div 
                            className={`h-full ${info.color}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-12 text-right text-sm font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspection Summary Table */}
              {formData.inspection_items.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <h4 className="font-medium text-slate-700 p-4 border-b border-slate-200">
                    Inspection Summary
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">S/No</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Location</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Panel</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Feeder</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">ΔT (°C)</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">Risk Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {formData.inspection_items.map((item, index) => {
                          const riskInfo = RISK_CATEGORIES[item.risk_category] || RISK_CATEGORIES['Normal'];
                          return (
                            <tr key={item.item_id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{item.location || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{item.panel || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{item.feeder || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.delta_t || 0}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 ${riskInfo.bgLight} ${riskInfo.textColor} text-xs font-medium rounded`}>
                                  {riskInfo.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IRThermographyForm;
