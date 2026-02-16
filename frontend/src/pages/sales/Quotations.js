import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Eye, Download, X, RefreshCw, FileText,
  ChevronDown, Filter, ArrowRight, CheckCircle, Link2, AlertCircle,
  Calendar, Building2, DollarSign, Phone, Mail, User, MapPin, FileSearch,
  Truck, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Quotations = () => {
  const [searchParams] = useSearchParams();
  const enquiryId = searchParams.get('enquiry');
  
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingQuotation, setConvertingQuotation] = useState(null);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [stats, setStats] = useState({
    total: 0, draft: 0, sent: 0, accepted: 0, total_value: 0
  });
  
  // Convert to Order form data
  const [convertFormData, setConvertFormData] = useState({
    po_number: '',
    po_date: new Date().toISOString().split('T')[0],
    acceptance_type: 'written_po',
    acceptance_remarks: '',
    delivery_date: ''
  });
  
  // Team members for salesperson dropdown
  const [teamMembers, setTeamMembers] = useState([]);
  
  const [formData, setFormData] = useState({
    enquiry_id: '',
    customer_name: '',
    customer_address: '',
    shipping_address: '',
    customer_gst: '',
    gst_treatment: 'registered_regular',
    place_of_supply: '',
    customer_contact: '',
    customer_phone: '',
    customer_email: '',
    salesperson: '',
    salesperson_name: '',
    reference_no: '',
    date: new Date().toISOString().split('T')[0],
    valid_until: '',
    subject: '',
    delivery_days: '',
    kind_attention: '',
    transport_mode: '',
    incoterms: '',
    items: [{ id: '1', sno: 1, description: '', hsn_sac: '', unit: 'Nos', quantity: 1, unit_price: 0, discount: 0, total: 0 }],
    subtotal: 0,
    discount_total: 0,
    gst_percent: 18,
    gst_amount: 0,
    total_amount: 0,
    terms_conditions: '',
    payment_terms: '50% Advance, 50% on delivery',
    delivery_terms: '2-3 weeks from order confirmation',
    notes: '',
    category: '',
    financial_year: (() => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      if (month >= 4) {
        return `${year % 100}-${(year + 1) % 100}`;
      } else {
        return `${(year - 1) % 100}-${year % 100}`;
      }
    })()
  });
  const [nextQuoteNumber, setNextQuoteNumber] = useState(null);

  const statuses = [
    { value: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
    { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
    { value: 'expired', label: 'Expired', color: 'bg-yellow-100 text-yellow-700' },
  ];

  const categories = [
    { value: 'PSS', label: 'PSS - Project & Services' },
    { value: 'AS', label: 'AS - Asset Services' },
    { value: 'OSS', label: 'OSS - Other Sales & Services' },
    { value: 'CS', label: 'CS - Commercial Sales' },
    { value: 'DOM_LIGHTING', label: 'DOM Lighting' },
    { value: 'EXPORTS', label: 'Exports' },
  ];

  const gstTreatments = [
    { value: 'registered_regular', label: 'Registered Business - Regular' },
    { value: 'registered_composition', label: 'Registered Business - Composition' },
    { value: 'unregistered', label: 'Unregistered Business' },
    { value: 'consumer', label: 'Consumer' },
    { value: 'overseas', label: 'Overseas' },
    { value: 'sez', label: 'SEZ' },
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
    'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep'
  ];

  const paymentTermsOptions = [
    'Due on Receipt',
    'Net 15',
    'Net 30',
    'Net 45',
    'Net 60',
    '50% Advance, 50% on delivery',
    '30% Advance, 70% on delivery',
    'Due on Due Date',
    'Custom'
  ];

  const transportModes = ['Road', 'Rail', 'Air', 'Sea', 'Courier', 'Hand Delivery'];

  const incotermsOptions = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

  const unitOptions = ['Nos', 'Set', 'Lot', 'M', 'Sqm', 'Kg', 'LS', 'KM', 'Ltr', 'Pcs', 'Job', 'Box', 'Pair', 'Rft'];

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/sales/quotations?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch quotations');
      const data = await response.json();
      setQuotations(data.quotations || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sales/quotations/stats`, {
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

  // Fetch all enquiries for dropdown
  const fetchEnquiries = async () => {
    try {
      setLoadingEnquiries(true);
      const response = await fetch(`${API_URL}/api/sales/enquiries?limit=500`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to show only enquiries that can be quoted (not declined, not already quoted, not accepted)
        const quotableEnquiries = (data.enquiries || []).filter(
          e => !['declined', 'accepted', 'invoiced', 'quoted'].includes(e.status) && !e.quotation_id
        );
        setEnquiries(quotableEnquiries);
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
    } finally {
      setLoadingEnquiries(false);
    }
  };

  // Fetch all customers for additional data
  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/clients?customer_type=domestic&limit=1000`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not object with clients property
        setCustomers(Array.isArray(data) ? data : (data.clients || []));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Fetch sales team members for salesperson dropdown
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/department-team/sales`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(Array.isArray(data) ? data.filter(m => m.is_active !== false) : []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchEnquiryDetails = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/sales/enquiries/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const enquiry = await response.json();
        setSelectedEnquiry(enquiry);
        
        // Find matching customer for GST and Address
        const matchingCustomer = customers.find(
          c => c.name?.toLowerCase() === enquiry.company_name?.toLowerCase()
        );
        
        // Set default valid until date (30 days from now)
        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + 30);
        
        setFormData(prev => ({
          ...prev,
          enquiry_id: enquiry.id,
          customer_name: enquiry.company_name || '',
          customer_contact: enquiry.contact_person || '',
          customer_phone: enquiry.contact_phone || '',
          customer_email: enquiry.contact_email || '',
          customer_address: matchingCustomer?.address || enquiry.location || '',
          shipping_address: matchingCustomer?.shipping_address || matchingCustomer?.address || enquiry.location || '',
          customer_gst: matchingCustomer?.gst_number || matchingCustomer?.gst || '',
          gst_treatment: matchingCustomer?.gst_treatment || 'registered_regular',
          place_of_supply: matchingCustomer?.state || '',
          kind_attention: enquiry.contact_person || '',
          subject: enquiry.description || '',
          category: enquiry.category || '',
          valid_until: validUntilDate.toISOString().split('T')[0]
        }));
      }
    } catch (error) {
      console.error('Error fetching enquiry:', error);
      toast.error('Failed to load enquiry details');
    }
  };

  // When enquiry is selected from dropdown
  const handleEnquirySelect = (enquiryId) => {
    if (enquiryId) {
      fetchEnquiryDetails(enquiryId);
    } else {
      setSelectedEnquiry(null);
      setFormData(prev => ({
        ...prev,
        enquiry_id: '',
        customer_name: '',
        customer_contact: '',
        customer_phone: '',
        customer_email: '',
        customer_address: '',
        shipping_address: '',
        customer_gst: '',
        gst_treatment: 'registered_regular',
        place_of_supply: '',
        kind_attention: '',
        subject: '',
        category: ''
      }));
    }
  };

  // When customer name changes, try to find matching customer data
  const handleCustomerNameChange = (name) => {
    setFormData(prev => ({ ...prev, customer_name: name }));
    
    // Find matching customer for auto-fill
    const matchingCustomer = customers.find(
      c => c.name?.toLowerCase() === name.toLowerCase()
    );
    
    if (matchingCustomer) {
      setFormData(prev => ({
        ...prev,
        customer_name: matchingCustomer.name,
        customer_address: matchingCustomer.address || prev.customer_address,
        shipping_address: matchingCustomer.shipping_address || matchingCustomer.address || prev.shipping_address,
        customer_gst: matchingCustomer.gst_number || matchingCustomer.gst || prev.customer_gst,
        gst_treatment: matchingCustomer.gst_treatment || prev.gst_treatment,
        place_of_supply: matchingCustomer.state || prev.place_of_supply,
        customer_contact: matchingCustomer.contact_person || prev.customer_contact,
        customer_phone: matchingCustomer.phone || prev.customer_phone,
        customer_email: matchingCustomer.email || prev.customer_email
      }));
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchStats();
    fetchEnquiries();
    fetchCustomers();
    fetchTeamMembers();
    
    // If coming from enquiry, load enquiry details
    if (enquiryId) {
      setTimeout(() => {
        fetchEnquiryDetails(enquiryId);
        setShowAddModal(true);
      }, 500);
    }
  }, [fetchQuotations, enquiryId]);

  const calculateTotals = (items, gstPercent) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const gstAmount = subtotal * (gstPercent / 100);
    const totalAmount = subtotal + gstAmount;
    return { subtotal, gstAmount, totalAmount };
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate line total
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    const { subtotal, gstAmount, totalAmount } = calculateTotals(newItems, formData.gst_percent);
    
    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      gst_amount: gstAmount,
      total_amount: totalAmount
    });
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      sno: formData.items.length + 1,
      description: '',
      hsn_sac: '',
      unit: 'Nos',
      quantity: 1,
      unit_price: 0,
      total: 0
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sno: i + 1 }));
    const { subtotal, gstAmount, totalAmount } = calculateTotals(newItems, formData.gst_percent);
    setFormData({
      ...formData,
      items: newItems,
      subtotal,
      gst_amount: gstAmount,
      total_amount: totalAmount
    });
  };

  const handleGstChange = (gstPercent) => {
    const { subtotal, gstAmount, totalAmount } = calculateTotals(formData.items, gstPercent);
    setFormData({
      ...formData,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      total_amount: totalAmount
    });
  };

  // Format date for display
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    // Handle DD/MM/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    // Already in YYYY-MM-DD format
    return dateStr;
  };

  // Format date for display in table
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try DD/MM/YYYY format
        if (dateStr.includes('/')) return dateStr;
        return dateStr;
      }
      return date.toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.customer_name) {
      toast.error('Customer name is required');
      return;
    }
    if (!formData.date) {
      toast.error('Date is required');
      return;
    }
    if (!formData.valid_until) {
      toast.error('Valid until date is required');
      return;
    }
    if (formData.items.length === 0 || !formData.items.some(i => i.description)) {
      toast.error('At least one line item is required');
      return;
    }
    
    try {
      // Format dates for backend (DD/MM/YYYY)
      const submitData = {
        ...formData,
        date: formData.date ? new Date(formData.date).toLocaleDateString('en-GB') : '',
        valid_until: formData.valid_until ? new Date(formData.valid_until).toLocaleDateString('en-GB') : ''
      };
      
      const url = editingQuotation 
        ? `${API_URL}/api/sales/quotations/${editingQuotation.id}`
        : `${API_URL}/api/sales/quotations`;
      
      const method = editingQuotation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submitData)
      });
      
      if (!response.ok) throw new Error('Failed to save quotation');
      
      toast.success(editingQuotation ? 'Quotation updated!' : 'Quotation created!');
      setShowAddModal(false);
      setEditingQuotation(null);
      setSelectedEnquiry(null);
      resetForm();
      fetchQuotations();
      fetchStats();
      fetchEnquiries(); // Refresh enquiries list
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
    }
  };

  const handleStatusChange = async (quotationId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/sales/quotations/${quotationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success('Status updated!');
      fetchQuotations();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const openConvertModal = (quotation) => {
    setConvertingQuotation(quotation);
    setConvertFormData({
      po_number: '',
      po_date: new Date().toISOString().split('T')[0],
      acceptance_type: 'written_po',
      acceptance_remarks: '',
      delivery_date: ''
    });
    setShowConvertModal(true);
  };

  const handleConvertToOrder = async (e) => {
    e.preventDefault();
    
    if (!convertFormData.po_number.trim()) {
      toast.error('Customer PO Number is required');
      return;
    }
    
    try {
      // First get the full quotation details
      const qtResponse = await fetch(`${API_URL}/api/sales/quotations/${convertingQuotation.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const quotation = await qtResponse.json();
      
      // Create order with Customer PO as identifier
      const orderData = {
        quotation_id: quotation.id,
        enquiry_id: quotation.enquiry_id,
        customer_name: quotation.customer_name,
        customer_address: quotation.customer_address,
        customer_gst: quotation.customer_gst,
        customer_contact: quotation.customer_contact,
        customer_phone: quotation.customer_phone,
        customer_email: quotation.customer_email,
        date: new Date().toISOString().split('T')[0],
        delivery_date: convertFormData.delivery_date || null,
        po_number: convertFormData.po_number.trim(),
        po_date: convertFormData.po_date,
        acceptance_type: convertFormData.acceptance_type,
        acceptance_remarks: convertFormData.acceptance_remarks,
        items: quotation.items || [],
        subtotal: quotation.subtotal || 0,
        gst_percent: quotation.gst_percent || 18,
        gst_amount: quotation.gst_amount || 0,
        total_amount: quotation.total_amount || 0,
        payment_terms: quotation.payment_terms,
        delivery_terms: quotation.delivery_terms,
        notes: quotation.notes,
        category: quotation.category
      };
      
      const response = await fetch(`${API_URL}/api/sales/orders`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create order');
      }
      
      // Update quotation status to accepted
      await fetch(`${API_URL}/api/sales/quotations/${convertingQuotation.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'accepted' })
      });
      
      toast.success(`Order created with PO: ${convertFormData.po_number}`);
      setShowConvertModal(false);
      setConvertingQuotation(null);
      fetchQuotations();
      fetchStats();
    } catch (error) {
      console.error('Error converting to order:', error);
      toast.error(error.message || 'Failed to convert to order');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/sales/quotations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete quotation');
      
      toast.success('Quotation deleted!');
      fetchQuotations();
      fetchStats();
      fetchEnquiries(); // Refresh enquiries as status may have changed
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast.error('Failed to delete quotation');
    }
  };

  const resetForm = () => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    
    setFormData({
      enquiry_id: '',
      customer_name: '',
      customer_address: '',
      shipping_address: '',
      customer_gst: '',
      gst_treatment: 'registered_regular',
      place_of_supply: '',
      customer_contact: '',
      customer_phone: '',
      customer_email: '',
      salesperson: '',
      salesperson_name: '',
      reference_no: '',
      date: new Date().toISOString().split('T')[0],
      valid_until: validUntilDate.toISOString().split('T')[0],
      subject: '',
      delivery_days: '',
      kind_attention: '',
      transport_mode: '',
      incoterms: '',
      items: [{ id: '1', sno: 1, description: '', hsn_sac: '', unit: 'Nos', quantity: 1, unit_price: 0, total: 0 }],
      subtotal: 0,
      discount_total: 0,
      gst_percent: 18,
      gst_amount: 0,
      total_amount: 0,
      terms_conditions: '',
      payment_terms: '50% Advance, 50% on delivery',
      delivery_terms: '2-3 weeks from order confirmation',
      notes: '',
      category: ''
    });
    setSelectedEnquiry(null);
  };

  const openEditModal = (qt) => {
    setEditingQuotation(qt);
    setFormData({
      enquiry_id: qt.enquiry_id || '',
      customer_name: qt.customer_name || '',
      customer_address: qt.customer_address || '',
      shipping_address: qt.shipping_address || '',
      customer_gst: qt.customer_gst || '',
      gst_treatment: qt.gst_treatment || 'registered_regular',
      place_of_supply: qt.place_of_supply || '',
      customer_contact: qt.customer_contact || '',
      customer_phone: qt.customer_phone || '',
      customer_email: qt.customer_email || '',
      salesperson: qt.salesperson || '',
      salesperson_name: qt.salesperson_name || '',
      reference_no: qt.reference_no || '',
      date: formatDateForInput(qt.date) || '',
      valid_until: formatDateForInput(qt.valid_until) || '',
      subject: qt.subject || '',
      delivery_days: qt.delivery_days || '',
      kind_attention: qt.kind_attention || '',
      transport_mode: qt.transport_mode || '',
      incoterms: qt.incoterms || '',
      items: qt.items?.length ? qt.items : [{ id: '1', sno: 1, description: '', hsn_sac: '', unit: 'Nos', quantity: 1, unit_price: 0, total: 0 }],
      subtotal: qt.subtotal || 0,
      discount_total: qt.discount_total || 0,
      gst_percent: qt.gst_percent || 18,
      gst_amount: qt.gst_amount || 0,
      total_amount: qt.total_amount || 0,
      terms_conditions: qt.terms_conditions || '',
      payment_terms: qt.payment_terms || '',
      delivery_terms: qt.delivery_terms || '',
      notes: qt.notes || '',
      category: qt.category || ''
    });
    
    // Set selected enquiry if linked
    if (qt.enquiry_id) {
      const linkedEnquiry = enquiries.find(e => e.id === qt.enquiry_id);
      setSelectedEnquiry(linkedEnquiry);
    }
    
    setShowAddModal(true);
  };

  const getStatusColor = (status) => {
    const found = statuses.find(s => s.value === status);
    return found ? found.color : 'bg-slate-100 text-slate-700';
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards = [
    { title: 'Total Quotations', value: stats.total, color: 'bg-slate-50 border-slate-200' },
    { title: 'Draft', value: stats.draft, color: 'bg-slate-50 border-slate-200' },
    { title: 'Sent', value: stats.sent, color: 'bg-blue-50 border-blue-200' },
    { title: 'Accepted', value: stats.accepted, color: 'bg-green-50 border-green-200' },
    { title: 'Total Value', value: formatCurrency(stats.total_value), color: 'bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="space-y-6" data-testid="quotations-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-slate-500 mt-1">Manage sales quotations and proposals</p>
        </div>
        <button 
          onClick={() => { resetForm(); setEditingQuotation(null); setShowAddModal(true); }} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          data-testid="add-quotation-btn"
        >
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className={`p-4 rounded-xl border ${card.color}`}>
            <p className="text-sm text-slate-500">{card.title}</p>
            <p className="text-2xl font-bold mt-1 text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Status</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { fetchQuotations(); fetchStats(); }}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quote No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Valid Until</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
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
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No quotations found</p>
                  </td>
                </tr>
              ) : (
                quotations.map((qt) => (
                  <tr key={qt.id} className="hover:bg-slate-50" data-testid={`quotation-row-${qt.id}`}>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-slate-900">{qt.quotation_no}</span>
                        {qt.enquiry_id && (
                          <span className="ml-2 text-xs text-blue-600 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> Linked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{qt.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDateForDisplay(qt.date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDateForDisplay(qt.valid_until)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                      {formatCurrency(qt.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-block">
                        <select
                          value={qt.status}
                          onChange={(e) => handleStatusChange(qt.id, e.target.value)}
                          className={`px-2 py-1 text-xs font-medium rounded-full appearance-none cursor-pointer pr-6 ${getStatusColor(qt.status)}`}
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
                          onClick={() => openEditModal(qt)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {(qt.status === 'sent' || qt.status === 'accepted') && !qt.order_id && (
                          <button 
                            onClick={() => openConvertModal(qt)}
                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Convert to Order"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        {qt.order_id && (
                          <span className="p-1.5 text-green-600" title="Order Created">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                        <button 
                          onClick={() => handleDelete(qt.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
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
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingQuotation ? 'Edit Quotation' : 'New Quotation'}
                </h3>
                {selectedEnquiry && (
                  <p className="text-sm text-blue-600 flex items-center gap-1">
                    <Link2 className="w-4 h-4" /> Linked to {selectedEnquiry.enquiry_no}
                  </p>
                )}
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditingQuotation(null); resetForm(); }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
              {/* Link to Enquiry Section */}
              {!editingQuotation && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-3">
                    <FileSearch className="w-4 h-4" /> Link to Enquiry (Optional)
                  </h4>
                  <select
                    value={formData.enquiry_id}
                    onChange={(e) => handleEnquirySelect(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    disabled={loadingEnquiries}
                  >
                    <option value="">-- Select an Enquiry to auto-fill --</option>
                    {enquiries.map(enq => (
                      <option key={enq.id} value={enq.id}>
                        {enq.enquiry_no} - {enq.company_name} - {enq.description?.substring(0, 40)}...
                      </option>
                    ))}
                  </select>
                  {loadingEnquiries && (
                    <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Loading enquiries...
                    </p>
                  )}
                </div>
              )}

              {/* Customer Information - Zoho Style */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Customer Information
                  </h4>
                  
                  {/* Customer Name with autocomplete */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      list="customer-names"
                      value={formData.customer_name}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Start typing to search customers..."
                    />
                    <datalist id="customer-names">
                      {customers.map(c => (
                        <option key={c.id || c.name} value={c.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* GST Fields */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">GST Treatment</label>
                      <select
                        value={formData.gst_treatment}
                        onChange={(e) => setFormData({...formData, gst_treatment: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {gstTreatments.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
                      <input
                        type="text"
                        value={formData.customer_gst}
                        onChange={(e) => setFormData({...formData, customer_gst: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder="e.g., 33AABCU9603R1ZM"
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Place of Supply</label>
                      <select
                        value={formData.place_of_supply}
                        onChange={(e) => setFormData({...formData, place_of_supply: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select State</option>
                        {indianStates.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                    {/* Billing & Shipping Address */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                        <textarea
                          rows={3}
                          value={formData.customer_address}
                          onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Full billing address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                          <span>Shipping Address</span>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, shipping_address: formData.customer_address})}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Copy from Billing
                          </button>
                        </label>
                        <textarea
                          rows={3}
                          value={formData.shipping_address}
                          onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Shipping address (if different)"
                        />
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kind Attention</label>
                        <input
                          type="text"
                          value={formData.kind_attention}
                          onChange={(e) => setFormData({...formData, kind_attention: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Contact person name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.customer_email}
                          onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              {/* Quotation Details - Horizontal Layout */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4" /> Quotation Details
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                    <input
                      type="text"
                      value={(() => {
                        const now = new Date();
                        const month = now.getMonth() + 1;
                        const year = now.getFullYear();
                        if (month >= 4) {
                          return `${year % 100}-${(year + 1) % 100}`;
                        } else {
                          return `${(year - 1) % 100}-${year % 100}`;
                        }
                      })()}
                      disabled
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-sm text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quote Number</label>
                    <input
                      type="text"
                      value={editingQuotation ? editingQuotation.quotation_no : 'Auto-generated'}
                      disabled
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-sm text-slate-600 font-mono"
                      placeholder="Quote/25-26/0001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Quote Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.valid_until}
                      onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>
                </div>
                
                {/* Second row: Salesperson, Delivery Days, Payment Terms */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Salesperson</label>
                    <select
                      value={formData.salesperson}
                      onChange={(e) => {
                        const member = teamMembers.find(m => m.id === e.target.value);
                        setFormData({
                          ...formData, 
                          salesperson: e.target.value,
                          salesperson_name: member?.name || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    >
                      <option value="">Select Salesperson</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Delivery in Days</label>
                    <input
                      type="number"
                      value={formData.delivery_days}
                      onChange={(e) => setFormData({...formData, delivery_days: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="e.g., 30"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                    <select
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    >
                      {paymentTermsOptions.map(pt => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Description</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Brief description of the quotation"
                />
              </div>

              {/* Line Items */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Line Items
                  </h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 w-10">S.No</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 min-w-[200px]">Description</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 w-24">HSN/SAC</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 w-20">Unit</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-slate-600 w-16">Qty</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-slate-600 w-24">Rate (₹)</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-slate-600 w-24">Amount (₹)</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="px-2 py-2 text-sm text-slate-600">{item.sno}</td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                              placeholder="Item description"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={item.hsn_sac || ''}
                              onChange={(e) => updateItem(idx, 'hsn_sac', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                              placeholder="HSN/SAC"
                              maxLength={8}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                            >
                              {unitOptions.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="px-2 py-2 text-sm text-right font-medium text-slate-900">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-2 py-2">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">GST</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={formData.gst_percent}
                        onChange={(e) => handleGstChange(parseFloat(e.target.value))}
                        className="px-2 py-1 border border-slate-200 rounded text-sm"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                      <span className="font-medium w-24 text-right">{formatCurrency(formData.gst_amount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-300">
                    <span>Total Amount</span>
                    <span className="text-green-600">{formatCurrency(formData.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Transport & Shipping Details */}
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <h4 className="font-medium text-teal-900 flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4" /> Transport & Shipping
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Transport Mode</label>
                    <select
                      value={formData.transport_mode}
                      onChange={(e) => setFormData({...formData, transport_mode: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                      <option value="">Select Transport Mode</option>
                      {transportModes.map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Incoterms
                    </label>
                    <select
                      value={formData.incoterms}
                      onChange={(e) => setFormData({...formData, incoterms: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                      <option value="">Select Incoterms</option>
                      {incotermsOptions.map(term => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">International Commercial Terms (Incoterms 2020)</p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Terms</label>
                  <textarea
                    rows={2}
                    value={formData.delivery_terms}
                    onChange={(e) => setFormData({...formData, delivery_terms: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="e.g., 2-3 weeks from order confirmation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({...formData, terms_conditions: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Additional terms and conditions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Notes for internal use (not shown on quotation)"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingQuotation(null); resetForm(); }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  {editingQuotation ? 'Update Quotation' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Order Modal */}
      {showConvertModal && convertingQuotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Convert to Order</h3>
                <p className="text-sm text-slate-500">Enter customer PO details to create order</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertToOrder} className="p-4 space-y-4">
              {/* Quotation Info */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Quotation:</strong> {convertingQuotation.quotation_no}
                </p>
                <p className="text-sm text-blue-700">
                  {convertingQuotation.customer_name} • ₹{(convertingQuotation.total_amount || 0).toLocaleString('en-IN')}
                </p>
              </div>

              {/* Customer PO Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer PO Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={convertFormData.po_number}
                  onChange={(e) => setConvertFormData({...convertFormData, po_number: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g., PO/2026/12345"
                />
                <p className="text-xs text-slate-500 mt-1">This will be used as the Order reference number</p>
              </div>

              {/* PO Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PO Date</label>
                <input
                  type="date"
                  value={convertFormData.po_date}
                  onChange={(e) => setConvertFormData({...convertFormData, po_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Acceptance Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Acceptance Type</label>
                <select
                  value={convertFormData.acceptance_type}
                  onChange={(e) => setConvertFormData({...convertFormData, acceptance_type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="written_po">Written PO</option>
                  <option value="email">Email Confirmation</option>
                  <option value="verbal">Verbal Acceptance</option>
                  <option value="loi">Letter of Intent (LOI)</option>
                </select>
              </div>

              {/* Expected Delivery Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={convertFormData.delivery_date}
                  onChange={(e) => setConvertFormData({...convertFormData, delivery_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={convertFormData.acceptance_remarks}
                  onChange={(e) => setConvertFormData({...convertFormData, acceptance_remarks: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                  placeholder="Any additional notes about this order..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotations;
