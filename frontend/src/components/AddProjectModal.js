import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2, Upload, FileText, Trash2, Calendar, ClipboardList, FileSpreadsheet } from 'lucide-react';
import { projectsAPI, settingsAPI, departmentTeamAPI } from '../services/api';
import * as XLSX from 'xlsx';

const AddProjectModal = ({ isOpen, onClose, onProjectAdded, prefillData = null }) => {
  const [loading, setLoading] = useState(false);
  const [loadingPID, setLoadingPID] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [financialYear, setFinancialYear] = useState('');
  const [poFile, setPOFile] = useState(null);
  const [poFilePath, setPOFilePath] = useState('');
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const excelInputRef = useRef(null);
  const [formData, setFormData] = useState({
    pid_no: '',
    category: 'PSS',
    po_number: '',
    client: '',
    location: '',
    project_name: '',
    vendor: '',
    status: 'Need to Start',
    engineer_in_charge: '',
    project_date: '',
    completion_date: '',
    po_amount: 0,
    balance: 0,
    invoiced_amount: 0,
    completion_percentage: 0,
    this_week_billing: 0,
    budget: 0,
    actual_expenses: 0,
    weekly_actions: '',
    work_items: [{ description: '', quantity: '', unit: 'Nos', status: 'Pending', assigned_to: '' }],
    linked_order_id: '',
    linked_order_no: '',
  });

  // Work Items / Line Items helpers
  const WORK_ITEM_UNITS = ['Nos', 'Mtr', 'Sqm', 'Sq.ft.', 'Kg', 'Ltr', 'Set', 'Lot', 'Each', 'Pair', 'Box'];
  const WORK_ITEM_STATUSES = ['Pending', 'In Progress', 'Completed', 'On Hold'];

  const addWorkItem = () => {
    setFormData({
      ...formData,
      work_items: [...formData.work_items, { description: '', quantity: '', unit: 'Nos', status: 'Pending', assigned_to: '' }]
    });
  };

  const updateWorkItem = (index, field, value) => {
    const updated = [...formData.work_items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, work_items: updated });
  };

  const removeWorkItem = (index) => {
    if (formData.work_items.length > 1) {
      setFormData({
        ...formData,
        work_items: formData.work_items.filter((_, i) => i !== index)
      });
    }
  };

  // Excel upload handler for work items
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingExcel(true);
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const binaryStr = evt.target.result;
          const workbook = XLSX.read(binaryStr, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            alert('No data found in the Excel file');
            setUploadingExcel(false);
            return;
          }

          // Map Excel columns to work item fields
          // Expected columns: Description, Quantity, Unit (or Qty, UOM, etc.)
          const newWorkItems = jsonData.map((row, idx) => {
            const description = row['Description'] || row['description'] || row['Item'] || row['item'] || row['Work'] || row['work'] || row['Name'] || row['name'] || '';
            const quantity = row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || row['QTY'] || 0;
            const unit = row['Unit'] || row['unit'] || row['UOM'] || row['uom'] || row['Units'] || 'Nos';
            const status = row['Status'] || row['status'] || 'Pending';
            
            return {
              id: `WI-${Date.now()}-${idx}`,
              description: String(description).trim(),
              quantity: parseFloat(quantity) || 0,
              unit: WORK_ITEM_UNITS.includes(unit) ? unit : 'Nos',
              status: WORK_ITEM_STATUSES.includes(status) ? status : 'Pending',
              assigned_to: row['Assigned To'] || row['assigned_to'] || ''
            };
          }).filter(item => item.description); // Filter out empty rows

          if (newWorkItems.length === 0) {
            alert('No valid work items found. Please ensure your Excel has a "Description" column.');
            setUploadingExcel(false);
            return;
          }

          // Add imported items to existing work items (or replace if current is empty)
          const existingItems = formData.work_items.filter(item => item.description.trim() !== '');
          setFormData({
            ...formData,
            work_items: existingItems.length > 0 
              ? [...existingItems, ...newWorkItems]
              : newWorkItems
          });

          alert(`Successfully imported ${newWorkItems.length} line items from Excel!`);
        } catch (parseError) {
          console.error('Error parsing Excel:', parseError);
          alert('Error parsing Excel file. Please check the file format.');
        }
        setUploadingExcel(false);
      };
      reader.onerror = () => {
        alert('Error reading file');
        setUploadingExcel(false);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error uploading Excel:', error);
      alert('Error uploading Excel file');
      setUploadingExcel(false);
    }
    
    // Reset file input
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
    }
  };

  // Download sample Excel template
  const downloadSampleTemplate = () => {
    const sampleData = [
      { Description: 'Meter Calibration', Quantity: 10, Unit: 'Nos', Status: 'Pending' },
      { Description: 'Cable Laying Work', Quantity: 500, Unit: 'Mtr', Status: 'Pending' },
      { Description: 'Panel Installation', Quantity: 2, Unit: 'Set', Status: 'Pending' },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Line Items');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Description
      { wch: 10 }, // Quantity
      { wch: 10 }, // Unit
      { wch: 12 }, // Status
    ];
    
    XLSX.writeFile(workbook, 'LineItems_Template.xlsx');
  };

  // Date conversion helpers
  const convertToDateInput = (ddmmyyyy) => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
  };

  const convertFromDateInput = (yyyymmdd) => {
    if (!yyyymmdd) return '';
    const parts = yyyymmdd.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  };

  const handleDateChange = (e, fieldName) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      [fieldName]: convertFromDateInput(value),
    });
  };

  // Fetch categories, statuses, team members (from projects department), clients, and vendors on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [catRes, statusRes, teamRes, clientRes, vendorRes] = await Promise.all([
          settingsAPI.getCategories(),
          settingsAPI.getStatuses(),
          departmentTeamAPI.getTeam('projects'),
          settingsAPI.getClients(),
          settingsAPI.getVendors(),
        ]);
        setCategories(catRes.data.filter(c => c.is_active));
        setStatuses(statusRes.data.filter(s => s.is_active).sort((a, b) => a.order - b.order));
        setTeamMembers(teamRes.data.filter(e => e.is_active !== false));
        setClients(clientRes.data.filter(c => c.is_active));
        setVendors(vendorRes.data.filter(v => v.is_active));
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Pre-fill form data when prefillData is provided (from Order Lifecycle)
  useEffect(() => {
    if (isOpen && prefillData) {
      setFormData(prev => ({
        ...prev,
        client: prefillData.client || prefillData.customer_name || '',
        location: prefillData.location || prefillData.customer_address || '',
        project_name: prefillData.project_name || `Project for ${prefillData.order_no || ''}`,
        po_number: prefillData.po_number || prefillData.order_no || '',
        po_amount: prefillData.po_amount || prefillData.order_value || prefillData.total_amount || 0,
        budget: prefillData.budget || prefillData.execution_budget || 0,
        linked_order_id: prefillData.order_id || prefillData.id || '',
        linked_order_no: prefillData.order_no || '',
        category: prefillData.category || prefillData.project_type || 'PSS',
      }));
    }
  }, [isOpen, prefillData]);

  useEffect(() => {
    if (isOpen && !formData.pid_no) {
      // Auto-detect financial year
      const today = new Date();
      const month = today.getMonth() + 1; // 1-12
      let year1, year2;
      if (month >= 4) { // April onwards
        year1 = today.getFullYear() % 100;
        year2 = (today.getFullYear() + 1) % 100;
      } else { // Jan-March
        year1 = (today.getFullYear() - 1) % 100;
        year2 = today.getFullYear() % 100;
      }
      const fy = `${year1.toString().padStart(2, '0')}-${year2.toString().padStart(2, '0')}`;
      setFinancialYear(fy);
      fetchNextPID(fy);
      
      // Set today's date as default project date in DD/MM/YYYY format
      const day = String(today.getDate()).padStart(2, '0');
      const monthStr = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      setFormData(prev => ({ ...prev, project_date: `${day}/${monthStr}/${year}` }));
    }
  }, [isOpen]);

  const fetchNextPID = async (fy = financialYear) => {
    try {
      setLoadingPID(true);
      const response = await projectsAPI.getNextPID(fy);
      setFormData(prev => ({ ...prev, pid_no: response.data.next_pid }));
      if (response.data.financial_year) {
        setFinancialYear(response.data.financial_year);
      }
    } catch (error) {
      console.error('Error fetching next PID:', error);
    } finally {
      setLoadingPID(false);
    }
  };

  const handleFinancialYearChange = (e) => {
    const newFY = e.target.value;
    setFinancialYear(newFY);
    // Auto-generate PID when FY changes (support partial input like "24-25" or just typing)
    // Trigger when we have valid format XX-XX
    if (newFY && newFY.match(/^\d{2}-\d{2}$/)) {
      fetchNextPID(newFY);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      // Allow empty string or convert to number
      setFormData({
        ...formData,
        [name]: value === '' ? '' : parseFloat(value) || 0,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      alert(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      e.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }

    setPOFile(file);
    
    // Upload file immediately
    try {
      setUploadingFile(true);
      const response = await projectsAPI.uploadPO(file);
      setPOFilePath(response.data.path);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
      setPOFile(null);
      e.target.value = '';
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setPOFile(null);
    setPOFilePath('');
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Filter out empty work items and convert empty strings to 0 for number fields
      const filteredWorkItems = formData.work_items.filter(item => item.description.trim() !== '');
      
      const dataToSend = {
        ...formData,
        po_amount: formData.po_amount === '' ? 0 : formData.po_amount,
        balance: formData.balance === '' ? 0 : formData.balance,
        invoiced_amount: formData.invoiced_amount === '' ? 0 : formData.invoiced_amount,
        completion_percentage: formData.completion_percentage === '' ? 0 : formData.completion_percentage,
        this_week_billing: formData.this_week_billing === '' ? 0 : formData.this_week_billing,
        budget: formData.budget === '' ? 0 : formData.budget,
        actual_expenses: formData.actual_expenses === '' ? 0 : formData.actual_expenses,
        po_attachment: poFilePath || null,
        work_items: filteredWorkItems.map((item, idx) => ({
          ...item,
          id: `WI-${Date.now()}-${idx}`,
          quantity: item.quantity === '' ? 0 : parseFloat(item.quantity) || 0,
        })),
      };
      
      await projectsAPI.create(dataToSend);
      onProjectAdded();
      onClose();
      // Reset form
      setFormData({
        pid_no: '',
        category: 'PSS',
        po_number: '',
        client: '',
        location: '',
        project_name: '',
        vendor: '',
        status: 'Need to Start',
        engineer_in_charge: '',
        project_date: '',
        completion_date: '',
        po_amount: 0,
        balance: 0,
        invoiced_amount: 0,
        completion_percentage: 0,
        this_week_billing: 0,
        budget: 0,
        actual_expenses: 0,
        weekly_actions: '',
        work_items: [{ description: '', quantity: '', unit: 'Nos', status: 'Pending', assigned_to: '' }],
      });
      setPOFile(null);
      setPOFilePath('');
      fetchNextPID();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Add New Project
          </h2>
          <button
            data-testid="close-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PID Number & Dates Row */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-3">
                {/* Financial Year */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={financialYear}
                    onChange={handleFinancialYearChange}
                    placeholder="25-26"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                
                {/* Complete PID */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PID Number <span className="text-red-500">*</span></label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      name="pid_no"
                      data-testid="pid-input"
                      value={formData.pid_no}
                      onChange={handleChange}
                      required
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => fetchNextPID(financialYear)}
                      disabled={loadingPID}
                      className="px-2 py-1.5 bg-slate-900 text-white rounded text-xs hover:bg-slate-800 disabled:opacity-50"
                    >
                      {loadingPID ? '...' : 'Auto'}
                    </button>
                  </div>
                </div>
                
                {/* Project Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <Calendar size={12} className="inline mr-1" /> Start Date
                  </label>
                  <input
                    type="date"
                    name="project_date"
                    data-testid="project-date-input"
                    value={formData.project_date ? convertToDateInput(formData.project_date) : ''}
                    onChange={(e) => handleDateChange(e, 'project_date')}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                
                {/* Completion Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    <Calendar size={12} className="inline mr-1" /> Target Completion
                  </label>
                  <input
                    type="date"
                    name="completion_date"
                    data-testid="completion-date-input"
                    value={formData.completion_date ? convertToDateInput(formData.completion_date) : ''}
                    onChange={(e) => handleDateChange(e, 'completion_date')}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                data-testid="category-select"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <option key={cat.id} value={cat.code}>{cat.code} - {cat.name}</option>
                  ))
                ) : (
                  <>
                    <option value="PSS">PSS</option>
                    <option value="AS">AS</option>
                    <option value="OSS">OSS</option>
                    <option value="CS">CS</option>
                  </>
                )}
              </select>
            </div>

            {/* PO Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
              <input
                type="text"
                name="po_number"
                data-testid="po-number-input"
                value={formData.po_number}
                onChange={handleChange}
                placeholder="e.g., PO642147"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* PO Attachment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Attachment</label>
              {!poFile ? (
                <div className="relative">
                  <input
                    type="file"
                    data-testid="po-attachment-input"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                    className="hidden"
                    id="po-file-input"
                  />
                  <label
                    htmlFor="po-file-input"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Choose File
                      </>
                    )}
                  </label>
                  <p className="text-xs text-slate-500 mt-1">PDF, Word, or Images (max 10MB)</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <FileText size={16} className="text-green-600" />
                  <span className="text-sm text-green-800 flex-1 truncate">{poFile.name}</span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                data-testid="status-select"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                {statuses.length > 0 ? (
                  statuses.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Need to Start">Need to Start</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Partially Invoiced">Partially Invoiced</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>

            {/* Client */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              {clients.length > 0 ? (
                <select
                  name="client"
                  data-testid="client-input"
                  value={formData.client}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">Select Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="client"
                  data-testid="client-input"
                  value={formData.client}
                  onChange={handleChange}
                  required
                  placeholder="e.g., JLL - Hexaware"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                data-testid="location-input"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="e.g., Chennai"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              {vendors.length > 0 ? (
                <select
                  name="vendor"
                  data-testid="vendor-input"
                  value={formData.vendor}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="vendor"
                  data-testid="vendor-input"
                  value={formData.vendor}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Enerzia"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              )}
            </div>

            {/* Project Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="project_name"
                data-testid="project-name-input"
                value={formData.project_name}
                onChange={handleChange}
                required
                placeholder="e.g., Electrical system testing activity"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Team Member in Charge */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Team Member in Charge <span className="text-red-500">*</span>
              </label>
              {teamMembers.length > 0 ? (
                <select
                  name="engineer_in_charge"
                  data-testid="engineer-input"
                  value={formData.engineer_in_charge}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">Select Team Member</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}{member.designation ? ` (${member.designation})` : ''}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="engineer_in_charge"
                  data-testid="engineer-input"
                  value={formData.engineer_in_charge}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Mr. Pradeep"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              )}
            </div>

            {/* Financial Fields */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Amount (₹)</label>
              <input
                type="number"
                name="po_amount"
                data-testid="po-amount-input"
                value={formData.po_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Balance (₹)</label>
              <input
                type="number"
                name="balance"
                data-testid="balance-input"
                value={formData.balance}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoiced Amount (₹)</label>
              <input
                type="number"
                name="invoiced_amount"
                data-testid="invoiced-amount-input"
                value={formData.invoiced_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">This Week Billing (₹)</label>
              <input
                type="number"
                name="this_week_billing"
                data-testid="week-billing-input"
                value={formData.this_week_billing}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Budget & Expenses */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget (₹)</label>
              <input
                type="number"
                name="budget"
                data-testid="budget-input"
                value={formData.budget}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actual Expenses (₹)</label>
              <input
                type="number"
                name="actual_expenses"
                data-testid="expenses-input"
                value={formData.actual_expenses}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Completion Percentage */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Completion Percentage (0-100)
              </label>
              <input
                type="number"
                name="completion_percentage"
                data-testid="completion-input"
                value={formData.completion_percentage}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Weekly Actions */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Weekly Actions / Notes
              </label>
              <textarea
                name="weekly_actions"
                data-testid="weekly-actions-input"
                value={formData.weekly_actions}
                onChange={handleChange}
                rows="3"
                placeholder="Enter actions to be taken..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Work Summary / Line Items */}
            <div className="md:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ClipboardList size={16} />
                  Work Summary / Line Items
                </h3>
                <div className="flex items-center gap-2">
                  {/* Excel Upload */}
                  <input
                    type="file"
                    ref={excelInputRef}
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="text-xs px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center gap-1"
                    title="Download sample Excel template"
                  >
                    <FileSpreadsheet size={14} />
                    Template
                  </button>
                  <label
                    htmlFor="excel-upload"
                    className={`text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium flex items-center gap-1 cursor-pointer ${uploadingExcel ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingExcel ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Upload Excel
                  </label>
                  <button
                    type="button"
                    onClick={addWorkItem}
                    className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>
              </div>
              
              {/* Help text */}
              <p className="text-xs text-slate-500 mb-3">
                Upload Excel with columns: Description, Quantity, Unit (Nos/Mtr/Sqm/etc.), Status
              </p>
              
              <div className="space-y-3">
                {formData.work_items.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">Item #{idx + 1}</span>
                      {formData.work_items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWorkItem(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            if (e.target.value.length <= 500) {
                              updateWorkItem(idx, 'description', e.target.value);
                            }
                          }}
                          placeholder="Description of work item (max 500 characters)"
                          rows="2"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm resize-none"
                        />
                        <div className="text-xs text-slate-400 text-right">{(item.description || '').length}/500</div>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-4">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateWorkItem(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-4">
                          <select
                            value={item.unit}
                            onChange={(e) => updateWorkItem(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                          >
                            {WORK_ITEM_UNITS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <select
                            value={item.status}
                            onChange={(e) => updateWorkItem(idx, 'status', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                          >
                            {WORK_ITEM_STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                These line items will be used in Planning & Execution and Work Completion reports.
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-project-btn"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
