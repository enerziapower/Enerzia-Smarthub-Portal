import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Calendar, Building2,
  FileText, Clock, CheckCircle, Package, Gauge, Users,
  Download, Eye, AlertCircle, Link, Unlink, Search, X, ExternalLink,
  Paperclip, Upload, File
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '../../components/ui/date-picker';

const API = process.env.REACT_APP_BACKEND_URL;

const METER_TYPES = [
  { id: 'energy_meter', name: 'Energy Meter (kWh)' },
  { id: 'voltmeter', name: 'Voltmeter' },
  { id: 'ammeter', name: 'Ammeter' },
  { id: 'ct', name: 'Current Transformer (CT)' },
  { id: 'pt', name: 'Potential Transformer (PT)' },
  { id: 'pf_meter', name: 'Power Factor Meter' },
  { id: 'frequency_meter', name: 'Frequency Meter' },
  { id: 'multifunction_meter', name: 'Multi-function Meter' },
  { id: 'wattmeter', name: 'Wattmeter' },
  { id: 'var_meter', name: 'VAR Meter' },
  { id: 'kwh_meter', name: 'kWh Meter' },
  { id: 'other', name: 'Other' }
];

const CALIBRATION_FREQUENCIES = [
  { id: 'monthly', name: 'Monthly' },
  { id: 'quarterly', name: 'Quarterly' },
  { id: 'half-yearly', name: 'Half-Yearly' },
  { id: 'yearly', name: 'Yearly' }
];

