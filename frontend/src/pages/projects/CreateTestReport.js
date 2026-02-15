import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Plus, Trash2, Upload, Camera, CheckCircle } from 'lucide-react';
import { EQUIPMENT_TYPES } from './EquipmentTestReports';
import { testReportsAPI, projectsAPI, settingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '../../components/ui/date-picker';

// Equipment-specific field configurations
const EQUIPMENT_FIELDS = {
  'transformer': {
    sections: [
      {
        title: 'Transformer Details',
        fields: [
          { name: 'transformer_type', label: 'Transformer Type', type: 'select', options: ['Distribution', 'Power', 'Auto', 'Isolation', 'Step-up', 'Step-down'] },
          { name: 'capacity', label: 'Capacity (KVA)', type: 'number' },
          { name: 'voltage_ratio', label: 'Voltage Ratio (HV/LV)', type: 'text', placeholder: 'e.g., 11000/433V' },
          { name: 'serial_no', label: 'Serial Number', type: 'text' },
          { name: 'make', label: 'Make/Manufacturer', type: 'text' },
          { name: 'year_of_mfg', label: 'Year of Manufacturing', type: 'number' },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'ir_value_hv', label: 'IR Value HV to E (MΩ)', type: 'number', step: '0.01' },
          { name: 'ir_value_lv', label: 'IR Value LV to E (MΩ)', type: 'number', step: '0.01' },
          { name: 'ir_value_hv_lv', label: 'IR Value HV to LV (MΩ)', type: 'number', step: '0.01' },
          { name: 'oil_level', label: 'Oil Level', type: 'select', options: ['Normal', 'Low', 'High', 'N/A'] },
          { name: 'oil_temperature', label: 'Oil Temperature (°C)', type: 'number' },
          { name: 'winding_temperature', label: 'Winding Temperature (°C)', type: 'number' },
          { name: 'load_current', label: 'Load Current (A)', type: 'number', step: '0.1' },
          { name: 'tap_position', label: 'Tap Position', type: 'text' },
        ]
      }
    ]
  },
  'earth-pit': {
    sections: [
      {
        title: 'Earth Pit Details',
        fields: [
          { name: 'pit_type', label: 'Earth Pit Type', type: 'select', options: ['Pipe Type', 'Plate Type', 'Rod Type', 'Chemical', 'Maintenance Free'] },
          { name: 'pit_no', label: 'Pit Number/ID', type: 'text' },
          { name: 'depth', label: 'Depth (meters)', type: 'number', step: '0.1' },
          { name: 'soil_type', label: 'Soil Type', type: 'select', options: ['Clay', 'Sandy', 'Rocky', 'Loamy', 'Mixed'] },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'earth_resistance', label: 'Earth Resistance (Ω)', type: 'number', step: '0.01' },
          { name: 'soil_resistivity', label: 'Soil Resistivity (Ω-m)', type: 'number', step: '0.1' },
          { name: 'moisture_content', label: 'Moisture Content (%)', type: 'number' },
          { name: 'test_method', label: 'Test Method', type: 'select', options: ['Fall of Potential', 'Clamp Method', 'Stakeless', 'Three Point'] },
          { name: 'weather_condition', label: 'Weather Condition', type: 'select', options: ['Sunny', 'Cloudy', 'Rainy', 'Humid'] },
        ]
      }
    ]
  },
  'energy-meter': {
    sections: [
      {
        title: 'Meter Details',
        fields: [
          { name: 'meter_type', label: 'Meter Type', type: 'select', options: ['Single Phase', 'Three Phase', 'CT Operated', 'Direct Connected', 'Smart Meter', 'Prepaid'] },
          { name: 'meter_no', label: 'Meter Number', type: 'text' },
          { name: 'make', label: 'Make/Brand', type: 'text' },
          { name: 'ct_ratio', label: 'CT Ratio', type: 'text', placeholder: 'e.g., 100/5A' },
          { name: 'pt_ratio', label: 'PT Ratio', type: 'text', placeholder: 'e.g., 11000/110V' },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'accuracy_class', label: 'Accuracy Class', type: 'select', options: ['0.2', '0.5', '1.0', '2.0'] },
          { name: 'starting_current', label: 'Starting Current Test', type: 'select', options: ['Pass', 'Fail'] },
          { name: 'creeping_test', label: 'Creeping Test', type: 'select', options: ['Pass', 'Fail'] },
          { name: 'error_percentage', label: 'Error Percentage (%)', type: 'number', step: '0.01' },
          { name: 'seal_condition', label: 'Seal Condition', type: 'select', options: ['Intact', 'Broken', 'Missing'] },
        ]
      }
    ]
  },
  'mccb': {
    sections: [
      {
        title: 'MCCB Details',
        fields: [
          { name: 'mccb_rating', label: 'MCCB Rating (A)', type: 'number' },
          { name: 'frame_size', label: 'Frame Size', type: 'text' },
          { name: 'poles', label: 'No. of Poles', type: 'select', options: ['2P', '3P', '4P'] },
          { name: 'make', label: 'Make/Brand', type: 'text' },
          { name: 'serial_no', label: 'Serial Number', type: 'text' },
          { name: 'breaking_capacity', label: 'Breaking Capacity (kA)', type: 'number' },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'ir_value', label: 'Insulation Resistance (MΩ)', type: 'number', step: '0.1' },
          { name: 'contact_resistance', label: 'Contact Resistance (μΩ)', type: 'number' },
          { name: 'trip_test', label: 'Trip Test Result', type: 'select', options: ['Pass', 'Fail'] },
          { name: 'overload_test', label: 'Overload Trip Test', type: 'select', options: ['Pass', 'Fail', 'N/A'] },
          { name: 'short_circuit_test', label: 'Short Circuit Test', type: 'select', options: ['Pass', 'Fail', 'N/A'] },
          { name: 'mechanical_operation', label: 'Mechanical Operation', type: 'select', options: ['Smooth', 'Stiff', 'Defective'] },
        ]
      }
    ]
  },
  'acb': {
    sections: [
      {
        title: 'ACB Details',
        fields: [
          { name: 'acb_rating', label: 'ACB Rating (A)', type: 'number' },
          { name: 'voltage_rating', label: 'Voltage Rating (V)', type: 'number' },
          { name: 'poles', label: 'No. of Poles', type: 'select', options: ['3P', '4P'] },
          { name: 'make', label: 'Make/Brand', type: 'text' },
          { name: 'model', label: 'Model', type: 'text' },
          { name: 'breaking_capacity', label: 'Breaking Capacity (kA)', type: 'number' },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'ir_value', label: 'Insulation Resistance (MΩ)', type: 'number', step: '0.1' },
          { name: 'contact_resistance', label: 'Contact Resistance (μΩ)', type: 'number' },
          { name: 'closing_time', label: 'Closing Time (ms)', type: 'number' },
          { name: 'opening_time', label: 'Opening Time (ms)', type: 'number' },
          { name: 'spring_charging', label: 'Spring Charging', type: 'select', options: ['Normal', 'Slow', 'Defective'] },
          { name: 'trip_unit_test', label: 'Trip Unit Test', type: 'select', options: ['Pass', 'Fail'] },
        ]
      }
    ]
  },
  'vcb': {
    sections: [
      {
        title: 'VCB Details',
        fields: [
          { name: 'vcb_rating', label: 'VCB Rating (A)', type: 'number' },
          { name: 'voltage_class', label: 'Voltage Class (kV)', type: 'select', options: ['3.3', '6.6', '11', '22', '33'] },
          { name: 'make', label: 'Make/Brand', type: 'text' },
          { name: 'model', label: 'Model', type: 'text' },
          { name: 'serial_no', label: 'Serial Number', type: 'text' },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'vacuum_integrity', label: 'Vacuum Integrity Test', type: 'select', options: ['Pass', 'Fail'] },
          { name: 'ir_value', label: 'Insulation Resistance (MΩ)', type: 'number', step: '0.1' },
          { name: 'contact_resistance', label: 'Contact Resistance (μΩ)', type: 'number' },
          { name: 'timing_test_close', label: 'Closing Time (ms)', type: 'number' },
          { name: 'timing_test_open', label: 'Opening Time (ms)', type: 'number' },
          { name: 'mechanism_operation', label: 'Mechanism Operation', type: 'select', options: ['Normal', 'Sluggish', 'Defective'] },
        ]
      }
    ]
  },
  'dg': {
    sections: [
      {
        title: 'DG Set Details',
        fields: [
          { name: 'dg_capacity', label: 'DG Capacity (KVA)', type: 'number' },
          { name: 'engine_make', label: 'Engine Make', type: 'text' },
          { name: 'alternator_make', label: 'Alternator Make', type: 'text' },
          { name: 'serial_no', label: 'Serial Number', type: 'text' },
          { name: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Diesel', 'Gas', 'Dual Fuel'] },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'load_test_25', label: '25% Load Test (kW)', type: 'number' },
          { name: 'load_test_50', label: '50% Load Test (kW)', type: 'number' },
          { name: 'load_test_75', label: '75% Load Test (kW)', type: 'number' },
          { name: 'load_test_100', label: '100% Load Test (kW)', type: 'number' },
          { name: 'frequency', label: 'Frequency (Hz)', type: 'number', step: '0.1' },
          { name: 'voltage_output', label: 'Voltage Output (V)', type: 'number' },
          { name: 'fuel_consumption', label: 'Fuel Consumption (L/hr)', type: 'number', step: '0.1' },
          { name: 'exhaust_temp', label: 'Exhaust Temperature (°C)', type: 'number' },
        ]
      }
    ]
  },
  'lighting': {
    sections: [
      {
        title: 'Area Details',
        fields: [
          { name: 'area_type', label: 'Area Type', type: 'select', options: ['Office', 'Workshop', 'Warehouse', 'Outdoor', 'Emergency Exit', 'Control Room'] },
          { name: 'area_name', label: 'Area Name', type: 'text' },
          { name: 'area_dimensions', label: 'Area Dimensions (L x W x H)', type: 'text', placeholder: 'e.g., 10m x 8m x 3m' },
          { name: 'fixture_type', label: 'Fixture Type', type: 'select', options: ['LED', 'Fluorescent', 'Metal Halide', 'High Bay', 'Flood Light', 'Street Light'] },
          { name: 'no_of_fixtures', label: 'No. of Fixtures', type: 'number' },
        ]
      },
      {
        title: 'Lux Level Measurements',
        fields: [
          { name: 'lux_point_1', label: 'Measurement Point 1 (Lux)', type: 'number' },
          { name: 'lux_point_2', label: 'Measurement Point 2 (Lux)', type: 'number' },
          { name: 'lux_point_3', label: 'Measurement Point 3 (Lux)', type: 'number' },
          { name: 'lux_point_4', label: 'Measurement Point 4 (Lux)', type: 'number' },
          { name: 'lux_average', label: 'Average Lux Level', type: 'number' },
          { name: 'lux_standard', label: 'Required Standard (Lux)', type: 'number' },
          { name: 'compliance', label: 'Compliance', type: 'select', options: ['Compliant', 'Non-Compliant', 'Marginal'] },
        ]
      }
    ]
  },
  'lightning-arrestor': {
    sections: [
      {
        title: 'Arrestor Details',
        fields: [
          { name: 'arrestor_type', label: 'Arrestor Type', type: 'select', options: ['Rod Type', 'Horn Gap', 'Metal Oxide', 'Surge Arrester'] },
          { name: 'voltage_class', label: 'Voltage Class (kV)', type: 'number' },
          { name: 'make', label: 'Make/Brand', type: 'text' },
          { name: 'location', label: 'Installation Location', type: 'text' },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'ir_value', label: 'Insulation Resistance (MΩ)', type: 'number', step: '0.1' },
          { name: 'leakage_current', label: 'Leakage Current (mA)', type: 'number', step: '0.01' },
          { name: 'earth_continuity', label: 'Earth Continuity', type: 'select', options: ['Good', 'Poor', 'Open'] },
          { name: 'physical_condition', label: 'Physical Condition', type: 'select', options: ['Good', 'Damaged', 'Corroded'] },
        ]
      }
    ]
  },
  'ups': {
    sections: [
      {
        title: 'UPS Details',
        fields: [
          { name: 'ups_capacity', label: 'UPS Capacity (KVA)', type: 'number' },
          { name: 'ups_type', label: 'UPS Type', type: 'select', options: ['Online', 'Offline', 'Line Interactive', 'Modular'] },
          { name: 'make', label: 'Make/Brand', type: 'text' },
          { name: 'model', label: 'Model', type: 'text' },
          { name: 'battery_type', label: 'Battery Type', type: 'select', options: ['SMF', 'Tubular', 'Lithium-Ion'] },
          { name: 'battery_ah', label: 'Battery Capacity (Ah)', type: 'number' },
          { name: 'no_of_batteries', label: 'No. of Batteries', type: 'number' },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'input_voltage', label: 'Input Voltage (V)', type: 'number' },
          { name: 'output_voltage', label: 'Output Voltage (V)', type: 'number' },
          { name: 'load_percentage', label: 'Load Percentage (%)', type: 'number' },
          { name: 'backup_time', label: 'Backup Time (minutes)', type: 'number' },
          { name: 'battery_voltage', label: 'Battery Voltage (V)', type: 'number', step: '0.1' },
          { name: 'battery_condition', label: 'Battery Condition', type: 'select', options: ['Good', 'Weak', 'Replace'] },
          { name: 'transfer_time', label: 'Transfer Time (ms)', type: 'number' },
        ]
      }
    ]
  },
  'ir-thermography': {
    sections: [
      {
        title: 'Survey Details',
        fields: [
          { name: 'survey_area', label: 'Survey Area', type: 'text' },
          { name: 'camera_model', label: 'Camera Model', type: 'text' },
          { name: 'emissivity', label: 'Emissivity Setting', type: 'number', step: '0.01', placeholder: '0.95' },
          { name: 'ambient_temp', label: 'Ambient Temperature (°C)', type: 'number' },
          { name: 'humidity', label: 'Humidity (%)', type: 'number' },
        ]
      },
      {
        title: 'Findings',
        fields: [
          { name: 'hotspots_found', label: 'No. of Hotspots Found', type: 'number' },
          { name: 'max_temp_recorded', label: 'Maximum Temperature (°C)', type: 'number' },
          { name: 'severity', label: 'Overall Severity', type: 'select', options: ['Normal', 'Attention', 'Intermediate', 'Serious', 'Critical'] },
          { name: 'priority_action', label: 'Priority Action Required', type: 'select', options: ['None', 'Schedule Maintenance', 'Urgent', 'Immediate Shutdown'] },
        ]
      }
    ]
  },
  'electrical-panel': {
    sections: [
      {
        title: 'Panel Details',
        fields: [
          { name: 'panel_type', label: 'Panel Type', type: 'select', options: ['MCC', 'PCC', 'PMCC', 'APFC', 'Distribution Board', 'Control Panel'] },
          { name: 'panel_name', label: 'Panel Name/ID', type: 'text' },
          { name: 'voltage_rating', label: 'Voltage Rating (V)', type: 'number' },
          { name: 'current_rating', label: 'Current Rating (A)', type: 'number' },
          { name: 'make', label: 'Make/Brand', type: 'text' },
          { name: 'ip_rating', label: 'IP Rating', type: 'select', options: ['IP20', 'IP31', 'IP42', 'IP54', 'IP55', 'IP65'] },
        ]
      },
      {
        title: 'Test Results',
        fields: [
          { name: 'ir_value_bus', label: 'Busbar IR Value (MΩ)', type: 'number', step: '0.1' },
          { name: 'earth_continuity', label: 'Earth Continuity', type: 'select', options: ['Good', 'Poor', 'Open'] },
          { name: 'tightness_check', label: 'Connection Tightness', type: 'select', options: ['All Tight', 'Some Loose', 'Major Issues'] },
          { name: 'cleanliness', label: 'Cleanliness', type: 'select', options: ['Clean', 'Dusty', 'Very Dirty'] },
          { name: 'ventilation', label: 'Ventilation', type: 'select', options: ['Adequate', 'Poor', 'Blocked'] },
          { name: 'labeling', label: 'Labeling/Marking', type: 'select', options: ['Complete', 'Partial', 'Missing'] },
        ]
      }
    ]
  }
};

