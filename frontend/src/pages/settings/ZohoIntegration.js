import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Link2, Unlink, CheckCircle2, AlertCircle, 
  Users, Building2, FileText, ShoppingCart, CreditCard,
  ExternalLink, Clock, Database, Loader2, ChevronDown, ChevronUp,
  Eye, X
} from 'lucide-react';
import api from '../../services/api';

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

const ZohoIntegration = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [viewData, setViewData] = useState(null);
  const [viewType, setViewType] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/zoho/status');
      setStatus(response.data);
    } catch (err) {
      console.error('Error fetching Zoho status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await api.get('/zoho/auth-url');
      if (response.data.auth_url) {
        window.open(response.data.auth_url, '_blank', 'width=600,height=700');
      }
    } catch (err) {
      alert('Error getting auth URL: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSync = async (type) => {
    try {
      setSyncing(prev => ({ ...prev, [type]: true }));
      const response = await api.post(`/zoho/sync/${type}`);
      alert(response.data.message);
      fetchStatus();
    } catch (err) {
      alert('Sync error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSyncing(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(prev => ({ ...prev, all: true }));
      const response = await api.post('/zoho/sync/all');
      alert('Sync completed! Check results below.');
      fetchStatus();
    } catch (err) {
      alert('Sync error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSyncing(prev => ({ ...prev, all: false }));
    }
  };

  const handleViewData = async (type) => {
    try {
      setLoadingData(true);
      setViewType(type);
      const response = await api.get(`/zoho/${type}`);
      setViewData(response.data);
    } catch (err) {
      alert('Error loading data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingData(false);
    }
  };

  const closeViewModal = () => {
    setViewData(null);
    setViewType(null);
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const syncItems = [
    { key: 'customers', label: 'Customers', icon: Users, color: 'blue' },
    { key: 'vendors', label: 'Vendors', icon: Building2, color: 'purple' },
    { key: 'invoices', label: 'Invoices', icon: FileText, color: 'green' },
    { key: 'salesorders', label: 'Sales Orders', icon: ShoppingCart, color: 'orange' },
    { key: 'payments', label: 'Payments', icon: CreditCard, color: 'teal' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Zoho Books Integration</h1>
          <p className="text-slate-500">One-way sync from Zoho Books to Smarthub ERP</p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh Status
        </button>
      </div>

      {/* Connection Status */}
      <div className={`rounded-xl border p-5 ${status?.connected ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {status?.connected ? (
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="text-green-600" size={24} />
              </div>
            ) : (
              <div className="p-3 bg-slate-200 rounded-lg">
                <Unlink className="text-slate-500" size={24} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {status?.connected ? 'Connected to Zoho Books' : 'Not Connected'}
              </h2>
              <p className="text-sm text-slate-500">
                {status?.connected 
                  ? `Organization ID: ${status?.zoho_org_id} | Region: ${status?.zoho_region?.toUpperCase()}`
                  : 'Click Connect to authorize Zoho Books access'
                }
              </p>
            </div>
          </div>
          
          {!status?.connected ? (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Link2 size={16} />
              Connect to Zoho
            </button>
          ) : (
            <button
              onClick={handleSyncAll}
              disabled={syncing.all}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {syncing.all ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sync All Data
            </button>
          )}
        </div>
        
        {status?.last_sync && (
          <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-2 text-sm text-green-700">
            <Clock size={14} />
            Last synced: {formatDate(status.last_sync)}
          </div>
        )}
      </div>

      {/* Sync Options */}
      {status?.connected && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Database size={20} />
              Data Sync Options
            </h2>
            <p className="text-sm text-slate-500">Click individual buttons to sync specific data types</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {syncItems.map((item) => {
              const Icon = item.icon;
              const count = status?.sync_counts?.[item.key] || 0;
              
              return (
                <div key={item.key} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${item.color}-100 rounded-lg`}>
                        <Icon className={`text-${item.color}-600`} size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{item.label}</h3>
                        <p className="text-xs text-slate-500">{count} records synced</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(item.key)}
                      disabled={syncing[item.key]}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 text-sm"
                      data-testid={`sync-${item.key}-btn`}
                    >
                      {syncing[item.key] ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Sync
                    </button>
                    <button
                      onClick={() => handleViewData(item.key)}
                      disabled={loadingData && viewType === item.key}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 text-sm"
                      data-testid={`view-${item.key}-btn`}
                    >
                      {loadingData && viewType === item.key ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Eye size={14} />
                      )}
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!status?.connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-800 mb-3">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
            <li>Go to <a href="https://api-console.zoho.in" target="_blank" rel="noopener noreferrer" className="underline">Zoho API Console</a></li>
            <li>Create a "Server-based Application"</li>
            <li>Add your Client ID, Client Secret, and Organization ID to the .env file</li>
            <li>Click "Connect to Zoho" button above</li>
            <li>Authorize the application in the popup window</li>
            <li>Start syncing data!</li>
          </ol>
        </div>
      )}

      {/* Synced Data Preview */}
      {status?.connected && status?.sync_counts && Object.keys(status.sync_counts).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Sync Summary</h3>
          <div className="grid grid-cols-5 gap-4">
            {syncItems.map((item) => {
              const count = status?.sync_counts?.[item.key] || 0;
              return (
                <div key={item.key} className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-800">{count}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Data Modal */}
      {viewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="view-data-modal">
          <div className="bg-white rounded-xl w-[90%] max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-800 capitalize flex items-center gap-2">
                <Database size={18} />
                {viewType} Data ({viewData?.count || 0} records)
              </h3>
              <button
                onClick={closeViewModal}
                className="p-2 hover:bg-slate-200 rounded-lg"
                data-testid="close-modal-btn"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(80vh-80px)]">
              {viewData?.count === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Database size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No {viewType} data synced yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Render based on data type */}
                  {viewType === 'customers' && viewData?.customers?.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{item.contact_name || item.company_name}</p>
                          <p className="text-sm text-slate-500">{item.email} • {item.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">Outstanding: {formatCurrency(item.outstanding_receivable_amount)}</p>
                          <p className="text-xs text-slate-400">GST: {item.gst_no || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {viewType === 'vendors' && viewData?.vendors?.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{item.contact_name || item.company_name}</p>
                          <p className="text-sm text-slate-500">{item.email} • {item.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">Payable: {formatCurrency(item.outstanding_payable_amount)}</p>
                          <p className="text-xs text-slate-400">GST: {item.gst_no || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {viewType === 'invoices' && viewData?.invoices?.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{item.invoice_number}</p>
                          <p className="text-sm text-slate-500">{item.customer_name} • {item.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(item.total)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.status === 'paid' ? 'bg-green-100 text-green-700' : 
                            item.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>{item.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {viewType === 'salesorders' && viewData?.salesorders?.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{item.salesorder_number}</p>
                          <p className="text-sm text-slate-500">{item.customer_name} • {item.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(item.total)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                            item.status === 'draft' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'
                          }`}>{item.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {viewType === 'payments' && viewData?.payments?.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{item.payment_number}</p>
                          <p className="text-sm text-slate-500">{item.customer_name} • {item.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">{formatCurrency(item.amount)}</p>
                          <p className="text-xs text-slate-400">{item.payment_mode || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZohoIntegration;
