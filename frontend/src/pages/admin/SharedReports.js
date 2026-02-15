import React, { useState, useEffect } from 'react';
import { 
  Share2, Search, Trash2, Plus, X, FileText, Users, 
  Loader2, Check, Filter, Building2, Mail
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SharedReports = () => {
  const [loading, setLoading] = useState(true);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, [filterCustomer, filterDocType]);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      // Load shared documents
      let url = `${API}/api/customer-portal/admin/shared-documents`;
      const params = new URLSearchParams();
      if (filterCustomer) params.append('customer_id', filterCustomer);
      if (filterDocType) params.append('document_type', filterDocType);
      if (params.toString()) url += `?${params.toString()}`;

      const sharedRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sharedData = await sharedRes.json();
      setSharedDocs(sharedData.shared_documents || []);

      // Load customers
      const customersRes = await fetch(`${API}/api/customer-portal/admin/customers-list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const customersData = await customersRes.json();
      setCustomers(customersData.customers || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDocs = async (docType) => {
    const token = localStorage.getItem('token');
    try {
      let url = `${API}/api/customer-portal/admin/available-documents`;
      const params = new URLSearchParams();
      if (docType) params.append('document_type', docType);
      if (searchTerm) params.append('search', searchTerm);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAvailableDocs(data.documents || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleShare = async (doc) => {
    if (!selectedCustomer) {
      setMessage({ type: 'error', text: 'Please select a customer' });
      return;
    }

    const token = localStorage.getItem('token');
    setSharing(true);
    
    try {
      const res = await fetch(`${API}/api/customer-portal/admin/share-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: selectedCustomer,
          document_type: doc.document_type,
          document_id: doc.id,
          document_name: doc.document_name
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Document shared successfully!' });
        loadData();
        setShowShareModal(false);
        setSelectedCustomer('');
        setSelectedDocType('');
        setAvailableDocs([]);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.detail || 'Failed to share document' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error sharing document' });
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async (shareId) => {
    if (!window.confirm('Remove this document sharing?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/customer-portal/admin/share-document/${shareId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Document unshared' });
        loadData();
      }
    } catch (err) {
      console.error('Error unsharing:', err);
    }
  };

  const getDocTypeLabel = (type) => {
    const labels = {
      test_report: 'Test Report',
      ir_thermography: 'IR Thermography',
      wcc: 'WCC',
      calibration: 'Calibration',
      amc_report: 'AMC Report'
    };
    return labels[type] || type;
  };

  const getDocTypeBadgeColor = (type) => {
    const colors = {
      test_report: 'bg-blue-500/20 text-blue-400',
      ir_thermography: 'bg-red-500/20 text-red-400',
      wcc: 'bg-amber-500/20 text-amber-400',
      calibration: 'bg-purple-500/20 text-purple-400',
      amc_report: 'bg-emerald-500/20 text-emerald-400'
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Share2 className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Shared Reports</h1>
            <p className="text-sm text-slate-500">Manage documents shared with customers</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowShareModal(true);
            loadAvailableDocs('');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Share Document
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.company_name})</option>
            ))}
          </select>
          <select
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Document Types</option>
            <option value="test_report">Test Reports</option>
            <option value="ir_thermography">IR Thermography</option>
            <option value="wcc">WCC</option>
            <option value="calibration">Calibration</option>
            <option value="amc_report">AMC Reports</option>
          </select>
        </div>
      </div>

      {/* Shared Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">
            Shared Documents ({sharedDocs.length})
          </h2>
        </div>
        
        {sharedDocs.length === 0 ? (
          <div className="p-8 text-center">
            <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No documents shared yet</p>
            <p className="text-sm text-slate-400 mt-1">Click "Share Document" to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sharedDocs.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <FileText className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{doc.document_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getDocTypeBadgeColor(doc.document_type)}`}>
                          {getDocTypeLabel(doc.document_type)}
                        </span>
                        <span className="text-xs text-slate-400">
                          Shared {formatDate(doc.shared_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-slate-700">
                        <Users className="w-4 h-4" />
                        {doc.customer_name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Building2 className="w-3 h-3" />
                        {doc.customer_company}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnshare(doc.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove sharing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Share Document with Customer</h2>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSelectedCustomer('');
                  setSelectedDocType('');
                  setAvailableDocs([]);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Customer *
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.company_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Document Type
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => {
                    setSelectedDocType(e.target.value);
                    loadAvailableDocs(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="test_report">Test Reports</option>
                  <option value="ir_thermography">IR Thermography</option>
                  <option value="wcc">WCC</option>
                  <option value="calibration">Calibration</option>
                  <option value="amc_report">AMC Reports</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadAvailableDocs(selectedDocType)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Available Documents */}
              <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                {availableDocs.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No documents found
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {availableDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{doc.document_name}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getDocTypeBadgeColor(doc.document_type)}`}>
                              {getDocTypeLabel(doc.document_type)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleShare(doc)}
                          disabled={sharing || !selectedCustomer}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sharing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                          Share
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedReports;