const CreateTestReport = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  const [formData, setFormData] = useState({
    // Common fields
    project_id: '',
    project_name: '',
    location: '',
    test_date: new Date().toISOString().split('T')[0],
    tested_by: user?.name || '',
    witnessed_by: '',
    ambient_temperature: '',
    humidity: '',
    remarks: '',
    recommendations: '',
    overall_condition: 'satisfactory',
    // Customer Information fields
    customer_name: '',
    site_location: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    po_ref: '',
    po_dated: '',
    // Service Provider fields
    service_company: 'Enerzia Power Solutions',
    service_address: '',
    engineer_name: user?.name || '',
    engineer_email: '',
    engineer_mobile: '',
    // Equipment-specific fields will be added dynamically
  });

  const equipment = EQUIPMENT_TYPES.find(e => e.id === equipmentId);
  const equipmentFields = EQUIPMENT_FIELDS[equipmentId];
  const Icon = equipment?.icon;

  useEffect(() => {
    fetchInitialData();
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill project name when project is selected
    if (name === 'project_id') {
      const selectedProject = projects.find(p => p.id === value);
      if (selectedProject) {
        setFormData(prev => ({
          ...prev,
          project_name: selectedProject.project_name,
          location: selectedProject.location || '',
          site_location: selectedProject.location || '',
          customer_name: selectedProject.client || ''
        }));
      }
    }

    // Auto-fill customer info when client is selected
    if (name === 'customer_name') {
      const client = clients.find(c => c.name === value);
      if (client) {
        setFormData(prev => ({
          ...prev,
          contact_person: client.contact_person || '',
          contact_phone: client.phone || '',
          contact_email: client.email || '',
          site_location: client.address || prev.site_location
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
          engineer_mobile: member.phone || '',
          tested_by: member.name || prev.tested_by
        }));
      }
    }
  };

  const handleSubmit = async (e, status = 'draft') => {
    e.preventDefault();
    setSaving(true);

    try {
      const reportData = {
        ...formData,
        equipment_type: equipmentId,
        status,
        created_by: user?.name || user?.email
      };

      const response = await testReportsAPI.create(reportData);
      
      // Show success message
      alert(`Report ${response.data.report_no} created successfully!`);
      
      navigate(`/projects/project-reports/equipment/${equipmentId}`);
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!equipment) {
    return <div className="p-8 text-center">Equipment type not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/projects/project-reports/equipment/${equipmentId}`)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`${equipment.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
              <Icon className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">New {equipment.name} Report</h1>
              <p className="text-slate-500">Create a new test report</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'completed')}>
        {/* Common Fields Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-slate-400" />
            General Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Project (Optional)</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.pid_no} - {project.project_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location / Site</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Date</label>
              <DatePicker
                value={formData.test_date}
                onChange={(val) => handleInputChange({ target: { name: 'test_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tested By</label>
              <input
                type="text"
                name="tested_by"
                value={formData.tested_by}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Witnessed By</label>
              <input
                type="text"
                name="witnessed_by"
                value={formData.witnessed_by}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Customer representative"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ambient Temperature (°C)</label>
              <input
                type="number"
                name="ambient_temperature"
                value={formData.ambient_temperature}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Customer Information Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                list="clients-list"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Select or enter company name"
                required
              />
              <datalist id="clients-list">
                {clients.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Site Location *</label>
              <input
                type="text"
                name="site_location"
                value={formData.site_location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Full site address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">P.O. Ref #</label>
              <input
                type="text"
                name="po_ref"
                value={formData.po_ref}
                onChange={handleInputChange}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
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

        {/* Service Provider Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
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
                  placeholder="Enter company address"
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
                  <option value="">Select Engineer</option>
                  {teamMembers.map(member => (
                    <option key={member.id || member.email} value={member.name}>{member.name}</option>
                  ))}
                  <option value={user?.name || ''}>{user?.name || 'Current User'} (Me)</option>
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

        {/* Equipment-Specific Sections */}
        {equipmentFields?.sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{section.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      step={field.step}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Remarks & Recommendations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Remarks & Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overall Condition</label>
              <select
                name="overall_condition"
                value={formData.overall_condition}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="satisfactory">Satisfactory</option>
                <option value="needs_attention">Needs Attention</option>
                <option value="critical">Critical - Immediate Action Required</option>
                <option value="not_working">Not Working</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any observations or remarks..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Recommendations</label>
              <textarea
                name="recommendations"
                value={formData.recommendations}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter recommendations for maintenance or improvements..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/projects/project-reports/equipment/${equipmentId}`)}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={saving}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2.5 ${equipment.color} text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTestReport;