const CalibrationForm = () => {
  const navigate = useNavigate();
  const { contractId } = useParams();
  const isEdit = Boolean(contractId);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  
  // Link Test Reports Modal state
  const [showLinkTestReportModal, setShowLinkTestReportModal] = useState(false);
  const [selectedVisitIndex, setSelectedVisitIndex] = useState(null);
  const [availableTestReports, setAvailableTestReports] = useState([]);
  const [loadingTestReports, setLoadingTestReports] = useState(false);
  const [testReportSearchTerm, setTestReportSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    project_id: '',
    status: 'active',
    contract_details: {
      contract_no: '',
      start_date: '',
      end_date: '',
      calibration_frequency: 'yearly',
      scope_of_work: '',
      special_conditions: ''
    },
    customer_info: {
      customer_name: '',
      site_location: '',
      contact_person: '',
      contact_number: '',
      email: ''
    },
    service_provider: {
      company_name: 'Enerzia Power Solutions',
      address: '',
      contact_person: '',
      contact_number: '',
      email: '',
      nabl_cert_no: ''
    },
    meter_list: [],
    calibration_visits: [],
    statutory_documents: []
  });

  useEffect(() => {
    fetchProjects();
    if (isEdit) {
      fetchContract();
    }
  }, [contractId]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const projectList = Array.isArray(data) ? data : (data.projects || []);
        setProjects(projectList);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchContract = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/calibration/${contractId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({
          ...formData,
          project_id: data.project_id || '',
          status: data.status || 'active',
          contract_details: data.contract_details || formData.contract_details,
          customer_info: data.customer_info || formData.customer_info,
          service_provider: data.service_provider || formData.service_provider,
          meter_list: data.meter_list || [],
          calibration_visits: data.calibration_visits || [],
          statutory_documents: data.statutory_documents || []
        });
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error('Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const handleContractChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contract_details: {
        ...prev.contract_details,
        [field]: value
      }
    }));
  };

  const handleCustomerInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      customer_info: {
        ...prev.customer_info,
        [field]: value
      }
    }));
  };

  const handleServiceProviderChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      service_provider: {
        ...prev.service_provider,
        [field]: value
      }
    }));
  };

  // Meter List functions
  const addMeter = () => {
    setFormData(prev => ({
      ...prev,
      meter_list: [
        ...prev.meter_list,
        {
          id: `meter_${Date.now()}`,
          meter_type: '',
          make: '',
          model: '',
          serial_no: '',
          range: '',
          accuracy_class: '',
          location: '',
          tag_no: ''
        }
      ]
    }));
  };

  const updateMeter = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.meter_list];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, meter_list: updated };
    });
  };

  const removeMeter = (index) => {
    setFormData(prev => ({
      ...prev,
      meter_list: prev.meter_list.filter((_, i) => i !== index)
    }));
  };

  // Calibration Visit functions
  const addVisit = () => {
    setFormData(prev => ({
      ...prev,
      calibration_visits: [
        ...prev.calibration_visits,
        {
          id: `visit_${Date.now()}`,
          visit_date: '',
          visit_type: 'scheduled',
          status: 'scheduled',
          technician: '',
          remarks: '',
          test_results: [],
          test_report_ids: []
        }
      ]
    }));
  };

  const updateVisit = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.calibration_visits];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, calibration_visits: updated };
    });
  };

  const removeVisit = (index) => {
    setFormData(prev => ({
      ...prev,
      calibration_visits: prev.calibration_visits.filter((_, i) => i !== index)
    }));
  };

  // Test Result functions for a visit
  const addTestResult = (visitIndex) => {
    setFormData(prev => {
      const updatedVisits = [...prev.calibration_visits];
      if (!updatedVisits[visitIndex].test_results) {
        updatedVisits[visitIndex].test_results = [];
      }
      updatedVisits[visitIndex].test_results.push({
        meter_id: '',
        meter_type: '',
        calibration_date: '',
        next_due_date: '',
        readings: [],
        overall_status: '',
        remarks: '',
        calibrated_by: '',
        verified_by: '',
        certificate_no: ''
      });
      return { ...prev, calibration_visits: updatedVisits };
    });
  };

  const updateTestResult = (visitIndex, resultIndex, field, value) => {
    setFormData(prev => {
      const updatedVisits = [...prev.calibration_visits];
      updatedVisits[visitIndex].test_results[resultIndex] = {
        ...updatedVisits[visitIndex].test_results[resultIndex],
        [field]: value
      };
      return { ...prev, calibration_visits: updatedVisits };
    });
  };

  const removeTestResult = (visitIndex, resultIndex) => {
    setFormData(prev => {
      const updatedVisits = [...prev.calibration_visits];
      updatedVisits[visitIndex].test_results = updatedVisits[visitIndex].test_results.filter((_, i) => i !== resultIndex);
      return { ...prev, calibration_visits: updatedVisits };
    });
  };

  // Add calibration reading to a test result
  const addReading = (visitIndex, resultIndex) => {
    setFormData(prev => {
      const updatedVisits = [...prev.calibration_visits];
      if (!updatedVisits[visitIndex].test_results[resultIndex].readings) {
        updatedVisits[visitIndex].test_results[resultIndex].readings = [];
      }
      updatedVisits[visitIndex].test_results[resultIndex].readings.push({
        test_point: '',
        standard_value: '',
        measured_value_before: '',
        measured_value_after: '',
        error_before: '',
        error_after: '',
        tolerance: '',
        status: ''
      });
      return { ...prev, calibration_visits: updatedVisits };
    });
  };

  const updateReading = (visitIndex, resultIndex, readingIndex, field, value) => {
    setFormData(prev => {
      const updatedVisits = [...prev.calibration_visits];
      updatedVisits[visitIndex].test_results[resultIndex].readings[readingIndex] = {
        ...updatedVisits[visitIndex].test_results[resultIndex].readings[readingIndex],
        [field]: value
      };
      return { ...prev, calibration_visits: updatedVisits };
    });
  };

  const removeReading = (visitIndex, resultIndex, readingIndex) => {
    setFormData(prev => {
      const updatedVisits = [...prev.calibration_visits];
      updatedVisits[visitIndex].test_results[resultIndex].readings = 
        updatedVisits[visitIndex].test_results[resultIndex].readings.filter((_, i) => i !== readingIndex);
      return { ...prev, calibration_visits: updatedVisits };
    });
  };

  // ========== Link Test Reports Functions ==========
  const openLinkTestReportModal = async (visitIndex) => {
    setSelectedVisitIndex(visitIndex);
    setShowLinkTestReportModal(true);
    await fetchAvailableTestReports();
  };

  const fetchAvailableTestReports = async () => {
    setLoadingTestReports(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/test-reports?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const reports = Array.isArray(data) ? data : (data.reports || data.test_reports || []);
        setAvailableTestReports(reports);
      }
    } catch (error) {
      console.error('Error fetching test reports:', error);
      toast.error('Failed to load test reports');
    } finally {
      setLoadingTestReports(false);
    }
  };

  const handleLinkTestReport = (reportId, visitIndex, shouldLink) => {
    setFormData(prev => {
      const updatedVisits = [...prev.calibration_visits];
      if (!updatedVisits[visitIndex].test_report_ids) {
        updatedVisits[visitIndex].test_report_ids = [];
      }
      
      if (shouldLink) {
        if (!updatedVisits[visitIndex].test_report_ids.includes(reportId)) {
          updatedVisits[visitIndex].test_report_ids.push(reportId);
        }
      } else {
        updatedVisits[visitIndex].test_report_ids = updatedVisits[visitIndex].test_report_ids.filter(id => id !== reportId);
      }
      
      return { ...prev, calibration_visits: updatedVisits };
    });
  };

  const getLinkedTestReportIds = (visitIndex) => {
    return formData.calibration_visits[visitIndex]?.test_report_ids || [];
  };

  const filteredTestReports = availableTestReports.filter(report => {
    const searchLower = testReportSearchTerm.toLowerCase();
    return (
      report.report_no?.toLowerCase().includes(searchLower) ||
      report.equipment_type?.toLowerCase().includes(searchLower) ||
      report.project_name?.toLowerCase().includes(searchLower)
    );
  });

  // ============ Statutory Documents Functions ============
  const addStatutoryDocument = () => {
    setFormData(prev => ({
      ...prev,
      statutory_documents: [
        ...prev.statutory_documents,
        {
          id: `doc-${Date.now()}`,
          document_type: 'calibration_certificate',
          document_name: '',
          reference_no: '',
          issue_date: '',
          expiry_date: '',
          file_url: '',
          file_name: ''
        }
      ]
    }));
  };

  const updateStatutoryDocument = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.statutory_documents];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, statutory_documents: updated };
    });
  };

  const removeStatutoryDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      statutory_documents: prev.statutory_documents.filter((_, i) => i !== index)
    }));
  };

  // File upload handler for statutory documents
  const handleStatutoryFileUpload = async (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type (PDF only for statutory documents)
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('category', 'statutory_document');

      const response = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        updateStatutoryDocument(index, 'file_url', data.file_url || data.url);
        updateStatutoryDocument(index, 'file_name', file.name);
        toast.success('Document uploaded successfully');
      } else {
        toast.error('Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error uploading document');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.contract_details.start_date || !formData.contract_details.end_date) {
      toast.error('Please enter contract start and end dates');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEdit ? `${API}/api/calibration/${contractId}` : `${API}/api/calibration`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const cleanedData = {
        ...formData,
        contract_details: {
          ...formData.contract_details,
          scope_of_work: formData.contract_details.scope_of_work || '',
          special_conditions: formData.contract_details.special_conditions || ''
        },
        customer_info: {
          customer_name: formData.customer_info.customer_name || '',
          site_location: formData.customer_info.site_location || '',
          contact_person: formData.customer_info.contact_person || '',
          contact_number: formData.customer_info.contact_number || '',
          email: formData.customer_info.email || ''
        },
        service_provider: {
          company_name: formData.service_provider.company_name || 'Enerzia Power Solutions',
          address: formData.service_provider.address || '',
          contact_person: formData.service_provider.contact_person || '',
          contact_number: formData.service_provider.contact_number || '',
          email: formData.service_provider.email || '',
          nabl_cert_no: formData.service_provider.nabl_cert_no || ''
        }
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      });
      
      if (response.ok) {
        toast.success(isEdit ? 'Contract updated successfully' : 'Contract created successfully');
        navigate('/projects/calibration');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save contract');
      }
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCertificate = async (visitId, meterId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/calibration-report/${contractId}/certificate/${visitId}/${meterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Calibration_Certificate_${meterId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  // Download comprehensive Calibration Contract Report PDF
  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem('token');
      toast.info('Generating Calibration Contract Report...');
      
      const response = await fetch(`${API}/api/calibration-report/${contractId}/report-pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Calibration_Contract_Report_${formData.contract_details?.contract_no || contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report downloaded successfully');
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const getMeterTypeLabel = (type) => {
    const meterType = METER_TYPES.find(m => m.id === type);
    return meterType ? meterType.name : type;
  };

  const tabs = [
    { id: 'details', name: 'Contract Details', icon: FileText },
    { id: 'customer', name: 'Customer Info', icon: Users },
    { id: 'provider', name: 'Service Provider', icon: Building2 },
    { id: 'meters', name: 'Meter List', icon: Gauge },
    { id: 'visits', name: 'Calibration Visits', icon: Calendar },
    { id: 'statutory', name: 'Statutory Documents', icon: Paperclip }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="calibration-form-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects/calibration')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEdit ? 'Edit Calibration Contract' : 'Create Calibration Contract'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isEdit ? 'Update contract details' : 'Set up a new calibration services contract'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          data-testid="save-calibration-btn"
        >
          {saving ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Save size={20} />
          )}
          {saving ? 'Saving...' : 'Save Contract'}
        </button>
        
        {isEdit && (
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            data-testid="download-report-btn"
          >
            <Download size={20} />
            Download Report
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
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
          {/* Contract Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Project Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Link to Project (Optional)
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-testid="project-select"
                  >
                    <option value="">No project linked</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.pid_no} - {project.project_name} ({project.client})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contract Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contract No</label>
                  <input
                    type="text"
                    value={formData.contract_details.contract_no}
                    onChange={(e) => handleContractChange('contract_no', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated if empty"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.contract_details.start_date}
                    onChange={(val) => handleContractChange('start_date', val)}
                    placeholder="Select start date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.contract_details.end_date}
                    onChange={(val) => handleContractChange('end_date', val)}
                    placeholder="Select end date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Calibration Frequency</label>
                  <select
                    value={formData.contract_details.calibration_frequency}
                    onChange={(e) => handleContractChange('calibration_frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CALIBRATION_FREQUENCIES.map((freq) => (
                      <option key={freq.id} value={freq.id}>{freq.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Scope of Work */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scope of Work</label>
                <textarea
                  value={formData.contract_details.scope_of_work}
                  onChange={(e) => handleContractChange('scope_of_work', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the scope of calibration services..."
                />
              </div>

              {/* Special Conditions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Conditions</label>
                <textarea
                  value={formData.contract_details.special_conditions}
                  onChange={(e) => handleContractChange('special_conditions', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special terms or conditions..."
                />
              </div>
            </div>
          )}

          {/* Customer Information Tab */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">Customer Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customer_info.customer_name}
                    onChange={(e) => handleCustomerInfoChange('customer_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer/company name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Location *</label>
                  <input
                    type="text"
                    value={formData.customer_info.site_location}
                    onChange={(e) => handleCustomerInfoChange('site_location', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter site address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.customer_info.contact_person}
                    onChange={(e) => handleCustomerInfoChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.customer_info.contact_number}
                    onChange={(e) => handleCustomerInfoChange('contact_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.customer_info.email}
                    onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Service Provider Tab */}
          {activeTab === 'provider' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">Service Provider Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.service_provider.company_name}
                    onChange={(e) => handleServiceProviderChange('company_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    value={formData.service_provider.address}
                    onChange={(e) => handleServiceProviderChange('address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.service_provider.contact_person}
                    onChange={(e) => handleServiceProviderChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.service_provider.contact_number}
                    onChange={(e) => handleServiceProviderChange('contact_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.service_provider.email}
                    onChange={(e) => handleServiceProviderChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">NABL Certificate No</label>
                  <input
                    type="text"
                    value={formData.service_provider.nabl_cert_no}
                    onChange={(e) => handleServiceProviderChange('nabl_cert_no', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter NABL certification number"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Meter List Tab */}
          {activeTab === 'meters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Meters for Calibration</h3>
                <button
                  type="button"
                  onClick={addMeter}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={18} />
                  Add Meter
                </button>
              </div>

              {formData.meter_list.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No meters added yet</p>
                  <button
                    type="button"
                    onClick={addMeter}
                    className="mt-3 text-blue-600 hover:underline"
                  >
                    Add your first meter
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.meter_list.map((meter, index) => (
                    <div key={meter.id || index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded">
                          Meter #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMeter(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Meter Type</label>
                          <select
                            value={meter.meter_type}
                            onChange={(e) => updateMeter(index, 'meter_type', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select type...</option>
                            {METER_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                          <input
                            type="text"
                            value={meter.make}
                            onChange={(e) => updateMeter(index, 'make', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., ABB, Siemens"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                          <input
                            type="text"
                            value={meter.model}
                            onChange={(e) => updateMeter(index, 'model', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Model number"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Serial No</label>
                          <input
                            type="text"
                            value={meter.serial_no}
                            onChange={(e) => updateMeter(index, 'serial_no', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Serial number"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Range</label>
                          <input
                            type="text"
                            value={meter.range}
                            onChange={(e) => updateMeter(index, 'range', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 0-500V"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Accuracy Class</label>
                          <input
                            type="text"
                            value={meter.accuracy_class}
                            onChange={(e) => updateMeter(index, 'accuracy_class', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 0.5, 1.0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={meter.location}
                            onChange={(e) => updateMeter(index, 'location', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Installation location"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tag No</label>
                          <input
                            type="text"
                            value={meter.tag_no}
                            onChange={(e) => updateMeter(index, 'tag_no', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Equipment tag"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calibration Visits Tab */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Calibration Visits</h3>
                <button
                  type="button"
                  onClick={addVisit}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={18} />
                  Add Visit
                </button>
              </div>

              {formData.calibration_visits.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No calibration visits scheduled</p>
                  <button
                    type="button"
                    onClick={addVisit}
                    className="mt-3 text-blue-600 hover:underline"
                  >
                    Schedule a visit
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.calibration_visits.map((visit, visitIndex) => (
                    <div key={visit.id || visitIndex} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                          Visit #{visitIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVisit(visitIndex)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Visit Date</label>
                          <DatePicker
                            value={visit.visit_date}
                            onChange={(val) => updateVisit(visitIndex, 'visit_date', val)}
                            placeholder="Select date"
                            className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type</label>
                          <select
                            value={visit.visit_type}
                            onChange={(e) => updateVisit(visitIndex, 'visit_type', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="emergency">Emergency</option>
                            <option value="follow_up">Follow-up</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <select
                            value={visit.status}
                            onChange={(e) => updateVisit(visitIndex, 'status', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Technician</label>
                          <input
                            type="text"
                            value={visit.technician}
                            onChange={(e) => updateVisit(visitIndex, 'technician', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Technician name"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                        <textarea
                          value={visit.remarks}
                          onChange={(e) => updateVisit(visitIndex, 'remarks', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Visit remarks..."
                        />
                      </div>

                      {/* Test Results Section */}
                      <div className="border-t border-slate-200 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-700">Calibration Test Results</h4>
                          <button
                            type="button"
                            onClick={() => addTestResult(visitIndex)}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                          >
                            <Plus size={14} />
                            Add Test Result
                          </button>
                        </div>

                        {(!visit.test_results || visit.test_results.length === 0) ? (
                          <p className="text-sm text-slate-500 italic">No test results recorded for this visit.</p>
                        ) : (
                          <div className="space-y-4">
                            {visit.test_results.map((result, resultIndex) => (
                              <div key={resultIndex} className="p-3 bg-white border border-slate-200 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium text-slate-600">Test Result #{resultIndex + 1}</span>
                                  <div className="flex items-center gap-2">
                                    {isEdit && result.meter_id && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadCertificate(visit.id, result.meter_id)}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 bg-purple-50 rounded hover:bg-purple-100"
                                      >
                                        <Download size={12} />
                                        Certificate
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeTestResult(visitIndex, resultIndex)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Meter</label>
                                    <select
                                      value={result.meter_id}
                                      onChange={(e) => {
                                        const meter = formData.meter_list.find(m => m.id === e.target.value);
                                        updateTestResult(visitIndex, resultIndex, 'meter_id', e.target.value);
                                        if (meter) {
                                          updateTestResult(visitIndex, resultIndex, 'meter_type', meter.meter_type);
                                        }
                                      }}
                                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Select meter...</option>
                                      {formData.meter_list.map((m, i) => (
                                        <option key={m.id || i} value={m.id}>
                                          {getMeterTypeLabel(m.meter_type)} - {m.serial_no || `#${i + 1}`}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Calibration Date</label>
                                    <DatePicker
                                      value={result.calibration_date}
                                      onChange={(val) => updateTestResult(visitIndex, resultIndex, 'calibration_date', val)}
                                      className="h-8 text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Next Due Date</label>
                                    <DatePicker
                                      value={result.next_due_date}
                                      onChange={(val) => updateTestResult(visitIndex, resultIndex, 'next_due_date', val)}
                                      className="h-8 text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Calibrated By</label>
                                    <input
                                      type="text"
                                      value={result.calibrated_by}
                                      onChange={(e) => updateTestResult(visitIndex, resultIndex, 'calibrated_by', e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Verified By</label>
                                    <input
                                      type="text"
                                      value={result.verified_by}
                                      onChange={(e) => updateTestResult(visitIndex, resultIndex, 'verified_by', e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Overall Status</label>
                                    <select
                                      value={result.overall_status}
                                      onChange={(e) => updateTestResult(visitIndex, resultIndex, 'overall_status', e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Select...</option>
                                      <option value="pass">Pass</option>
                                      <option value="fail">Fail</option>
                                      <option value="conditional">Conditional</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="mb-3">
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Certificate No</label>
                                  <input
                                    type="text"
                                    value={result.certificate_no}
                                    onChange={(e) => updateTestResult(visitIndex, resultIndex, 'certificate_no', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder="Auto-generated if empty"
                                  />
                                </div>

                                {/* Readings Section */}
                                <div className="border-t border-slate-100 pt-3 mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-600">Test Readings</span>
                                    <button
                                      type="button"
                                      onClick={() => addReading(visitIndex, resultIndex)}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      + Add Reading
                                    </button>
                                  </div>

                                  {(!result.readings || result.readings.length === 0) ? (
                                    <p className="text-xs text-slate-400 italic">No readings added.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="bg-slate-100">
                                            <th className="px-2 py-1 text-left">Test Point</th>
                                            <th className="px-2 py-1 text-left">Standard</th>
                                            <th className="px-2 py-1 text-left">Before</th>
                                            <th className="px-2 py-1 text-left">After</th>
                                            <th className="px-2 py-1 text-left">Tolerance</th>
                                            <th className="px-2 py-1 text-left">Status</th>
                                            <th className="px-2 py-1"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {result.readings.map((reading, readingIndex) => (
                                            <tr key={readingIndex} className="border-b border-slate-100">
                                              <td className="px-1 py-1">
                                                <input
                                                  type="text"
                                                  value={reading.test_point}
                                                  onChange={(e) => updateReading(visitIndex, resultIndex, readingIndex, 'test_point', e.target.value)}
                                                  className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs"
                                                />
                                              </td>
                                              <td className="px-1 py-1">
                                                <input
                                                  type="text"
                                                  value={reading.standard_value}
                                                  onChange={(e) => updateReading(visitIndex, resultIndex, readingIndex, 'standard_value', e.target.value)}
                                                  className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs"
                                                />
                                              </td>
                                              <td className="px-1 py-1">
                                                <input
                                                  type="text"
                                                  value={reading.measured_value_before}
                                                  onChange={(e) => updateReading(visitIndex, resultIndex, readingIndex, 'measured_value_before', e.target.value)}
                                                  className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs"
                                                />
                                              </td>
                                              <td className="px-1 py-1">
                                                <input
                                                  type="text"
                                                  value={reading.measured_value_after}
                                                  onChange={(e) => updateReading(visitIndex, resultIndex, readingIndex, 'measured_value_after', e.target.value)}
                                                  className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs"
                                                />
                                              </td>
                                              <td className="px-1 py-1">
                                                <input
                                                  type="text"
                                                  value={reading.tolerance}
                                                  onChange={(e) => updateReading(visitIndex, resultIndex, readingIndex, 'tolerance', e.target.value)}
                                                  className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs"
                                                />
                                              </td>
                                              <td className="px-1 py-1">
                                                <select
                                                  value={reading.status}
                                                  onChange={(e) => updateReading(visitIndex, resultIndex, readingIndex, 'status', e.target.value)}
                                                  className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs"
                                                >
                                                  <option value="">-</option>
                                                  <option value="pass">Pass</option>
                                                  <option value="fail">Fail</option>
                                                </select>
                                              </td>
                                              <td className="px-1 py-1">
                                                <button
                                                  type="button"
                                                  onClick={() => removeReading(visitIndex, resultIndex, readingIndex)}
                                                  className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
                                  <textarea
                                    value={result.remarks}
                                    onChange={(e) => updateTestResult(visitIndex, resultIndex, 'remarks', e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder="Test remarks..."
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Link Test Reports Section */}
                      <div className="border-t border-slate-200 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" />
                            <h4 className="font-medium text-slate-700">
                              Linked Test Reports ({(visit.test_report_ids || []).length})
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => openLinkTestReportModal(visitIndex)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                          >
                            <Link size={14} />
                            Link Test Reports
                          </button>
                        </div>

                        {(!visit.test_report_ids || visit.test_report_ids.length === 0) ? (
                          <p className="text-sm text-slate-500 italic">No test reports linked to this visit yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {visit.test_report_ids.map((reportId) => {
                              const report = availableTestReports.find(r => r.id === reportId);
                              return (
                                <div key={reportId} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-green-600" />
                                    <span className="text-sm font-medium text-slate-700">
                                      {report?.report_no || `Report #${reportId.slice(-6)}`}
                                    </span>
                                    {report && (
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded capitalize">
                                        {report.equipment_type?.replace(/-/g, ' ').replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleLinkTestReport(reportId, visitIndex, false)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Unlink"
                                  >
                                    <Unlink size={16} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statutory Documents Tab */}
      {activeTab === 'statutory' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Statutory Documents & Attachments</h3>
              <p className="text-sm text-slate-500">Upload calibration certificates, statutory documents, and other attachments</p>
            </div>
            <button
              type="button"
              onClick={addStatutoryDocument}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              data-testid="add-statutory-doc-btn"
            >
              <Plus size={18} />
              Add Document
            </button>
          </div>

          {formData.statutory_documents.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <Paperclip className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No statutory documents attached</p>
              <p className="text-sm text-slate-400 mt-1">Upload calibration certificates, compliance documents, etc.</p>
              <button
                type="button"
                onClick={addStatutoryDocument}
                className="mt-4 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Add document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.statutory_documents.map((doc, index) => (
                <div key={doc.id || index} className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded flex items-center gap-1">
                      <File size={14} />
                      Document #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStatutoryDocument(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Remove document"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
                      <select
                        value={doc.document_type}
                        onChange={(e) => updateStatutoryDocument(index, 'document_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="calibration_certificate">Calibration Certificate</option>
                        <option value="nabl_certificate">NABL Certificate</option>
                        <option value="test_certificate">Test Certificate</option>
                        <option value="compliance_certificate">Compliance Certificate</option>
                        <option value="safety_certificate">Safety Certificate</option>
                        <option value="warranty_document">Warranty Document</option>
                        <option value="manufacturer_datasheet">Manufacturer Datasheet</option>
                        <option value="iso_certificate">ISO Certificate</option>
                        <option value="other">Other Document</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Document Name *</label>
                      <input
                        type="text"
                        value={doc.document_name}
                        onChange={(e) => updateStatutoryDocument(index, 'document_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., NABL Accreditation Certificate"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reference No.</label>
                      <input
                        type="text"
                        value={doc.reference_no}
                        onChange={(e) => updateStatutoryDocument(index, 'reference_no', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Certificate/Document number"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={doc.issue_date}
                          onChange={(e) => updateStatutoryDocument(index, 'issue_date', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={doc.expiry_date}
                          onChange={(e) => updateStatutoryDocument(index, 'expiry_date', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Upload Document (PDF)</label>
                      <div className="flex items-center gap-3">
                        {doc.file_url ? (
                          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle size={18} className="text-green-600" />
                            <span className="text-sm text-green-700 truncate flex-1">{doc.file_name || 'Document uploaded'}</span>
                            <a 
                              href={doc.file_url.startsWith('http') ? doc.file_url : `${API}${doc.file_url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="View document"
                            >
                              <ExternalLink size={16} />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                updateStatutoryDocument(index, 'file_url', '');
                                updateStatutoryDocument(index, 'file_name', '');
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Remove file"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                              <Upload size={20} className="text-slate-400" />
                              <span className="text-sm text-slate-500">Click to upload PDF</span>
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleStatutoryFileUpload(index, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link Test Reports Modal */}
      {showLinkTestReportModal && selectedVisitIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Link Test Reports to Visit #{selectedVisitIndex + 1}</h3>
              <button
                type="button"
                onClick={() => { setShowLinkTestReportModal(false); setSelectedVisitIndex(null); }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={testReportSearchTerm}
                  onChange={(e) => setTestReportSearchTerm(e.target.value)}
                  placeholder="Search by report no, equipment type, project..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingTestReports ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
                </div>
              ) : filteredTestReports.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No test reports found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTestReports.map((report) => {
                    const isLinked = getLinkedTestReportIds(selectedVisitIndex).includes(report.id);
                    return (
                      <div
                        key={report.id}
                        className={`p-3 rounded-lg border ${isLinked ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{report.report_no}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                report.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {report.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                              <span className="capitalize">{report.equipment_type?.replace(/-/g, ' ').replace(/_/g, ' ')}</span>
                              <span>{report.project_name}</span>
                              <span>{report.test_date ? new Date(report.test_date).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLinkTestReport(report.id, selectedVisitIndex, !isLinked)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              isLinked
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isLinked ? 'Unlink' : 'Link'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowLinkTestReportModal(false); setSelectedVisitIndex(null); }}
                className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationForm;
