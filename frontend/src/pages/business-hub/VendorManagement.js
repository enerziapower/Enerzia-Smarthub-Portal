/**
 * Vendor Management - Business Hub
 * 
 * Integrates Vendors with:
 * - Vendor Requests from Project Management
 * - Purchase Orders
 * - Payments
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Store, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin,
  Package, Loader2, Download, Upload, X, Save, AlertCircle, FileSpreadsheet,
  CheckSquare, Square, Tag, RefreshCw, Eye, Link2, ShoppingCart, CreditCard,
  TrendingUp, Building2, Star
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const VENDOR_CATEGORIES = ['Electrical', 'Mechanical', 'HVAC', 'Plumbing', 'Civil', 'IT', 'Subcontractor', 'Transport', 'General', 'Other'];

const VendorManagement = () => {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gst_number: '',
    category: '',
    pan_number: '',
    bank_name: '',
    bank_account: '',
    ifsc_code: '',
    rating: 3,
    notes: ''
  });

  const [stats, setStats] = useState({
    total_vendors: 0,
    active_vendors: 0,
    pending_requests: 0,
    total_orders: 0
  });

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch vendors
      const vendorRes = await fetch(`${API_URL}/api/settings/vendors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let vendorList = [];
      if (vendorRes.ok) {
        const data = await vendorRes.json();
        vendorList = data || [];
        setVendors(vendorList);
      }

      // Fetch vendor requests from projects
      const reqRes = await fetch(`${API_URL}/api/project-requests/vendors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let reqList = [];
      if (reqRes.ok) {
        const data = await reqRes.json();
        reqList = data.requests || [];
        setVendorRequests(reqList);
      }

      // Fetch purchase orders
      const poRes = await fetch(`${API_URL}/api/project-requests/purchase-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let poList = [];
      if (poRes.ok) {
        const data = await poRes.json();
        poList = data.purchase_orders || [];
        setPurchaseOrders(poList);
      }

      // Calculate stats
      setStats({
        total_vendors: vendorList.length,
        active_vendors: vendorList.filter(v => v.is_active !== false).length,
        pending_requests: reqList.filter(r => r.status === 'pending').length,
        total_orders: poList.length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddVendor = async () => {
    if (!formData.name) {
      toast.error('Vendor name is required');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/settings/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Vendor added successfully');
        setShowAddModal(false);
        resetForm();
        fetchData();
      } else {
        toast.error('Failed to add vendor');
      }
    } catch (error) {
      toast.error('Error adding vendor');
    }
  };

  const handleUpdateVendor = async () => {
    if (!selectedVendor || !formData.name) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/settings/vendors/${selectedVendor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Vendor updated successfully');
        setShowEditModal(false);
        setSelectedVendor(null);
        resetForm();
        fetchData();
      } else {
        toast.error('Failed to update vendor');
      }
    } catch (error) {
      toast.error('Error updating vendor');
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/settings/vendors/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Vendor deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      gst_number: '',
      category: '',
      pan_number: '',
      bank_name: '',
      bank_account: '',
      ifsc_code: '',
      rating: 3,
      notes: ''
    });
  };

  const openEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name || '',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      gst_number: vendor.gst_number || '',
      category: vendor.category || '',
      pan_number: vendor.pan_number || '',
      bank_name: vendor.bank_name || '',
      bank_account: vendor.bank_account || '',
      ifsc_code: vendor.ifsc_code || '',
      rating: vendor.rating || 3,
      notes: vendor.notes || ''
    });
    setShowEditModal(true);
  };

  const openDetailModal = (vendor) => {
    setSelectedVendor(vendor);
    // Get related POs and requests for this vendor
    setShowDetailModal(true);
  };

  // Download Excel Template
  const downloadTemplate = () => {
    const templateData = [{
      'Vendor Name': 'Example Vendor',
      'Contact Person': 'John Doe',
      'Email': 'john@vendor.com',
      'Phone': '9876543210',
      'Address': '123 Business Street, City',
      'GST Number': '29VENDOR1234F1Z5',
      'Category': 'Electrical',
      'PAN Number': 'ABCDE1234F',
      'Bank Name': 'State Bank',
      'Bank Account': '12345678901234',
      'IFSC Code': 'SBIN0001234'
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
    XLSX.writeFile(wb, 'vendors_template.xlsx');
    toast.success('Template downloaded');
  };

  // Export Vendors
  const exportToExcel = () => {
    const dataToExport = selectedIds.length > 0
      ? vendors.filter(v => selectedIds.includes(v.id))
      : vendors;

    if (dataToExport.length === 0) {
      toast.error('No vendors to export');
      return;
    }

    const exportData = dataToExport.map(v => ({
      'Vendor Name': v.name || '',
      'Contact Person': v.contact_person || '',
      'Email': v.email || '',
      'Phone': v.phone || '',
      'Address': v.address || '',
      'GST Number': v.gst_number || '',
      'Category': v.category || '',
      'PAN Number': v.pan_number || '',
      'Bank Name': v.bank_name || '',
      'Bank Account': v.bank_account || '',
      'IFSC Code': v.ifsc_code || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
    XLSX.writeFile(wb, `vendors_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${dataToExport.length} vendors`);
  };

  // Handle File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const mappedData = data.map(row => ({
          name: row['Vendor Name'] || row['name'] || '',
          contact_person: row['Contact Person'] || row['contact_person'] || '',
          email: row['Email'] || row['email'] || '',
          phone: String(row['Phone'] || row['phone'] || ''),
          address: row['Address'] || row['address'] || '',
          gst_number: row['GST Number'] || row['gst_number'] || '',
          category: row['Category'] || row['category'] || '',
          pan_number: row['PAN Number'] || row['pan_number'] || '',
          bank_name: row['Bank Name'] || row['bank_name'] || '',
          bank_account: row['Bank Account'] || row['bank_account'] || '',
          ifsc_code: row['IFSC Code'] || row['ifsc_code'] || ''
        })).filter(row => row.name);

        setImportPreview(mappedData);
        setShowImportModal(true);
      } catch (error) {
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Import Vendors
  const handleImport = async () => {
    if (importPreview.length === 0) return;

    setImporting(true);
    const token = localStorage.getItem('token');
    let successCount = 0;

    for (const vendor of importPreview) {
      try {
        await fetch(`${API_URL}/api/settings/vendors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(vendor)
        });
        successCount++;
      } catch (error) {
        console.error('Error importing:', vendor.name);
      }
    }

    setImporting(false);
    setShowImportModal(false);
    setImportPreview([]);
    fetchData();
    toast.success(`Imported ${successCount} vendors`);
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = !searchTerm ||
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || vendor.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get vendor-related data
  const getVendorPOs = (vendorName) => {
    return purchaseOrders.filter(po => po.vendor_name?.toLowerCase() === vendorName?.toLowerCase());
  };

  const getVendorRequests = (vendorName) => {
    return vendorRequests.filter(r => r.description?.toLowerCase().includes(vendorName?.toLowerCase()));
  };

  return (
    <div className="space-y-6" data-testid="vendor-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Store className="text-orange-600" />
              Vendor Management
            </h2>
            <p className="text-sm text-slate-500">Manage vendors, track POs, and monitor performance</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={downloadTemplate}
              className="px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
              <FileSpreadsheet size={16} /> Template
            </button>
            <button
              onClick={exportToExcel}
              className="px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 flex items-center gap-2"
            >
              <Upload size={16} /> Import
            </button>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <Plus size={16} /> Add Vendor
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Store size={18} className="text-orange-600" />
            <span className="text-sm text-slate-600">Total Vendors</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{stats.total_vendors}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare size={18} className="text-green-600" />
            <span className="text-sm text-slate-600">Active Vendors</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.active_vendors}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Pending Requests</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.pending_requests}</p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={18} className="text-violet-600" />
            <span className="text-sm text-slate-600">Purchase Orders</span>
          </div>
          <p className="text-2xl font-bold text-violet-700">{stats.total_orders}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">All Categories</option>
          {VENDOR_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map(vendor => {
            const vendorPOs = getVendorPOs(vendor.name);
            const totalPOValue = vendorPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);

            return (
              <div
                key={vendor.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Package size={20} className="text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{vendor.name}</h3>
                      {vendor.category && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {vendor.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDetailModal(vendor)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => openEditModal(vendor)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {vendor.contact_person && (
                    <p className="text-slate-600 font-medium">{vendor.contact_person}</p>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail size={14} />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone size={14} />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.gst_number && (
                    <div className="text-xs text-slate-400">GST: {vendor.gst_number}</div>
                  )}
                </div>

                {/* PO Stats */}
                {vendorPOs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <ShoppingCart size={12} />
                      <span>{vendorPOs.length} POs</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-600">{formatCurrency(totalPOValue)}</span>
                  </div>
                )}

                {/* Rating */}
                {vendor.rating && (
                  <div className="mt-2 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={i < vendor.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredVendors.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              <Store size={40} className="mx-auto mb-3 text-slate-300" />
              <p>No vendors found</p>
              <p className="text-sm">Add vendors to start tracking</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <h3 className="text-lg font-semibold text-slate-800">
                {showEditModal ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="p-2 hover:bg-white/50 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select category</option>
                    {VENDOR_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Bank Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdateVendor : handleAddVendor}
                disabled={!formData.name}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {showEditModal ? 'Update Vendor' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Detail Modal */}
      {showDetailModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedVendor.name}</h3>
                <p className="text-sm text-slate-500">{selectedVendor.category || 'General'}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Contact Person</p>
                  <p className="font-medium">{selectedVendor.contact_person || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium">{selectedVendor.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium">{selectedVendor.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">GST Number</p>
                  <p className="font-medium">{selectedVendor.gst_number || '-'}</p>
                </div>
              </div>

              {/* Address */}
              {selectedVendor.address && (
                <div>
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="font-medium">{selectedVendor.address}</p>
                </div>
              )}

              {/* Purchase Orders */}
              <div>
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <ShoppingCart size={16} className="text-violet-600" />
                  Purchase Orders ({getVendorPOs(selectedVendor.name).length})
                </h4>
                {getVendorPOs(selectedVendor.name).length > 0 ? (
                  <div className="space-y-2">
                    {getVendorPOs(selectedVendor.name).map(po => (
                      <div key={po.id} className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="font-mono text-sm text-violet-700">{po.po_number}</span>
                          <p className="text-xs text-slate-500">{po.order_no}</p>
                        </div>
                        <span className="font-medium text-violet-700">{formatCurrency(po.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No purchase orders</p>
                )}
              </div>

              {/* Bank Details */}
              {(selectedVendor.bank_name || selectedVendor.bank_account) && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-800 mb-2">Bank Details</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Bank</p>
                      <p className="font-medium">{selectedVendor.bank_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Account</p>
                      <p className="font-medium">{selectedVendor.bank_account || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">IFSC</p>
                      <p className="font-medium">{selectedVendor.ifsc_code || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Import Preview</h3>
                <p className="text-sm text-slate-500">{importPreview.length} vendors ready to import</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportPreview([]); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Contact</th>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Phone</th>
                    <th className="text-left px-3 py-2">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.contact_person}</td>
                      <td className="px-3 py-2">{row.email}</td>
                      <td className="px-3 py-2">{row.phone}</td>
                      <td className="px-3 py-2">{row.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import {importPreview.length} Vendors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;
