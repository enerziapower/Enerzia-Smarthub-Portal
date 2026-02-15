import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Eye, X, RefreshCw, FileText, 
  Phone, Mail, MapPin, Calendar, DollarSign, User, Building2,
  ChevronDown, Filter, ArrowRight, Download, FileSpreadsheet, Upload
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState(null);
  const [viewingEnquiry, setViewingEnquiry] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    quoted: 0,
    accepted: 0,
    pipeline_value: 0
  });
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    target_date: '',
    company_name: '',
    customer_id: '',
    location: '',
    description: '',
    value: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    remarks: '',
    category: '',
    assigned_to: '',
    department: '',
    priority: '',
    status: 'new'
  });

  const statuses = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
    { value: 'price_enquiry', label: 'Price Enquiry', color: 'bg-cyan-100 text-cyan-700' },
    { value: 'site_visit_needed', label: 'Site Visit Needed', color: 'bg-orange-100 text-orange-700' },
    { value: 'site_visited', label: 'Site Visited', color: 'bg-purple-100 text-purple-700' },
    { value: 'under_progress', label: 'Under Progress', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'quoted', label: 'Quoted', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'negotiation', label: 'Negotiation', color: 'bg-pink-100 text-pink-700' },
    { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
    { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
    { value: 'invoiced', label: 'Invoiced', color: 'bg-emerald-100 text-emerald-700' },
  ];

  const priorities = [
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
  ];

  const categories = [
    { value: 'PSS', label: 'PSS - Project & Services' },
    { value: 'AS', label: 'AS - Asset Services' },
    { value: 'OSS', label: 'OSS - Other Sales & Services' },
    { value: 'CS', label: 'CS - Commercial Sales' },
    { value: 'DOM_LIGHTING', label: 'Domestic Lighting' },
    { value: 'EXPORTS', label: 'Exports' },
  ];

  const departments = [
    { code: 'PROJECTS', name: 'Projects & Services' },
    { code: 'SALES', name: 'Sales & Marketing' },
    { code: 'ACCOUNTS', name: 'Accounts' },
    { code: 'PURCHASE', name: 'Purchase' },
    { code: 'EXPORTS', name: 'Exports' },
    { code: 'FINANCE', name: 'Finance' },
    { code: 'HR', name: 'HR & Admin' },
    { code: 'OPERATIONS', name: 'Operations' },
  ];

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/sales/enquiries?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch enquiries');
      const data = await response.json();
      setEnquiries(data.enquiries || []);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sales/enquiries/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Fetch Domestic Customers from Settings API
      const response = await fetch(`${API_URL}/api/settings/clients?customer_type=domestic`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Response is a direct array of clients
        const clientsList = Array.isArray(data) ? data : (data.clients || []);
        setCustomers(clientsList);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.users || data || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    fetchStats();
    fetchCustomers();
    fetchTeamMembers();
  }, [fetchEnquiries]);

  // Filter team members by selected department
  const filteredTeamMembers = useMemo(() => {
    if (!formData.department) return [];
    return teamMembers.filter(member => {
      const memberDept = (member.department || '').toUpperCase();
      const selectedDept = formData.department.toUpperCase();
      // Match department code or name
      return memberDept === selectedDept || 
             memberDept.includes(selectedDept) || 
             selectedDept.includes(memberDept);
    });
  }, [teamMembers, formData.department]);

  // Handle department change - reset assigned_to when department changes
  const handleDepartmentChange = (dept) => {
    setFormData({
      ...formData,
      department: dept,
      assigned_to: '' // Reset assigned to when department changes
    });
  };

  // Bulk upload handlers
  const handleDownloadTemplate = async () => {
    try {
      toast.info('Downloading template...');
      const response = await fetch(`${API_URL}/api/sales/enquiries/bulk/template`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enquiries_bulk_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded!');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setUploadingBulk(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/sales/enquiries/bulk/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formDataUpload
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Upload failed');
      }

      toast.success(`Successfully imported ${result.imported} enquiries!`);
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} rows had errors`);
      }
      
      setShowBulkUploadModal(false);
      fetchEnquiries();
      fetchStats();
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploadingBulk(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleCustomerSelect = (customerId) => {
    if (customerId === 'new') {
      setShowNewCustomer(true);
      setFormData({
        ...formData,
        customer_id: '',
        company_name: '',
        location: '',
        contact_person: '',
        contact_phone: '',
        contact_email: ''
      });
      return;
    }

    setShowNewCustomer(false);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      // Debug log
      console.log('Selected customer:', customer);
      
      setFormData({
        ...formData,
        customer_id: customerId,
        company_name: customer.name || '',  // name field holds company name
        location: customer.location || customer.city || customer.address || '',
        contact_person: customer.contact_person || '',  // separate field for contact person
        contact_phone: customer.phone || '',
        contact_email: customer.email || ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingEnquiry 
        ? `${API_URL}/api/sales/enquiries/${editingEnquiry.id}`
        : `${API_URL}/api/sales/enquiries`;
      
      const method = editingEnquiry ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        value: formData.value ? parseFloat(formData.value) : null
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to save enquiry');
      
      toast.success(editingEnquiry ? 'Enquiry updated!' : 'Enquiry created!');
      setShowAddModal(false);
      setEditingEnquiry(null);
      resetForm();
      fetchEnquiries();
      fetchStats();
    } catch (error) {
      console.error('Error saving enquiry:', error);
      toast.error('Failed to save enquiry');
    }
  };

  const handleStatusChange = async (enquiryId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/sales/enquiries/${enquiryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success('Status updated!');
      fetchEnquiries();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/sales/enquiries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete enquiry');
      
      toast.success('Enquiry deleted!');
      fetchEnquiries();
      fetchStats();
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      toast.error('Failed to delete enquiry');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('Generating PDF...');
      const response = await fetch(`${API_URL}/api/sales/enquiries/export/pdf?status=${statusFilter}&search=${searchTerm}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enquiries_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      toast.info('Generating Excel...');
      const response = await fetch(`${API_URL}/api/sales/enquiries/export/excel?status=${statusFilter}&search=${searchTerm}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to generate Excel');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded!');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      target_date: '',
      company_name: '',
      customer_id: '',
      location: '',
      description: '',
      value: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      remarks: '',
      category: '',
      assigned_to: '',
      department: '',
      priority: '',
      status: 'new'
    });
    setShowNewCustomer(false);
  };

  const openEditModal = (enq) => {
    setEditingEnquiry(enq);
    setFormData({
      date: enq.date || '',
      target_date: enq.target_date || '',
      company_name: enq.company_name || '',
      customer_id: enq.customer_id || '',
      location: enq.location || '',
      description: enq.description || '',
      value: enq.value || '',
      contact_person: enq.contact_person || '',
      contact_phone: enq.contact_phone || '',
      contact_email: enq.contact_email || '',
      remarks: enq.remarks || '',
      category: enq.category || '',
      assigned_to: enq.assigned_to || '',
      department: enq.department || '',
      priority: enq.priority || '',
      status: enq.status || 'new'
    });
    setShowNewCustomer(!enq.customer_id);
    setShowAddModal(true);
  };

  const openViewModal = (enq) => {
    setViewingEnquiry(enq);
    setShowViewModal(true);
  };

  const getStatusColor = (status) => {
    const found = statuses.find(s => s.value === status);
    return found ? found.color : 'bg-slate-100 text-slate-700';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const statCards = [
    { title: 'Total Enquiries', value: stats.total, color: 'bg-slate-50 border-slate-200', textColor: 'text-slate-900' },
    { title: 'New', value: stats.new, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { title: 'Quoted', value: stats.quoted, color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
    { title: 'Accepted', value: stats.accepted, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    { title: 'Pipeline Value', value: formatCurrency(stats.pipeline_value), color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-700' },
  ];

  return (
    <div className="space-y-6" data-testid="enquiries-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enquiries</h1>
          <p className="text-slate-500 mt-1">Manage sales enquiries and track conversions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Download Buttons */}
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            data-testid="download-pdf-btn"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            data-testid="download-excel-btn"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          {/* Bulk Upload Button */}
          <button 
            onClick={() => setShowBulkUploadModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-green-300 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            data-testid="bulk-upload-btn"
            title="Bulk Upload"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </button>
          {/* New Enquiry Button */}
          <button 
            onClick={() => { resetForm(); setEditingEnquiry(null); setShowAddModal(true); }} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="add-enquiry-btn"
          >
            <Plus className="w-4 h-4" /> New Enquiry
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className={`p-4 rounded-xl border ${card.color}`}>
            <p className="text-sm text-slate-500">{card.title}</p>
            <p className={`text-2xl font-bold mt-1 ${card.textColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company, enquiry no, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            data-testid="search-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            data-testid="status-filter"
          >
            <option value="">All Status</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { fetchEnquiries(); fetchStats(); }}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          data-testid="refresh-btn"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Enquiry No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Value</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No enquiries found</p>
                    <button 
                      onClick={() => { resetForm(); setEditingEnquiry(null); setShowAddModal(true); }}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Create your first enquiry
                    </button>
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-50" data-testid={`enquiry-row-${enq.id}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{enq.enquiry_no}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(enq.date)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{enq.company_name}</p>
                        {enq.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {enq.location}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{enq.description}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                      {formatCurrency(enq.value)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-block">
                        <select
                          value={enq.status}
                          onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                          className={`px-2 py-1 text-xs font-medium rounded-full appearance-none cursor-pointer pr-6 ${getStatusColor(enq.status)}`}
                          data-testid={`status-select-${enq.id}`}
                        >
                          {statuses.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => openViewModal(enq)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                          data-testid={`view-btn-${enq.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEditModal(enq)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                          data-testid={`edit-btn-${enq.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {enq.status === 'new' && (
                          <button 
                            onClick={() => window.location.href = `/sales/quotations?enquiry=${enq.id}`}
                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Create Quotation"
                            data-testid={`quote-btn-${enq.id}`}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(enq.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                          data-testid={`delete-btn-${enq.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingEnquiry ? 'Edit Enquiry' : 'New Enquiry'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingEnquiry(null); }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Date & Target Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Enquiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    data-testid="date-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    data-testid="target-date-input"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  data-testid="category-select"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Company Name - Customer Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Company Name *
                </label>
                <select
                  value={formData.customer_id || (showNewCustomer ? 'new' : '')}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  data-testid="customer-select"
                >
                  <option value="">Select Customer</option>
                  <option value="new" className="font-medium text-blue-600">+ Add New Customer</option>
                  {customers.map(c => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name || c.company_name}
                    </option>
                  ))}
                </select>
                
                {showNewCustomer && (
                  <input
                    type="text"
                    placeholder="Enter new company name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    data-testid="new-company-input"
                    required
                  />
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  data-testid="location-input"
                />
              </div>

              {/* Contact Person Section - Auto-populated */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                <p className="text-sm font-medium text-slate-700">Contact Information</p>
                <p className="text-xs text-slate-500">{showNewCustomer ? 'Enter contact details' : 'Auto-filled from customer record'}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      <User className="w-3 h-3 inline mr-1" />
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                      data-testid="contact-person-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                      data-testid="contact-phone-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                      data-testid="contact-email-input"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Enquiry Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="What does the customer need?"
                  data-testid="description-input"
                />
              </div>

              {/* Estimated Value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Estimated Value (₹)
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="0"
                  data-testid="value-input"
                />
              </div>

              {/* Department & Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    data-testid="department-select"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.code} value={dept.code}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Assigned To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    data-testid="assigned-to-select"
                    disabled={!formData.department}
                  >
                    <option value="">{formData.department ? 'Select Team Member' : 'Select Department First'}</option>
                    {filteredTeamMembers.map(member => (
                      <option key={member.id || member._id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  {formData.department && filteredTeamMembers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No members found in this department</p>
                  )}
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    data-testid="priority-select"
                  >
                    <option value="">Select Priority</option>
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    data-testid="status-select"
                  >
                    {statuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Any additional notes..."
                  data-testid="remarks-input"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingEnquiry(null); }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                  data-testid="submit-btn"
                >
                  {editingEnquiry ? 'Update Enquiry' : 'Create Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {showViewModal && viewingEnquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{viewingEnquiry.enquiry_no}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(viewingEnquiry.status)}`}>
                  {statuses.find(s => s.value === viewingEnquiry.status)?.label || viewingEnquiry.status}
                </span>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Enquiry Date</p>
                  <p className="font-medium">{formatDate(viewingEnquiry.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Target Date</p>
                  <p className="font-medium">{formatDate(viewingEnquiry.target_date)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">Category</p>
                <p className="font-medium">{viewingEnquiry.category || '-'}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-500">Company</p>
                <p className="font-medium">{viewingEnquiry.company_name}</p>
                {viewingEnquiry.location && (
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {viewingEnquiry.location}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-500">Description</p>
                <p className="text-sm">{viewingEnquiry.description}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Estimated Value</p>
                <p className="font-semibold text-lg">{formatCurrency(viewingEnquiry.value)}</p>
              </div>

              {(viewingEnquiry.contact_person || viewingEnquiry.contact_phone || viewingEnquiry.contact_email) && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">Contact Information</p>
                  {viewingEnquiry.contact_person && (
                    <p className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" /> {viewingEnquiry.contact_person}
                    </p>
                  )}
                  {viewingEnquiry.contact_phone && (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" /> {viewingEnquiry.contact_phone}
                    </p>
                  )}
                  {viewingEnquiry.contact_email && (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" /> {viewingEnquiry.contact_email}
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500">Assigned To</p>
                <p>{viewingEnquiry.assigned_to || '-'}</p>
              </div>

              {viewingEnquiry.remarks && (
                <div>
                  <p className="text-xs text-slate-500">Remarks</p>
                  <p className="text-sm">{viewingEnquiry.remarks}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => { setShowViewModal(false); openEditModal(viewingEnquiry); }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                {viewingEnquiry.status !== 'accepted' && viewingEnquiry.status !== 'invoiced' && (
                  <button
                    onClick={() => { setShowViewModal(false); window.location.href = `/sales/quotations?enquiry=${viewingEnquiry.id}`; }}
                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" /> Create Quotation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Bulk Upload Enquiries
              </h3>
              <button 
                onClick={() => setShowBulkUploadModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Step 1: Download Template */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Download the Excel template with the correct format and column headers.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  data-testid="download-template-btn"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Step 2: Upload Filled Template</h4>
                <p className="text-sm text-green-700 mb-3">
                  Fill in the template with your enquiry data and upload it here.
                </p>
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
                  {uploadingBulk ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Select Excel File
                    </>
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    className="hidden"
                    disabled={uploadingBulk}
                    data-testid="bulk-upload-input"
                  />
                </label>
              </div>

              {/* Instructions */}
              <div className="text-sm text-slate-600">
                <p className="font-medium mb-2">Template Columns:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Date (YYYY-MM-DD) *</li>
                  <li>Target Date (YYYY-MM-DD)</li>
                  <li>Company Name *</li>
                  <li>Location</li>
                  <li>Description *</li>
                  <li>Estimated Value</li>
                  <li>Contact Person, Phone, Email</li>
                  <li>Priority (high, medium, low)</li>
                  <li>Status (new, quoted, accepted, etc.)</li>
                  <li>Category, Department, Assigned To</li>
                  <li>Remarks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enquiries;
