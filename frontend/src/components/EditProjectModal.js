import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Upload, FileText, Trash2, ExternalLink, Calendar, Plus, ClipboardList, FileSpreadsheet } from 'lucide-react';
import { projectsAPI, settingsAPI, departmentTeamAPI } from '../services/api';
import * as XLSX from 'xlsx';

const EditProjectModal = ({ isOpen, onClose, onProjectUpdated, project }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [poFile, setPOFile] = useState(null);
  const [poFilePath, setPOFilePath] = useState('');
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({});
  const excelInputRef = useRef(null);

  // Fetch settings on mount
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

  useEffect(() => {
    if (project) {
      setFormData({
        category: project.category || 'PSS',
        po_number: project.po_number || '',
        project_date: project.project_date || '',
        completion_date: project.completion_date || '',
        client: project.client || '',
        location: project.location || '',
        project_name: project.project_name || '',
        vendor: project.vendor || '',
        status: project.status || 'Need to Start',
        engineer_in_charge: project.engineer_in_charge || '',
        po_amount: project.po_amount || 0,
        balance: project.balance || 0,
        invoiced_amount: project.invoiced_amount || 0,
        completion_percentage: project.completion_percentage || 0,
        this_week_billing: project.this_week_billing || 0,
        budget: project.budget || 0,
        actual_expenses: project.actual_expenses || 0,
        weekly_actions: project.weekly_actions || '',
      });
      // Set work items / line items
      setWorkItems(project.work_items || [{ description: '', quantity: '', unit: 'Nos', status: 'Pending', assigned_to: '' }]);
      // Set existing PO attachment
      setPOFilePath(project.po_attachment || '');
      setPOFile(null);
    }
  }, [project]);

  // Work Items / Line Items state and handlers
  const [workItems, setWorkItems] = useState([]);
  const WORK_ITEM_UNITS = ['Nos', 'Mtr', 'Sqm', 'Sq.ft.', 'Kg', 'Ltr', 'Set', 'Lot', 'Each', 'Pair', 'Box'];
  const WORK_ITEM_STATUSES = ['Pending', 'In Progress', 'Completed', 'On Hold'];

  const addWorkItem = () => {
    setWorkItems([...workItems, { description: '', quantity: '', unit: 'Nos', status: 'Pending', assigned_to: '' }]);
  };

  const updateWorkItem = (index, field, value) => {
    const updated = [...workItems];
    updated[index] = { ...updated[index], [field]: value };
    setWorkItems(updated);
  };

  const removeWorkItem = (index) => {
    if (workItems.length > 1) {
      setWorkItems(workItems.filter((_, i) => i !== index));
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
          }).filter(item => item.description);

          if (newWorkItems.length === 0) {
            alert('No valid work items found. Please ensure your Excel has a "Description" column.');
            setUploadingExcel(false);
            return;
          }

          // Add imported items to existing work items (or replace if current is empty)
          const existingItems = workItems.filter(item => item.description && item.description.trim() !== '');
          setWorkItems(existingItems.length > 0 
            ? [...existingItems, ...newWorkItems]
            : newWorkItems
          );

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

  const getFileUrl = (path) => {
    if (!path) return '';
    return `${process.env.REACT_APP_BACKEND_URL}/api${path}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Convert empty strings to 0 for number fields
      const dataToSend = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value === '' && ['po_amount', 'balance', 'invoiced_amount', 'completion_percentage', 'this_week_billing', 'budget', 'actual_expenses'].includes(key)) {
          dataToSend[key] = 0;
        } else {
          dataToSend[key] = value;
        }
      });
      
      // Add PO attachment if changed
      if (poFilePath !== project.po_attachment) {
        dataToSend.po_attachment = poFilePath || null;
      }
      
      // Add work items (filter out empty ones and ensure proper format)
      const filteredWorkItems = workItems.filter(item => item.description && item.description.trim() !== '');
      dataToSend.work_items = filteredWorkItems.map((item, idx) => ({
        ...item,
        id: item.id || `WI-${Date.now()}-${idx}`,
        quantity: item.quantity === '' ? 0 : parseFloat(item.quantity) || 0,
      }));
      
      await projectsAPI.update(project.id, dataToSend);
      onProjectUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  const profitLoss = (formData.budget || 0) - (formData.actual_expenses || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Edit Project
            </h2>
            <p className="text-sm text-slate-500 mt-1">{project.pid_no}</p>
          </div>
          <button
            data-testid="close-edit-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status & Completion */}
            <div className="md:col-span-2 bg-sky-50 border border-sky-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-sky-900 mb-3">Quick Update</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    data-testid="edit-status-select"
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar size={14} className="inline mr-1" /> Project Date
                  </label>
                  <input
                    type="date"
                    name="project_date"
                    data-testid="edit-project-date"
                    value={formData.project_date ? convertToDateInput(formData.project_date) : ''}
                    onChange={(e) => handleDateChange(e, 'project_date')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar size={14} className="inline mr-1" /> Target Completion
                  </label>
                  <input
                    type="date"
                    name="completion_date"
                    data-testid="edit-completion-date"
                    value={formData.completion_date ? convertToDateInput(formData.completion_date) : ''}
                    onChange={(e) => handleDateChange(e, 'completion_date')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Completion % (0-100)
                  </label>
                  <input
                    type="number"
                    name="completion_percentage"
                    data-testid="edit-completion-input"
                    value={formData.completion_percentage}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Work Summary / Line Items */}
            <div className="md:col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
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
                    id="edit-excel-upload"
                    data-testid="edit-excel-upload-input"
                  />
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="text-xs px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center gap-1"
                    title="Download sample Excel template"
                    data-testid="download-template-btn"
                  >
                    <FileSpreadsheet size={14} />
                    Template
                  </button>
                  <label
                    htmlFor="edit-excel-upload"
                    className={`text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium flex items-center gap-1 cursor-pointer ${uploadingExcel ? 'opacity-50 pointer-events-none' : ''}`}
                    data-testid="upload-excel-btn"
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
                    className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-1"
                    data-testid="add-work-item-btn"
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>
              </div>
              
              {/* Help text */}
              <p className="text-xs text-emerald-600 mb-3">
                Upload Excel with columns: Description, Quantity, Unit (Nos/Mtr/Sqm/etc.), Status
              </p>
              
              {workItems.length > 0 ? (
                <div className="space-y-3">
                  {workItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-600">Item #{idx + 1}</span>
                        {workItems.length > 1 && (
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
                            value={item.description || ''}
                            onChange={(e) => {
                              if (e.target.value.length <= 500) {
                                updateWorkItem(idx, 'description', e.target.value);
                              }
                            }}
                            placeholder="Work description (max 500 characters)"
                            rows="2"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm resize-none"
                          />
                          <div className="text-xs text-slate-400 text-right">{(item.description || '').length}/500</div>
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <label className="text-xs text-slate-500">Qty</label>
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateWorkItem(idx, 'quantity', e.target.value)}
                              placeholder="Qty"
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                            />
                          </div>
                          <div className="col-span-4">
                            <label className="text-xs text-slate-500">Unit</label>
                            <select
                              value={item.unit || 'Nos'}
                              onChange={(e) => updateWorkItem(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                            >
                              {WORK_ITEM_UNITS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-4">
                            <label className="text-xs text-slate-500">Status</label>
                            <select
                              value={item.status || 'Pending'}
                              onChange={(e) => updateWorkItem(idx, 'status', e.target.value)}
                              className={`w-full px-2 py-1.5 border rounded text-sm ${
                                item.status === 'Completed' ? 'bg-green-50 border-green-300 text-green-700' :
                                item.status === 'In Progress' ? 'bg-blue-50 border-blue-300 text-blue-700' :
                                item.status === 'On Hold' ? 'bg-amber-50 border-amber-300 text-amber-700' :
                                'bg-white border-slate-200'
                              }`}
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
              ) : (
                <p className="text-sm text-emerald-700 text-center py-3">No work items yet. Add one above.</p>
              )}
              <p className="text-xs text-emerald-600 mt-2">
                These items are used in Planning & Execution and transferred to Work Completion reports.
              </p>
            </div>

            {/* Weekly Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Weekly Notes
              </label>
              <textarea
                name="weekly_actions"
                data-testid="edit-weekly-actions"
                value={formData.weekly_actions}
                onChange={handleChange}
                rows="2"
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Budget & Expenses */}
            <div className="md:col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-emerald-900 mb-3">Budget vs Actual</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    name="budget"
                    data-testid="edit-budget-input"
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
                    data-testid="edit-expenses-input"
                    value={formData.actual_expenses}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PID Savings (₹)</label>
                  <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${profitLoss >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    ₹{profitLoss.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Fields */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Amount (₹)</label>
              <input
                type="number"
                name="po_amount"
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
                value={formData.this_week_billing}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Other Fields */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
              <input
                type="text"
                name="po_number"
                value={formData.po_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* PO Attachment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Attachment</label>
              {!poFilePath ? (
                <div className="relative">
                  <input
                    type="file"
                    data-testid="edit-po-attachment-input"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                    className="hidden"
                    id="edit-po-file-input"
                  />
                  <label
                    htmlFor="edit-po-file-input"
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
                  <span className="text-sm text-green-800 flex-1 truncate">
                    {poFile ? poFile.name : poFilePath.split('/').pop()}
                  </span>
                  <a
                    href={getFileUrl(poFilePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                    title="View file"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
              {clients.length > 0 ? (
                <select
                  name="client"
                  value={formData.client}
                  onChange={handleChange}
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
                  value={formData.client}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              {vendors.length > 0 ? (
                <select
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
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
                  value={formData.vendor}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
              <input
                type="text"
                name="project_name"
                value={formData.project_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Team Member in Charge</label>
              {teamMembers.length > 0 ? (
                <select
                  name="engineer_in_charge"
                  value={formData.engineer_in_charge}
                  onChange={handleChange}
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
                  value={formData.engineer_in_charge}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              )}
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
              data-testid="save-project-btn"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
