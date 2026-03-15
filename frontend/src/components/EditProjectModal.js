/**
 * Edit Project Modal - Project & Services
 * 
 * Reorganized and cleaned up version with:
 * - Clear section groupings
 * - Business Hub integration (Requests & GRN)
 * - No duplicate fields
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, Loader2, Upload, FileText, Trash2, Calendar, Plus, 
  ClipboardList, FileSpreadsheet, Package, Truck, CreditCard, 
  CheckCircle, Clock, AlertTriangle, DollarSign, Building2, User,
  FolderKanban, TrendingUp
} from 'lucide-react';
import { projectsAPI, settingsAPI, departmentTeamAPI } from '../services/api';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const EditProjectModal = ({ isOpen, onClose, onProjectUpdated, project }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({});
  const [workItems, setWorkItems] = useState([]);
  const [isFromBusinessHub, setIsFromBusinessHub] = useState(false); // Track if project came from order
  const excelInputRef = useRef(null);
  
  // Business Hub integration
  const [projectRequests, setProjectRequests] = useState({ material: [], vendor: [], payment: [] });
  const [grnList, setGrnList] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const WORK_ITEM_UNITS = ['Nos', 'Mtr', 'Sqm', 'Sq.ft.', 'Kg', 'Ltr', 'Set', 'Lot', 'Each'];
  const WORK_ITEM_STATUSES = ['Pending', 'In Progress', 'Completed', 'On Hold'];

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [catRes, statusRes, teamRes, clientRes] = await Promise.all([
          settingsAPI.getCategories(),
          settingsAPI.getStatuses(),
          departmentTeamAPI.getTeam('projects'),
          settingsAPI.getDomesticClients(),
        ]);
        setCategories(catRes.data.filter(c => c.is_active));
        setStatuses(statusRes.data.filter(s => s.is_active).sort((a, b) => a.order - b.order));
        setTeamMembers(teamRes.data.filter(e => e.is_active !== false));
        setClients(clientRes.data.filter(c => c.is_active));
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Load project data
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
        status: project.status || 'Need to Start',
        engineer_in_charge: project.engineer_in_charge || '',
        po_amount: project.po_amount || 0,
        invoiced_amount: project.invoiced_amount || 0,
        this_week_billing: project.this_week_billing || 0,
        budget: project.budget || 0,
        actual_expenses: project.actual_expenses || 0,
        weekly_actions: project.weekly_actions || '',
      });
      
      // Initialize work items with completion_percentage
      const items = project.work_items || [{ description: '', quantity: '', unit: 'Nos', status: 'Pending', completion_percentage: 0 }];
      setWorkItems(items.map(item => ({
        ...item,
        completion_percentage: item.completion_percentage || (item.status === 'Completed' ? 100 : 0)
      })));
      
      // Check if project came from Business Hub (order)
      setIsFromBusinessHub(!!project.source_order_id);
      
      // Fetch Business Hub data
      fetchProjectRequests(project.id);
      fetchGRNList(project.id);
    }
  }, [project]);

  // Fetch project requests from Business Hub
  const fetchProjectRequests = async (projectId) => {
    if (!projectId) return;
    setLoadingRequests(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/by-order/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const requests = data.requests || {};
        setProjectRequests({
          material: requests.materials || requests.material || [],
          vendor: requests.vendors || requests.vendor || [],
          payment: requests.payments || requests.payment || []
        });
      }
    } catch (error) {
      console.error('Error fetching project requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch GRN list
  const fetchGRNList = async (projectId) => {
    if (!projectId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/grn?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGrnList(data.grns || []);
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
    }
  };

  // Helpers
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const convertToDateInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Work Items handlers
  const addWorkItem = () => {
    setWorkItems([...workItems, { description: '', quantity: '', unit: 'Nos', status: 'Pending' }]);
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

  // Excel upload for work items
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

          const newWorkItems = jsonData.map((row, idx) => ({
            id: `WI-${Date.now()}-${idx}`,
            description: String(row['Description'] || row['description'] || '').trim(),
            quantity: parseFloat(row['Quantity'] || row['quantity'] || 0) || 0,
            unit: WORK_ITEM_UNITS.includes(row['Unit'] || row['unit']) ? row['Unit'] || row['unit'] : 'Nos',
            status: WORK_ITEM_STATUSES.includes(row['Status'] || row['status']) ? row['Status'] || row['status'] : 'Pending'
          })).filter(item => item.description);

          if (newWorkItems.length > 0) {
            const existingItems = workItems.filter(item => item.description?.trim());
            setWorkItems(existingItems.length > 0 ? [...existingItems, ...newWorkItems] : newWorkItems);
            alert(`Imported ${newWorkItems.length} items from Excel!`);
          } else {
            alert('No valid items found. Ensure Excel has a "Description" column.');
          }
        } catch (parseError) {
          alert('Error parsing Excel file.');
        }
        setUploadingExcel(false);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      alert('Error uploading file');
      setUploadingExcel(false);
    }
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  // Download sample template
  const downloadSampleTemplate = () => {
    const sampleData = [
      { Description: 'Meter Calibration', Quantity: 10, Unit: 'Nos', Status: 'Pending', 'Completion %': 0 },
      { Description: 'Cable Laying Work', Quantity: 500, Unit: 'Mtr', Status: 'Pending', 'Completion %': 0 },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Line Items');
    XLSX.writeFile(workbook, 'work_items_template.xlsx');
  };

  // Calculate savings and completion percentage based on work items
  const savings = (formData.budget || 0) - (formData.actual_expenses || 0);
  
  // Auto-calculate completion percentage from work items
  const calculateCompletionFromWorkItems = () => {
    const validItems = workItems.filter(w => w.description?.trim());
    if (validItems.length === 0) return 0;
    
    const totalCompletion = validItems.reduce((sum, item) => {
      return sum + (parseFloat(item.completion_percentage) || 0);
    }, 0);
    
    return Math.round(totalCompletion / validItems.length);
  };
  
  const completionPercent = calculateCompletionFromWorkItems();

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        work_items: workItems.filter(item => item.description?.trim()),
      };

      await projectsAPI.update(project.id, updateData);
      onProjectUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl m-4 max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-xl">
          <div className="flex items-center gap-3">
            <FolderKanban className="text-white" size={24} />
            <div>
              <h2 className="text-lg font-semibold text-white">{project.pid_no}</h2>
              <p className="text-sm text-slate-300 truncate max-w-md">{project.project_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            
            {/* Section 1: Status & Progress */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <TrendingUp size={16} />
                Status & Progress
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {statuses.length > 0 ? (
                      statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                    ) : (
                      <>
                        <option value="Need to Start">Need to Start</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Invoiced">Invoiced</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="project_date"
                    value={convertToDateInput(formData.project_date)}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Target Completion</label>
                  <input
                    type="date"
                    name="completion_date"
                    value={convertToDateInput(formData.completion_date)}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Progress</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-8 bg-slate-200 rounded-lg overflow-hidden">
                      <div 
                        className={`h-full ${completionPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'} transition-all`}
                        style={{ width: `${Math.min(completionPercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-12">{completionPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Project Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 size={16} />
                Project Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Client</label>
                  <select
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {categories.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Engineer In Charge</label>
                  <select
                    name="engineer_in_charge"
                    value={formData.engineer_in_charge}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select Engineer</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">PO Number</label>
                  <input
                    type="text"
                    name="po_number"
                    value={formData.po_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Financials */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                <DollarSign size={16} />
                Financials
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PO Amount (₹)</label>
                  <input
                    type="number"
                    name="po_amount"
                    value={formData.po_amount}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoiced (₹)</label>
                  <input
                    type="number"
                    name="invoiced_amount"
                    value={formData.invoiced_amount}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Actual Expenses (₹)</label>
                  <input
                    type="number"
                    name="actual_expenses"
                    value={formData.actual_expenses}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-slate-500">This Week Billing</p>
                  <input
                    type="number"
                    name="this_week_billing"
                    value={formData.this_week_billing}
                    onChange={handleChange}
                    min="0"
                    className="w-full text-lg font-bold text-emerald-700 bg-transparent border-none p-0 focus:ring-0"
                  />
                </div>
                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency((formData.po_amount || 0) - (formData.invoiced_amount || 0))}
                  </p>
                </div>
                <div className={`rounded-lg p-3 border ${savings >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs text-slate-500">PID Savings</p>
                  <p className={`text-lg font-bold ${savings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(savings)}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Work Items / Line Items */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                  <ClipboardList size={16} />
                  Work Items ({workItems.filter(w => w.description).length})
                </h3>
                <div className="flex items-center gap-2">
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
                    className="text-xs px-2 py-1.5 text-amber-700 hover:bg-amber-100 rounded-lg flex items-center gap-1"
                  >
                    <FileSpreadsheet size={14} />
                    Template
                  </button>
                  <label
                    htmlFor="excel-upload"
                    className={`text-xs px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg hover:bg-amber-300 cursor-pointer flex items-center gap-1 ${uploadingExcel ? 'opacity-50' : ''}`}
                  >
                    {uploadingExcel ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Upload Excel
                  </label>
                  <button
                    type="button"
                    onClick={addWorkItem}
                    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {workItems.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-amber-200 flex items-start gap-3">
                    <span className="text-xs font-semibold text-amber-600 mt-2">#{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateWorkItem(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="col-span-5 px-2 py-1.5 border border-slate-200 rounded text-sm"
                      />
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateWorkItem(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="col-span-2 px-2 py-1.5 border border-slate-200 rounded text-sm"
                      />
                      <select
                        value={item.unit || 'Nos'}
                        onChange={(e) => updateWorkItem(idx, 'unit', e.target.value)}
                        className="col-span-2 px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                      >
                        {WORK_ITEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <select
                        value={item.status || 'Pending'}
                        onChange={(e) => updateWorkItem(idx, 'status', e.target.value)}
                        className={`col-span-2 px-2 py-1.5 border rounded text-sm ${
                          item.status === 'Completed' ? 'bg-green-50 border-green-300 text-green-700' :
                          item.status === 'In Progress' ? 'bg-blue-50 border-blue-300 text-blue-700' :
                          'bg-white border-slate-200'
                        }`}
                      >
                        {WORK_ITEM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeWorkItem(idx)}
                        className="col-span-1 p-1.5 text-red-500 hover:bg-red-50 rounded"
                        disabled={workItems.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Weekly Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Weekly Notes</label>
              <textarea
                name="weekly_actions"
                value={formData.weekly_actions}
                onChange={handleChange}
                rows={2}
                placeholder="Notes for weekly review..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            {/* Section 6: Business Hub Integration */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-violet-900 mb-4 flex items-center gap-2">
                <ClipboardList size={16} />
                Business Hub Requests
                {loadingRequests && <Loader2 size={14} className="animate-spin text-violet-500" />}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Material Requests */}
                <div className="bg-white rounded-lg p-3 border border-violet-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={16} className="text-amber-600" />
                    <span className="text-xs font-medium text-slate-700">Material ({projectRequests.material?.length || 0})</span>
                  </div>
                  {projectRequests.material?.length > 0 ? (
                    <div className="space-y-1">
                      {projectRequests.material.slice(0, 3).map(req => (
                        <div key={req.id} className="text-xs flex justify-between items-center">
                          <span className="font-mono text-amber-700">{req.request_no || req.request_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>{req.status}</span>
                        </div>
                      ))}
                      {projectRequests.material.length > 3 && (
                        <p className="text-xs text-slate-400">+{projectRequests.material.length - 3} more</p>
                      )}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">None</p>}
                </div>

                {/* Vendor Requests */}
                <div className="bg-white rounded-lg p-3 border border-violet-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={16} className="text-blue-600" />
                    <span className="text-xs font-medium text-slate-700">Vendor ({projectRequests.vendor?.length || 0})</span>
                  </div>
                  {projectRequests.vendor?.length > 0 ? (
                    <div className="space-y-1">
                      {projectRequests.vendor.slice(0, 3).map(req => (
                        <div key={req.id} className="text-xs flex justify-between items-center">
                          <span className="font-mono text-blue-700">{req.request_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>{req.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">None</p>}
                </div>

                {/* Payment Requests */}
                <div className="bg-white rounded-lg p-3 border border-violet-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard size={16} className="text-green-600" />
                    <span className="text-xs font-medium text-slate-700">Payment ({projectRequests.payment?.length || 0})</span>
                  </div>
                  {projectRequests.payment?.length > 0 ? (
                    <div className="space-y-1">
                      {projectRequests.payment.slice(0, 3).map(req => (
                        <div key={req.id} className="text-xs flex justify-between items-center">
                          <span className="font-mono text-green-700">{req.request_number}</span>
                          <span className="text-green-600 font-medium">{formatCurrency(req.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">None</p>}
                </div>
              </div>
              
              <p className="text-xs text-violet-600 mt-3">
                Raise requests from Business Hub → Project Management
              </p>
            </div>

            {/* Section 7: GRN Status */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-teal-900 mb-4 flex items-center gap-2">
                <CheckCircle size={16} />
                Goods Received Notes (GRN)
              </h3>
              
              {grnList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {grnList.map(grn => (
                    <div key={grn.id} className="bg-white border border-teal-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm font-medium text-teal-700">{grn.grn_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          grn.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {grn.status === 'received' ? 'Received' : 'Partial'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        PO: {grn.po_number} • {grn.items?.length || 0} items
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle size={20} className="mx-auto text-teal-300 mb-2" />
                  <p className="text-sm text-teal-600">No goods received yet</p>
                  <p className="text-xs text-slate-400">Create GRN from Business Hub → GRN Management</p>
                </div>
              )}
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;
