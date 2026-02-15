import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Plus, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { testReportsAPI, projectsAPI, settingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '../../components/ui/date-picker';

// Report Types (8 options - same for all equipment reports)
const REPORT_TYPES = [
  'Periodical Maintenance',
  'Breakdown Maintenance',
  'Annual Shutdown Maintenance',
  'Equipment Testing',
  'Pre-Commissioning',
  'Warranty',
  'Calibration',
  'Routine Inspection'
];

// Cooling Types
const COOLING_TYPES = ['ONAN', 'ONAF', 'OFAF', 'OFWF', 'ODAF', 'ODWF'];

// Vector Groups
const VECTOR_GROUPS = ['Dyn11', 'Dyn1', 'Yyn0', 'Dd0', 'Yd1', 'Yd11', 'YNd11', 'Other'];

// Transformer Types
const TRANSFORMER_TYPES = ['Distribution', 'Power', 'Auto', 'Isolation', 'Step-up', 'Step-down', 'Dry Type', 'Oil Filled'];

const TransformerTestReport = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!reportId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Test sections visibility state
  const [enabledTests, setEnabledTests] = useState({
    oilBdvTest: true,
    irTest: true,
    magneticBalanceTest: true,
    ratioTest: true,
    magnetisingCurrentTest: true,
    vectorGroupTest: true,
    oltcOilBdvTest: true,
    oltcOperationalChecklist: true
  });

  // Form Data State
  const [formData, setFormData] = useState({
    // Header
    report_type: 'Periodical Maintenance',
    report_date: new Date().toISOString().split('T')[0],

    // Customer Information
    customer_name: '',
    site_location: '',
    project_name: '',
    po_ref: '',
    po_dated: '',  // P.O. Date field
    contact_person: '',
    contact_phone: '',
    contact_email: '',  // Customer email for sending reports

    // Service Provider Details
    service_company: 'Enerzia Power Solutions',
    service_address: '',
    engineer_name: user?.name || '',
    engineer_email: '',
    engineer_mobile: '',

    // Main Equipment Details
    equipment_name: '',
    equipment_location: '',
    rating_kva: '',
    transformer_type: 'Distribution',
    feeder_name: '',
    voltage_ratio_hv: '11000',
    voltage_ratio_lv: '433',
    make: '',
    current_ratio_hv: '',
    current_ratio_lv: '',
    serial_no: '',
    frequency: '50',
    test_date: new Date().toISOString().split('T')[0],
    vector_group: 'Dyn11',
    energization_date: '',
    cooling_type: 'ONAN',
    next_due_date: '',
    year_of_manufacture: '',
    no_of_tapping: '', // NEW FIELD

    // Maintenance Checklist
    checklist_cleaned: true,
    checklist_no_defects: true,
    checklist_double_earthing: true,
    checklist_bushings_clean: true,
    checklist_bolts_tight: true,
    checklist_silica_gel_ok: true,
    checklist_pressure_valve_ok: true,
    checklist_remarks: '',

    // Test Instruments Used
    test_instruments: [
      { name: 'Clamp Meter', make: '', model: '', serial: '' },
      { name: 'Megger / IR Tester', make: '', model: '', serial: '' },
      { name: 'BDV Test Kit', make: '', model: '', serial: '' }
    ],

    // TEST 1: Transformer Oil BDV Test
    oil_sample_location: 'Bottom',
    oil_bdv_before_flash_point: '',
    oil_bdv_after_value: '',
    oil_bdv_after_flash_point: '',
    oil_bdv_remarks: 'Transformer Oil BDV tested and found satisfactory',

    // TEST 2: Insulation Resistance Test
    ir_applied_voltage: '5000',
    ir_tests: [
      { circuit: 'Primary to Earth', voltage: '5000', measured: '', acceptance: '> 100 MΩ' },
      { circuit: 'Primary to Secondary', voltage: '5000', measured: '', acceptance: '> 100 MΩ' },
      { circuit: 'Secondary to Earth', voltage: '500', measured: '', acceptance: '> 10 MΩ' }
    ],

    // TEST 3: Magnetic Balance Test (Updated with full columns)
    magnetic_balance_tap: 'TAP5 (Normal Tap)',
    magnetic_balance_tests: [
      { circuit: 'R-Open', applied_1u1v: '', applied_1v1w: '', applied_1w1u: '', measured_2u2v: '', measured_2v2w: '', measured_2w2u: '', measured_2u2n: '', measured_2v2n: '', measured_2w2n: '' },
      { circuit: 'Y-Open', applied_1u1v: '', applied_1v1w: '', applied_1w1u: '', measured_2u2v: '', measured_2v2w: '', measured_2w2u: '', measured_2u2n: '', measured_2v2n: '', measured_2w2n: '' },
      { circuit: 'B-Open', applied_1u1v: '', applied_1v1w: '', applied_1w1u: '', measured_2u2v: '', measured_2v2w: '', measured_2w2u: '', measured_2u2n: '', measured_2v2n: '', measured_2w2n: '' }
    ],

    // TEST 4: Ratio Test (Dynamic - add/delete rows based on transformer taps)
    ratio_tests: [
      { tap_no: '1', applied_1u1v: '417.5', applied_1v1w: '417.5', applied_1w1u: '417.8', measured_2u2v: '', measured_2v2w: '', measured_2w2u: '', measured_2u2n: '', measured_2v2n: '', measured_2w2n: '' }
    ],

    // TEST 5: Three Phase Magnetising Current Test (Dynamic - add/delete rows based on transformer taps)
    magnetising_current_tests: [
      { tap_position: '1', applied_1u1v: '417.5', applied_1v1w: '417.5', applied_1w1u: '417.8', current_1u: '', current_1v: '', current_1w: '' }
    ],

    // TEST 6: Vector Group Test
    vector_group_tests: [
      { parameter: '1W2W < 1W2V', observed: '' },
      { parameter: '1U1V = 1U2N + 1V2N', observed: '' },
      { parameter: '1V2W = 1V2V', observed: '' }
    ],
    vector_group_remarks: 'The test results are found satisfactory and the transformer found healthy',

    // OLTC Equipment Details (optional)
    has_oltc: false,
    oltc_equipment_name: '',
    oltc_location: '',
    oltc_rating: '',
    oltc_total_taps: '',
    oltc_normal_tap: '',
    oltc_make: '',
    oltc_serial_no: '',

    // TEST 7: OLTC Oil BDV Test
    oltc_bdv_before: '',
    oltc_bdv_after: '',
    oltc_bdv_flash_point: '',
    oltc_bdv_remarks: '',

    // TEST 8: OLTC Operational Checklist
    oltc_visual_inspection: true,
    oltc_local_operation: true,
    oltc_remote_operation: true,
    oltc_tap_position_indicator: true,
    oltc_limit_switch: true,
    oltc_cooling_equipment: false,
    oltc_pump_fan_rotation: false,
    oltc_spares_oil_topup: false,
    oltc_deficiencies: '',

    // Results
    overall_result: 'satisfactory',
    final_remarks: 'The test results are found satisfactory and the transformer found healthy',

    // Signatures
    engineer_signature_name: user?.name || '',
    engineer_signature_date: new Date().toISOString().split('T')[0],
    customer_signature_name: '',
    customer_signature_date: '',

    // Meta
    project_id: '',
    status: 'draft',
    enabled_tests: {
      oilBdvTest: true,
      irTest: true,
      magneticBalanceTest: true,
      ratioTest: true,
      magnetisingCurrentTest: true,
      vectorGroupTest: true,
      oltcOilBdvTest: true,
      oltcOperationalChecklist: true
    }
  });

  useEffect(() => {
    fetchInitialData();
    if (isEdit) {
      fetchReport();
    }
  }, [reportId]);

  const fetchInitialData = async () => {
    try {
      // Fetch projects and clients
      const [projectsRes, clientsRes] = await Promise.all([
        projectsAPI.getAll(),
        settingsAPI.getClients()
      ]);
      setProjects(projectsRes.data || []);
      setClients(clientsRes.data || []);
      
      // Fetch team members from departments/projects/team endpoint
      try {
        const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
        const token = localStorage.getItem('token');
        const teamRes = await fetch(`${API_BASE_URL}/departments/projects/team`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setTeamMembers(teamData || []);
        }
      } catch (teamError) {
        console.error('Error fetching team members:', teamError);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await testReportsAPI.getById(reportId);
      if (response.data) {
        setFormData(prev => ({ ...prev, ...response.data }));
        if (response.data.enabled_tests) {
          setEnabledTests(response.data.enabled_tests);
        }
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      showMessage('error', 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-fill customer info when client is selected
    if (name === 'customer_name') {
      const client = clients.find(c => c.name === value);
      if (client) {
        setFormData(prev => ({
          ...prev,
          contact_person: client.contact_person || '',
          contact_phone: client.phone || '',
          contact_email: client.email || '',
          site_location: client.address || ''
        }));
      }
    }

    // Auto-fill when project is selected
    if (name === 'project_id') {
      const project = projects.find(p => p.id === value);
      if (project) {
        setFormData(prev => ({
          ...prev,
          project_name: project.project_name || '',
          customer_name: project.client || '',
          site_location: project.location || ''
        }));
      }
    }

    // Auto-fill engineer details when team member is selected
    if (name === 'engineer_name') {
      const member = teamMembers.find(m => m.name === value);
      if (member) {
        setFormData(prev => ({
          ...prev,
          engineer_email: member.email || '',
          engineer_mobile: member.phone || ''
        }));
      }
    }
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setFormData(prev => {
      const newArray = [...(prev[arrayName] || [])];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const addArrayItem = (arrayName, template) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...(prev[arrayName] || []), template]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const toggleTestSection = (testKey) => {
    setEnabledTests(prev => ({
      ...prev,
      [testKey]: !prev[testKey]
    }));
  };

  const handleSubmit = async (e, status = 'draft') => {
    e.preventDefault();
    setSaving(true);

    try {
      const reportData = {
        ...formData,
        equipment_type: 'transformer',
        report_category: 'equipment',
        status,
        enabled_tests: enabledTests,
        created_by: user?.name || user?.email
      };

      if (isEdit) {
        await testReportsAPI.update(reportId, reportData);
        showMessage('success', 'Report updated successfully!');
      } else {
        const response = await testReportsAPI.create(reportData);
        showMessage('success', `Report ${response.data.report_no} created successfully!`);
        setTimeout(() => {
          navigate('/projects/project-reports/equipment/transformer');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving report:', error);
      showMessage('error', 'Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="transformer-test-report">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects/project-reports/equipment/transformer')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEdit ? 'Edit Transformer Test Report' : 'New Transformer Test Report'}
            </h1>
            <p className="text-slate-500">Format: TRN/YEAR/NUMBER</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={saving}
            className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'completed')}
            disabled={saving}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Complete Report
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, 'completed')} className="space-y-6">
        {/* Section 1: Report Information (Standardized) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Report Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Report No.</label>
              <input
                type="text"
                value={formData.report_no || 'Auto-generated on save'}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Report Date</label>
              <DatePicker
                value={formData.report_date}
                onChange={(val) => handleInputChange({ target: { name: 'report_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Testing <span className="text-red-500">*</span></label>
              <DatePicker
                value={formData.test_date}
                onChange={(val) => handleInputChange({ target: { name: 'test_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Energization</label>
              <DatePicker
                value={formData.energization_date}
                onChange={(val) => handleInputChange({ target: { name: 'energization_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Report Type - 8 Radio Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REPORT_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.report_type === type
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="report_type"
                    value={type}
                    checked={formData.report_type === type}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    formData.report_type === type ? 'border-blue-500' : 'border-slate-300'
                  }`}>
                    {formData.report_type === type && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Customer Information (Standardized - 8 Fields) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
              <input
                list="clients-list"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter customer/company name"
                required
              />
              <datalist id="clients-list">
                {clients.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site Location <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="site_location"
                value={formData.site_location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter site location"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Name (PID)</label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Project (Optional)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.pid_no || `PID-${p.id.slice(0,6).toUpperCase()}`} - {p.project_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">P.O. Ref #</label>
              <input
                type="text"
                name="po_ref"
                value={formData.po_ref}
                onChange={handleInputChange}
                placeholder="Enter P.O. reference"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
                placeholder="Enter contact person name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                placeholder="Enter contact phone"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">P.O. Dated</label>
              <DatePicker
                value={formData.po_dated}
                onChange={(val) => handleInputChange({ target: { name: 'po_dated', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                placeholder="customer@company.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Service Provider Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Provider Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Company Name & Address */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  name="service_company"
                  value={formData.service_company}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Address</label>
                <textarea
                  name="service_address"
                  value={formData.service_address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter company address (multiple lines supported)"
                />
              </div>
            </div>
            {/* Right Column: Engineer Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Engineer / Technician Name *</label>
                <select
                  name="engineer_name"
                  value={formData.engineer_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Team Member</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name} - {m.designation || m.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Engineer Email</label>
                <input
                  type="email"
                  name="engineer_email"
                  value={formData.engineer_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Engineer Mobile</label>
                <input
                  type="text"
                  name="engineer_mobile"
                  value={formData.engineer_mobile}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Main Equipment Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Main Equipment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Name *</label>
              <input
                type="text"
                name="equipment_name"
                value={formData.equipment_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 250 KVA Distribution Transformer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Location</label>
              <input
                type="text"
                name="equipment_location"
                value={formData.equipment_location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Transformer Yard"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rating (KVA) *</label>
              <input
                type="number"
                name="rating_kva"
                value={formData.rating_kva}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transformer Type</label>
              <select
                name="transformer_type"
                value={formData.transformer_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {TRANSFORMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Feeder Name</label>
              <input
                type="text"
                name="feeder_name"
                value={formData.feeder_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">No. of Tapping</label>
              <input
                type="text"
                name="no_of_tapping"
                value={formData.no_of_tapping}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 5 or 1-5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voltage Ratio HV (V)</label>
              <input
                type="text"
                name="voltage_ratio_hv"
                value={formData.voltage_ratio_hv}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="11000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voltage Ratio LV (V)</label>
              <input
                type="text"
                name="voltage_ratio_lv"
                value={formData.voltage_ratio_lv}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="433"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make / Manufacturer</label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Ratio HV (A)</label>
              <input
                type="text"
                name="current_ratio_hv"
                value={formData.current_ratio_hv}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Ratio LV (A)</label>
              <input
                type="text"
                name="current_ratio_lv"
                value={formData.current_ratio_lv}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Serial No.</label>
              <input
                type="text"
                name="serial_no"
                value={formData.serial_no}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency (Hz)</label>
              <input
                type="text"
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Testing *</label>
              <DatePicker
                value={formData.test_date}
                onChange={(val) => handleInputChange({ target: { name: 'test_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vector Group</label>
              <select
                name="vector_group"
                value={formData.vector_group}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {VECTOR_GROUPS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Energization</label>
              <DatePicker
                value={formData.energization_date}
                onChange={(val) => handleInputChange({ target: { name: 'energization_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type of Cooling</label>
              <select
                name="cooling_type"
                value={formData.cooling_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {COOLING_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Next Due Date</label>
              <DatePicker
                value={formData.next_due_date}
                onChange={(val) => handleInputChange({ target: { name: 'next_due_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year of Manufacture</label>
              <input
                type="number"
                name="year_of_manufacture"
                value={formData.year_of_manufacture}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1950"
                max={new Date().getFullYear()}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Maintenance / Testing Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Maintenance / Testing Checklist</h2>
          <div className="space-y-3">
            {[
              { name: 'checklist_cleaned', label: 'Equipment is cleaned and free from dust / dirt / foreign materials' },
              { name: 'checklist_no_defects', label: 'Equipment is free from all visible defects on physical inspection' },
              { name: 'checklist_double_earthing', label: 'Check main tank has been provided with double earthing' },
              { name: 'checklist_bushings_clean', label: 'Bushings are clean and free from physical damages' },
              { name: 'checklist_bolts_tight', label: 'All nuts and bolts are tightened correctly as per specified torque' },
              { name: 'checklist_silica_gel_ok', label: 'Check the colour of breather silica gel (Blue when dry)' },
              { name: 'checklist_pressure_valve_ok', label: 'Check that pressure relief valve is correctly mounted' }
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700">{item.label}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={item.name}
                      checked={formData[item.name] === true}
                      onChange={() => setFormData(prev => ({ ...prev, [item.name]: true }))}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm text-green-600 font-medium">YES</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={item.name}
                      checked={formData[item.name] === false}
                      onChange={() => setFormData(prev => ({ ...prev, [item.name]: false }))}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm text-red-600 font-medium">NO</span>
                  </label>
                </div>
              </div>
            ))}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (Record deficiencies, if any)</label>
              <textarea
                name="checklist_remarks"
                value={formData.checklist_remarks}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Test Instruments Used */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Test Instruments Used</h2>
            <button
              type="button"
              onClick={() => addArrayItem('test_instruments', { name: '', make: '', model: '', serial: '' })}
              className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
            >
              <Plus size={14} /> Add Instrument
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">S.No.</th>
                  <th className="px-3 py-2 text-left">Equipment Name</th>
                  <th className="px-3 py-2 text-left">Make</th>
                  <th className="px-3 py-2 text-left">Model #</th>
                  <th className="px-3 py-2 text-left">Serial #</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {formData.test_instruments.map((inst, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={inst.name}
                        onChange={(e) => handleArrayChange('test_instruments', idx, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={inst.make}
                        onChange={(e) => handleArrayChange('test_instruments', idx, 'make', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={inst.model}
                        onChange={(e) => handleArrayChange('test_instruments', idx, 'model', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={inst.serial}
                        onChange={(e) => handleArrayChange('test_instruments', idx, 'serial', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('test_instruments', idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TEST 1: Transformer Oil BDV Test */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">TEST 1</span>
              Transformer Oil BDV Test
            </h2>
            <button
              type="button"
              onClick={() => toggleTestSection('oilBdvTest')}
              className={`px-3 py-1 text-sm rounded-lg ${enabledTests.oilBdvTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {enabledTests.oilBdvTest ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {enabledTests.oilBdvTest && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sample Collected At</label>
                <select
                  name="oil_sample_location"
                  value={formData.oil_sample_location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Bottom">Bottom</option>
                  <option value="Top">Top</option>
                  <option value="Middle">Middle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Before Filtration - Flash Point (KV)</label>
                <input
                  type="text"
                  name="oil_bdv_before_flash_point"
                  value={formData.oil_bdv_before_flash_point}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">After Filtration - BDV at 2.5mm Gap (KV)</label>
                <input
                  type="text"
                  name="oil_bdv_after_value"
                  value={formData.oil_bdv_after_value}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">After Filtration - Flash Point (KV)</label>
                <input
                  type="text"
                  name="oil_bdv_after_flash_point"
                  value={formData.oil_bdv_after_flash_point}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="lg:col-span-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  name="oil_bdv_remarks"
                  value={formData.oil_bdv_remarks}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* TEST 2: Insulation Resistance Test */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">TEST 2</span>
              Insulation Resistance Test
            </h2>
            <button
              type="button"
              onClick={() => toggleTestSection('irTest')}
              className={`px-3 py-1 text-sm rounded-lg ${enabledTests.irTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {enabledTests.irTest ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {enabledTests.irTest && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Applied Voltage (V)</label>
                <input
                  type="text"
                  name="ir_applied_voltage"
                  value={formData.ir_applied_voltage}
                  onChange={handleInputChange}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Circuit Reference</th>
                      <th className="px-3 py-2 text-left">IR / Megger Values (V)</th>
                      <th className="px-3 py-2 text-left">Measured Values</th>
                      <th className="px-3 py-2 text-left">Acceptance Value</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.ir_tests.map((test, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={test.circuit}
                            onChange={(e) => handleArrayChange('ir_tests', idx, 'circuit', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={test.voltage}
                            onChange={(e) => handleArrayChange('ir_tests', idx, 'voltage', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={test.measured}
                            onChange={(e) => handleArrayChange('ir_tests', idx, 'measured', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-200 rounded"
                            placeholder="e.g., 2.82 GΩ"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={test.acceptance}
                            onChange={(e) => handleArrayChange('ir_tests', idx, 'acceptance', e.target.value)}
                            className="w-28 px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeArrayItem('ir_tests', idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={() => addArrayItem('ir_tests', { circuit: '', voltage: '', measured: '', acceptance: '' })}
                  className="mt-2 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>
            </>
          )}
        </div>

        {/* TEST 3: Magnetic Balance Test */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">TEST 3</span>
              Magnetic Balance Test
            </h2>
            <button
              type="button"
              onClick={() => toggleTestSection('magneticBalanceTest')}
              className={`px-3 py-1 text-sm rounded-lg ${enabledTests.magneticBalanceTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {enabledTests.magneticBalanceTest ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {enabledTests.magneticBalanceTest && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tested At</label>
                <input
                  type="text"
                  name="magnetic_balance_tap"
                  value={formData.magnetic_balance_tap}
                  onChange={handleInputChange}
                  className="w-48 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th rowSpan="2" className="px-2 py-2 border text-center text-xs font-semibold">Circuit<br/>Reference</th>
                      <th colSpan="3" className="px-2 py-1 border text-center text-xs font-semibold">Applied Primary Voltage (V)</th>
                      <th colSpan="6" className="px-2 py-1 border text-center text-xs font-semibold">Measured Secondary Voltage (V)</th>
                    </tr>
                    <tr className="bg-slate-50">
                      <th className="px-2 py-1 border text-center text-xs">1U-1V</th>
                      <th className="px-2 py-1 border text-center text-xs">1V-1W</th>
                      <th className="px-2 py-1 border text-center text-xs">1W-1U</th>
                      <th className="px-2 py-1 border text-center text-xs">2U-2V</th>
                      <th className="px-2 py-1 border text-center text-xs">2V-2W</th>
                      <th className="px-2 py-1 border text-center text-xs">2W-2U</th>
                      <th className="px-2 py-1 border text-center text-xs">2U-2N</th>
                      <th className="px-2 py-1 border text-center text-xs">2V-2N</th>
                      <th className="px-2 py-1 border text-center text-xs">2W-2N</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.magnetic_balance_tests.map((test, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="px-2 py-1 border">
                          <input
                            type="text"
                            value={test.circuit}
                            onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'circuit', e.target.value)}
                            className="w-20 px-1 py-1 text-xs border border-slate-200 rounded text-center"
                          />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.applied_1u1v} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'applied_1u1v', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.applied_1v1w} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'applied_1v1w', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.applied_1w1u} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'applied_1w1u', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.measured_2u2v} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'measured_2u2v', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.measured_2v2w} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'measured_2v2w', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.measured_2w2u} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'measured_2w2u', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.measured_2u2n} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'measured_2u2n', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.measured_2v2n} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'measured_2v2n', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                        <td className="px-1 py-1 border">
                          <input type="text" value={test.measured_2w2n} onChange={(e) => handleArrayChange('magnetic_balance_tests', idx, 'measured_2w2n', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* TEST 4: Ratio Test (NEW) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">TEST 4</span>
              Transformer Ratio Test
            </h2>
            <button
              type="button"
              onClick={() => toggleTestSection('ratioTest')}
              className={`px-3 py-1 text-sm rounded-lg ${enabledTests.ratioTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {enabledTests.ratioTest ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {enabledTests.ratioTest && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th rowSpan="2" className="px-2 py-2 border text-center text-xs font-semibold">TAP<br/>NO</th>
                    <th colSpan="3" className="px-2 py-1 border text-center text-xs font-semibold">Applied Primary Voltage (V)</th>
                    <th colSpan="6" className="px-2 py-1 border text-center text-xs font-semibold">Measured Secondary Voltage (V)</th>
                    <th rowSpan="2" className="px-2 py-2 border text-center text-xs font-semibold w-10"></th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="px-2 py-1 border text-center text-xs">1U-1V</th>
                    <th className="px-2 py-1 border text-center text-xs">1V-1W</th>
                    <th className="px-2 py-1 border text-center text-xs">1W-1U</th>
                    <th className="px-2 py-1 border text-center text-xs">2U-2V</th>
                    <th className="px-2 py-1 border text-center text-xs">2V-2W</th>
                    <th className="px-2 py-1 border text-center text-xs">2W-2U</th>
                    <th className="px-2 py-1 border text-center text-xs">2U-2N</th>
                    <th className="px-2 py-1 border text-center text-xs">2V-2N</th>
                    <th className="px-2 py-1 border text-center text-xs">2W-2N</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.ratio_tests.map((test, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="px-2 py-1 border text-center">
                        <input type="text" value={test.tap_no} onChange={(e) => handleArrayChange('ratio_tests', idx, 'tap_no', e.target.value)} className="w-10 px-1 py-1 text-xs border border-slate-200 rounded text-center font-medium" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.applied_1u1v} onChange={(e) => handleArrayChange('ratio_tests', idx, 'applied_1u1v', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.applied_1v1w} onChange={(e) => handleArrayChange('ratio_tests', idx, 'applied_1v1w', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.applied_1w1u} onChange={(e) => handleArrayChange('ratio_tests', idx, 'applied_1w1u', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.measured_2u2v} onChange={(e) => handleArrayChange('ratio_tests', idx, 'measured_2u2v', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.measured_2v2w} onChange={(e) => handleArrayChange('ratio_tests', idx, 'measured_2v2w', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.measured_2w2u} onChange={(e) => handleArrayChange('ratio_tests', idx, 'measured_2w2u', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.measured_2u2n} onChange={(e) => handleArrayChange('ratio_tests', idx, 'measured_2u2n', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.measured_2v2n} onChange={(e) => handleArrayChange('ratio_tests', idx, 'measured_2v2n', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.measured_2w2n} onChange={(e) => handleArrayChange('ratio_tests', idx, 'measured_2w2n', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border text-center">
                        <button
                          type="button"
                          onClick={() => removeArrayItem('ratio_tests', idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          disabled={formData.ratio_tests.length <= 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => addArrayItem('ratio_tests', { tap_no: String(formData.ratio_tests.length + 1), applied_1u1v: '417.5', applied_1v1w: '417.5', applied_1w1u: '417.8', measured_2u2v: '', measured_2v2w: '', measured_2w2u: '', measured_2u2n: '', measured_2v2n: '', measured_2w2n: '' })}
                className="mt-2 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
              >
                <Plus size={14} /> Add Tap
              </button>
            </div>
          )}
        </div>

        {/* TEST 5: Three Phase Magnetising Current Test (NEW) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">TEST 5</span>
              Three Phase Magnetising Current Test
            </h2>
            <button
              type="button"
              onClick={() => toggleTestSection('magnetisingCurrentTest')}
              className={`px-3 py-1 text-sm rounded-lg ${enabledTests.magnetisingCurrentTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {enabledTests.magnetisingCurrentTest ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {enabledTests.magnetisingCurrentTest && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th rowSpan="2" className="px-2 py-2 border text-center text-xs font-semibold">TAP<br/>POSITION</th>
                    <th colSpan="3" className="px-2 py-1 border text-center text-xs font-semibold">Applied Voltage (V)</th>
                    <th colSpan="3" className="px-2 py-1 border text-center text-xs font-semibold">Measured Current (mA)</th>
                    <th rowSpan="2" className="px-2 py-2 border text-center text-xs font-semibold w-10"></th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="px-2 py-1 border text-center text-xs">1U-1V</th>
                    <th className="px-2 py-1 border text-center text-xs">1V-1W</th>
                    <th className="px-2 py-1 border text-center text-xs">1W-1U</th>
                    <th className="px-2 py-1 border text-center text-xs">1U</th>
                    <th className="px-2 py-1 border text-center text-xs">1V</th>
                    <th className="px-2 py-1 border text-center text-xs">1W</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.magnetising_current_tests.map((test, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="px-2 py-1 border text-center">
                        <input type="text" value={test.tap_position} onChange={(e) => handleArrayChange('magnetising_current_tests', idx, 'tap_position', e.target.value)} className="w-10 px-1 py-1 text-xs border border-slate-200 rounded text-center font-medium" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.applied_1u1v} onChange={(e) => handleArrayChange('magnetising_current_tests', idx, 'applied_1u1v', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.applied_1v1w} onChange={(e) => handleArrayChange('magnetising_current_tests', idx, 'applied_1v1w', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.applied_1w1u} onChange={(e) => handleArrayChange('magnetising_current_tests', idx, 'applied_1w1u', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.current_1u} onChange={(e) => handleArrayChange('magnetising_current_tests', idx, 'current_1u', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.current_1v} onChange={(e) => handleArrayChange('magnetising_current_tests', idx, 'current_1v', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border">
                        <input type="text" value={test.current_1w} onChange={(e) => handleArrayChange('magnetising_current_tests', idx, 'current_1w', e.target.value)} className="w-16 px-1 py-1 text-xs border border-slate-200 rounded text-center" />
                      </td>
                      <td className="px-1 py-1 border text-center">
                        <button
                          type="button"
                          onClick={() => removeArrayItem('magnetising_current_tests', idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          disabled={formData.magnetising_current_tests.length <= 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => addArrayItem('magnetising_current_tests', { tap_position: String(formData.magnetising_current_tests.length + 1), applied_1u1v: '417.5', applied_1v1w: '417.5', applied_1w1u: '417.8', current_1u: '', current_1v: '', current_1w: '' })}
                className="mt-2 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
              >
                <Plus size={14} /> Add Tap Position
              </button>
            </div>
          )}
        </div>

        {/* TEST 6: Vector Group Test */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">TEST 6</span>
              Vector Group Test
            </h2>
            <button
              type="button"
              onClick={() => toggleTestSection('vectorGroupTest')}
              className={`px-3 py-1 text-sm rounded-lg ${enabledTests.vectorGroupTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {enabledTests.vectorGroupTest ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {enabledTests.vectorGroupTest && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Test Parameters</th>
                      <th className="px-3 py-2 text-left">Values Observed</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.vector_group_tests.map((test, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={test.parameter}
                            onChange={(e) => handleArrayChange('vector_group_tests', idx, 'parameter', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded font-mono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={test.observed}
                            onChange={(e) => handleArrayChange('vector_group_tests', idx, 'observed', e.target.value)}
                            className="w-48 px-2 py-1 border border-slate-200 rounded"
                            placeholder="Enter observed values"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeArrayItem('vector_group_tests', idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={() => addArrayItem('vector_group_tests', { parameter: '', observed: '' })}
                  className="mt-2 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  name="vector_group_remarks"
                  value={formData.vector_group_remarks}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>

        {/* OLTC Section Toggle */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_oltc"
              name="has_oltc"
              checked={formData.has_oltc}
              onChange={handleInputChange}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="has_oltc" className="text-lg font-semibold text-slate-800 cursor-pointer">
              Include OLTC (On-Load Tap Changer) Tests
            </label>
          </div>
        </div>

        {/* OLTC Equipment Details (Conditional) */}
        {formData.has_oltc && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">OLTC Equipment Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Name</label>
                  <input
                    type="text"
                    name="oltc_equipment_name"
                    value={formData.oltc_equipment_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., OLTC of 400KVA Transformer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="oltc_location"
                    value={formData.oltc_location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rating (KVA)</label>
                  <input
                    type="text"
                    name="oltc_rating"
                    value={formData.oltc_rating}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Taps</label>
                  <input
                    type="text"
                    name="oltc_total_taps"
                    value={formData.oltc_total_taps}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Normal Tap</label>
                  <input
                    type="text"
                    name="oltc_normal_tap"
                    value={formData.oltc_normal_tap}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                  <input
                    type="text"
                    name="oltc_make"
                    value={formData.oltc_make}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Serial No.</label>
                  <input
                    type="text"
                    name="oltc_serial_no"
                    value={formData.oltc_serial_no}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* TEST 7: OLTC Oil BDV Test */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded mr-2">TEST 7</span>
                  OLTC Oil BDV Test
                </h2>
                <button
                  type="button"
                  onClick={() => toggleTestSection('oltcOilBdvTest')}
                  className={`px-3 py-1 text-sm rounded-lg ${enabledTests.oltcOilBdvTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {enabledTests.oltcOilBdvTest ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {enabledTests.oltcOilBdvTest && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Before Filtration - Flash Point (KV)</label>
                    <input
                      type="text"
                      name="oltc_bdv_before"
                      value={formData.oltc_bdv_before}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">After Filtration - BDV at 2.5mm Gap (KV)</label>
                    <input
                      type="text"
                      name="oltc_bdv_after"
                      value={formData.oltc_bdv_after}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">After Filtration - Flash Point (KV)</label>
                    <input
                      type="text"
                      name="oltc_bdv_flash_point"
                      value={formData.oltc_bdv_flash_point}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <textarea
                      name="oltc_bdv_remarks"
                      value={formData.oltc_bdv_remarks}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TEST 8: OLTC Operational Checklist */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded mr-2">TEST 8</span>
                  OLTC Operational Checklist
                </h2>
                <button
                  type="button"
                  onClick={() => toggleTestSection('oltcOperationalChecklist')}
                  className={`px-3 py-1 text-sm rounded-lg ${enabledTests.oltcOperationalChecklist ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {enabledTests.oltcOperationalChecklist ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {enabledTests.oltcOperationalChecklist && (
                <div className="space-y-3">
                  {[
                    { name: 'oltc_visual_inspection', label: 'Visual Inspection of Equipment' },
                    { name: 'oltc_local_operation', label: 'Local Operation (Electrical)' },
                    { name: 'oltc_remote_operation', label: 'Remote Operation (Electrical)' },
                    { name: 'oltc_tap_position_indicator', label: 'Tap Position Indicator' },
                    { name: 'oltc_limit_switch', label: 'Limit Switch' },
                    { name: 'oltc_cooling_equipment', label: 'Checking of Cooling Equipments' },
                    { name: 'oltc_pump_fan_rotation', label: 'Rotation Direction of Pumps / Fans' },
                    { name: 'oltc_spares_oil_topup', label: 'Spares / Oil Top Up Done' }
                  ].map(item => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={item.name}
                            checked={formData[item.name] === true}
                            onChange={() => setFormData(prev => ({ ...prev, [item.name]: true }))}
                            className="w-4 h-4 text-green-600"
                          />
                          <span className="text-sm text-green-600 font-medium">YES</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={item.name}
                            checked={formData[item.name] === false}
                            onChange={() => setFormData(prev => ({ ...prev, [item.name]: false }))}
                            className="w-4 h-4 text-red-600"
                          />
                          <span className="text-sm text-red-600 font-medium">NO</span>
                        </label>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Record Deficiencies, if any</label>
                    <textarea
                      name="oltc_deficiencies"
                      value={formData.oltc_deficiencies}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Results Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Results</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Overall Result</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="overall_result"
                    value="satisfactory"
                    checked={formData.overall_result === 'satisfactory'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-green-600 font-medium">Satisfactory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="overall_result"
                    value="unsatisfactory"
                    checked={formData.overall_result === 'unsatisfactory'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-red-600 font-medium">Unsatisfactory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="overall_result"
                    value="requires_attention"
                    checked={formData.overall_result === 'requires_attention'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm text-orange-600 font-medium">Requires Attention</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Result & Remarks</label>
              <textarea
                name="final_remarks"
                value={formData.final_remarks}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Signatures</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-700 text-center border-b pb-2">SERVICE PROVIDER</h3>
              <p className="text-center text-sm text-slate-600">{formData.service_company}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="engineer_signature_name"
                    value={formData.engineer_signature_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <DatePicker
                    value={formData.engineer_signature_date}
                    onChange={(val) => handleInputChange({ target: { name: 'engineer_signature_date', value: val } })}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Signature</label>
                <div className="h-16 border border-dashed border-slate-300 rounded-lg bg-white"></div>
              </div>
            </div>
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-700 text-center border-b pb-2">CUSTOMER</h3>
              <p className="text-center text-sm text-slate-600">{formData.customer_name || 'Customer Company'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="customer_signature_name"
                    value={formData.customer_signature_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <DatePicker
                    value={formData.customer_signature_date}
                    onChange={(val) => handleInputChange({ target: { name: 'customer_signature_date', value: val } })}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Signature</label>
                <div className="h-16 border border-dashed border-slate-300 rounded-lg bg-white"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/projects/project-reports/equipment/transformer')}
            className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={saving}
            className="px-6 py-2.5 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Complete & Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransformerTestReport;
