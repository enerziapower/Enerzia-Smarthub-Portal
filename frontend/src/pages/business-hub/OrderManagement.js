/**
 * Order Management - Business Hub
 * 
 * Two tabs:
 * 1. Order Management (default) - Add New Order with PID creation, Budget, Timeline
 * 2. Order Summary - View-only list of Sales Orders
 * 
 * This is the starting point of the Order-to-Cash lifecycle
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Filter, RefreshCw, Eye, X, Edit2, Trash2,
  Package, DollarSign, Calendar, Building2, FileText, Upload,
  ChevronDown, ChevronRight, CheckCircle, Clock, AlertTriangle,
  Target, Wallet, Truck, Receipt, CreditCard, Save, Loader2,
  FolderKanban, ClipboardList, FileSpreadsheet, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const API_URL = window.location.origin;

// Status configurations
const ORDER_STATUS = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700' },
  shipped: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
};

const PAYMENT_STATUS = {
  unpaid: { label: 'Unpaid', color: 'bg-red-100 text-red-700' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' }
};

const CATEGORIES = [
  { id: 'PSS', name: 'Projects & Services', color: 'violet' },
  { id: 'AS', name: 'Asset Services', color: 'blue' },
  { id: 'OSS', name: 'Other Sales & Services', color: 'amber' },
  { id: 'CS', name: 'Commercial Sales', color: 'green' }
];

const WORK_ITEM_UNITS = ['Nos', 'Mtr', 'Sqm', 'Sq.ft.', 'Kg', 'Ltr', 'Set', 'Lot', 'Each', 'Pair', 'Box'];

const OrderManagement = () => {
  const [activeTab, setActiveTab] = useState('management'); // 'management' or 'summary'
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Add New Order form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [loadingPID, setLoadingPID] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [financialYear, setFinancialYear] = useState('');
  const [customers, setCustomers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [poFile, setPOFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const excelInputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Stats
  const [stats, setStats] = useState({
    total_orders: 0,
    total_value: 0,
    pending: 0,
    confirmed: 0
  });

  // Form data for Add New Order
  const initialFormData = {
    pid_no: '',
    category: 'PSS',
    customer_id: '',
    customer_name: '',
    customer_address: '',
    customer_gst: '',
    customer_contact: '',
    customer_phone: '',
    customer_email: '',
    po_number: '',
    po_date: '',
    order_date: new Date().toLocaleDateString('en-GB'),
    delivery_date: '',
    project_name: '',
    location: '',
    // Budget fields
    purchase_budget: 0,
    execution_budget: 0,
    others_budget: 0,
    target_profit: 0,
    target_profit_type: 'amount', // 'amount' or 'percent'
    // Timeline fields
    start_date: '',
    end_date: '',
    deadline: '',
    // Items
    items: [{ id: '1', sno: 1, description: '', unit: 'Nos', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    gst_percent: 18,
    gst_amount: 0,
    total_amount: 0,
    // Other fields
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    po_file_path: '',
    status: 'pending',
    engineer_in_charge: ''
  };
  
  const [formData, setFormData] = useState(initialFormData);

  // Fetch orders for Order Management tab
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch from order-lifecycle/orders which contains orders with budget/timeline
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch sales orders for Order Summary tab
  const fetchSalesOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${API_URL}/api/sales/orders?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.orders || []);
        
        // Calculate stats
        const orders = data.orders || [];
        setStats({
          total_orders: orders.length,
          total_value: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          pending: orders.filter(o => o.status === 'pending').length,
          confirmed: orders.filter(o => o.status === 'confirmed').length
        });
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  // Fetch customers and team members for dropdown
  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [customersRes, teamRes] = await Promise.all([
        fetch(`${API_URL}/api/domestic-customers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/department-team/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.filter(c => c.is_active !== false));
      }
      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeamMembers(data.filter(m => m.is_active !== false));
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  // Generate next PID
  const fetchNextPID = async (fy = financialYear) => {
    try {
      setLoadingPID(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/projects/next-pid?financial_year=${fy}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, pid_no: data.next_pid }));
        if (data.financial_year) setFinancialYear(data.financial_year);
      }
    } catch (error) {
      console.error('Error fetching next PID:', error);
    } finally {
      setLoadingPID(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'management') {
      fetchOrders();
    } else {
      fetchSalesOrders();
    }
    fetchDropdownData();
  }, [activeTab, fetchOrders, fetchSalesOrders]);

  // Auto-detect financial year on modal open
  useEffect(() => {
    if (showAddModal) {
      const today = new Date();
      const month = today.getMonth() + 1;
      let year1, year2;
      if (month >= 4) {
        year1 = today.getFullYear() % 100;
        year2 = (today.getFullYear() + 1) % 100;
      } else {
        year1 = (today.getFullYear() - 1) % 100;
        year2 = today.getFullYear() % 100;
      }
      const fy = `${year1.toString().padStart(2, '0')}-${year2.toString().padStart(2, '0')}`;
      setFinancialYear(fy);
      fetchNextPID(fy);
      
      // Set today's date as default
      const day = String(today.getDate()).padStart(2, '0');
      const monthStr = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      setFormData(prev => ({ 
        ...prev, 
        order_date: `${day}/${monthStr}/${year}`,
        start_date: `${year}-${monthStr}-${day}`
      }));
    }
  }, [showAddModal]);

  // Handle customer selection
  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customer.id,
        customer_name: customer.company_name || customer.name,
        customer_address: customer.address || '',
        customer_gst: customer.gst_no || '',
        customer_contact: customer.contact_person || '',
        customer_phone: customer.phone || '',
        customer_email: customer.email || ''
      }));
    }
  };

  // Calculate totals
  const calculateTotals = (items, gstPercent) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const gstAmount = subtotal * (gstPercent / 100);
    const totalAmount = subtotal + gstAmount;
    return { subtotal, gstAmount, totalAmount };
  };

  // Update item
  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    const { subtotal, gstAmount, totalAmount } = calculateTotals(newItems, formData.gst_percent);
    setFormData(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      gst_amount: gstAmount,
      total_amount: totalAmount
    }));
  };

  // Add item
  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      sno: formData.items.length + 1,
      description: '',
      unit: 'Nos',
      quantity: 1,
      unit_price: 0,
      total: 0
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  // Remove item
  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sno: i + 1 }));
    const { subtotal, gstAmount, totalAmount } = calculateTotals(newItems, formData.gst_percent);
    setFormData(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      gst_amount: gstAmount,
      total_amount: totalAmount
    }));
  };

  // Handle GST change
  const handleGstChange = (gstPercent) => {
    const { subtotal, gstAmount, totalAmount } = calculateTotals(formData.items, gstPercent);
    setFormData(prev => ({
      ...prev,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      total_amount: totalAmount
    }));
  };

  // Handle PO file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      toast.error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }
    
    setUploadingFile(true);
    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/upload-po`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, po_file_path: data.file_path || data.url }));
        setPOFile(file);
        toast.success('File uploaded successfully');
      } else {
        toast.error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle Excel import for items
  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const binaryStr = evt.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          toast.error('No data found in Excel file');
          return;
        }
        
        const newItems = jsonData.map((row, idx) => ({
          id: `${Date.now()}-${idx}`,
          sno: idx + 1,
          description: row['Description'] || row['description'] || row['Item'] || '',
          unit: row['Unit'] || row['unit'] || 'Nos',
          quantity: parseFloat(row['Quantity'] || row['quantity'] || row['Qty'] || 0),
          unit_price: parseFloat(row['Unit Price'] || row['unit_price'] || row['Price'] || 0),
          total: 0
        })).filter(item => item.description);
        
        // Calculate totals
        newItems.forEach(item => {
          item.total = item.quantity * item.unit_price;
        });
        
        const { subtotal, gstAmount, totalAmount } = calculateTotals(newItems, formData.gst_percent);
        setFormData(prev => ({
          ...prev,
          items: newItems.length > 0 ? newItems : prev.items,
          subtotal,
          gst_amount: gstAmount,
          total_amount: totalAmount
        }));
        
        toast.success(`Imported ${newItems.length} items from Excel`);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast.error('Error importing Excel file');
    }
    
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  // Submit new order
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name) {
      toast.error('Please select a customer');
      return;
    }
    
    if (!formData.pid_no) {
      toast.error('PID is required');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      // Calculate total budget
      const totalBudget = (formData.purchase_budget || 0) + (formData.execution_budget || 0) + (formData.others_budget || 0);
      
      // Prepare order data
      const orderData = {
        ...formData,
        order_no: formData.pid_no,
        total_budget: totalBudget,
        lifecycle: {
          status: 'new',
          purchase_budget: formData.purchase_budget,
          execution_budget: formData.execution_budget,
          others_budget: formData.others_budget,
          target_profit: formData.target_profit,
          target_profit_type: formData.target_profit_type,
          timeline: {
            start_date: formData.start_date,
            end_date: formData.end_date,
            deadline: formData.deadline
          }
        },
        financials: {
          purchase_budget: formData.purchase_budget,
          execution_budget: formData.execution_budget,
          others_budget: formData.others_budget,
          target_profit: formData.target_profit,
          purchase_actual: 0,
          execution_actual: 0,
          actual_profit: 0,
          profit_margin: 0
        }
      };
      
      // Create order in order-lifecycle
      const response = await fetch(`${API_URL}/api/order-lifecycle/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        toast.success('Order created successfully with PID: ' + formData.pid_no);
        setShowAddModal(false);
        setFormData(initialFormData);
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error creating order');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.pid_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || order.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredSalesOrders = salesOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" data-testid="order-management">
      {/* Header with Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Order Management</h2>
              <p className="text-sm text-slate-500">Create orders and manage lifecycle</p>
            </div>
            
            <div className="flex items-center gap-3">
              {activeTab === 'management' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add New Order
                </button>
              )}
              <button 
                onClick={activeTab === 'management' ? fetchOrders : fetchSalesOrders} 
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <RefreshCw size={20} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('management')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'management'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FolderKanban size={18} />
              Order Management
            </div>
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClipboardList size={18} />
              Order Summary
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'management' ? "Search by PID, customer..." : "Search orders..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          
          {activeTab === 'management' ? (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.id} - {cat.name}</option>
              ))}
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(ORDER_STATUS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'management' ? (
        /* ORDER MANAGEMENT TAB - Orders with Budget & Timeline */
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-slate-500">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-600 mb-1">No orders yet</h3>
              <p className="text-sm text-slate-500 mb-4">Click "Add New Order" to create your first order with PID</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Add New Order
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              // Get budget from financials (API returns purchase_target, execution_target)
              // Also check order.lifecycle for orders created via Order Management form
              const purchaseBudget = order.financials?.purchase_target || order.lifecycle?.purchase_budget?.amount || order.lifecycle?.purchase_budget || 0;
              const executionBudget = order.financials?.execution_target || order.lifecycle?.execution_budget?.amount || order.lifecycle?.execution_budget || 0;
              const othersBudget = order.lifecycle?.others_budget || 0;
              const totalBudget = purchaseBudget + executionBudget + othersBudget;
              const targetProfit = order.lifecycle?.target_profit?.amount || order.financials?.target_profit || 0;
              
              return (
                <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-violet-600">{order.order_no || order.pid_no}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ORDER_STATUS[order.lifecycle_status || order.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                          {ORDER_STATUS[order.lifecycle_status || order.status]?.label || order.status || 'New'}
                        </span>
                        {order.category && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${CATEGORIES.find(c => c.id === order.category)?.color || 'slate'}-100 text-${CATEGORIES.find(c => c.id === order.category)?.color || 'slate'}-700`}>
                            {order.category}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-800 truncate">{order.customer_name}</p>
                      <p className="text-sm text-slate-500">{order.date || order.order_date}</p>
                    </div>

                    {/* Budget & Financials */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Order Value</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(order.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total Budget</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(totalBudget)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Expenses</p>
                        <p className="font-semibold text-purple-600">{formatCurrency(order.financials?.total_cost || order.financials?.purchase_actual || 0)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Target Profit</p>
                        <p className="font-semibold text-green-600">{formatCurrency(targetProfit)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setViewingOrder(order); setShowViewModal(true); }}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Timeline */}
                  {order.lifecycle?.timeline && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-slate-500">Start:</span>
                          <span className="font-medium">{order.lifecycle.timeline.start_date || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-slate-500">End:</span>
                          <span className="font-medium">{order.lifecycle.timeline.end_date || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-amber-500" />
                          <span className="text-slate-500">Deadline:</span>
                          <span className="font-medium text-amber-600">{order.lifecycle.timeline.deadline || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ORDER SUMMARY TAB - View-only Sales Orders */
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-800">{stats.total_orders}</p>
              <p className="text-sm text-slate-500">Total Orders</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_value)}</p>
              <p className="text-sm text-slate-500">Total Value</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              <p className="text-sm text-amber-600">Pending</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
              <p className="text-sm text-green-600">Confirmed</p>
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-slate-500">Loading orders...</p>
            </div>
          ) : filteredSalesOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-600 mb-1">No orders found</h3>
              <p className="text-sm text-slate-500">Sales orders will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Delivery</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{order.order_no}</td>
                      <td className="px-4 py-3 text-slate-600">{order.customer_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{order.date}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{order.delivery_date || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(order.total_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ORDER_STATUS[order.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                          {ORDER_STATUS[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_STATUS[order.payment_status]?.color || 'bg-slate-100 text-slate-700'}`}>
                          {PAYMENT_STATUS[order.payment_status]?.label || order.payment_status || 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => { setViewingOrder(order); setShowViewModal(true); }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add New Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Add New Order</h3>
                <p className="text-sm text-slate-500">Create order with PID, budget allocation, and timeline</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* PID & Category */}
              <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                <h4 className="font-semibold text-violet-800 mb-3 flex items-center gap-2">
                  <FolderKanban size={18} />
                  Project Identification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                    <input
                      type="text"
                      value={financialYear}
                      onChange={(e) => {
                        setFinancialYear(e.target.value);
                        if (e.target.value.match(/^\d{2}-\d{2}$/)) fetchNextPID(e.target.value);
                      }}
                      placeholder="25-26"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PID Number *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.pid_no}
                        readOnly
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-violet-600"
                      />
                      {loadingPID && <Loader2 className="w-5 h-5 animate-spin text-violet-600" />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.id} - {cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Building2 size={18} />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer *</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST No</label>
                    <input
                      type="text"
                      value={formData.customer_gst}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_gst: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.customer_contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_contact: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea
                      value={formData.customer_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer PO/WO Number</label>
                  <input
                    type="text"
                    value={formData.po_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                    placeholder="Customer Purchase/Work Order Number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order Date</label>
                  <input
                    type="text"
                    value={formData.order_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={formData.project_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Budget Allocation */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <DollarSign size={18} />
                  Budget Allocation
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Budget</label>
                    <input
                      type="number"
                      value={formData.purchase_budget || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_budget: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="₹0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Execution Budget</label>
                    <input
                      type="number"
                      value={formData.execution_budget || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, execution_budget: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="₹0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Others Budget</label>
                    <input
                      type="number"
                      value={formData.others_budget || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, others_budget: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="₹0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Profit</label>
                    <input
                      type="number"
                      value={formData.target_profit || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, target_profit: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="₹0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Profit Type</label>
                    <select
                      value={formData.target_profit_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, target_profit_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="amount">Amount (₹)</option>
                      <option value="percent">Percent (%)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Calendar size={18} />
                  Timeline
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <ClipboardList size={18} />
                    Order Items
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => excelInputRef.current?.click()}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                    >
                      <FileSpreadsheet size={14} />
                      Import Excel
                    </button>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Item
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left w-10">#</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-center w-24">Unit</th>
                        <th className="px-3 py-2 text-center w-24">Qty</th>
                        <th className="px-3 py-2 text-right w-32">Unit Price</th>
                        <th className="px-3 py-2 text-right w-32">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-slate-500">{item.sno}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded"
                              placeholder="Item description"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded"
                            >
                              {WORK_ITEM_UNITS.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-center"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
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

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">GST:</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={formData.gst_percent}
                          onChange={(e) => handleGstChange(parseInt(e.target.value))}
                          className="px-2 py-1 border border-slate-200 rounded text-sm"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                        <span className="font-medium">{formatCurrency(formData.gst_amount)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                      <span>Total:</span>
                      <span className="text-green-600">{formatCurrency(formData.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PO File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PO Document (PDF)</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                  >
                    {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {poFile ? 'Change File' : 'Upload PO'}
                  </button>
                  {poFile && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle size={14} />
                      {poFile.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                  <textarea
                    value={formData.payment_terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.pid_no || !formData.customer_name}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {showViewModal && viewingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{viewingOrder.order_no || viewingOrder.pid_no}</h3>
                <p className="text-sm text-slate-500">{viewingOrder.customer_name}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Status</label>
                  <p className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${ORDER_STATUS[viewingOrder.status]?.color || 'bg-slate-100'}`}>
                    {ORDER_STATUS[viewingOrder.status]?.label || viewingOrder.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Date</label>
                  <p className="font-medium">{viewingOrder.date || viewingOrder.order_date}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Delivery</label>
                  <p className="font-medium">{viewingOrder.delivery_date || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Total</label>
                  <p className="font-bold text-lg text-green-600">{formatCurrency(viewingOrder.total_amount)}</p>
                </div>
              </div>

              {viewingOrder.items && viewingOrder.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Order Items</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingOrder.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{idx + 1}</td>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
