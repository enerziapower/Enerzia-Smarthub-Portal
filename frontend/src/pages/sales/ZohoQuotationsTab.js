import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Search, Eye, Edit2, Trash2, Plus, Send, CheckCircle, XCircle,
  ArrowRight, Calendar, Building2, DollarSign, FileText, ExternalLink,
  Cloud, AlertCircle, X, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ZohoQuotationsTab = () => {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoCustomers, setZohoCustomers] = useState([]);
  
  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [estimateDetail, setEstimateDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Form data for create/edit
  const [formData, setFormData] = useState({
    customer_id: '',
    reference_number: '',
    date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    subject: '',
    salesperson_name: '',
    line_items: [{ name: '', description: '', quantity: 1, rate: 0, unit: 'Nos', hsn_or_sac: '' }],
    notes: '',
    terms: '',
    discount: 0
  });
  
  const [saving, setSaving] = useState(false);

  const statuses = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
    { value: 'invoiced', label: 'Invoiced', color: 'bg-purple-100 text-purple-700' },
    { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
    { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
    { value: 'expired', label: 'Expired', color: 'bg-amber-100 text-amber-700' },
  ];

  const getStatusColor = (status) => {
    const statusObj = statuses.find(s => s.value === status);
    return statusObj?.color || 'bg-slate-100 text-slate-700';
  };

  const getToken = () => localStorage.getItem('token');

  const checkZohoConnection = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/zoho/status`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setZohoConnected(data.connected);
      return data.connected;
    } catch (error) {
      console.error('Error checking Zoho status:', error);
      return false;
    }
  }, []);

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/zoho/estimates`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to fetch estimates');
      const data = await res.json();
      setEstimates(data.estimates || []);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load Zoho quotations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchZohoCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/zoho/customers`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setZohoCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching Zoho customers:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const connected = await checkZohoConnection();
      if (connected) {
        await Promise.all([fetchEstimates(), fetchZohoCustomers()]);
      }
      setLoading(false);
    };
    init();
  }, [checkZohoConnection, fetchEstimates, fetchZohoCustomers]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`${API_URL}/api/zoho/sync/estimates`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Sync failed');
      toast.success(`Synced ${data.count} quotations from Zoho Books`);
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to sync quotations');
    } finally {
      setSyncing(false);
    }
  };

  const handleViewDetail = async (estimate) => {
    try {
      setSelectedEstimate(estimate);
      setLoadingDetail(true);
      setShowDetailModal(true);
      
      const res = await fetch(`${API_URL}/api/zoho/estimates/${estimate.zoho_estimate_id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to fetch estimate details');
      const data = await res.json();
      setEstimateDetail(data.estimate);
    } catch (error) {
      toast.error('Failed to load estimate details');
      console.error(error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      customer_id: '',
      reference_number: '',
      date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      subject: '',
      salesperson_name: '',
      line_items: [{ name: '', description: '', quantity: 1, rate: 0, unit: 'Nos', hsn_or_sac: '' }],
      notes: '',
      terms: '',
      discount: 0
    });
    setShowCreateModal(true);
  };

  const handleEdit = async (estimate) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`${API_URL}/api/zoho/estimates/${estimate.zoho_estimate_id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to fetch estimate details');
      const data = await res.json();
      const est = data.estimate;
      
      setSelectedEstimate(estimate);
      setFormData({
        customer_id: est.customer_id || '',
        reference_number: est.reference_number || '',
        date: est.date || '',
        expiry_date: est.expiry_date || '',
        subject: est.subject || '',
        salesperson_name: est.salesperson_name || '',
        line_items: est.line_items?.length > 0 
          ? est.line_items.map(item => ({
              name: item.name || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              unit: item.unit || 'Nos',
              hsn_or_sac: item.hsn_or_sac || ''
            }))
          : [{ name: '', description: '', quantity: 1, rate: 0, unit: 'Nos', hsn_or_sac: '' }],
        notes: est.notes || '',
        terms: est.terms || '',
        discount: est.discount || 0
      });
      setShowEditModal(true);
    } catch (error) {
      toast.error('Failed to load estimate for editing');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveCreate = async () => {
    try {
      setSaving(true);
      
      if (!formData.customer_id) {
        toast.error('Please select a customer');
        return;
      }
      
      if (!formData.line_items.some(item => item.name)) {
        toast.error('Please add at least one item');
        return;
      }
      
      const res = await fetch(`${API_URL}/api/zoho/estimates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          reference_number: formData.reference_number,
          date: formData.date,
          expiry_date: formData.expiry_date,
          subject: formData.subject,
          salesperson_name: formData.salesperson_name,
          line_items: formData.line_items.filter(item => item.name),
          notes: formData.notes,
          terms: formData.terms,
          discount: formData.discount
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create estimate');
      
      toast.success('Quotation created in Zoho Books');
      setShowCreateModal(false);
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to create quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      
      const res = await fetch(`${API_URL}/api/zoho/estimates/${selectedEstimate.zoho_estimate_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          reference_number: formData.reference_number,
          date: formData.date,
          expiry_date: formData.expiry_date,
          subject: formData.subject,
          salesperson_name: formData.salesperson_name,
          line_items: formData.line_items.filter(item => item.name),
          notes: formData.notes,
          terms: formData.terms,
          discount: formData.discount
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update estimate');
      
      toast.success('Quotation updated in Zoho Books');
      setShowEditModal(false);
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to update quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (estimate) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${estimate.estimate_number}? This will also delete it from Zoho Books.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/zoho/estimates/${estimate.zoho_estimate_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete');
      }
      
      toast.success('Quotation deleted from Zoho Books');
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to delete quotation');
    }
  };

  const handleSendEmail = async (estimate) => {
    const email = prompt('Enter customer email to send quotation:');
    if (!email) return;
    
    try {
      const res = await fetch(`${API_URL}/api/zoho/estimates/${estimate.zoho_estimate_id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to_emails: [email] })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to send');
      }
      
      toast.success('Quotation sent via email');
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to send quotation');
    }
  };

  const handleMarkAccepted = async (estimate) => {
    try {
      const res = await fetch(`${API_URL}/api/zoho/estimates/${estimate.zoho_estimate_id}/mark-as-accepted`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update status');
      }
      
      toast.success('Quotation marked as accepted');
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to mark as accepted');
    }
  };

  const handleMarkDeclined = async (estimate) => {
    try {
      const res = await fetch(`${API_URL}/api/zoho/estimates/${estimate.zoho_estimate_id}/mark-as-declined`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update status');
      }
      
      toast.success('Quotation marked as declined');
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to mark as declined');
    }
  };

  const handleConvertToOrder = async (estimate) => {
    if (!window.confirm(`Convert "${estimate.estimate_number}" to a Sales Order? This will create a new order in Order Management.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/zoho/estimates/${estimate.zoho_estimate_id}/convert-to-order`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to convert');
      
      toast.success(`Created Sales Order: ${data.order.order_number}`);
      await fetchEstimates();
    } catch (error) {
      toast.error(error.message || 'Failed to convert to order');
    }
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { name: '', description: '', quantity: 1, rate: 0, unit: 'Nos', hsn_or_sac: '' }]
    }));
  };

  const removeLineItem = (index) => {
    if (formData.line_items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const updateLineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount, symbol = '₹') => {
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  // Filter estimates
  const filteredEstimates = estimates.filter(est => {
    const matchesSearch = !searchTerm || 
      est.estimate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      est.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      est.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || est.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Not connected state
  if (!zohoConnected && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Cloud size={48} className="text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">Zoho Books Not Connected</h3>
        <p className="text-slate-500 mb-4 text-center max-w-md">
          Connect your Zoho Books account to sync and manage quotations. 
          Go to Settings → Zoho Integration to connect.
        </p>
        <a 
          href="/settings/zoho" 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <ExternalLink size={16} />
          Go to Zoho Settings
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Zoho quotations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-72 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg"
          >
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync from Zoho'}
          </button>
          
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            Create in Zoho
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-800">{estimates.length}</div>
          <div className="text-sm text-slate-500">Total Quotations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-600">{estimates.filter(e => e.status === 'draft').length}</div>
          <div className="text-sm text-slate-500">Draft</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-blue-600">{estimates.filter(e => e.status === 'sent').length}</div>
          <div className="text-sm text-slate-500">Sent</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-green-600">{estimates.filter(e => e.status === 'accepted').length}</div>
          <div className="text-sm text-slate-500">Accepted</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(estimates.reduce((sum, e) => sum + (e.total || 0), 0))}
          </div>
          <div className="text-sm text-slate-500">Total Value</div>
        </div>
      </div>

      {/* Quotations List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-blue-600" />
        </div>
      ) : filteredEstimates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No Zoho Quotations</h3>
          <p className="text-slate-500 mt-1">
            {searchTerm || statusFilter ? 'No quotations match your filters' : 'Sync quotations from Zoho Books or create a new one'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Quote #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEstimates.map(estimate => (
                <tr key={estimate.zoho_estimate_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{estimate.estimate_number}</div>
                    {estimate.reference_number && (
                      <div className="text-xs text-slate-500">Ref: {estimate.reference_number}</div>
                    )}
                    {estimate.converted_to_order && (
                      <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle size={12} />
                        Order: {estimate.erp_order_number}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{estimate.customer_name || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(estimate.date)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(estimate.expiry_date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      {formatCurrency(estimate.total, estimate.currency_symbol || '₹')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(estimate.status)}`}>
                      {estimate.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewDetail(estimate)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(estimate)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleSendEmail(estimate)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Send Email"
                      >
                        <Send size={16} />
                      </button>
                      {estimate.status !== 'accepted' && !estimate.converted_to_order && (
                        <button
                          onClick={() => handleMarkAccepted(estimate)}
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Mark as Accepted"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {estimate.status === 'accepted' && !estimate.converted_to_order && (
                        <button
                          onClick={() => handleConvertToOrder(estimate)}
                          className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                          title="Convert to Order"
                        >
                          <ArrowRight size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(estimate)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                Quotation: {selectedEstimate?.estimate_number}
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingDetail ? (
                <div className="flex justify-center py-12">
                  <RefreshCw size={24} className="animate-spin text-blue-600" />
                </div>
              ) : estimateDetail ? (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Customer</h3>
                      <div className="text-slate-800 font-medium">{estimateDetail.customer_name}</div>
                      {estimateDetail.billing_address && (
                        <div className="text-sm text-slate-500 mt-1">{estimateDetail.billing_address.address}</div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Dates</h3>
                      <div className="text-sm space-y-1">
                        <div><span className="text-slate-500">Date:</span> {formatDate(estimateDetail.date)}</div>
                        <div><span className="text-slate-500">Expiry:</span> {formatDate(estimateDetail.expiry_date)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Line Items */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-3">Items</h3>
                    <table className="w-full border border-slate-200 rounded">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Item</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Rate</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {estimateDetail.line_items?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <div className="font-medium">{item.name}</div>
                              {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.rate)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.item_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Sub Total:</span>
                          <span>{formatCurrency(estimateDetail.sub_total)}</span>
                        </div>
                        {estimateDetail.discount > 0 && (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>Discount:</span>
                            <span>-{formatCurrency(estimateDetail.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Tax:</span>
                          <span>{formatCurrency(estimateDetail.tax_total)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Total:</span>
                          <span>{formatCurrency(estimateDetail.total, estimateDetail.currency_symbol)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes & Terms */}
                  {(estimateDetail.notes || estimateDetail.terms) && (
                    <div className="grid grid-cols-2 gap-6 border-t pt-4">
                      {estimateDetail.notes && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-500 mb-2">Notes</h3>
                          <div className="text-sm text-slate-700 whitespace-pre-wrap">{estimateDetail.notes}</div>
                        </div>
                      )}
                      {estimateDetail.terms && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-500 mb-2">Terms & Conditions</h3>
                          <div className="text-sm text-slate-700 whitespace-pre-wrap">{estimateDetail.terms}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Failed to load estimate details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {showCreateModal ? 'Create Quotation in Zoho' : 'Edit Quotation'}
              </h2>
              <button 
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Customer & Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="">Select Customer</option>
                      {zohoCustomers.map(c => (
                        <option key={c.zoho_contact_id} value={c.zoho_contact_id}>
                          {c.contact_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="e.g., PO-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quote Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="Brief description of the quotation"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">Line Items</label>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.line_items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-slate-50 p-3 rounded-lg">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                            placeholder="Item Name *"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                            placeholder="Description"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                            placeholder="Qty"
                            min="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                            placeholder="Rate"
                            min="0"
                          />
                        </div>
                        <div className="col-span-1">
                          <select
                            value={item.unit}
                            onChange={(e) => updateLineItem(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                          >
                            <option value="Nos">Nos</option>
                            <option value="Set">Set</option>
                            <option value="Kg">Kg</option>
                            <option value="M">M</option>
                            <option value="Sqm">Sqm</option>
                            <option value="Ltr">Ltr</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            value={item.hsn_or_sac}
                            onChange={(e) => updateLineItem(idx, 'hsn_or_sac', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                            placeholder="HSN"
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            disabled={formData.line_items.length <= 1}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes & Terms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      rows={3}
                      placeholder="Additional notes for customer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
                    <textarea
                      value={formData.terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      rows={3}
                      placeholder="Terms and conditions"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-slate-50">
              <button
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={showCreateModal ? handleSaveCreate : handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <RefreshCw size={16} className="animate-spin" />}
                {showCreateModal ? 'Create in Zoho' : 'Update in Zoho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZohoQuotationsTab;
