import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, FileText, Plus, Trash2, Download, 
  CheckCircle, XCircle, Minus, Loader2, AlertCircle, RefreshCw, Upload 
} from 'lucide-react';
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

// Equipment type display info
const EQUIPMENT_INFO = {
  acb: { name: 'ACB', fullName: 'Air Circuit Breaker', color: 'bg-red-500' },
  mccb: { name: 'MCCB', fullName: 'Moulded Case Circuit Breaker', color: 'bg-purple-500' },
  vcb: { name: 'VCB', fullName: 'Vacuum Circuit Breaker', color: 'bg-indigo-500' },
  panel: { name: 'Panel', fullName: 'Electrical Panel / DB', color: 'bg-cyan-500' },
  'electrical-panel': { name: 'Panel', fullName: 'Electrical Panel / DB', color: 'bg-cyan-500' },
  relay: { name: 'Relay', fullName: 'Protection Relay', color: 'bg-pink-500' },
  apfc: { name: 'APFC', fullName: 'Automatic Power Factor Correction', color: 'bg-emerald-500' },
  battery: { name: 'Battery', fullName: 'Battery Bank', color: 'bg-lime-600' },
  earth_pit: { name: 'Earth Pit', fullName: 'Earth Pit / Grounding', color: 'bg-green-600' },
  'earth-pit': { name: 'Earth Pit', fullName: 'Earth Pit / Grounding', color: 'bg-green-600' },
  ups: { name: 'UPS', fullName: 'Uninterrupted Power Supply', color: 'bg-teal-500' },
  dg: { name: 'DG', fullName: 'Diesel Generator', color: 'bg-orange-500' },
  lightning_arrestor: { name: 'LA', fullName: 'Lightning Arrestor', color: 'bg-slate-600' },
  'lightning-arrestor': { name: 'LA', fullName: 'Lightning Arrestor', color: 'bg-slate-600' },
  energy_meter: { name: 'Energy Meter', fullName: 'Energy Meter / kWh Meter', color: 'bg-amber-500' },
  'energy-meter': { name: 'Energy Meter', fullName: 'Energy Meter / kWh Meter', color: 'bg-amber-500' },
  voltmeter: { name: 'Voltmeter', fullName: 'Voltmeter / Voltage Meter', color: 'bg-indigo-500' },
  ammeter: { name: 'Ammeter', fullName: 'Ammeter / Current Meter', color: 'bg-cyan-500' },
};

const EquipmentServiceReport = () => {
  const { equipmentType, reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!reportId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [orgSettings, setOrgSettings] = useState(null);
  const [error, setError] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    report_no: '',
    report_type: 'Periodical Maintenance',
    report_date: new Date().toISOString().split('T')[0],
    equipment_type: equipmentType,
    report_category: 'equipment',
    
    // Customer Information (Matching Transformer Test Report)
    customer_info: {
      company_name: '',
      site_location: '',
      project_name: '',
      po_ref: '',
      contact_person: '',
      contact_phone: '',
      po_dated: '',
      contact_email: ''
    },
    
    // Service Provider Details (Matching Transformer Test Report)
    service_provider: {
      company_name: 'Enerzia Power Solutions',
      company_address: 'Plot No. 123, Industrial Area, Phase-II',
      engineer_name: user?.name || '',
      engineer_email: user?.email || '',
      engineer_mobile: ''
    },
    
    // Legacy fields for backward compatibility
    project_id: '',
    project_name: '',
    customer_name: '',
    location: '',
    test_date: new Date().toISOString().split('T')[0],
    date_of_testing: new Date().toISOString().split('T')[0],
    date_of_energization: '',
    tested_by: user?.name || '',
    witnessed_by: '',
    remarks: '',
    status: 'draft',
    
    // Equipment details (dynamic based on template)
    equipment_details: {},
    
    // Checklist items (array of {id, item, status: 'yes'|'no'|'na', remarks})
    checklist: [],
    
    // Points to Ensure for Panel (array of {id, item, sub_items, confirmed: true|false, remarks})
    points_to_ensure: [],
    
    // Panel Section Toggles
    panel_section_toggles: {
      checklist: true,
      capacitor_health: true
    },
    
    // Capacitor Health Report for Panel (array of {feeder, current_r, current_y, current_b, remarks})
    capacitor_health_rows: [],
    
    // IR Test results (for ACB, VCB)
    ir_test: {},
    
    // Timing test (for VCB)
    timing_test: {},
    
    // Settings (for Relay)
    settings: [],
    
    // Readings (for UPS, DG)
    readings: [],
    
    // Capacitor banks (for APFC)
    capacitor_banks: [],
    
    // Test results (for Earth Pit, LA)
    test_results: [],
    
    // Earth Pit Testing Details
    earth_pit_testing_details: {
      pit_type: '',
      electrode_material: '',
      date_of_testing: '',
      next_due_on: ''
    },
    
    // Earth Pit Section Toggles
    earth_pit_section_toggles: {
      electrical_checks: true,
      continuity_checks: true
    },
    
    // Earth Pit Electrical Checks (array of rows)
    electrical_checks_rows: [],
    
    // Earth Pit Continuity Checks (array of rows)
    continuity_checks_rows: [],
    
    // Energy Meter Equipment Details
    energy_meter_details: {
      meter_name: '',
      meter_location: '',
      meter_accuracy: '',
      panel_feeder_name: '',
      make_model: '',
      serial_no: '',
      ct_ratio: '',
      pt_ratio: '',
      system_frequency: '',
      system_voltage: '',
      date_of_calibration: '',
      next_due_on: ''
    },
    
    // Energy Meter Section Toggles
    energy_meter_section_toggles: {
      master_standard: true,
      test_results: true
    },
    
    // Energy Meter Master Standard Details
    energy_meter_master_standard: {
      nomenclature: '',
      make_model: '',
      sl_no: '',
      certificate_no: '',
      validity: ''
    },
    
    // Energy Meter Test Results - Parameters Table (DUC vs STD)
    energy_meter_parameters: {
      duc_vry: '', duc_vyb: '', duc_vbr: '',
      duc_r: '', duc_y: '', duc_b: '',
      duc_pf: '', duc_freq: '',
      std_vry: '', std_vyb: '', std_vbr: '',
      std_r: '', std_y: '', std_b: '',
      std_pf: '', std_freq: ''
    },
    
    // Energy Meter Test Results Summary
    energy_meter_test_summary: {
      result_1: '',
      result_2: ''
    },
    
    // Energy Meter Energy Reading Table
    energy_meter_energy_reading: {
      final_duc: '', final_std: '',
      initial_duc: '', initial_std: '',
      difference_duc: '', difference_std: '',
      mf_duc: '', mf_std: '',
      total_duc: '', total_std: '',
      error_percent: ''
    },
    
    // Voltmeter Details
    voltmeter_details: {
      meter_name: '',
      meter_location: '',
      meter_accuracy: '',
      panel_feeder_name: '',
      make_model: '',
      serial_no: '',
      measuring_range: '',
      system_voltage: '',
      date_of_calibration: '',
      next_due_on: ''
    },
    voltmeter_section_toggles: {
      master_standard: true,
      test_results: true
    },
    voltmeter_master_standard: {
      nomenclature: '',
      make_model: '',
      sl_no: '',
      certificate_no: '',
      validity: ''
    },
    voltmeter_measurement_tests: [
      { phase: 'R-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' },
      { phase: 'Y-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' },
      { phase: 'B-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' },
      { phase: 'R&Y-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' },
      { phase: 'Y&B-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' },
      { phase: 'R&B-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' }
    ],
    
    // Ammeter Details
    ammeter_details: {
      meter_name: '',
      meter_location: '',
      meter_accuracy: '',
      panel_feeder_name: '',
      make_model: '',
      serial_no: '',
      measuring_range: '',
      ct_ratio: '',
      date_of_calibration: '',
      next_due_on: ''
    },
    ammeter_section_toggles: {
      master_standard: true,
      test_results: true
    },
    ammeter_master_standard: {
      nomenclature: '',
      make_model: '',
      sl_no: '',
      certificate_no: '',
      validity: ''
    },
    ammeter_measurement_tests: [
      { phase: 'R-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' },
      { phase: 'Y-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' },
      { phase: 'B-PHASE', test_reading: '', standard_reading: '', error_percent: '', error_limit: '±1.0' }
    ],
    
    // Protection Relay Specific Fields
    relay_details: {
      make: '',
      type: '',
      serial_no: '',
      ct_sec: '',
      control_voltage: ''
    },
    
    // Relay Section Toggles
    relay_section_toggles: {
      service_checklist: true,
      protection_relay_test: true,
      feeder_protection_test: false,
      master_trip_relay_test: false,
      trip_circuit_supervision_test: false
    },
    
    // Protection Relay Test (TEST 1)
    protection_relay_test: {
      // Setting Details
      setting_details: [
        { fb_name: 'I>', setting_current: '', setting_tl: '', dmt: '', remark: 'ON' },
        { fb_name: 'I>>', setting_current: '', setting_tl: '', dmt: '', remark: 'ON' },
        { fb_name: 'Ie>', setting_current: '', setting_tl: '', dmt: '', remark: 'ON' },
        { fb_name: 'Ie>>', setting_current: '', setting_tl: '', dmt: '', remark: 'ON' }
      ],
      // Pickup Test
      pickup_test: [
        { phase: 'RY', setting_current: '', setting_tl: '', pickup_current: '', trip_time: '', hi_set_pickup_current: '', hi_set_trip_time: '' },
        { phase: 'YB', setting_current: '', setting_tl: '', pickup_current: '', trip_time: '', hi_set_pickup_current: '', hi_set_trip_time: '' },
        { phase: 'E/F', setting_current: '', setting_tl: '', pickup_current: '', trip_time: '', hi_set_pickup_current: '', hi_set_trip_time: '' }
      ],
      // Characteristic Check by Secondary Injection Test
      characteristic_check: [
        { phase: 'RY', plug_setting: '', tl: '', graph_time_2x: '', graph_time_5x: '', actual_time_2x: '', actual_time_5x: '' },
        { phase: 'YB', plug_setting: '', tl: '', graph_time_2x: '', graph_time_5x: '', actual_time_2x: '', actual_time_5x: '' },
        { phase: 'E/F', plug_setting: '', tl: '', graph_time_2x: '', graph_time_5x: '', actual_time_2x: '', actual_time_5x: '' }
      ],
      remarks: ''
    },
    
    // Feeder Protection Relay Test (TEST 2)
    feeder_protection_test: {
      // Relay Details specific to Feeder
      relay_details: {
        make: '',
        type: '',
        serial_no: '',
        ct_sec: '',
        control_voltage: ''
      },
      // Setting Details
      setting_details: [
        { fb_name: 'I>', setting_current: '', setting_tl: '', dmt: '', remark: 'ON' },
        { fb_name: 'Ie>', setting_current: '', setting_tl: '', dmt: '', remark: 'ON' }
      ],
      // Pickup Test
      pickup_test: [
        { phase: 'A', setting_current: '', setting_tl: '', pickup_current: '', trip_time: '' },
        { phase: 'E/F', setting_current: '', setting_tl: '', pickup_current: '', trip_time: '' },
        { phase: 'C', setting_current: '', setting_tl: '', pickup_current: '', trip_time: '' }
      ],
      // Characteristic Check
      characteristic_check: [
        { phase: 'A', plug_setting: '', tl: '', graph_time_2x: '', graph_time_5x: '', actual_time_2x: '', actual_time_5x: '' },
        { phase: 'E/F', plug_setting: '', tl: '', graph_time_2x: '', graph_time_5x: '', actual_time_2x: '', actual_time_5x: '' },
        { phase: 'C', plug_setting: '', tl: '', graph_time_2x: '', graph_time_5x: '', actual_time_2x: '', actual_time_5x: '' }
      ],
      remarks: ''
    },
    
    // Master Trip Relay Test (TEST 3)
    master_trip_relay_test: {
      relay_details: {
        make: '',
        type: '',
        serial_no: '',
        auxiliary_supply: ''
      },
      test_results: [
        { parameter: 'Pick-up Voltage', set_value: '', measured_value: '', status: '' },
        { parameter: 'Drop-off Voltage', set_value: '', measured_value: '', status: '' },
        { parameter: 'Operating Time', set_value: '', measured_value: '', status: '' },
        { parameter: 'Contact Resistance', set_value: '', measured_value: '', status: '' },
        { parameter: 'Coil Resistance', set_value: '', measured_value: '', status: '' },
        { parameter: 'Insulation Resistance', set_value: '', measured_value: '', status: '' }
      ],
      remarks: ''
    },
    
    // Trip Circuit Supervision Relay Test (TEST 4)
    trip_circuit_supervision_test: {
      relay_details: {
        make: '',
        type: '',
        serial_no: '',
        auxiliary_supply: ''
      },
      test_results: [
        { parameter: 'Pick-up Voltage', set_value: '', measured_value: '', status: '' },
        { parameter: 'Drop-off Voltage', set_value: '', measured_value: '', status: '' },
        { parameter: 'Operating Time', set_value: '', measured_value: '', status: '' },
        { parameter: 'LED Indication Check', set_value: '', measured_value: '', status: '' },
        { parameter: 'Alarm Contact Check', set_value: '', measured_value: '', status: '' },
        { parameter: 'Coil Resistance', set_value: '', measured_value: '', status: '' },
        { parameter: 'Insulation Resistance', set_value: '', measured_value: '', status: '' }
      ],
      remarks: ''
    },
    
    // Bulk entries (for MCCB)
    bulk_entries: [],
    
    // ACB Specific Tests
    insulation_resistance: {
      ambient_temp: '',
      voltage_applied: '1000V DC for 60 Sec',
      cb_open: { "R-R'": '', "Y-Y'": '', "B-B'": '', "N-N'": '' },
      cb_close_phase_earth: { 'R-E': '', 'Y-E': '', 'B-E': '', 'N-E': '' },
      cb_close_phase_phase: { 'R-Y': '', 'Y-B': '', 'B-R': '' }
    },
    coil_resistance: {
      ambient_temp: '',
      close_coil: '',
      trip_coil: ''
    },
    contact_resistance: {
      injected_current: '100 Amps DC',
      r_phase: '',
      y_phase: '',
      b_phase: '',
      n_phase: ''
    },
    
    // ACB Section Toggles (matching VCB/Transformer pattern)
    acb_section_toggles: {
      detailed_checklist: true,
      insulation_resistance_test: true,
      coil_resistance_test: true,
      contact_resistance_test: true,
      micrologic_trip_test: true,
      carbon_test_report: true
    },
    
    // ACB Micrologic Automatic Trip Test (Section 5)
    micrologic_trip_test: {
      // 1. Switchboard details
      switchboard_details: {
        report_no: '',
        test_conducted_on: '',
        location: '',
        panel_name: '',
        feeder_name: ''
      },
      // 2. Breaker details
      breaker_details: {
        product_type: '',
        manufacturer: '',
        rated_current: ''
      },
      // 3. Trip unit details
      trip_unit_details: {
        release_model: '',
        release_type: '',
        serial_no: ''
      },
      // 4. Basic protection settings
      protection_settings: {
        long_time_pickup_ir: '',
        long_time_delay_tr: '',
        short_time_pickup_isd: '',
        short_time_delay_tsd: '',
        instantaneous_pickup_ii: '',
        ground_fault_pickup_ig: '',
        ground_fault_delay_tg: ''
      },
      // 5. Automatic test results
      test_results: [
        { protection: 'Long time', injected_current: '', expected_min_time: '', expected_max_time: '', actual_trip_time: '', result: '' },
        { protection: 'Short time', injected_current: '', expected_min_time: '', expected_max_time: '', actual_trip_time: '', result: '' },
        { protection: 'Instantaneous', injected_current: '', expected_min_time: '', expected_max_time: '', actual_trip_time: '', result: '' },
        { protection: 'Ground fault', injected_current: '', expected_min_time: '', expected_max_time: '', actual_trip_time: '', result: '' }
      ],
      remarks: ''
    },
    
    // ACB Carbon Test Report (Section 6)
    carbon_test_report: {
      images: [],
      description: ''
    },
    
    // MCCB Section Toggles (same structure as ACB - both are circuit breakers)
    mccb_section_toggles: {
      detailed_checklist: true,
      insulation_resistance_test: true,
      coil_resistance_test: true,
      contact_resistance_test: true,
      micrologic_trip_test: true,
      carbon_test_report: true
    },
    
    // VCB Specific Tests
    vcb_service_checks: {
      spring_motor_resistance: { voltage: '', resistance: '' },
      closing_coil: { voltage: '', resistance: '' },
      tripping_coil: { voltage: '', resistance: '' },
      counter_reading: '',
      visual_inspection: '',
      replacement: '',
      thorough_cleaning: '',
      lubrication: '',
      gap_travel: { 
        roller_gap_before: '', roller_gap_after: '',
        damper_gap_before: '', damper_gap_after: ''
      },
      torque: { contact_arm: '', vi_fixing: '' },
      onoff_operation: { count: '', method: '' }
    },
    vcb_contact_resistance: {
      R: { resistance: '', current: '' },
      Y: { resistance: '', current: '' },
      B: { resistance: '', current: '' }
    },
    vcb_insulation_resistance: {
      breaker_closed: {
        ir_top_ground: { R: '', Y: '', B: '' },
        ir_phase_phase: { R: '', Y: '', B: '' }
      },
      breaker_open: {
        ir_pole_pole: { R: '', Y: '', B: '' }
      }
    },
    vcb_breaker_timings: {
      closing_time: { R: '', Y: '', B: '' },
      opening_time: { R: '', Y: '', B: '' },
      close_open: { R: '', Y: '', B: '' }
    },
    vcb_operational_checks: {
      close: { manual: 'OK', electrical: 'OK' },
      open: { manual: 'OK', electrical: 'OK' }
    },
    vcb_functional_checks: [],
    
    // Battery Specific Fields
    battery_details: {
      location: '',
      device_name: '',
      battery_make: '',
      battery_type: '',
      battery_ah: '',
      no_of_batteries: '',
      batch_code: ''
    },
    
    // Battery Section Toggles
    battery_section_toggles: {
      inspection_checklist: true,
      test_data: true
    },
    
    // Battery Inspection Checklist
    battery_inspection_checklist: [
      { id: 1, item: 'Visual Inspection of Battery Terminals', status: 'yes', remarks: '' },
      { id: 2, item: 'Check for Corrosion on Terminals', status: 'yes', remarks: '' },
      { id: 3, item: 'Battery Housing Condition', status: 'yes', remarks: '' },
      { id: 4, item: 'Electrolyte Level Check (if applicable)', status: 'na', remarks: '' },
      { id: 5, item: 'Vent Cap Condition', status: 'yes', remarks: '' },
      { id: 6, item: 'Battery Mounting & Cabling', status: 'yes', remarks: '' },
      { id: 7, item: 'Cleaning of Battery Surface', status: 'yes', remarks: '' },
      { id: 8, item: 'Temperature Check', status: 'yes', remarks: '' }
    ],
    
    // Battery Test Data (individual cell readings)
    battery_test_data: [
      { s_no: 1, resistance: '', voltage: '', status: 'Normal' },
      { s_no: 2, resistance: '', voltage: '', status: 'Normal' }
    ],
    
    // Section enable/disable toggles
    section_toggles: {
      service_checks: true,
      contact_resistance_test: true,
      insulation_resistance_test: true,
      breaker_timings_test: true,
      operational_checks: true,
      functional_checks: true
    },
    
    // Remarks & Recommendations
    overall_result: 'Satisfactory',
    recommendations: '',
    
    // Signatures (Service Provider / Customer format)
    engineer_signature_name: user?.name || '',
    engineer_designation: '',
    engineer_signature_date: new Date().toISOString().split('T')[0],
    customer_signature_name: '',
    customer_designation: '',
    customer_signature_date: '',
    service_company: 'Enerzia Power Solutions'
  });

  // Fetch template and initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch template
        const templateResponse = await testReportsAPI.getTemplate(equipmentType);
        const templateRes = templateResponse.data || templateResponse;
        setTemplate(templateRes);
        
        // Initialize checklist from template
        if (templateRes.checklist) {
          setFormData(prev => ({
            ...prev,
            checklist: templateRes.checklist.map(item => ({
              ...item,
              status: 'yes',
              remarks: ''
            }))
          }));
        }
        
        // Initialize Points To Ensure from template (for Panel)
        if (templateRes.points_to_ensure?.items) {
          setFormData(prev => ({
            ...prev,
            points_to_ensure: templateRes.points_to_ensure.items.map(item => ({
              id: item.id,
              item: item.item,
              sub_items: item.sub_items || [],
              confirmed: true,
              remarks: ''
            }))
          }));
        }
        
        // Initialize Capacitor Health Rows from template (for Panel)
        if (templateRes.capacitor_health) {
          const defaultRows = templateRes.capacitor_health.default_rows || 8;
          setFormData(prev => ({
            ...prev,
            capacitor_health_rows: Array.from({ length: defaultRows }, (_, i) => ({
              feeder: '',
              current_r: '',
              current_y: '',
              current_b: '',
              remarks: ''
            })),
            panel_section_toggles: templateRes.panel_section_toggles || { checklist: true, capacitor_health: true }
          }));
        }
        
        // Initialize Earth Pit sections from template
        if (templateRes.electrical_checks || templateRes.continuity_checks) {
          const electricalRows = templateRes.electrical_checks?.default_rows || 6;
          const continuityRows = templateRes.continuity_checks?.default_rows || 6;
          setFormData(prev => ({
            ...prev,
            electrical_checks_rows: Array.from({ length: electricalRows }, () => ({
              earth_pit_no: '',
              pit_location: '',
              test_method: '',
              individual_result: '',
              combined_result: '',
              remarks: ''
            })),
            continuity_checks_rows: Array.from({ length: continuityRows }, () => ({
              from_pit_no: '',
              to_equipment: '',
              continuity_checked: '',
              remarks: ''
            })),
            earth_pit_section_toggles: templateRes.earth_pit_section_toggles || { electrical_checks: true, continuity_checks: true }
          }));
        }
        
        // Initialize Energy Meter sections from template
        if (templateRes.master_standard || templateRes.test_results_config) {
          setFormData(prev => ({
            ...prev,
            energy_meter_section_toggles: templateRes.energy_meter_section_toggles || { master_standard: true, test_results: true }
          }));
        }
        
        // Initialize settings from template (for relay)
        if (templateRes.settings) {
          setFormData(prev => ({
            ...prev,
            settings: templateRes.settings.map(s => ({ ...s }))
          }));
        }
        
        // Initialize readings from template (for UPS, DG)
        if (templateRes.readings?.rows) {
          setFormData(prev => ({
            ...prev,
            readings: templateRes.readings.rows.map(r => ({
              parameter: r.parameter,
              reading: '',
              no_load: '',
              full_load: '',
              normal: r.normal
            }))
          }));
        }
        
        // Initialize test results from template (for Earth Pit, LA)
        if (templateRes.test_results) {
          setFormData(prev => ({
            ...prev,
            test_results: templateRes.test_results.map(t => ({ ...t }))
          }));
        }
        
        // Initialize IR test structure
        if (templateRes.ir_test) {
          const irTest = {};
          templateRes.ir_test.rows.forEach(row => {
            irTest[row] = {};
            templateRes.ir_test.columns.forEach(col => {
              irTest[row][col] = '';
            });
          });
          setFormData(prev => ({ ...prev, ir_test: irTest }));
        }
        
        // Initialize timing test structure (VCB)
        if (templateRes.timing_test) {
          const timingTest = {};
          templateRes.timing_test.rows.forEach(row => {
            timingTest[row] = {};
            templateRes.timing_test.columns.forEach(col => {
              timingTest[row][col] = '';
            });
          });
          setFormData(prev => ({ ...prev, timing_test: timingTest }));
        }
        
        // Initialize VCB Functional Checks from template
        if (templateRes.functional_checks?.items) {
          setFormData(prev => ({
            ...prev,
            vcb_functional_checks: templateRes.functional_checks.items.map(item => ({
              ...item,
              status: 'Checked and Found OK',
              remarks: ''
            }))
          }));
        }
        
        // Fetch projects
        const projectsResponse = await projectsAPI.getAll();
        const projectsData = projectsResponse.data || projectsResponse;
        // Handle both array and object response formats
        const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.projects || projectsData?.data || []);
        setProjects(projectsList);
        
        // Fetch team members from departments/projects/team endpoint (matching Transformer)
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
        
        // Fetch org settings
        const orgResponse = await settingsAPI.getOrganization();
        setOrgSettings(orgResponse.data || orgResponse);
        
        // Report number is auto-generated on save (matching Transformer behavior)
        // Don't pre-generate a fake number - leave it empty until save
        
        // If editing, fetch existing report
        if (isEdit) {
          const reportRes = await testReportsAPI.getById(reportId);
          // Extract data from axios response - THIS WAS THE BUG
          const reportData = reportRes?.data || reportRes;
          
          if (reportData && reportData.id) {
            // Helper function to safely get string value (handles corrupted object data)
            const safeString = (val, defaultVal = '') => {
              if (val === null || val === undefined) return defaultVal;
              if (typeof val === 'string') return val;
              if (typeof val === 'object') {
                // Handle corrupted data where string was saved as {0: "1", 1: "0", ...}
                const keys = Object.keys(val);
                if (keys.every(k => !isNaN(parseInt(k)))) {
                  return keys.sort((a, b) => parseInt(a) - parseInt(b)).map(k => val[k]).join('');
                }
              }
              return String(val);
            };
            
            // Deep merge the report data with default structure to ensure all fields exist
            setFormData(prev => {
              // Only merge specific fields from reportData, not the entire object
              const merged = { 
                ...prev,
                // Basic fields
                report_no: reportData.report_no || prev.report_no,
                report_type: reportData.report_type || prev.report_type,
                equipment_type: reportData.equipment_type || prev.equipment_type,
                report_category: reportData.report_category || prev.report_category,
                project_id: reportData.project_id || prev.project_id,
                project_name: reportData.project_name || prev.project_name,
                customer_name: reportData.customer_name || prev.customer_name,
                location: reportData.location || prev.location,
                test_date: reportData.test_date || prev.test_date,
                date_of_testing: reportData.date_of_testing || prev.date_of_testing,
                date_of_energization: reportData.date_of_energization || prev.date_of_energization,
                tested_by: reportData.tested_by || prev.tested_by,
                witnessed_by: reportData.witnessed_by || prev.witnessed_by,
                remarks: reportData.remarks || prev.remarks,
                status: reportData.status || prev.status,
                // Equipment details
                equipment_details: reportData.equipment_details || prev.equipment_details,
                // Checklist
                checklist: reportData.checklist || prev.checklist,
                // Points to Ensure (for Panel)
                points_to_ensure: reportData.points_to_ensure || prev.points_to_ensure,
                // Capacitor Health (for Panel)
                capacitor_health_rows: reportData.capacitor_health_rows || prev.capacitor_health_rows,
                // Panel Section Toggles
                panel_section_toggles: reportData.panel_section_toggles || prev.panel_section_toggles,
                // Earth Pit Testing Details
                earth_pit_testing_details: reportData.earth_pit_testing_details || prev.earth_pit_testing_details,
                // Earth Pit Section Toggles
                earth_pit_section_toggles: reportData.earth_pit_section_toggles || prev.earth_pit_section_toggles,
                // Earth Pit Electrical Checks
                electrical_checks_rows: reportData.electrical_checks_rows || prev.electrical_checks_rows,
                // Earth Pit Continuity Checks
                continuity_checks_rows: reportData.continuity_checks_rows || prev.continuity_checks_rows,
                // Energy Meter Details
                energy_meter_details: reportData.energy_meter_details || prev.energy_meter_details,
                // Energy Meter Section Toggles
                energy_meter_section_toggles: reportData.energy_meter_section_toggles || prev.energy_meter_section_toggles,
                // Energy Meter Master Standard
                energy_meter_master_standard: reportData.energy_meter_master_standard || prev.energy_meter_master_standard,
                // Energy Meter Parameters
                energy_meter_parameters: reportData.energy_meter_parameters || prev.energy_meter_parameters,
                // Energy Meter Test Summary
                energy_meter_test_summary: reportData.energy_meter_test_summary || prev.energy_meter_test_summary,
                // Energy Meter Energy Reading
                energy_meter_energy_reading: reportData.energy_meter_energy_reading || prev.energy_meter_energy_reading,
                // Voltmeter Details
                voltmeter_details: reportData.voltmeter_details || prev.voltmeter_details,
                voltmeter_section_toggles: reportData.voltmeter_section_toggles || prev.voltmeter_section_toggles,
                voltmeter_master_standard: reportData.voltmeter_master_standard || prev.voltmeter_master_standard,
                voltmeter_parameters: reportData.voltmeter_parameters || prev.voltmeter_parameters,
                voltmeter_readings: reportData.voltmeter_readings || prev.voltmeter_readings,
                // Ammeter Details
                ammeter_details: reportData.ammeter_details || prev.ammeter_details,
                ammeter_section_toggles: reportData.ammeter_section_toggles || prev.ammeter_section_toggles,
                ammeter_master_standard: reportData.ammeter_master_standard || prev.ammeter_master_standard,
                ammeter_parameters: reportData.ammeter_parameters || prev.ammeter_parameters,
                ammeter_readings: reportData.ammeter_readings || prev.ammeter_readings,
                // Signature fields
                engineer_signature_name: reportData.engineer_signature_name || prev.engineer_signature_name,
                engineer_signature_date: reportData.engineer_signature_date || prev.engineer_signature_date,
                customer_signature_name: reportData.customer_signature_name || prev.customer_signature_name,
                customer_signature_date: reportData.customer_signature_date || prev.customer_signature_date,
                service_company: reportData.service_company || prev.service_company,
              };
              
              // Load Customer Information
              if (reportData.customer_info) {
                merged.customer_info = {
                  company_name: reportData.customer_info.company_name || reportData.customer_name || '',
                  site_location: reportData.customer_info.site_location || reportData.location || '',
                  project_name: reportData.customer_info.project_name || reportData.project_name || '',
                  po_ref: reportData.customer_info.po_ref || '',
                  contact_person: reportData.customer_info.contact_person || '',
                  contact_phone: reportData.customer_info.contact_phone || '',
                  po_dated: reportData.customer_info.po_dated || '',
                  contact_email: reportData.customer_info.contact_email || ''
                };
              } else if (reportData.customer_name || reportData.location) {
                // Backward compatibility: populate from legacy fields
                merged.customer_info = {
                  ...prev.customer_info,
                  company_name: reportData.customer_name || '',
                  site_location: reportData.location || '',
                  project_name: reportData.project_name || ''
                };
              }
              
              // Load Service Provider Details
              if (reportData.service_provider) {
                merged.service_provider = {
                  company_name: reportData.service_provider.company_name || 'Enerzia Power Solutions',
                  company_address: reportData.service_provider.company_address || '',
                  engineer_name: reportData.service_provider.engineer_name || reportData.tested_by || '',
                  engineer_email: reportData.service_provider.engineer_email || '',
                  engineer_mobile: reportData.service_provider.engineer_mobile || ''
                };
              } else if (reportData.tested_by) {
                // Backward compatibility: populate from legacy fields
                merged.service_provider = {
                  ...prev.service_provider,
                  engineer_name: reportData.tested_by || ''
                };
              }
              
              // Load new fields: report_date, overall_result, recommendations, designations
              if (reportData.report_date) merged.report_date = reportData.report_date;
              if (reportData.overall_result) merged.overall_result = reportData.overall_result;
              if (reportData.recommendations) merged.recommendations = reportData.recommendations;
              if (reportData.engineer_designation) merged.engineer_designation = reportData.engineer_designation;
              if (reportData.customer_designation) merged.customer_designation = reportData.customer_designation;
              
              // Ensure nested objects are properly merged with safe string conversion
              const ir = reportData.insulation_resistance;
              if (ir) {
                merged.insulation_resistance = {
                  ambient_temp: safeString(ir.ambient_temp, ''),
                  voltage_applied: safeString(ir.voltage_applied, '1000V DC for 60 Sec'),
                  cb_open: {
                    "R-R'": safeString(ir.cb_open?.["R-R'"], ''),
                    "Y-Y'": safeString(ir.cb_open?.["Y-Y'"], ''),
                    "B-B'": safeString(ir.cb_open?.["B-B'"], ''),
                    "N-N'": safeString(ir.cb_open?.["N-N'"], ''),
                  },
                  cb_close_phase_earth: {
                    'R-E': safeString(ir.cb_close_phase_earth?.['R-E'], ''),
                    'Y-E': safeString(ir.cb_close_phase_earth?.['Y-E'], ''),
                    'B-E': safeString(ir.cb_close_phase_earth?.['B-E'], ''),
                    'N-E': safeString(ir.cb_close_phase_earth?.['N-E'], ''),
                  },
                  cb_close_phase_phase: {
                    'R-Y': safeString(ir.cb_close_phase_phase?.['R-Y'], ''),
                    'Y-B': safeString(ir.cb_close_phase_phase?.['Y-B'], ''),
                    'B-R': safeString(ir.cb_close_phase_phase?.['B-R'], ''),
                  }
                };
              }
              
              const cr = reportData.coil_resistance;
              if (cr) {
                merged.coil_resistance = {
                  ambient_temp: safeString(cr.ambient_temp, ''),
                  close_coil: safeString(cr.close_coil, ''),
                  trip_coil: safeString(cr.trip_coil, ''),
                };
              }
              
              const contr = reportData.contact_resistance;
              if (contr) {
                merged.contact_resistance = {
                  injected_current: safeString(contr.injected_current, '100 Amps DC'),
                  r_phase: safeString(contr.r_phase, ''),
                  y_phase: safeString(contr.y_phase, ''),
                  b_phase: safeString(contr.b_phase, ''),
                  n_phase: safeString(contr.n_phase, ''),
                };
              }
              
              // VCB Specific Data Loading
              if (reportData.vcb_service_checks) {
                merged.vcb_service_checks = reportData.vcb_service_checks;
              }
              if (reportData.vcb_contact_resistance) {
                merged.vcb_contact_resistance = reportData.vcb_contact_resistance;
              }
              if (reportData.vcb_insulation_resistance) {
                merged.vcb_insulation_resistance = reportData.vcb_insulation_resistance;
              }
              if (reportData.vcb_breaker_timings) {
                merged.vcb_breaker_timings = reportData.vcb_breaker_timings;
              }
              if (reportData.vcb_operational_checks) {
                merged.vcb_operational_checks = reportData.vcb_operational_checks;
              }
              if (reportData.vcb_functional_checks) {
                merged.vcb_functional_checks = reportData.vcb_functional_checks;
              }
              if (reportData.section_toggles) {
                merged.section_toggles = reportData.section_toggles;
              }
              
              // ACB-specific fields
              if (reportData.acb_section_toggles) {
                merged.acb_section_toggles = reportData.acb_section_toggles;
              }
              if (reportData.micrologic_trip_test) {
                merged.micrologic_trip_test = reportData.micrologic_trip_test;
              }
              if (reportData.carbon_test_report) {
                merged.carbon_test_report = reportData.carbon_test_report;
              }
              
              // MCCB-specific fields
              if (reportData.mccb_section_toggles) {
                merged.mccb_section_toggles = reportData.mccb_section_toggles;
              }
              
              // Battery-specific fields
              if (reportData.battery_details) {
                merged.battery_details = reportData.battery_details;
              }
              if (reportData.battery_section_toggles) {
                merged.battery_section_toggles = reportData.battery_section_toggles;
              }
              if (reportData.battery_inspection_checklist) {
                merged.battery_inspection_checklist = reportData.battery_inspection_checklist;
              }
              if (reportData.battery_test_data) {
                merged.battery_test_data = reportData.battery_test_data;
              }
              
              // Relay-specific fields
              if (reportData.relay_details) {
                merged.relay_details = reportData.relay_details;
              }
              if (reportData.relay_test_report) {
                merged.relay_test_report = reportData.relay_test_report;
              }
              if (reportData.relay_section_toggles) {
                merged.relay_section_toggles = reportData.relay_section_toggles;
              }
              if (reportData.protection_relay_test) {
                merged.protection_relay_test = reportData.protection_relay_test;
              }
              if (reportData.feeder_protection_test) {
                merged.feeder_protection_test = reportData.feeder_protection_test;
              }
              
              return merged;
            });
          }
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load template. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [equipmentType, reportId, isEdit]);

  const generateReportNumber = async (type) => {
    const prefixes = {
      acb: 'ACB',
      mccb: 'MCCB',
      vcb: 'VCB',
      panel: 'PNL',
      'electrical-panel': 'PNL',
      relay: 'RLY',
      apfc: 'APFC',
      battery: 'BAT',
      earth_pit: 'EP',
      'earth-pit': 'EP',
      ups: 'UPS',
      dg: 'DG',
      lightning_arrestor: 'LA',
      'lightning-arrestor': 'LA',
    };
    const prefix = prefixes[type] || 'EQ';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}/${year}${month}/${random}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handler for Customer Information fields
  const handleCustomerInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      customer_info: {
        ...prev.customer_info,
        [field]: value
      },
      // Also update legacy fields for backward compatibility
      ...(field === 'company_name' && { customer_name: value }),
      ...(field === 'site_location' && { location: value }),
      ...(field === 'project_name' && { project_name: value })
    }));
  };

  // Handler for Service Provider fields
  const handleServiceProviderChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      service_provider: {
        ...prev.service_provider,
        [field]: value
      },
      // Also update legacy fields for backward compatibility
      ...(field === 'engineer_name' && { tested_by: value })
    }));
  };

  const handleEquipmentDetailChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      equipment_details: {
        ...prev.equipment_details,
        [field]: value
      }
    }));
  };

  const handleChecklistChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.checklist];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, checklist: updated };
    });
  };

  const handlePointsToEnsureChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.points_to_ensure];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, points_to_ensure: updated };
    });
  };

  const handleCapacitorHealthChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.capacitor_health_rows];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, capacitor_health_rows: updated };
    });
  };

  const addCapacitorHealthRow = () => {
    setFormData(prev => ({
      ...prev,
      capacitor_health_rows: [...prev.capacitor_health_rows, { feeder: '', current_r: '', current_y: '', current_b: '', remarks: '' }]
    }));
  };

  const removeCapacitorHealthRow = (index) => {
    setFormData(prev => ({
      ...prev,
      capacitor_health_rows: prev.capacitor_health_rows.filter((_, i) => i !== index)
    }));
  };

  const handlePanelSectionToggle = (section) => {
    setFormData(prev => ({
      ...prev,
      panel_section_toggles: {
        ...prev.panel_section_toggles,
        [section]: !prev.panel_section_toggles?.[section]
      }
    }));
  };

  // Earth Pit Handlers
  const handleEarthPitTestingDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      earth_pit_testing_details: {
        ...prev.earth_pit_testing_details,
        [field]: value
      }
    }));
  };

  const handleEarthPitSectionToggle = (section) => {
    setFormData(prev => ({
      ...prev,
      earth_pit_section_toggles: {
        ...prev.earth_pit_section_toggles,
        [section]: !prev.earth_pit_section_toggles?.[section]
      }
    }));
  };

  const handleElectricalChecksChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.electrical_checks_rows];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, electrical_checks_rows: updated };
    });
  };

  const addElectricalChecksRow = () => {
    setFormData(prev => ({
      ...prev,
      electrical_checks_rows: [...prev.electrical_checks_rows, { earth_pit_no: '', pit_location: '', test_method: '', individual_result: '', combined_result: '', remarks: '' }]
    }));
  };

  const removeElectricalChecksRow = (index) => {
    setFormData(prev => ({
      ...prev,
      electrical_checks_rows: prev.electrical_checks_rows.filter((_, i) => i !== index)
    }));
  };

  const handleContinuityChecksChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.continuity_checks_rows];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, continuity_checks_rows: updated };
    });
  };

  const addContinuityChecksRow = () => {
    setFormData(prev => ({
      ...prev,
      continuity_checks_rows: [...prev.continuity_checks_rows, { from_pit_no: '', to_equipment: '', continuity_checked: '', remarks: '' }]
    }));
  };

  const removeContinuityChecksRow = (index) => {
    setFormData(prev => ({
      ...prev,
      continuity_checks_rows: prev.continuity_checks_rows.filter((_, i) => i !== index)
    }));
  };

  // Energy Meter Handlers
  const handleEnergyMeterDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      energy_meter_details: {
        ...prev.energy_meter_details,
        [field]: value
      }
    }));
  };

  const handleEnergyMeterSectionToggle = (section) => {
    setFormData(prev => ({
      ...prev,
      energy_meter_section_toggles: {
        ...prev.energy_meter_section_toggles,
        [section]: !prev.energy_meter_section_toggles?.[section]
      }
    }));
  };

  const handleMasterStandardChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      energy_meter_master_standard: {
        ...prev.energy_meter_master_standard,
        [field]: value
      }
    }));
  };

  const handleParametersChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      energy_meter_parameters: {
        ...prev.energy_meter_parameters,
        [field]: value
      }
    }));
  };

  const handleTestSummaryChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      energy_meter_test_summary: {
        ...prev.energy_meter_test_summary,
        [field]: value
      }
    }));
  };

  const handleEnergyReadingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      energy_meter_energy_reading: {
        ...prev.energy_meter_energy_reading,
        [field]: value
      }
    }));
  };

  // Voltmeter Handlers
  const handleVoltmeterDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      voltmeter_details: {
        ...prev.voltmeter_details,
        [field]: value
      }
    }));
  };

  const handleVoltmeterSectionToggle = (section) => {
    setFormData(prev => ({
      ...prev,
      voltmeter_section_toggles: {
        ...prev.voltmeter_section_toggles,
        [section]: !prev.voltmeter_section_toggles?.[section]
      }
    }));
  };

  const handleVoltmeterMasterStandardChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      voltmeter_master_standard: {
        ...prev.voltmeter_master_standard,
        [field]: value
      }
    }));
  };

  const handleVoltmeterMeasurementTestChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      voltmeter_measurement_tests: prev.voltmeter_measurement_tests.map((test, i) => 
        i === index ? { ...test, [field]: value } : test
      )
    }));
  };

  // Ammeter Handlers
  const handleAmmeterDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      ammeter_details: {
        ...prev.ammeter_details,
        [field]: value
      }
    }));
  };

  const handleAmmeterSectionToggle = (section) => {
    setFormData(prev => ({
      ...prev,
      ammeter_section_toggles: {
        ...prev.ammeter_section_toggles,
        [section]: !prev.ammeter_section_toggles?.[section]
      }
    }));
  };

  const handleAmmeterMasterStandardChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      ammeter_master_standard: {
        ...prev.ammeter_master_standard,
        [field]: value
      }
    }));
  };

  const handleAmmeterMeasurementTestChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ammeter_measurement_tests: prev.ammeter_measurement_tests.map((test, i) => 
        i === index ? { ...test, [field]: value } : test
      )
    }));
  };

  const handleIRTestChange = (row, col, value) => {
    setFormData(prev => ({
      ...prev,
      ir_test: {
        ...prev.ir_test,
        [row]: {
          ...prev.ir_test[row],
          [col]: value
        }
      }
    }));
  };

  const handleTimingTestChange = (row, col, value) => {
    setFormData(prev => ({
      ...prev,
      timing_test: {
        ...prev.timing_test,
        [row]: {
          ...prev.timing_test[row],
          [col]: value
        }
      }
    }));
  };

  const handleSettingsChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.settings];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, settings: updated };
    });
  };

  const handleReadingsChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.readings];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, readings: updated };
    });
  };

  const handleTestResultsChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.test_results];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, test_results: updated };
    });
  };

  // ACB Specific Handlers
  const handleInsulationResistanceChange = (section, key, value) => {
    setFormData(prev => {
      // Handle direct fields (voltage_applied, ambient_temp)
      if (key === null || key === undefined) {
        return {
          ...prev,
          insulation_resistance: {
            ...prev.insulation_resistance,
            [section]: value
          }
        };
      }
      // Handle nested fields (cb_open, cb_close_phase_earth, cb_close_phase_phase)
      return {
        ...prev,
        insulation_resistance: {
          ...prev.insulation_resistance,
          [section]: {
            ...(prev.insulation_resistance?.[section] || {}),
            [key]: value
          }
        }
      };
    });
  };

  const handleCoilResistanceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      coil_resistance: {
        ...prev.coil_resistance,
        [field]: value
      }
    }));
  };

  const handleContactResistanceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contact_resistance: {
        ...prev.contact_resistance,
        [field]: value
      }
    }));
  };

  // VCB Specific Handlers
  const handleSectionToggle = (section) => {
    setFormData(prev => ({
      ...prev,
      section_toggles: {
        ...prev.section_toggles,
        [section]: !prev.section_toggles[section]
      }
    }));
  };

  const handleVCBServiceCheckChange = (checkId, field, value) => {
    setFormData(prev => {
      const currentCheck = prev.vcb_service_checks[checkId];
      if (typeof currentCheck === 'object' && currentCheck !== null) {
        return {
          ...prev,
          vcb_service_checks: {
            ...prev.vcb_service_checks,
            [checkId]: {
              ...currentCheck,
              [field]: value
            }
          }
        };
      }
      return {
        ...prev,
        vcb_service_checks: {
          ...prev.vcb_service_checks,
          [checkId]: value
        }
      };
    });
  };

  const handleVCBContactResistanceChange = (phase, field, value) => {
    setFormData(prev => ({
      ...prev,
      vcb_contact_resistance: {
        ...prev.vcb_contact_resistance,
        [phase]: {
          ...(prev.vcb_contact_resistance?.[phase] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleVCBInsulationResistanceChange = (condition, rowId, phase, value) => {
    setFormData(prev => ({
      ...prev,
      vcb_insulation_resistance: {
        ...prev.vcb_insulation_resistance,
        [condition]: {
          ...(prev.vcb_insulation_resistance?.[condition] || {}),
          [rowId]: {
            ...(prev.vcb_insulation_resistance?.[condition]?.[rowId] || {}),
            [phase]: value
          }
        }
      }
    }));
  };

  const handleVCBBreakerTimingsChange = (rowId, phase, value) => {
    setFormData(prev => ({
      ...prev,
      vcb_breaker_timings: {
        ...prev.vcb_breaker_timings,
        [rowId]: {
          ...(prev.vcb_breaker_timings?.[rowId] || {}),
          [phase]: value
        }
      }
    }));
  };

  const handleVCBOperationalChecksChange = (rowId, column, value) => {
    setFormData(prev => ({
      ...prev,
      vcb_operational_checks: {
        ...prev.vcb_operational_checks,
        [rowId]: {
          ...(prev.vcb_operational_checks?.[rowId] || {}),
          [column.toLowerCase()]: value
        }
      }
    }));
  };

  const handleVCBFunctionalCheckChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.vcb_functional_checks];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, vcb_functional_checks: updated };
    });
  };

  const handleSignatureChange = (column, field, value) => {
    setFormData(prev => ({
      ...prev,
      signatures: {
        ...prev.signatures,
        [column]: {
          ...prev.signatures[column],
          [field]: value
        }
      }
    }));
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      // Auto-fill project details (matching Transformer behavior)
      setFormData(prev => ({
        ...prev,
        project_id: projectId,
        project_name: project.project_name || project.name || '',
        // Update legacy fields for backward compatibility
        customer_name: project.client || project.customer_name || project.client_name || '',
        location: project.location || project.site_address || '',
        // Also update customer_info object (matching Transformer)
        customer_info: {
          ...prev.customer_info,
          company_name: project.client || project.customer_name || project.client_name || '',
          site_location: project.location || project.site_address || '',
          project_name: project.project_name || project.name || ''
        }
      }));
    } else {
      // Clear project selection
      setFormData(prev => ({
        ...prev,
        project_id: '',
        project_name: ''
      }));
    }
  };

  // Handle engineer selection with auto-fill (matching Transformer behavior)
  const handleEngineerChange = (engineerName) => {
    const member = teamMembers.find(m => m.name === engineerName);
    if (member) {
      setFormData(prev => ({
        ...prev,
        service_provider: {
          ...prev.service_provider,
          engineer_name: engineerName,
          engineer_email: member.email || '',
          engineer_mobile: member.phone || ''
        },
        // Also update legacy field
        tested_by: engineerName
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        service_provider: {
          ...prev.service_provider,
          engineer_name: engineerName
        },
        tested_by: engineerName
      }));
    }
  };

  // Regenerate Report Number
  const handleRegenerateReportNo = async () => {
    const newReportNo = await generateReportNumber(equipmentType);
    setFormData(prev => ({ ...prev, report_no: newReportNo }));
  };

  // Add bulk entry (MCCB)
  const addBulkEntry = () => {
    setFormData(prev => ({
      ...prev,
      bulk_entries: [
        ...prev.bulk_entries,
        {
          id: Date.now(),
          feeder_name: '',
          make: '',
          poles: '4P',
          rated_current: '',
          status: 'OK',
          remarks: ''
        }
      ]
    }));
  };

  const removeBulkEntry = (index) => {
    setFormData(prev => ({
      ...prev,
      bulk_entries: prev.bulk_entries.filter((_, i) => i !== index)
    }));
  };

  const handleBulkEntryChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.bulk_entries];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, bulk_entries: updated };
    });
  };

  // Add capacitor bank (APFC)
  const addCapacitorBank = () => {
    setFormData(prev => ({
      ...prev,
      capacitor_banks: [
        ...prev.capacitor_banks,
        {
          id: Date.now(),
          stage: prev.capacitor_banks.length + 1,
          kvar_rating: '',
          make: '',
          status: 'OK',
          remarks: ''
        }
      ]
    }));
  };

  const handleCapacitorBankChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.capacitor_banks];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, capacitor_banks: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString()
      };
      
      if (isEdit) {
        await testReportsAPI.update(reportId, dataToSave);
      } else {
        await testReportsAPI.create(dataToSave);
      }
      
      navigate(`/projects/project-reports/equipment/${equipmentType}`);
    } catch (err) {
      console.error('Error saving report:', err);
      setError('Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const equipmentInfo = EQUIPMENT_INFO[equipmentType] || { name: equipmentType, fullName: '', color: 'bg-gray-500' };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-600">Loading template...</span>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Template Not Found</h2>
        <p className="text-slate-600 mb-4">{error || `No template available for ${equipmentType}`}</p>
        <Link to="/projects/project-reports/equipment" className="text-blue-600 hover:underline">
          ← Back to Equipment Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/projects/project-reports/equipment/${equipmentType}`}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className={`${equipmentInfo.color} text-white px-3 py-1 rounded-lg text-sm font-medium`}>
                {equipmentInfo.name}
              </span>
              <h1 className="text-2xl font-bold text-slate-800">
                {isEdit ? 'Edit' : 'New'} {template.title}
              </h1>
            </div>
            {equipmentInfo.fullName && (
              <p className="text-slate-500 mt-1">{equipmentInfo.fullName}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Report Information (with Report Type inside - matching Transformer) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Report Information
          </h2>
          
          {/* Row 1: Report No, Report Date, Date of Testing, Date of Energization (hidden for energy_meter) */}
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
                value={formData.report_date || new Date().toISOString().split('T')[0]}
                onChange={(val) => handleInputChange({ target: { name: 'report_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Testing <span className="text-red-500">*</span></label>
              <DatePicker
                value={formData.date_of_testing || ''}
                onChange={(val) => handleInputChange({ target: { name: 'date_of_testing', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {equipmentType !== 'energy_meter' && equipmentType !== 'energy-meter' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Energization</label>
                <DatePicker
                  value={formData.date_of_energization || ''}
                  onChange={(val) => handleInputChange({ target: { name: 'date_of_energization', value: val } })}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
          
          {/* Row 2: Report Type - 8 Radio Options (inside Report Information - matching Transformer) */}
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

        {/* Section 2: Customer Information (8 Fields - matching Transformer) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.customer_info?.company_name || ''}
                onChange={(e) => handleCustomerInfoChange('company_name', e.target.value)}
                placeholder="Enter customer/company name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site Location <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.customer_info?.site_location || ''}
                onChange={(e) => handleCustomerInfoChange('site_location', e.target.value)}
                placeholder="Enter site location"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Name (PID)</label>
              <select
                value={formData.project_id || ''}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Project (Optional)</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.pid_no || `PID-${project.id.slice(0,6).toUpperCase()}`} - {project.project_name || project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">P.O. Ref #</label>
              <input
                type="text"
                value={formData.customer_info?.po_ref || ''}
                onChange={(e) => handleCustomerInfoChange('po_ref', e.target.value)}
                placeholder="Enter P.O. reference"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.customer_info?.contact_person || ''}
                onChange={(e) => handleCustomerInfoChange('contact_person', e.target.value)}
                placeholder="Enter contact person name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={formData.customer_info?.contact_phone || ''}
                onChange={(e) => handleCustomerInfoChange('contact_phone', e.target.value)}
                placeholder="Enter contact phone"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">P.O. Dated</label>
              <DatePicker
                value={formData.customer_info?.po_dated || ''}
                onChange={(val) => handleCustomerInfoChange('po_dated', val)}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.customer_info?.contact_email || ''}
                onChange={(e) => handleCustomerInfoChange('contact_email', e.target.value)}
                placeholder="customer@company.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Service Provider Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Provider Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.service_provider?.company_name || 'Enerzia Power Solutions'}
                onChange={(e) => handleServiceProviderChange('company_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Engineer / Technician Name <span className="text-red-500">*</span></label>
              <select
                value={formData.service_provider?.engineer_name || ''}
                onChange={(e) => handleEngineerChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Team Member</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.name} - {m.designation || m.role}</option>
                ))}
              </select>
            </div>
            <div className="md:row-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Address</label>
              <textarea
                value={formData.service_provider?.company_address || ''}
                onChange={(e) => handleServiceProviderChange('company_address', e.target.value)}
                placeholder="Enter company address"
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Engineer Email</label>
              <input
                type="email"
                value={formData.service_provider?.engineer_email || ''}
                onChange={(e) => handleServiceProviderChange('engineer_email', e.target.value)}
                placeholder="engineer@company.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-start-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Engineer Mobile</label>
              <input
                type="tel"
                value={formData.service_provider?.engineer_mobile || ''}
                onChange={(e) => handleServiceProviderChange('engineer_mobile', e.target.value)}
                placeholder="Enter mobile number"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Equipment Details - hide for battery as it has its own dedicated section */}
        {template?.equipment_fields && template.equipment_fields.length > 0 && equipmentType !== 'battery' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Equipment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {template.equipment_fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={formData.equipment_details[field.name] || field.default || ''}
                      onChange={(e) => handleEquipmentDetailChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'date' ? (
                    <DatePicker
                      value={formData.equipment_details[field.name] || ''}
                      onChange={(val) => handleEquipmentDetailChange(field.name, val)}
                      placeholder="Select date"
                      className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={formData.equipment_details[field.name] || field.default || ''}
                      onChange={(e) => handleEquipmentDetailChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Detailed Check List - ACB/MCCB Specific */}
        {(equipmentType === 'acb' || equipmentType === 'mccb') && template?.checklist && template.checklist.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">Section 1</span>
                Detailed Check List
              </h2>
              <button
                type="button"
                onClick={() => {
                  const toggleKey = equipmentType === 'mccb' ? 'mccb_section_toggles' : 'acb_section_toggles';
                  setFormData(prev => ({
                    ...prev,
                    [toggleKey]: { ...prev[toggleKey], detailed_checklist: !prev[toggleKey]?.detailed_checklist }
                  }));
                }}
                className={`px-3 py-1 text-sm rounded-lg ${
                  (equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.detailed_checklist !== false 
                    ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.detailed_checklist !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.detailed_checklist !== false && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">#</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-center w-20">Yes</th>
                    <th className="px-3 py-2 text-center w-20">No</th>
                    <th className="px-3 py-2 text-center w-20">N/A</th>
                    <th className="px-3 py-2 text-left w-48">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.checklist.map((item, idx) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{item.id}</td>
                      <td className="px-3 py-2">{item.item}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'yes')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            item.status === 'yes' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-green-100'
                          }`}
                        >
                          <CheckCircle size={18} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'no')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            item.status === 'no' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-100'
                          }`}
                        >
                          <XCircle size={18} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'na')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            item.status === 'na' ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Minus size={18} />
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => handleChecklistChange(idx, 'remarks', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          placeholder="Optional remarks"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Non-ACB/MCCB Checklist (for other equipment types like VCB, Relay - NOT Panel, Battery) */}
        {equipmentType !== 'acb' && equipmentType !== 'mccb' && equipmentType !== 'panel' && equipmentType !== 'electrical-panel' && equipmentType !== 'battery' && template?.checklist && template.checklist.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Checklist</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">#</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-center w-20">Yes</th>
                    <th className="px-3 py-2 text-center w-20">No</th>
                    <th className="px-3 py-2 text-center w-20">N/A</th>
                    <th className="px-3 py-2 text-left w-48">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.checklist.map((item, idx) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{item.id}</td>
                      <td className="px-3 py-2">{item.item}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'yes')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            item.status === 'yes' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-green-100'
                          }`}
                        >
                          <CheckCircle size={18} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'no')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            item.status === 'no' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-100'
                          }`}
                        >
                          <XCircle size={18} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'na')}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            item.status === 'na' ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Minus size={18} />
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => handleChecklistChange(idx, 'remarks', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          placeholder="Optional remarks"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Panel Section A: Checklist of LT Panels */}
        {(equipmentType === 'panel' || equipmentType === 'electrical-panel') && formData.points_to_ensure && formData.points_to_ensure.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded mr-2">A</span>
                CHECKLIST OF LT. PANELS (PCC&apos;s, MCC, LDB, PDB, ELDB, APFCR, DB&apos;s, etc.)
              </h2>
              <button
                type="button"
                onClick={() => handlePanelSectionToggle('checklist')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.panel_section_toggles?.checklist !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.panel_section_toggles?.checklist !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.panel_section_toggles?.checklist !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left w-12">#</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-center w-24">Confirmation</th>
                      <th className="px-3 py-2 text-left w-48">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.points_to_ensure.map((item, idx) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium align-top">{item.id}</td>
                        <td className="px-3 py-2">
                          <div>{item.item}</div>
                          {item.sub_items && item.sub_items.length > 0 && (
                            <ul className="mt-1 ml-4 text-slate-600 text-xs list-disc">
                              {item.sub_items.map((subItem, subIdx) => (
                                <li key={subIdx}>{subItem}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePointsToEnsureChange(idx, 'confirmed', true)}
                              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                item.confirmed === true 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-green-100'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePointsToEnsureChange(idx, 'confirmed', false)}
                              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                item.confirmed === false 
                                  ? 'bg-red-500 text-white' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-red-100'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => handlePointsToEnsureChange(idx, 'remarks', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            placeholder="Optional remarks"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Panel Section B: Capacitor Health Report */}
        {(equipmentType === 'panel' || equipmentType === 'electrical-panel') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded mr-2">B</span>
                CAPACITOR HEALTH REPORT
              </h2>
              <button
                type="button"
                onClick={() => handlePanelSectionToggle('capacitor_health')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.panel_section_toggles?.capacitor_health !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.panel_section_toggles?.capacitor_health !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.panel_section_toggles?.capacitor_health !== false && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-center w-16">S/NO</th>
                        <th className="px-3 py-2 text-left">FEEDER</th>
                        <th colSpan="3" className="px-3 py-2 text-center border-l">CURRENT (A)</th>
                        <th className="px-3 py-2 text-left border-l w-48">REMARKS</th>
                        <th className="px-3 py-2 text-center w-16">Action</th>
                      </tr>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-1"></th>
                        <th className="px-3 py-1"></th>
                        <th className="px-3 py-1 text-center w-20 border-l">R</th>
                        <th className="px-3 py-1 text-center w-20">Y</th>
                        <th className="px-3 py-1 text-center w-20">B</th>
                        <th className="px-3 py-1 border-l"></th>
                        <th className="px-3 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.capacitor_health_rows?.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2 text-center font-medium">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.feeder || ''}
                              onChange={(e) => handleCapacitorHealthChange(idx, 'feeder', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="e.g., 2.5 KVAR - 1"
                            />
                          </td>
                          <td className="px-3 py-2 border-l">
                            <input
                              type="text"
                              value={row.current_r || ''}
                              onChange={(e) => handleCapacitorHealthChange(idx, 'current_r', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center"
                              placeholder="R"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.current_y || ''}
                              onChange={(e) => handleCapacitorHealthChange(idx, 'current_y', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center"
                              placeholder="Y"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.current_b || ''}
                              onChange={(e) => handleCapacitorHealthChange(idx, 'current_b', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center"
                              placeholder="B"
                            />
                          </td>
                          <td className="px-3 py-2 border-l">
                            <input
                              type="text"
                              value={row.remarks || ''}
                              onChange={(e) => handleCapacitorHealthChange(idx, 'remarks', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="Optional remarks"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeCapacitorHealthRow(idx)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove row"
                            >
                              <XCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addCapacitorHealthRow}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors"
                >
                  <Plus size={16} />
                  Add Row
                </button>
              </div>
            )}
          </div>
        )}

        {/* Earth Pit Testing Details Section */}
        {(equipmentType === 'earth_pit' || equipmentType === 'earth-pit') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded mr-2">Details</span>
              Testing Details - Earth Pit
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pit Type *</label>
                <select
                  value={formData.earth_pit_testing_details?.pit_type || ''}
                  onChange={(e) => handleEarthPitTestingDetailsChange('pit_type', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Pit Type</option>
                  <option value="Pipe Type">Pipe Type</option>
                  <option value="Plate Type">Plate Type</option>
                  <option value="Rod Type">Rod Type</option>
                  <option value="Chemical">Chemical</option>
                  <option value="Maintenance Free">Maintenance Free</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Electrode Material *</label>
                <select
                  value={formData.earth_pit_testing_details?.electrode_material || ''}
                  onChange={(e) => handleEarthPitTestingDetailsChange('electrode_material', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Material</option>
                  <option value="GI Pipe">GI Pipe</option>
                  <option value="Copper Plate">Copper Plate</option>
                  <option value="GI Rod">GI Rod</option>
                  <option value="Copper Rod">Copper Rod</option>
                  <option value="Chemical Compound">Chemical Compound</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Testing *</label>
                <DatePicker
                  value={formData.earth_pit_testing_details?.date_of_testing || ''}
                  onChange={(val) => handleEarthPitTestingDetailsChange('date_of_testing', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Due On</label>
                <DatePicker
                  value={formData.earth_pit_testing_details?.next_due_on || ''}
                  onChange={(val) => handleEarthPitTestingDetailsChange('next_due_on', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Earth Pit Section A: Electrical Checks */}
        {(equipmentType === 'earth_pit' || equipmentType === 'earth-pit') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded mr-2">A</span>
                Test Performed: ELECTRICAL CHECKS
              </h2>
              <button
                type="button"
                onClick={() => handleEarthPitSectionToggle('electrical_checks')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.earth_pit_section_toggles?.electrical_checks !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.earth_pit_section_toggles?.electrical_checks !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.earth_pit_section_toggles?.electrical_checks !== false && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Earth Pit No</th>
                        <th className="px-3 py-2 text-left">Pit Location</th>
                        <th className="px-3 py-2 text-left">Test Method</th>
                        <th className="px-3 py-2 text-center">Test Results Ohm (Individual)</th>
                        <th className="px-3 py-2 text-center">Test Results Ohm (Combined)</th>
                        <th className="px-3 py-2 text-left">Remarks</th>
                        <th className="px-3 py-2 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.electrical_checks_rows?.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.earth_pit_no || ''}
                              onChange={(e) => handleElectricalChecksChange(idx, 'earth_pit_no', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="EP-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.pit_location || ''}
                              onChange={(e) => handleElectricalChecksChange(idx, 'pit_location', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="Location"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.test_method || ''}
                              onChange={(e) => handleElectricalChecksChange(idx, 'test_method', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            >
                              <option value="">Select</option>
                              <option value="Fall of Potential">Fall of Potential</option>
                              <option value="Clamp-on">Clamp-on</option>
                              <option value="3-Point">3-Point</option>
                              <option value="4-Point">4-Point</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.individual_result || ''}
                              onChange={(e) => handleElectricalChecksChange(idx, 'individual_result', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center"
                              placeholder="Ω"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.combined_result || ''}
                              onChange={(e) => handleElectricalChecksChange(idx, 'combined_result', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center"
                              placeholder="Ω"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.remarks || ''}
                              onChange={(e) => handleElectricalChecksChange(idx, 'remarks', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="Remarks"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeElectricalChecksRow(idx)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove row"
                            >
                              <XCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={addElectricalChecksRow}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Plus size={16} />
                    Add Row
                  </button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-amber-800">
                    <strong>NOTES:</strong> The maximum permissible value for individual earth pit is 5 Ohms and the maximum permissible value for combined earth pit is 1 Ohm as per IS 3043:2018, IEEE Std 80-2013, and IEC 60364-5-54.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Earth Pit Section B: Continuity Checks */}
        {(equipmentType === 'earth_pit' || equipmentType === 'earth-pit') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded mr-2">B</span>
                Test Performed: CONTINUITY CHECKS
              </h2>
              <button
                type="button"
                onClick={() => handleEarthPitSectionToggle('continuity_checks')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.earth_pit_section_toggles?.continuity_checks !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.earth_pit_section_toggles?.continuity_checks !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.earth_pit_section_toggles?.continuity_checks !== false && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">FROM: EARTH PIT NO</th>
                        <th className="px-3 py-2 text-left">TO: EQUIPMENT</th>
                        <th className="px-3 py-2 text-center">CONTINUITY CHECKED</th>
                        <th className="px-3 py-2 text-left">REMARKS</th>
                        <th className="px-3 py-2 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.continuity_checks_rows?.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.from_pit_no || ''}
                              onChange={(e) => handleContinuityChecksChange(idx, 'from_pit_no', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="EP-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.to_equipment || ''}
                              onChange={(e) => handleContinuityChecksChange(idx, 'to_equipment', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="Equipment name"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select
                              value={row.continuity_checked || ''}
                              onChange={(e) => handleContinuityChecksChange(idx, 'continuity_checked', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center"
                            >
                              <option value="">Select</option>
                              <option value="OK">OK</option>
                              <option value="NOT OK">NOT OK</option>
                              <option value="N/A">N/A</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.remarks || ''}
                              onChange={(e) => handleContinuityChecksChange(idx, 'remarks', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="Remarks"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeContinuityChecksRow(idx)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove row"
                            >
                              <XCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addContinuityChecksRow}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Plus size={16} />
                  Add Row
                </button>
              </div>
            )}
          </div>
        )}

        {/* Energy Meter Equipment Details Section */}
        {(equipmentType === 'energy_meter' || equipmentType === 'energy-meter') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded mr-2">Details</span>
              Equipment Details - Energy Meter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Name *</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.meter_name || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('meter_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter meter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Location *</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.meter_location || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('meter_location', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter meter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Accuracy</label>
                <select
                  value={formData.energy_meter_details?.meter_accuracy || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('meter_accuracy', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Accuracy Class</option>
                  <option value="Class 0.2">Class 0.2</option>
                  <option value="Class 0.5">Class 0.5</option>
                  <option value="Class 1.0">Class 1.0</option>
                  <option value="Class 2.0">Class 2.0</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Panel/Feeder Name</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.panel_feeder_name || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('panel_feeder_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter panel/feeder name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Make/Model No.</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.make_model || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('make_model', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter make/model"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Serial No.</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.serial_no || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('serial_no', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter serial number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CT Ratio</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.ct_ratio || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('ct_ratio', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., 100/5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PT Ratio</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.pt_ratio || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('pt_ratio', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., 11000/110"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System Frequency</label>
                <select
                  value={formData.energy_meter_details?.system_frequency || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('system_frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Frequency</option>
                  <option value="50 Hz">50 Hz</option>
                  <option value="60 Hz">60 Hz</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System Voltage</label>
                <input
                  type="text"
                  value={formData.energy_meter_details?.system_voltage || ''}
                  onChange={(e) => handleEnergyMeterDetailsChange('system_voltage', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., 415V"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Calibration</label>
                <DatePicker
                  value={formData.energy_meter_details?.date_of_calibration || ''}
                  onChange={(val) => handleEnergyMeterDetailsChange('date_of_calibration', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Due On</label>
                <DatePicker
                  value={formData.energy_meter_details?.next_due_on || ''}
                  onChange={(val) => handleEnergyMeterDetailsChange('next_due_on', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Energy Meter: MASTER STANDARD DETAILS */}
        {(equipmentType === 'energy_meter' || equipmentType === 'energy-meter') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded mr-2">1</span>
                MASTER STANDARD DETAILS
              </h2>
              <button
                type="button"
                onClick={() => handleEnergyMeterSectionToggle('master_standard')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.energy_meter_section_toggles?.master_standard !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.energy_meter_section_toggles?.master_standard !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.energy_meter_section_toggles?.master_standard !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Nomenclature</th>
                      <th className="px-3 py-2 text-left">Make/Model</th>
                      <th className="px-3 py-2 text-left">SL.NO</th>
                      <th className="px-3 py-2 text-left">Certificate No</th>
                      <th className="px-3 py-2 text-left">Validity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={formData.energy_meter_master_standard?.nomenclature || ''}
                          onChange={(e) => handleMasterStandardChange('nomenclature', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          placeholder="3Φ Phase Power Analyzer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={formData.energy_meter_master_standard?.make_model || ''}
                          onChange={(e) => handleMasterStandardChange('make_model', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          placeholder="Calmet TE-30"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={formData.energy_meter_master_standard?.sl_no || ''}
                          onChange={(e) => handleMasterStandardChange('sl_no', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          placeholder="27272"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={formData.energy_meter_master_standard?.certificate_no || ''}
                          onChange={(e) => handleMasterStandardChange('certificate_no', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          placeholder="Certificate No"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <DatePicker
                          value={formData.energy_meter_master_standard?.validity || ''}
                          onChange={(val) => handleMasterStandardChange('validity', val)}
                          placeholder="Select date"
                          className="h-8 border-slate-200 text-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Energy Meter: TEST RESULTS */}
        {(equipmentType === 'energy_meter' || equipmentType === 'energy-meter') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded mr-2">2</span>
                TEST RESULTS
              </h2>
              <button
                type="button"
                onClick={() => handleEnergyMeterSectionToggle('test_results')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.energy_meter_section_toggles?.test_results !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.energy_meter_section_toggles?.test_results !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.energy_meter_section_toggles?.test_results !== false && (
              <div className="space-y-6">
                {/* Parameters Table - TEST RESULTS (V, I, PF & FREQ) */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">TEST RESULTS (V, I, PF &amp; FREQ)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-2 py-2 text-left border" rowSpan="2">Parameters</th>
                          <th className="px-2 py-2 text-center border" colSpan="3">Voltage (V)</th>
                          <th className="px-2 py-2 text-center border" colSpan="3">Current (A)</th>
                          <th className="px-2 py-2 text-center border" colSpan="1">P.F</th>
                          <th className="px-2 py-2 text-center border" colSpan="1">Frequency</th>
                        </tr>
                        <tr className="bg-slate-50">
                          <th className="px-2 py-1 text-center border">V (R-Y)</th>
                          <th className="px-2 py-1 text-center border">V (Y-B)</th>
                          <th className="px-2 py-1 text-center border">V (B-R)</th>
                          <th className="px-2 py-1 text-center border">R</th>
                          <th className="px-2 py-1 text-center border">Y</th>
                          <th className="px-2 py-1 text-center border">B</th>
                          <th className="px-2 py-1 text-center border"></th>
                          <th className="px-2 py-1 text-center border">Hz</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-2 py-2 border font-medium">DUC Reading</td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_vry || ''} onChange={(e) => handleParametersChange('duc_vry', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_vyb || ''} onChange={(e) => handleParametersChange('duc_vyb', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_vbr || ''} onChange={(e) => handleParametersChange('duc_vbr', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_r || ''} onChange={(e) => handleParametersChange('duc_r', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_y || ''} onChange={(e) => handleParametersChange('duc_y', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_b || ''} onChange={(e) => handleParametersChange('duc_b', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_pf || ''} onChange={(e) => handleParametersChange('duc_pf', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.duc_freq || ''} onChange={(e) => handleParametersChange('duc_freq', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-2 py-2 border font-medium">STD Reading</td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_vry || ''} onChange={(e) => handleParametersChange('std_vry', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_vyb || ''} onChange={(e) => handleParametersChange('std_vyb', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_vbr || ''} onChange={(e) => handleParametersChange('std_vbr', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_r || ''} onChange={(e) => handleParametersChange('std_r', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_y || ''} onChange={(e) => handleParametersChange('std_y', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_b || ''} onChange={(e) => handleParametersChange('std_b', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_pf || ''} onChange={(e) => handleParametersChange('std_pf', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_parameters?.std_freq || ''} onChange={(e) => handleParametersChange('std_freq', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Energy Reading Table - TEST RESULTS (kWH) */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">TEST RESULTS (kWH)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-2 py-2 text-left border"></th>
                          <th className="px-2 py-2 text-center border">DUC Reading in MWh</th>
                          <th className="px-2 py-2 text-center border">Standard Reading in kWh</th>
                          <th className="px-2 py-2 text-center border">Error in %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-2 py-2 border font-medium">Final Reading</td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.final_duc || ''} onChange={(e) => handleEnergyReadingChange('final_duc', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.final_std || ''} onChange={(e) => handleEnergyReadingChange('final_std', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border" rowSpan="5"><input type="text" value={formData.energy_meter_energy_reading?.error_percent || ''} onChange={(e) => handleEnergyReadingChange('error_percent', e.target.value)} className="w-full h-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-2 py-2 border font-medium">Initial Reading</td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.initial_duc || ''} onChange={(e) => handleEnergyReadingChange('initial_duc', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.initial_std || ''} onChange={(e) => handleEnergyReadingChange('initial_std', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-2 py-2 border font-medium">Difference</td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.difference_duc || ''} onChange={(e) => handleEnergyReadingChange('difference_duc', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.difference_std || ''} onChange={(e) => handleEnergyReadingChange('difference_std', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-2 py-2 border font-medium">MF Factor</td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.mf_duc || ''} onChange={(e) => handleEnergyReadingChange('mf_duc', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.mf_std || ''} onChange={(e) => handleEnergyReadingChange('mf_std', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                        </tr>
                        <tr className="border-b hover:bg-slate-50">
                          <td className="px-2 py-2 border font-medium">Total Unit</td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.total_duc || ''} onChange={(e) => handleEnergyReadingChange('total_duc', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                          <td className="px-1 py-1 border"><input type="text" value={formData.energy_meter_energy_reading?.total_std || ''} onChange={(e) => handleEnergyReadingChange('total_std', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-sm text-center" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-800 mb-2">Notes:</h3>
                  <p className="text-sm text-amber-800">The Standards used are traceable to National Standards</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== VOLTMETER SECTIONS ==================== */}
        {/* Voltmeter Equipment Details */}
        {equipmentType === 'voltmeter' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded mr-2">Details</span>
              Equipment Details - Voltmeter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Name *</label>
                <input
                  type="text"
                  value={formData.voltmeter_details?.meter_name || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('meter_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter meter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Location *</label>
                <input
                  type="text"
                  value={formData.voltmeter_details?.meter_location || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('meter_location', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter meter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Accuracy</label>
                <select
                  value={formData.voltmeter_details?.meter_accuracy || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('meter_accuracy', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Accuracy Class</option>
                  <option value="Class 0.2">Class 0.2</option>
                  <option value="Class 0.5">Class 0.5</option>
                  <option value="Class 1.0">Class 1.0</option>
                  <option value="Class 2.0">Class 2.0</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Panel/Feeder Name</label>
                <input
                  type="text"
                  value={formData.voltmeter_details?.panel_feeder_name || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('panel_feeder_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter panel/feeder name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Make/Model No.</label>
                <input
                  type="text"
                  value={formData.voltmeter_details?.make_model || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('make_model', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter make/model"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Serial No.</label>
                <input
                  type="text"
                  value={formData.voltmeter_details?.serial_no || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('serial_no', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter serial number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Measuring Range</label>
                <input
                  type="text"
                  value={formData.voltmeter_details?.measuring_range || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('measuring_range', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 0-500V"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System Voltage</label>
                <input
                  type="text"
                  value={formData.voltmeter_details?.system_voltage || ''}
                  onChange={(e) => handleVoltmeterDetailsChange('system_voltage', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 415V"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Calibration</label>
                <DatePicker
                  value={formData.voltmeter_details?.date_of_calibration || ''}
                  onChange={(val) => handleVoltmeterDetailsChange('date_of_calibration', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Due On</label>
                <DatePicker
                  value={formData.voltmeter_details?.next_due_on || ''}
                  onChange={(val) => handleVoltmeterDetailsChange('next_due_on', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Voltmeter: MASTER STANDARD DETAILS */}
        {equipmentType === 'voltmeter' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded mr-2">1</span>
                MASTER STANDARD DETAILS
              </h2>
              <button
                type="button"
                onClick={() => handleVoltmeterSectionToggle('master_standard')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.voltmeter_section_toggles?.master_standard !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.voltmeter_section_toggles?.master_standard !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.voltmeter_section_toggles?.master_standard !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Nomenclature</th>
                      <th className="px-3 py-2 text-left">Make/Model</th>
                      <th className="px-3 py-2 text-left">SL.NO</th>
                      <th className="px-3 py-2 text-left">Certificate No</th>
                      <th className="px-3 py-2 text-left">Validity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input type="text" value={formData.voltmeter_master_standard?.nomenclature || ''} onChange={(e) => handleVoltmeterMasterStandardChange('nomenclature', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Digital Multimeter" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={formData.voltmeter_master_standard?.make_model || ''} onChange={(e) => handleVoltmeterMasterStandardChange('make_model', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Fluke 87V" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={formData.voltmeter_master_standard?.sl_no || ''} onChange={(e) => handleVoltmeterMasterStandardChange('sl_no', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="SL No" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={formData.voltmeter_master_standard?.certificate_no || ''} onChange={(e) => handleVoltmeterMasterStandardChange('certificate_no', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Certificate No" />
                      </td>
                      <td className="px-3 py-2">
                        <DatePicker value={formData.voltmeter_master_standard?.validity || ''} onChange={(val) => handleVoltmeterMasterStandardChange('validity', val)} placeholder="Select date" className="h-8 border-slate-200 text-sm" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Voltmeter: TEST RESULTS */}
        {equipmentType === 'voltmeter' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded mr-2">2</span>
                TEST RESULTS
              </h2>
              <button
                type="button"
                onClick={() => handleVoltmeterSectionToggle('test_results')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.voltmeter_section_toggles?.test_results !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.voltmeter_section_toggles?.test_results !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.voltmeter_section_toggles?.test_results !== false && (
              <div className="space-y-6">
                {/* Measurement Test Table - New Format */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">❖ MEASUREMENT TEST:</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-slate-300">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">PHASE REFERENCE</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">TEST METER READING (V)</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">STANDARD METER READING (V)</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">ERROR %</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">ERROR LIMIT %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.voltmeter_measurement_tests?.map((test, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="px-3 py-2 border border-slate-300 text-center font-medium">{test.phase}</td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.test_reading || ''} 
                                onChange={(e) => handleVoltmeterMeasurementTestChange(idx, 'test_reading', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.standard_reading || ''} 
                                onChange={(e) => handleVoltmeterMeasurementTestChange(idx, 'standard_reading', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.error_percent || ''} 
                                onChange={(e) => handleVoltmeterMeasurementTestChange(idx, 'error_percent', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.error_limit || ''} 
                                onChange={(e) => handleVoltmeterMeasurementTestChange(idx, 'error_limit', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="font-semibold text-indigo-800 mb-2">Notes:</h3>
                  <p className="text-sm text-indigo-800">The Standards used are traceable to National Standards</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== AMMETER SECTIONS ==================== */}
        {/* Ammeter Equipment Details */}
        {equipmentType === 'ammeter' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded mr-2">Details</span>
              Equipment Details - Ammeter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Name *</label>
                <input
                  type="text"
                  value={formData.ammeter_details?.meter_name || ''}
                  onChange={(e) => handleAmmeterDetailsChange('meter_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter meter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Location *</label>
                <input
                  type="text"
                  value={formData.ammeter_details?.meter_location || ''}
                  onChange={(e) => handleAmmeterDetailsChange('meter_location', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter meter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meter Accuracy</label>
                <select
                  value={formData.ammeter_details?.meter_accuracy || ''}
                  onChange={(e) => handleAmmeterDetailsChange('meter_accuracy', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select Accuracy Class</option>
                  <option value="Class 0.2">Class 0.2</option>
                  <option value="Class 0.5">Class 0.5</option>
                  <option value="Class 1.0">Class 1.0</option>
                  <option value="Class 2.0">Class 2.0</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Panel/Feeder Name</label>
                <input
                  type="text"
                  value={formData.ammeter_details?.panel_feeder_name || ''}
                  onChange={(e) => handleAmmeterDetailsChange('panel_feeder_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter panel/feeder name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Make/Model No.</label>
                <input
                  type="text"
                  value={formData.ammeter_details?.make_model || ''}
                  onChange={(e) => handleAmmeterDetailsChange('make_model', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter make/model"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Serial No.</label>
                <input
                  type="text"
                  value={formData.ammeter_details?.serial_no || ''}
                  onChange={(e) => handleAmmeterDetailsChange('serial_no', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter serial number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Measuring Range</label>
                <input
                  type="text"
                  value={formData.ammeter_details?.measuring_range || ''}
                  onChange={(e) => handleAmmeterDetailsChange('measuring_range', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g., 0-100A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CT Ratio</label>
                <input
                  type="text"
                  value={formData.ammeter_details?.ct_ratio || ''}
                  onChange={(e) => handleAmmeterDetailsChange('ct_ratio', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g., 100/5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Calibration</label>
                <DatePicker
                  value={formData.ammeter_details?.date_of_calibration || ''}
                  onChange={(val) => handleAmmeterDetailsChange('date_of_calibration', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Due On</label>
                <DatePicker
                  value={formData.ammeter_details?.next_due_on || ''}
                  onChange={(val) => handleAmmeterDetailsChange('next_due_on', val)}
                  placeholder="Select date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Ammeter: MASTER STANDARD DETAILS */}
        {equipmentType === 'ammeter' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded mr-2">1</span>
                MASTER STANDARD DETAILS
              </h2>
              <button
                type="button"
                onClick={() => handleAmmeterSectionToggle('master_standard')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.ammeter_section_toggles?.master_standard !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.ammeter_section_toggles?.master_standard !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.ammeter_section_toggles?.master_standard !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Nomenclature</th>
                      <th className="px-3 py-2 text-left">Make/Model</th>
                      <th className="px-3 py-2 text-left">SL.NO</th>
                      <th className="px-3 py-2 text-left">Certificate No</th>
                      <th className="px-3 py-2 text-left">Validity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input type="text" value={formData.ammeter_master_standard?.nomenclature || ''} onChange={(e) => handleAmmeterMasterStandardChange('nomenclature', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Clamp Meter" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={formData.ammeter_master_standard?.make_model || ''} onChange={(e) => handleAmmeterMasterStandardChange('make_model', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Fluke 376" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={formData.ammeter_master_standard?.sl_no || ''} onChange={(e) => handleAmmeterMasterStandardChange('sl_no', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="SL No" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={formData.ammeter_master_standard?.certificate_no || ''} onChange={(e) => handleAmmeterMasterStandardChange('certificate_no', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Certificate No" />
                      </td>
                      <td className="px-3 py-2">
                        <DatePicker value={formData.ammeter_master_standard?.validity || ''} onChange={(val) => handleAmmeterMasterStandardChange('validity', val)} placeholder="Select date" className="h-8 border-slate-200 text-sm" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Ammeter: TEST RESULTS */}
        {equipmentType === 'ammeter' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded mr-2">2</span>
                TEST RESULTS
              </h2>
              <button
                type="button"
                onClick={() => handleAmmeterSectionToggle('test_results')}
                className={`px-3 py-1 text-sm rounded-lg ${formData.ammeter_section_toggles?.test_results !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {formData.ammeter_section_toggles?.test_results !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {formData.ammeter_section_toggles?.test_results !== false && (
              <div className="space-y-6">
                {/* Measurement Test Table - New Format */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">❖ MEASUREMENT TEST:</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-slate-300">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">PHASE RERERANCE</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">TEST METER READINGS (A)</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">STANDARD METER READINGS (A)</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">ERROR(%)</th>
                          <th className="px-3 py-2 text-center border border-slate-300 font-bold">ERROR LIMIT (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.ammeter_measurement_tests?.map((test, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="px-3 py-2 border border-slate-300 text-center font-medium">{test.phase}</td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.test_reading || ''} 
                                onChange={(e) => handleAmmeterMeasurementTestChange(idx, 'test_reading', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.standard_reading || ''} 
                                onChange={(e) => handleAmmeterMeasurementTestChange(idx, 'standard_reading', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.error_percent || ''} 
                                onChange={(e) => handleAmmeterMeasurementTestChange(idx, 'error_percent', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                            <td className="px-1 py-1 border border-slate-300">
                              <input 
                                type="text" 
                                value={test.error_limit || ''} 
                                onChange={(e) => handleAmmeterMeasurementTestChange(idx, 'error_limit', e.target.value)} 
                                className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center" 
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <h3 className="font-semibold text-cyan-800 mb-2">Notes:</h3>
                  <p className="text-sm text-cyan-800">The Standards used are traceable to National Standards</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* IR Test Table (ACB only - VCB has its own specific section) */}
        {equipmentType !== 'vcb' && template?.ir_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {equipmentType === 'acb' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">Section 2</span>}
                IR Test Results ({template.ir_test.unit})
              </h2>
              {equipmentType === 'acb' && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    acb_section_toggles: { ...prev.acb_section_toggles, insulation_resistance_test: !prev.acb_section_toggles?.insulation_resistance_test }
                  }))}
                  className={`px-3 py-1 text-sm rounded-lg ${formData.acb_section_toggles?.insulation_resistance_test !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {formData.acb_section_toggles?.insulation_resistance_test !== false ? 'Enabled' : 'Disabled'}
                </button>
              )}
            </div>
            {(equipmentType !== 'acb' || formData.acb_section_toggles?.insulation_resistance_test !== false) && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 border text-left">Condition</th>
                    {template.ir_test.columns.map(col => (
                      <th key={col} className="px-3 py-2 border text-center">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {template.ir_test.rows.map(row => (
                    <tr key={row} className="border-b">
                      <td className="px-3 py-2 border font-medium">{row}</td>
                      {template.ir_test.columns.map(col => (
                        <td key={col} className="px-3 py-2 border">
                          <input
                            type="text"
                            value={formData.ir_test[row]?.[col] || ''}
                            onChange={(e) => handleIRTestChange(row, col, e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Timing Test (Legacy - VCB has its own specific section) */}
        {equipmentType !== 'vcb' && template?.timing_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Timing Test</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 border text-left">Parameter</th>
                    {template.timing_test.columns.map(col => (
                      <th key={col} className="px-3 py-2 border text-center">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {template.timing_test.rows.map(row => (
                    <tr key={row} className="border-b">
                      <td className="px-3 py-2 border font-medium">{row}</td>
                      {template.timing_test.columns.map(col => (
                        <td key={col} className="px-3 py-2 border">
                          <input
                            type="text"
                            value={formData.timing_test[row]?.[col] || ''}
                            onChange={(e) => handleTimingTestChange(row, col, e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Table (Relay) */}
        {equipmentType === 'relay' && (
          <div className="space-y-6">
            {/* TEST 1: Protection Relay Test */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">TEST 1: PROTECTION RELAY</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-slate-600">Enable</span>
                  <input
                    type="checkbox"
                    checked={formData.relay_section_toggles?.protection_relay_test !== false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      relay_section_toggles: { ...prev.relay_section_toggles, protection_relay_test: e.target.checked }
                    }))}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              {formData.relay_section_toggles?.protection_relay_test !== false && (
                <div className="space-y-6">
                  {/* Setting Details Table */}
                  <div>
                    <h3 className="text-md font-semibold text-slate-700 mb-3 bg-blue-50 px-3 py-2 rounded">Setting Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 border border-slate-300 text-left">FB Name</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting Current</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting TL</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">DMT</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.protection_relay_test?.setting_details?.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 border border-slate-300 font-medium">{row.fb_name}</td>
                              <td className="px-3 py-2 border border-slate-300">
                                <input
                                  type="text"
                                  value={row.setting_current || ''}
                                  onChange={(e) => {
                                    const newDetails = [...formData.protection_relay_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], setting_current: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      protection_relay_test: { ...prev.protection_relay_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                                />
                              </td>
                              <td className="px-3 py-2 border border-slate-300">
                                <input
                                  type="text"
                                  value={row.setting_tl || ''}
                                  onChange={(e) => {
                                    const newDetails = [...formData.protection_relay_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], setting_tl: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      protection_relay_test: { ...prev.protection_relay_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                                />
                              </td>
                              <td className="px-3 py-2 border border-slate-300">
                                <input
                                  type="text"
                                  value={row.dmt || ''}
                                  onChange={(e) => {
                                    const newDetails = [...formData.protection_relay_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], dmt: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      protection_relay_test: { ...prev.protection_relay_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                />
                              </td>
                              <td className="px-3 py-2 border border-slate-300">
                                <select
                                  value={row.remark || 'ON'}
                                  onChange={(e) => {
                                    const newDetails = [...formData.protection_relay_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], remark: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      protection_relay_test: { ...prev.protection_relay_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                >
                                  <option value="ON">ON</option>
                                  <option value="OFF">OFF</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pickup Test Table */}
                  <div>
                    <h3 className="text-md font-semibold text-slate-700 mb-3 bg-green-50 px-3 py-2 rounded">Pickup Test</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 border border-slate-300 text-left">Phase</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting Current</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting TL</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Pickup Current</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Trip Time</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Hi Set Pickup Current</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Hi Set Trip Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.protection_relay_test?.pickup_test?.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 border border-slate-300 font-medium">{row.phase}</td>
                              {['setting_current', 'setting_tl', 'pickup_current', 'trip_time', 'hi_set_pickup_current', 'hi_set_trip_time'].map(field => (
                                <td key={field} className="px-3 py-2 border border-slate-300">
                                  <input
                                    type="text"
                                    value={row[field] || ''}
                                    onChange={(e) => {
                                      const newTest = [...formData.protection_relay_test.pickup_test];
                                      newTest[idx] = { ...newTest[idx], [field]: e.target.value };
                                      setFormData(prev => ({
                                        ...prev,
                                        protection_relay_test: { ...prev.protection_relay_test, pickup_test: newTest }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Characteristic Check Table */}
                  <div>
                    <h3 className="text-md font-semibold text-slate-700 mb-3 bg-amber-50 px-3 py-2 rounded">Characteristic Check by Secondary Injection Test</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 border border-slate-300 text-left">Phase</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Plug Setting</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">TL</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Graph Time @2x</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Graph Time @5x</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Actual Time @2x</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Actual Time @5x</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.protection_relay_test?.characteristic_check?.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 border border-slate-300 font-medium">{row.phase}</td>
                              {['plug_setting', 'tl', 'graph_time_2x', 'graph_time_5x', 'actual_time_2x', 'actual_time_5x'].map(field => (
                                <td key={field} className="px-3 py-2 border border-slate-300">
                                  <input
                                    type="text"
                                    value={row[field] || ''}
                                    onChange={(e) => {
                                      const newCheck = [...formData.protection_relay_test.characteristic_check];
                                      newCheck[idx] = { ...newCheck[idx], [field]: e.target.value };
                                      setFormData(prev => ({
                                        ...prev,
                                        protection_relay_test: { ...prev.protection_relay_test, characteristic_check: newCheck }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <textarea
                      value={formData.protection_relay_test?.remarks || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        protection_relay_test: { ...prev.protection_relay_test, remarks: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      rows={2}
                      placeholder="Enter any remarks..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TEST 2: Feeder Protection Relay Test */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">TEST 2: FEEDER PROTECTION RELAY</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-slate-600">Enable</span>
                  <input
                    type="checkbox"
                    checked={formData.relay_section_toggles?.feeder_protection_test === true}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      relay_section_toggles: { ...prev.relay_section_toggles, feeder_protection_test: e.target.checked }
                    }))}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              {formData.relay_section_toggles?.feeder_protection_test === true && (
                <div className="space-y-6">
                  {/* Feeder Setting Details Table */}
                  <div>
                    <h3 className="text-md font-semibold text-slate-700 mb-3 bg-blue-50 px-3 py-2 rounded">Setting Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 border border-slate-300 text-left">FB Name</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting Current</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting TL</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">DMT</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.feeder_protection_test?.setting_details?.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 border border-slate-300 font-medium">{row.fb_name}</td>
                              <td className="px-3 py-2 border border-slate-300">
                                <input
                                  type="text"
                                  value={row.setting_current || ''}
                                  onChange={(e) => {
                                    const newDetails = [...formData.feeder_protection_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], setting_current: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      feeder_protection_test: { ...prev.feeder_protection_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                                />
                              </td>
                              <td className="px-3 py-2 border border-slate-300">
                                <input
                                  type="text"
                                  value={row.setting_tl || ''}
                                  onChange={(e) => {
                                    const newDetails = [...formData.feeder_protection_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], setting_tl: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      feeder_protection_test: { ...prev.feeder_protection_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                                />
                              </td>
                              <td className="px-3 py-2 border border-slate-300">
                                <input
                                  type="text"
                                  value={row.dmt || ''}
                                  onChange={(e) => {
                                    const newDetails = [...formData.feeder_protection_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], dmt: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      feeder_protection_test: { ...prev.feeder_protection_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                />
                              </td>
                              <td className="px-3 py-2 border border-slate-300">
                                <select
                                  value={row.remark || 'ON'}
                                  onChange={(e) => {
                                    const newDetails = [...formData.feeder_protection_test.setting_details];
                                    newDetails[idx] = { ...newDetails[idx], remark: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      feeder_protection_test: { ...prev.feeder_protection_test, setting_details: newDetails }
                                    }));
                                  }}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                >
                                  <option value="ON">ON</option>
                                  <option value="OFF">OFF</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Feeder Pickup Test Table */}
                  <div>
                    <h3 className="text-md font-semibold text-slate-700 mb-3 bg-green-50 px-3 py-2 rounded">Pickup Test</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 border border-slate-300 text-left">Phase</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting Current</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Setting TL</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Pickup Current</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Trip Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.feeder_protection_test?.pickup_test?.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 border border-slate-300 font-medium">{row.phase}</td>
                              {['setting_current', 'setting_tl', 'pickup_current', 'trip_time'].map(field => (
                                <td key={field} className="px-3 py-2 border border-slate-300">
                                  <input
                                    type="text"
                                    value={row[field] || ''}
                                    onChange={(e) => {
                                      const newTest = [...formData.feeder_protection_test.pickup_test];
                                      newTest[idx] = { ...newTest[idx], [field]: e.target.value };
                                      setFormData(prev => ({
                                        ...prev,
                                        feeder_protection_test: { ...prev.feeder_protection_test, pickup_test: newTest }
                                      }));
                                    }}
                                    className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Feeder Characteristic Check Table */}
                  <div>
                    <h3 className="text-md font-semibold text-slate-700 mb-3 bg-amber-50 px-3 py-2 rounded">Characteristic Check by Secondary Injection Test</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 border border-slate-300 text-left">Phase</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Plug Setting</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">TL</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Graph Time @2x</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Graph Time @5x</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Actual Time @2x</th>
                            <th className="px-3 py-2 border border-slate-300 text-center">Actual Time @5x</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.feeder_protection_test?.characteristic_check?.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 border border-slate-300 font-medium">{row.phase}</td>
                              {['plug_setting', 'tl', 'graph_time_2x', 'graph_time_5x', 'actual_time_2x', 'actual_time_5x'].map(field => (
                                <td key={field} className="px-3 py-2 border border-slate-300">
                                  <input
                                    type="text"
                                    value={row[field] || ''}
                                    onChange={(e) => {
                                      const newCheck = [...formData.feeder_protection_test.characteristic_check];
                                      newCheck[idx] = { ...newCheck[idx], [field]: e.target.value };
                                      setFormData(prev => ({
                                        ...prev,
                                        feeder_protection_test: { ...prev.feeder_protection_test, characteristic_check: newCheck }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <textarea
                      value={formData.feeder_protection_test?.remarks || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        feeder_protection_test: { ...prev.feeder_protection_test, remarks: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      rows={2}
                      placeholder="Enter any remarks..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Capacitor Banks Table (APFC) */}
        {equipmentType === 'apfc' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Capacitor Banks Status</h2>
              <button
                type="button"
                onClick={addCapacitorBank}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" />
                Add Stage
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 border text-center w-16">Stage</th>
                    <th className="px-3 py-2 border text-center">KVAR Rating</th>
                    <th className="px-3 py-2 border text-center">Make</th>
                    <th className="px-3 py-2 border text-center">Status</th>
                    <th className="px-3 py-2 border text-left">Remarks</th>
                    <th className="px-3 py-2 border w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.capacitor_banks.map((bank, idx) => (
                    <tr key={bank.id || idx} className="border-b">
                      <td className="px-3 py-2 border text-center font-medium">{bank.stage}</td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          value={bank.kvar_rating || ''}
                          onChange={(e) => handleCapacitorBankChange(idx, 'kvar_rating', e.target.value)}
                          placeholder="e.g., 25"
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          value={bank.make || ''}
                          onChange={(e) => handleCapacitorBankChange(idx, 'make', e.target.value)}
                          placeholder="Make"
                          className="w-28 px-2 py-1 border border-slate-200 rounded"
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <select
                          value={bank.status || 'OK'}
                          onChange={(e) => handleCapacitorBankChange(idx, 'status', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded"
                        >
                          <option value="OK">OK</option>
                          <option value="FAULTY">Faulty</option>
                          <option value="REPLACED">Replaced</option>
                          <option value="BYPASSED">Bypassed</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          value={bank.remarks || ''}
                          onChange={(e) => handleCapacitorBankChange(idx, 'remarks', e.target.value)}
                          placeholder="Remarks"
                          className="w-full px-2 py-1 border border-slate-200 rounded"
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            capacitor_banks: prev.capacitor_banks.filter((_, i) => i !== idx)
                          }))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.capacitor_banks.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-3 py-4 text-center text-slate-500">
                        No capacitor banks added. Click "Add Stage" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Readings Table (UPS, DG) */}
        {template?.readings && formData.readings.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Readings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 border text-left">Parameter</th>
                    {template.readings.columns.includes('No Load') && (
                      <th className="px-3 py-2 border text-center">No Load</th>
                    )}
                    {template.readings.columns.includes('Full Load') && (
                      <th className="px-3 py-2 border text-center">Full Load</th>
                    )}
                    {template.readings.columns.includes('Reading') && (
                      <th className="px-3 py-2 border text-center">Reading</th>
                    )}
                    <th className="px-3 py-2 border text-center">Normal Range</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.readings.map((reading, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2 border">{reading.parameter}</td>
                      {template.readings.columns.includes('No Load') && (
                        <td className="px-3 py-2 border">
                          <input
                            type="text"
                            value={reading.no_load || ''}
                            onChange={(e) => handleReadingsChange(idx, 'no_load', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                      )}
                      {template.readings.columns.includes('Full Load') && (
                        <td className="px-3 py-2 border">
                          <input
                            type="text"
                            value={reading.full_load || ''}
                            onChange={(e) => handleReadingsChange(idx, 'full_load', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                      )}
                      {template.readings.columns.includes('Reading') && (
                        <td className="px-3 py-2 border">
                          <input
                            type="text"
                            value={reading.reading || ''}
                            onChange={(e) => handleReadingsChange(idx, 'reading', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 border text-center text-slate-500">{reading.normal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Test Results (Earth Pit, LA) */}
        {template?.test_results && formData.test_results.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Test Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 border text-left">Parameter</th>
                    <th className="px-3 py-2 border text-center">Value</th>
                    <th className="px-3 py-2 border text-left">Acceptance Criteria</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.test_results.map((result, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2 border">{result.parameter}</td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          value={result.value}
                          onChange={(e) => handleTestResultsChange(idx, 'value', e.target.value)}
                          className="w-32 px-2 py-1 border border-slate-200 rounded text-center"
                        />
                      </td>
                      <td className="px-3 py-2 border text-slate-500">{result.acceptance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACB/MCCB Specific: Insulation Resistance Test */}
        {(equipmentType === 'acb' || equipmentType === 'mccb') && template?.insulation_resistance_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">Section 2</span>
                {template.insulation_resistance_test.title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const toggleKey = equipmentType === 'mccb' ? 'mccb_section_toggles' : 'acb_section_toggles';
                  setFormData(prev => ({
                    ...prev,
                    [toggleKey]: { ...prev[toggleKey], insulation_resistance_test: !prev[toggleKey]?.insulation_resistance_test }
                  }));
                }}
                className={`px-3 py-1 text-sm rounded-lg ${
                  (equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.insulation_resistance_test !== false 
                    ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.insulation_resistance_test !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.insulation_resistance_test !== false && (
            <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Voltage Applied</label>
                <input
                  type="text"
                  value={formData.insulation_resistance?.voltage_applied || ''}
                  onChange={(e) => handleInsulationResistanceChange('voltage_applied', null, e.target.value)}
                  placeholder="e.g., 1000V DC for 60 Sec"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ambient Temp (°C)</label>
                <input
                  type="text"
                  value={formData.insulation_resistance?.ambient_temp || ''}
                  onChange={(e) => handleInsulationResistanceChange('ambient_temp', null, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th rowSpan="2" className="px-3 py-2 border text-center font-semibold">CB OPEN</th>
                    <th colSpan="4" className="px-3 py-2 border text-center font-semibold">CB CLOSE</th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th colSpan="4" className="px-1 py-1 border text-center text-xs">
                      <div className="grid grid-cols-2">
                        <span>Phase to Earth</span>
                        <span>Phase to Phase</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1 border">
                      <div className="grid grid-cols-4 gap-1">
                        {["R-R'", "Y-Y'", "B-B'", "N-N'"].map(key => (
                          <div key={key} className="text-center">
                            <label className="block text-xs text-slate-500 mb-1">{key}</label>
                            <input
                              type="text"
                              value={formData.insulation_resistance?.cb_open?.[key] || ''}
                              onChange={(e) => handleInsulationResistanceChange('cb_open', key, e.target.value)}
                              className="w-14 px-1 py-1 text-xs border border-slate-200 rounded text-center"
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td colSpan="4" className="px-2 py-1 border">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-4 gap-1">
                          {["R-E", "Y-E", "B-E", "N-E"].map(key => (
                            <div key={key} className="text-center">
                              <label className="block text-xs text-slate-500 mb-1">{key}</label>
                              <input
                                type="text"
                                value={formData.insulation_resistance?.cb_close_phase_earth?.[key] || ''}
                                onChange={(e) => handleInsulationResistanceChange('cb_close_phase_earth', key, e.target.value)}
                                className="w-14 px-1 py-1 text-xs border border-slate-200 rounded text-center"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {["R-Y", "Y-B", "B-R"].map(key => (
                            <div key={key} className="text-center">
                              <label className="block text-xs text-slate-500 mb-1">{key}</label>
                              <input
                                type="text"
                                value={formData.insulation_resistance?.cb_close_phase_phase?.[key] || ''}
                                onChange={(e) => handleInsulationResistanceChange('cb_close_phase_phase', key, e.target.value)}
                                className="w-14 px-1 py-1 text-xs border border-slate-200 rounded text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">* Accepted criteria: {template.insulation_resistance_test.acceptance_criteria}</p>
            </div>
            </>
            )}
          </div>
        )}

        {/* ACB/MCCB Specific: Coil Resistance Test */}
        {(equipmentType === 'acb' || equipmentType === 'mccb') && template?.coil_resistance_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">Section 3</span>
                {template.coil_resistance_test.title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const toggleKey = equipmentType === 'mccb' ? 'mccb_section_toggles' : 'acb_section_toggles';
                  setFormData(prev => ({
                    ...prev,
                    [toggleKey]: { ...prev[toggleKey], coil_resistance_test: !prev[toggleKey]?.coil_resistance_test }
                  }));
                }}
                className={`px-3 py-1 text-sm rounded-lg ${
                  (equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.coil_resistance_test !== false 
                    ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.coil_resistance_test !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.coil_resistance_test !== false && (
            <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Ambient Temp (°C)</label>
              <input
                type="text"
                value={formData.coil_resistance?.ambient_temp || ''}
                onChange={(e) => handleCoilResistanceChange('ambient_temp', e.target.value)}
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse max-w-md">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 border text-left font-semibold">COIL</th>
                    <th className="px-3 py-2 border text-center font-semibold">CLOSE</th>
                    <th className="px-3 py-2 border text-center font-semibold">TRIP COIL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 border font-medium">RESISTANCE ({template.coil_resistance_test.unit})</td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={formData.coil_resistance?.close_coil || ''}
                        onChange={(e) => handleCoilResistanceChange('close_coil', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={formData.coil_resistance?.trip_coil || ''}
                        onChange={(e) => handleCoilResistanceChange('trip_coil', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">* Accepted criteria: {template.coil_resistance_test.acceptance_criteria}</p>
            </div>
            </>
            )}
          </div>
        )}

        {/* ACB/MCCB Specific: Contact Resistance Test */}
        {(equipmentType === 'acb' || equipmentType === 'mccb') && template?.contact_resistance_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">Section 4</span>
                {template.contact_resistance_test.title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const toggleKey = equipmentType === 'mccb' ? 'mccb_section_toggles' : 'acb_section_toggles';
                  setFormData(prev => ({
                    ...prev,
                    [toggleKey]: { ...prev[toggleKey], contact_resistance_test: !prev[toggleKey]?.contact_resistance_test }
                  }));
                }}
                className={`px-3 py-1 text-sm rounded-lg ${
                  (equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.contact_resistance_test !== false 
                    ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.contact_resistance_test !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.contact_resistance_test !== false && (
            <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Injected Current</label>
              <input
                type="text"
                value={formData.contact_resistance?.injected_current || ''}
                onChange={(e) => handleContactResistanceChange('injected_current', e.target.value)}
                placeholder="e.g., 100 Amps DC"
                className="w-48 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse max-w-lg">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 border text-left font-semibold">PHASE</th>
                    {template.contact_resistance_test.phases.map(phase => (
                      <th key={phase} className="px-3 py-2 border text-center font-semibold">{phase}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 border font-medium">Measured Value ({template.contact_resistance_test.unit})</td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={formData.contact_resistance?.r_phase || ''}
                        onChange={(e) => handleContactResistanceChange('r_phase', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={formData.contact_resistance?.y_phase || ''}
                        onChange={(e) => handleContactResistanceChange('y_phase', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={formData.contact_resistance?.b_phase || ''}
                        onChange={(e) => handleContactResistanceChange('b_phase', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={formData.contact_resistance?.n_phase || ''}
                        onChange={(e) => handleContactResistanceChange('n_phase', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">* Accepted criteria: {template.contact_resistance_test.acceptance_criteria}</p>
            </div>
            </>
            )}
          </div>
        )}

        {/* ACB/MCCB Section 5: Micrologic Automatic Trip Test */}
        {(equipmentType === 'acb' || equipmentType === 'mccb') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">Section 5</span>
                Micrologic Automatic Trip Test
              </h2>
              <button
                type="button"
                onClick={() => {
                  const toggleKey = equipmentType === 'mccb' ? 'mccb_section_toggles' : 'acb_section_toggles';
                  setFormData(prev => ({
                    ...prev,
                    [toggleKey]: { ...prev[toggleKey], micrologic_trip_test: !prev[toggleKey]?.micrologic_trip_test }
                  }));
                }}
                className={`px-3 py-1 text-sm rounded-lg ${
                  (equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.micrologic_trip_test !== false 
                    ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.micrologic_trip_test !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.micrologic_trip_test !== false && (
              <div className="space-y-6">
                {/* 1. Switchboard Details */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">1. Switchboard Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Report No</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.switchboard_details?.report_no || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            switchboard_details: { ...prev.micrologic_trip_test?.switchboard_details, report_no: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Test Conducted On</label>
                      <DatePicker
                        value={formData.micrologic_trip_test?.switchboard_details?.test_conducted_on || ''}
                        onChange={(val) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            switchboard_details: { ...prev.micrologic_trip_test?.switchboard_details, test_conducted_on: val }
                          }
                        }))}
                        placeholder="Select date"
                        className="h-10 border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.switchboard_details?.location || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            switchboard_details: { ...prev.micrologic_trip_test?.switchboard_details, location: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Panel Name</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.switchboard_details?.panel_name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            switchboard_details: { ...prev.micrologic_trip_test?.switchboard_details, panel_name: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Feeder Name</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.switchboard_details?.feeder_name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            switchboard_details: { ...prev.micrologic_trip_test?.switchboard_details, feeder_name: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Breaker Details */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">2. Breaker Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Product Type</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.breaker_details?.product_type || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            breaker_details: { ...prev.micrologic_trip_test?.breaker_details, product_type: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Manufacturer</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.breaker_details?.manufacturer || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            breaker_details: { ...prev.micrologic_trip_test?.breaker_details, manufacturer: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Rated Current</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.breaker_details?.rated_current || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            breaker_details: { ...prev.micrologic_trip_test?.breaker_details, rated_current: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Trip Unit Details */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">3. Trip Unit Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Release Model</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.trip_unit_details?.release_model || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            trip_unit_details: { ...prev.micrologic_trip_test?.trip_unit_details, release_model: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Release Type</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.trip_unit_details?.release_type || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            trip_unit_details: { ...prev.micrologic_trip_test?.trip_unit_details, release_type: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Serial No</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.trip_unit_details?.serial_no || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            trip_unit_details: { ...prev.micrologic_trip_test?.trip_unit_details, serial_no: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Basic Protection Settings */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">4. Basic Protection Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Long Time Pickup (Ir)</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.protection_settings?.long_time_pickup_ir || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            protection_settings: { ...prev.micrologic_trip_test?.protection_settings, long_time_pickup_ir: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Long Time Delay (Tr)</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.protection_settings?.long_time_delay_tr || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            protection_settings: { ...prev.micrologic_trip_test?.protection_settings, long_time_delay_tr: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Short Time Pickup (Isd)</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.protection_settings?.short_time_pickup_isd || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            protection_settings: { ...prev.micrologic_trip_test?.protection_settings, short_time_pickup_isd: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Short Time Delay (Tsd)</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.protection_settings?.short_time_delay_tsd || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            protection_settings: { ...prev.micrologic_trip_test?.protection_settings, short_time_delay_tsd: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Instantaneous Pickup (Ii)</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.protection_settings?.instantaneous_pickup_ii || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            protection_settings: { ...prev.micrologic_trip_test?.protection_settings, instantaneous_pickup_ii: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Ground Fault Pickup (Ig)</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.protection_settings?.ground_fault_pickup_ig || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            protection_settings: { ...prev.micrologic_trip_test?.protection_settings, ground_fault_pickup_ig: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Ground Fault Delay (Tg)</label>
                      <input
                        type="text"
                        value={formData.micrologic_trip_test?.protection_settings?.ground_fault_delay_tg || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          micrologic_trip_test: {
                            ...prev.micrologic_trip_test,
                            protection_settings: { ...prev.micrologic_trip_test?.protection_settings, ground_fault_delay_tg: e.target.value }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Automatic Test Results */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">5. Automatic Test Results</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 border text-left">Protections</th>
                          <th className="px-3 py-2 border text-center">Injected Current</th>
                          <th className="px-3 py-2 border text-center" colSpan="2">Expected Trip Time</th>
                          <th className="px-3 py-2 border text-center">Actual Trip Time</th>
                          <th className="px-3 py-2 border text-center">Result</th>
                        </tr>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-1 border"></th>
                          <th className="px-3 py-1 border"></th>
                          <th className="px-3 py-1 border text-center text-xs">Min</th>
                          <th className="px-3 py-1 border text-center text-xs">Max</th>
                          <th className="px-3 py-1 border"></th>
                          <th className="px-3 py-1 border"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.micrologic_trip_test?.test_results || [
                          { protection: 'Long time' },
                          { protection: 'Short time' },
                          { protection: 'Instantaneous' },
                          { protection: 'Ground fault' }
                        ]).map((row, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2 border font-medium">{row.protection}</td>
                            <td className="px-3 py-2 border">
                              <input
                                type="text"
                                value={row.injected_current || ''}
                                onChange={(e) => {
                                  const newResults = [...(formData.micrologic_trip_test?.test_results || [])];
                                  if (!newResults[idx]) newResults[idx] = { protection: row.protection };
                                  newResults[idx].injected_current = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    micrologic_trip_test: { ...prev.micrologic_trip_test, test_results: newResults }
                                  }));
                                }}
                                className="w-24 px-2 py-1 border border-slate-200 rounded text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 border">
                              <input
                                type="text"
                                value={row.expected_min_time || ''}
                                onChange={(e) => {
                                  const newResults = [...(formData.micrologic_trip_test?.test_results || [])];
                                  if (!newResults[idx]) newResults[idx] = { protection: row.protection };
                                  newResults[idx].expected_min_time = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    micrologic_trip_test: { ...prev.micrologic_trip_test, test_results: newResults }
                                  }));
                                }}
                                className="w-20 px-2 py-1 border border-slate-200 rounded text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 border">
                              <input
                                type="text"
                                value={row.expected_max_time || ''}
                                onChange={(e) => {
                                  const newResults = [...(formData.micrologic_trip_test?.test_results || [])];
                                  if (!newResults[idx]) newResults[idx] = { protection: row.protection };
                                  newResults[idx].expected_max_time = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    micrologic_trip_test: { ...prev.micrologic_trip_test, test_results: newResults }
                                  }));
                                }}
                                className="w-20 px-2 py-1 border border-slate-200 rounded text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 border">
                              <input
                                type="text"
                                value={row.actual_trip_time || ''}
                                onChange={(e) => {
                                  const newResults = [...(formData.micrologic_trip_test?.test_results || [])];
                                  if (!newResults[idx]) newResults[idx] = { protection: row.protection };
                                  newResults[idx].actual_trip_time = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    micrologic_trip_test: { ...prev.micrologic_trip_test, test_results: newResults }
                                  }));
                                }}
                                className="w-24 px-2 py-1 border border-slate-200 rounded text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 border">
                              <select
                                value={row.result || ''}
                                onChange={(e) => {
                                  const newResults = [...(formData.micrologic_trip_test?.test_results || [])];
                                  if (!newResults[idx]) newResults[idx] = { protection: row.protection };
                                  newResults[idx].result = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    micrologic_trip_test: { ...prev.micrologic_trip_test, test_results: newResults }
                                  }));
                                }}
                                className="w-20 px-2 py-1 border border-slate-200 rounded text-center text-sm"
                              >
                                <option value="">-</option>
                                <option value="PASS">PASS</option>
                                <option value="FAIL">FAIL</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remarks / Description</label>
                  <textarea
                    value={formData.micrologic_trip_test?.remarks || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      micrologic_trip_test: { ...prev.micrologic_trip_test, remarks: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="Enter any additional remarks or observations..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACB/MCCB Section 6: Carbon Test Report */}
        {(equipmentType === 'acb' || equipmentType === 'mccb') && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">Section 6</span>
                Carbon Test Report
              </h2>
              <button
                type="button"
                onClick={() => {
                  const toggleKey = equipmentType === 'mccb' ? 'mccb_section_toggles' : 'acb_section_toggles';
                  setFormData(prev => ({
                    ...prev,
                    [toggleKey]: { ...prev[toggleKey], carbon_test_report: !prev[toggleKey]?.carbon_test_report }
                  }));
                }}
                className={`px-3 py-1 text-sm rounded-lg ${
                  (equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.carbon_test_report !== false 
                    ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.carbon_test_report !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {(equipmentType === 'mccb' ? formData.mccb_section_toggles : formData.acb_section_toggles)?.carbon_test_report !== false && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Upload Carbon Test Images</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setFormData(prev => ({
                              ...prev,
                              carbon_test_report: {
                                ...prev.carbon_test_report,
                                images: [...(prev.carbon_test_report?.images || []), {
                                  name: file.name,
                                  data: ev.target?.result,
                                  uploaded_at: new Date().toISOString()
                                }]
                              }
                            }));
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="hidden"
                      id="carbon-test-images"
                    />
                    <label htmlFor="carbon-test-images" className="cursor-pointer">
                      <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">Click to upload images or drag and drop</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB each</p>
                    </label>
                  </div>
                </div>

                {/* Image Preview Grid */}
                {formData.carbon_test_report?.images && formData.carbon_test_report.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.carbon_test_report.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img.data}
                          alt={img.name}
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              carbon_test_report: {
                                ...prev.carbon_test_report,
                                images: prev.carbon_test_report?.images?.filter((_, i) => i !== idx) || []
                              }
                            }));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle size={16} />
                        </button>
                        <p className="text-xs text-slate-500 mt-1 truncate">{img.name}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={formData.carbon_test_report?.description || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      carbon_test_report: { ...prev.carbon_test_report, description: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="Enter description of carbon test findings..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== VCB SPECIFIC SECTIONS ==================== */}
        
        {/* VCB Section 1: Service Checks */}
        {equipmentType === 'vcb' && template?.service_checks && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Section 1: {template.service_checks.title}
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.section_toggles?.service_checks !== false}
                  onChange={() => handleSectionToggle('service_checks')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Enable Section</span>
              </label>
            </div>
            {formData.section_toggles?.service_checks !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-left font-semibold w-1/3">Description</th>
                      <th className="px-3 py-2 border text-left font-semibold">Observation Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Spring Charging Motor Resistance */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Spring Charging Motor Resistance</td>
                      <td className="px-3 py-2 border">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Voltage (V.AC)"
                            value={formData.vcb_service_checks?.spring_motor_resistance?.voltage || ''}
                            onChange={(e) => handleVCBServiceCheckChange('spring_motor_resistance', 'voltage', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-200 rounded"
                          />
                          <span>/</span>
                          <input
                            type="text"
                            placeholder="Resistance (Ohm)"
                            value={formData.vcb_service_checks?.spring_motor_resistance?.resistance || ''}
                            onChange={(e) => handleVCBServiceCheckChange('spring_motor_resistance', 'resistance', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-200 rounded"
                          />
                        </div>
                      </td>
                    </tr>
                    {/* Closing Coil */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Closing Coil Voltage and Resistance</td>
                      <td className="px-3 py-2 border">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Voltage (V.DC)"
                            value={formData.vcb_service_checks?.closing_coil?.voltage || ''}
                            onChange={(e) => handleVCBServiceCheckChange('closing_coil', 'voltage', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-200 rounded"
                          />
                          <span>/</span>
                          <input
                            type="text"
                            placeholder="Resistance (Ohm)"
                            value={formData.vcb_service_checks?.closing_coil?.resistance || ''}
                            onChange={(e) => handleVCBServiceCheckChange('closing_coil', 'resistance', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-200 rounded"
                          />
                        </div>
                      </td>
                    </tr>
                    {/* Tripping Coil */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Tripping Coil Voltage and Resistance</td>
                      <td className="px-3 py-2 border">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Voltage (V.DC)"
                            value={formData.vcb_service_checks?.tripping_coil?.voltage || ''}
                            onChange={(e) => handleVCBServiceCheckChange('tripping_coil', 'voltage', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-200 rounded"
                          />
                          <span>/</span>
                          <input
                            type="text"
                            placeholder="Resistance (Ohm)"
                            value={formData.vcb_service_checks?.tripping_coil?.resistance || ''}
                            onChange={(e) => handleVCBServiceCheckChange('tripping_coil', 'resistance', e.target.value)}
                            className="w-32 px-2 py-1 border border-slate-200 rounded"
                          />
                        </div>
                      </td>
                    </tr>
                    {/* Counter Reading */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Counter Reading/Anti pumping(K1)</td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          value={formData.vcb_service_checks?.counter_reading || ''}
                          onChange={(e) => handleVCBServiceCheckChange('counter_reading', null, e.target.value)}
                          className="w-40 px-2 py-1 border border-slate-200 rounded"
                        />
                      </td>
                    </tr>
                    {/* Visual Inspection */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Visual Inspection for Damage</td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          placeholder="e.g., No Damage Found"
                          value={formData.vcb_service_checks?.visual_inspection || ''}
                          onChange={(e) => handleVCBServiceCheckChange('visual_inspection', null, e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded"
                        />
                      </td>
                    </tr>
                    {/* Replacement */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Replacement</td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          placeholder="Parts replaced (if any)"
                          value={formData.vcb_service_checks?.replacement || ''}
                          onChange={(e) => handleVCBServiceCheckChange('replacement', null, e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded"
                        />
                      </td>
                    </tr>
                    {/* Thorough Cleaning */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Thorough Cleaning</td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          placeholder="e.g., Yes Done Thoroughly with CRC and Cotton Cloth"
                          value={formData.vcb_service_checks?.thorough_cleaning || ''}
                          onChange={(e) => handleVCBServiceCheckChange('thorough_cleaning', null, e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded"
                        />
                      </td>
                    </tr>
                    {/* Lubrication */}
                    <tr className="border-b">
                      <td className="px-3 py-2 border font-medium">Lubrication of Moving Parts/Coil</td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          placeholder="e.g., Yes Done Isoflex Topaz Grease & Shell Tells 32 Oil"
                          value={formData.vcb_service_checks?.lubrication || ''}
                          onChange={(e) => handleVCBServiceCheckChange('lubrication', null, e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VCB Section 2: Contact Resistance Test */}
        {equipmentType === 'vcb' && template?.contact_resistance_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Section 2: {template.contact_resistance_test.title} (In {template.contact_resistance_test.unit_resistance})
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.section_toggles?.contact_resistance_test !== false}
                  onChange={() => handleSectionToggle('contact_resistance_test')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Enable Section</span>
              </label>
            </div>
            {formData.section_toggles?.contact_resistance_test !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-center font-semibold">Phase</th>
                      <th className="px-3 py-2 border text-center font-semibold">Resistance Measured</th>
                      <th className="px-3 py-2 border text-center font-semibold">Current Injected ({template.contact_resistance_test.unit_current})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['R', 'Y', 'B'].map(phase => (
                      <tr key={phase} className="border-b">
                        <td className="px-3 py-2 border text-center font-medium">{phase}</td>
                        <td className="px-3 py-2 border text-center">
                          <input
                            type="text"
                            value={formData.vcb_contact_resistance?.[phase]?.resistance || ''}
                            onChange={(e) => handleVCBContactResistanceChange(phase, 'resistance', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <input
                            type="text"
                            value={formData.vcb_contact_resistance?.[phase]?.current || ''}
                            onChange={(e) => handleVCBContactResistanceChange(phase, 'current', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">* Acceptance Criteria: {template.contact_resistance_test.acceptance_criteria}</p>
              </div>
            )}
          </div>
        )}

        {/* VCB Section 3: Insulation Resistance Test */}
        {equipmentType === 'vcb' && template?.insulation_resistance_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Section 3: {template.insulation_resistance_test.title}
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.section_toggles?.insulation_resistance_test !== false}
                  onChange={() => handleSectionToggle('insulation_resistance_test')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Enable Section</span>
              </label>
            </div>
            {formData.section_toggles?.insulation_resistance_test !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-left font-semibold">Description</th>
                      <th className="px-3 py-2 border text-center font-semibold">R</th>
                      <th className="px-3 py-2 border text-center font-semibold">Y</th>
                      <th className="px-3 py-2 border text-center font-semibold">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Breaker in Closed Condition Header */}
                    <tr className="bg-slate-50">
                      <td colSpan="4" className="px-3 py-2 border font-semibold text-slate-700">
                        Breaker in Closed Condition
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2 border">IR Value between top to Ground</td>
                      {['R', 'Y', 'B'].map(phase => (
                        <td key={phase} className="px-3 py-2 border text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={formData.vcb_insulation_resistance?.breaker_closed?.ir_top_ground?.[phase] || ''}
                              onChange={(e) => handleVCBInsulationResistanceChange('breaker_closed', 'ir_top_ground', phase, e.target.value)}
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
                            />
                            <span className="text-xs text-slate-500">{template.insulation_resistance_test.unit}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2 border">IR Value between Phase to Phase</td>
                      {['R', 'Y', 'B'].map(phase => (
                        <td key={phase} className="px-3 py-2 border text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={formData.vcb_insulation_resistance?.breaker_closed?.ir_phase_phase?.[phase] || ''}
                              onChange={(e) => handleVCBInsulationResistanceChange('breaker_closed', 'ir_phase_phase', phase, e.target.value)}
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
                            />
                            <span className="text-xs text-slate-500">{template.insulation_resistance_test.unit}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    {/* Breaker in Open Condition Header */}
                    <tr className="bg-slate-50">
                      <td colSpan="4" className="px-3 py-2 border font-semibold text-slate-700">
                        Breaker in Open Condition
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2 border">IR Value between Pole to Pole</td>
                      {['R', 'Y', 'B'].map(phase => (
                        <td key={phase} className="px-3 py-2 border text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={formData.vcb_insulation_resistance?.breaker_open?.ir_pole_pole?.[phase] || ''}
                              onChange={(e) => handleVCBInsulationResistanceChange('breaker_open', 'ir_pole_pole', phase, e.target.value)}
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
                            />
                            <span className="text-xs text-slate-500">{template.insulation_resistance_test.unit}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">* Acceptance Criteria: {template.insulation_resistance_test.acceptance_criteria}</p>
              </div>
            )}
          </div>
        )}

        {/* VCB Section 4: Breaker Timings Test */}
        {equipmentType === 'vcb' && template?.breaker_timings_test && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Section 4: {template.breaker_timings_test.title} (In {template.breaker_timings_test.unit})
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.section_toggles?.breaker_timings_test !== false}
                  onChange={() => handleSectionToggle('breaker_timings_test')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Enable Section</span>
              </label>
            </div>
            {formData.section_toggles?.breaker_timings_test !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-left font-semibold">Phase</th>
                      <th className="px-3 py-2 border text-center font-semibold">R</th>
                      <th className="px-3 py-2 border text-center font-semibold">Y</th>
                      <th className="px-3 py-2 border text-center font-semibold">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.breaker_timings_test.rows.map(row => (
                      <tr key={row.id} className="border-b">
                        <td className="px-3 py-2 border font-medium">{row.label}</td>
                        {['R', 'Y', 'B'].map(phase => (
                          <td key={phase} className="px-3 py-2 border text-center">
                            <input
                              type="text"
                              value={formData.vcb_breaker_timings?.[row.id]?.[phase] || ''}
                              onChange={(e) => handleVCBBreakerTimingsChange(row.id, phase, e.target.value)}
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">* Acceptance Criteria: {template.breaker_timings_test.acceptance_criteria}</p>
              </div>
            )}
          </div>
        )}

        {/* VCB Section 5: Operational Checks */}
        {equipmentType === 'vcb' && template?.operational_checks && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Section 5: {template.operational_checks.title}
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.section_toggles?.operational_checks !== false}
                  onChange={() => handleSectionToggle('operational_checks')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Enable Section</span>
              </label>
            </div>
            {formData.section_toggles?.operational_checks !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse max-w-2xl">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-left font-semibold">Description</th>
                      {template.operational_checks.columns.map(col => (
                        <th key={col} className="px-3 py-2 border text-center font-semibold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {template.operational_checks.rows.map(row => (
                      <tr key={row.id} className="border-b">
                        <td className="px-3 py-2 border font-medium">{row.label}</td>
                        {template.operational_checks.columns.map(col => (
                          <td key={col} className="px-3 py-2 border text-center">
                            <select
                              value={formData.vcb_operational_checks?.[row.id]?.[col.toLowerCase()] || 'OK'}
                              onChange={(e) => handleVCBOperationalChecksChange(row.id, col, e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded text-center"
                            >
                              {template.operational_checks.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* ON/OFF Operation - moved from Service Checks */}
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">ON/OFF Operation</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Count"
                      value={formData.vcb_operational_checks?.onoff_operation?.count || ''}
                      onChange={(e) => handleVCBOperationalChecksChange('onoff_operation', 'count', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-200 rounded"
                    />
                    <span className="text-sm text-slate-500">Operations Done</span>
                    <input
                      type="text"
                      placeholder="e.g., Electrical & Mechanically"
                      value={formData.vcb_operational_checks?.onoff_operation?.method || ''}
                      onChange={(e) => handleVCBOperationalChecksChange('onoff_operation', 'method', e.target.value)}
                      className="flex-1 max-w-md px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VCB Section 6: Functional Checks */}
        {equipmentType === 'vcb' && template?.functional_checks && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Section 6: {template.functional_checks.title}
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.section_toggles?.functional_checks !== false}
                  onChange={() => handleSectionToggle('functional_checks')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Enable Section</span>
              </label>
            </div>
            {formData.section_toggles?.functional_checks !== false && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-left font-semibold">Description</th>
                      <th className="px-3 py-2 border text-center font-semibold">{template.functional_checks.column}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.vcb_functional_checks?.map((check, idx) => (
                      <tr key={check.id || idx} className="border-b">
                        <td className="px-3 py-2 border">{check.item}</td>
                        <td className="px-3 py-2 border text-center">
                          <select
                            value={check.status || 'Checked and Found OK'}
                            onChange={(e) => handleVCBFunctionalCheckChange(idx, 'status', e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded"
                          >
                            {template.functional_checks.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Battery Equipment Details & Test Data */}
        {equipmentType === 'battery' && (
          <div className="space-y-6">
            {/* Battery Equipment Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Equipment Details - Battery</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.battery_details?.location || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_details: { ...prev.battery_details, location: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., Panel Room"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Device Name</label>
                  <input
                    type="text"
                    value={formData.battery_details?.device_name || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_details: { ...prev.battery_details, device_name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., 250 KVA DG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Battery Make</label>
                  <input
                    type="text"
                    value={formData.battery_details?.battery_make || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_details: { ...prev.battery_details, battery_make: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., Exide"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Battery Type</label>
                  <input
                    type="text"
                    value={formData.battery_details?.battery_type || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_details: { ...prev.battery_details, battery_type: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., SMF"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Battery AH</label>
                  <input
                    type="text"
                    value={formData.battery_details?.battery_ah || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_details: { ...prev.battery_details, battery_ah: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., 12V/150AH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">No. of Batteries</label>
                  <input
                    type="number"
                    value={formData.battery_details?.no_of_batteries || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_details: { ...prev.battery_details, no_of_batteries: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., 2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batch Code</label>
                  <input
                    type="text"
                    value={formData.battery_details?.batch_code || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_details: { ...prev.battery_details, batch_code: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., AIB4C302752/2996"
                  />
                </div>
              </div>
            </div>

            {/* Battery Inspection Checklist */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Inspection Checklist</h2>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.battery_section_toggles?.inspection_checklist !== false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      battery_section_toggles: { ...prev.battery_section_toggles, inspection_checklist: e.target.checked }
                    }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Include in PDF</span>
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-left w-12">S.No</th>
                      <th className="px-3 py-2 border text-left">Inspection Item</th>
                      <th className="px-3 py-2 border text-center w-24">Yes</th>
                      <th className="px-3 py-2 border text-center w-24">No</th>
                      <th className="px-3 py-2 border text-center w-24">N/A</th>
                      <th className="px-3 py-2 border text-left w-48">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.battery_inspection_checklist || []).map((item, idx) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 border text-center">{idx + 1}</td>
                        <td className="px-3 py-2 border">{item.item}</td>
                        <td className="px-3 py-2 border text-center">
                          <input
                            type="radio"
                            name={`battery_check_${item.id}`}
                            checked={item.status === 'yes'}
                            onChange={() => {
                              const updated = [...formData.battery_inspection_checklist];
                              updated[idx] = { ...updated[idx], status: 'yes' };
                              setFormData(prev => ({ ...prev, battery_inspection_checklist: updated }));
                            }}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <input
                            type="radio"
                            name={`battery_check_${item.id}`}
                            checked={item.status === 'no'}
                            onChange={() => {
                              const updated = [...formData.battery_inspection_checklist];
                              updated[idx] = { ...updated[idx], status: 'no' };
                              setFormData(prev => ({ ...prev, battery_inspection_checklist: updated }));
                            }}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <input
                            type="radio"
                            name={`battery_check_${item.id}`}
                            checked={item.status === 'na'}
                            onChange={() => {
                              const updated = [...formData.battery_inspection_checklist];
                              updated[idx] = { ...updated[idx], status: 'na' };
                              setFormData(prev => ({ ...prev, battery_inspection_checklist: updated }));
                            }}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-3 py-2 border">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => {
                              const updated = [...formData.battery_inspection_checklist];
                              updated[idx] = { ...updated[idx], remarks: e.target.value };
                              setFormData(prev => ({ ...prev, battery_inspection_checklist: updated }));
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            placeholder="Remarks"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Battery Test Data */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Battery Test Data</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.battery_section_toggles?.test_data !== false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        battery_section_toggles: { ...prev.battery_section_toggles, test_data: e.target.checked }
                      }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">Include in PDF</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const currentData = formData.battery_test_data || [];
                      const newRow = {
                        s_no: currentData.length + 1,
                        resistance: '',
                        voltage: '',
                        status: 'Normal'
                      };
                      setFormData(prev => ({
                        ...prev,
                        battery_test_data: [...currentData, newRow]
                      }));
                    }}
                    className="px-3 py-1.5 bg-lime-600 text-white rounded-lg text-sm hover:bg-lime-700"
                  >
                    + Add Row
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-3 py-2 border text-center w-16">S.No</th>
                      <th className="px-3 py-2 border text-center">Resistance (mΩ)</th>
                      <th className="px-3 py-2 border text-center">Voltage (VDC)</th>
                      <th className="px-3 py-2 border text-center w-32">Status</th>
                      <th className="px-3 py-2 border text-center w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.battery_test_data || []).map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 border text-center">{row.s_no}</td>
                        <td className="px-3 py-2 border">
                          <input
                            type="text"
                            value={row.resistance || ''}
                            onChange={(e) => {
                              const updated = [...formData.battery_test_data];
                              updated[idx] = { ...updated[idx], resistance: e.target.value };
                              setFormData(prev => ({ ...prev, battery_test_data: updated }));
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                            placeholder="e.g., 3.83"
                          />
                        </td>
                        <td className="px-3 py-2 border">
                          <input
                            type="text"
                            value={row.voltage || ''}
                            onChange={(e) => {
                              const updated = [...formData.battery_test_data];
                              updated[idx] = { ...updated[idx], voltage: e.target.value };
                              setFormData(prev => ({ ...prev, battery_test_data: updated }));
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                            placeholder="e.g., 13.45"
                          />
                        </td>
                        <td className="px-3 py-2 border">
                          <select
                            value={row.status || 'Normal'}
                            onChange={(e) => {
                              const updated = [...formData.battery_test_data];
                              updated[idx] = { ...updated[idx], status: e.target.value };
                              setFormData(prev => ({ ...prev, battery_test_data: updated }));
                            }}
                            className={`w-full px-2 py-1 border rounded text-center ${
                              row.status === 'Normal' ? 'bg-green-50 border-green-300 text-green-700' :
                              row.status === 'Warning' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                              'bg-red-50 border-red-300 text-red-700'
                            }`}
                          >
                            <option value="Normal">Normal</option>
                            <option value="Warning">Warning</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.battery_test_data.filter((_, i) => i !== idx);
                              // Renumber s_no
                              const renumbered = updated.map((r, i) => ({ ...r, s_no: i + 1 }));
                              setFormData(prev => ({ ...prev, battery_test_data: renumbered }));
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!formData.battery_test_data || formData.battery_test_data.length === 0) && (
                <p className="text-center text-slate-500 py-4">No test data added. Click "Add Row" to start.</p>
              )}
            </div>
          </div>
        )}

        {/* Remarks & Recommendations Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Remarks & Recommendations</h2>
          
          {/* Overall Result */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Overall Result</label>
            <div className="flex gap-4">
              {['Satisfactory', 'Needs Attention', 'Critical'].map((result) => (
                <label
                  key={result}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.overall_result === result
                      ? result === 'Satisfactory' ? 'bg-green-50 border-green-500 text-green-700'
                      : result === 'Needs Attention' ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                      : 'bg-red-50 border-red-500 text-red-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="overall_result"
                    value={result}
                    checked={formData.overall_result === result}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    formData.overall_result === result 
                      ? result === 'Satisfactory' ? 'border-green-500'
                      : result === 'Needs Attention' ? 'border-yellow-500'
                      : 'border-red-500'
                      : 'border-slate-300'
                  }`}>
                    {formData.overall_result === result && (
                      <div className={`w-2 h-2 rounded-full ${
                        result === 'Satisfactory' ? 'bg-green-500'
                        : result === 'Needs Attention' ? 'bg-yellow-500'
                        : 'bg-red-500'
                      }`} />
                    )}
                  </div>
                  <span className="text-sm font-medium">{result}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Remarks */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter observations and remarks..."
            />
          </div>
          
          {/* Recommendations */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recommendations</label>
            <textarea
              name="recommendations"
              value={formData.recommendations || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter recommendations for maintenance, repairs, or improvements..."
            />
          </div>
        </div>

        {/* Signatures Section - 2 Column Layout (Service Provider / Customer) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Signatures</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Service Provider Signature */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-700 text-center border-b pb-2">SERVICE PROVIDER</h3>
              <p className="text-center text-sm text-slate-600">{formData.service_provider?.company_name || formData.service_company || 'Enerzia Power Solutions'}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="engineer_signature_name"
                    value={formData.engineer_signature_name || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    name="engineer_designation"
                    value={formData.engineer_designation || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Service Engineer"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <DatePicker
                    value={formData.engineer_signature_date || ''}
                    onChange={(val) => handleInputChange({ target: { name: 'engineer_signature_date', value: val } })}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Signature</label>
                  <div className="h-20 border border-dashed border-slate-300 rounded-lg bg-white flex items-center justify-center text-slate-400 text-sm">
                    Signature Area
                  </div>
                </div>
              </div>
            </div>
            
            {/* Customer Signature */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-700 text-center border-b pb-2">CUSTOMER</h3>
              <p className="text-center text-sm text-slate-600">{formData.customer_info?.company_name || formData.customer_name || 'Customer Company'}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="customer_signature_name"
                    value={formData.customer_signature_name || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    name="customer_designation"
                    value={formData.customer_designation || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Plant Manager"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <DatePicker
                    value={formData.customer_signature_date || ''}
                    onChange={(val) => handleInputChange({ target: { name: 'customer_signature_date', value: val } })}
                    placeholder="Select date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Signature</label>
                  <div className="h-20 border border-dashed border-slate-300 rounded-lg bg-white flex items-center justify-center text-slate-400 text-sm">
                    Signature Area
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EquipmentServiceReport;
