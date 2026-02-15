import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { 
  Building2, LogOut, Loader2, AlertCircle, CheckCircle2, 
  Clock, Calendar, ArrowLeft, Wrench, FileText, MapPin,
  Phone, Mail, User
} from 'lucide-react';

const CustomerAMCDetail = () => {
  const navigate = useNavigate();
  const { amcId } = useParams();
  const [loading, setLoading] = useState(true);
  const [amc, setAmc] = useState(null);
  const [serviceHistory, setServiceHistory] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');
    
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }

    if (customerInfo) {
      setCustomer(JSON.parse(customerInfo));
    }

    loadAMCDetail(token);
    loadServiceHistory(token);
  }, [navigate, amcId]);

  const loadAMCDetail = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/customer-portal/amcs/${amcId}?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to load AMC details');
      }

      const data = await response.json();
      setAmc(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceHistory = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/customer-portal/amcs/${amcId}/service-history?token=${token}`);
      
      if (response.ok) {
        const data = await response.json();
        setServiceHistory(data);
      }
    } catch (err) {
      console.error('Error loading service history:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    navigate('/customer-portal/login');
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
      expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Expired' },
      renewed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Renewed' },
      cancelled: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Cancelled' },
      scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Scheduled' },
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
      rescheduled: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Rescheduled' }
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Customer Portal
              </h1>
              <p className="text-slate-400 text-sm">Enerzia Power Solutions</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link 
            to="/customer-portal/amcs"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              AMC Contract Details
            </h2>
            <p className="text-slate-400 text-sm">{amc?.amc_no || 'AMC Details'}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {amc && (
          <>
            {/* AMC Header Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm bg-slate-900 px-3 py-1 rounded border border-slate-700 text-slate-300">
                      {amc.amc_no}
                    </span>
                    {getStatusBadge(amc.status)}
                  </div>
                  <h3 className="text-white font-semibold text-xl mb-2">
                    {amc.project?.project_name || 'Project'}
                  </h3>
                  {amc.project?.location && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <MapPin className="w-4 h-4" />
                      {amc.project.location}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="p-4 bg-slate-900/50 rounded-lg text-center min-w-[120px]">
                    <p className="text-xs text-slate-500 mb-1">Start Date</p>
                    <p className="text-white font-medium">
                      {amc.contract_details?.start_date 
                        ? new Date(amc.contract_details.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-'
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-lg text-center min-w-[120px]">
                    <p className="text-xs text-slate-500 mb-1">End Date</p>
                    <p className="text-white font-medium">
                      {amc.contract_details?.end_date 
                        ? new Date(amc.contract_details.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-700 overflow-x-auto">
              {['overview', 'equipment', 'service-history'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab 
                      ? 'text-emerald-400 border-b-2 border-emerald-400' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'equipment' && 'Equipment'}
                  {tab === 'service-history' && 'Service History'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Contract Details */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Contract Details
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Contract No</span>
                      <span className="text-white text-sm">{amc.contract_details?.contract_no || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Contract Value</span>
                      <span className="text-white text-sm">
                        {amc.contract_details?.contract_value 
                          ? `₹${amc.contract_details.contract_value.toLocaleString('en-IN')}`
                          : '-'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Payment Terms</span>
                      <span className="text-white text-sm">{amc.contract_details?.payment_terms || '-'}</span>
                    </div>
                    {amc.contract_details?.scope_of_work && (
                      <div className="pt-3 border-t border-slate-700">
                        <p className="text-slate-400 text-sm mb-2">Scope of Work</p>
                        <p className="text-white text-sm">{amc.contract_details.scope_of_work}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Provider Info */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Service Provider
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-slate-500 mt-1" />
                      <div>
                        <p className="text-white text-sm font-medium">
                          {amc.service_provider?.company_name || 'Enerzia Power Solutions'}
                        </p>
                        <p className="text-slate-400 text-xs">{amc.service_provider?.address || ''}</p>
                      </div>
                    </div>
                    {amc.service_provider?.contact_person && (
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300 text-sm">{amc.service_provider.contact_person}</span>
                      </div>
                    )}
                    {amc.service_provider?.contact_number && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300 text-sm">{amc.service_provider.contact_number}</span>
                      </div>
                    )}
                    {amc.service_provider?.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300 text-sm">{amc.service_provider.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-400" />
                  Equipment Covered ({amc.equipment_list?.length || 0})
                </h4>
                
                {amc.equipment_list?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                          <th className="pb-3 font-medium">Equipment</th>
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Qty</th>
                          <th className="pb-3 font-medium">Service Frequency</th>
                          <th className="pb-3 font-medium">Next Service</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {amc.equipment_list.map((eq, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50">
                            <td className="py-3 text-white">{eq.equipment_name}</td>
                            <td className="py-3 text-slate-300">{eq.equipment_type}</td>
                            <td className="py-3 text-slate-300">{eq.quantity}</td>
                            <td className="py-3 text-slate-300 capitalize">{eq.service_frequency}</td>
                            <td className="py-3 text-slate-300">
                              {eq.next_service_date 
                                ? new Date(eq.next_service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '-'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No equipment listed</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'service-history' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Service Visit History ({serviceHistory?.total_visits || amc.service_visits?.length || 0})
                </h4>
                
                {(serviceHistory?.service_visits?.length > 0 || amc.service_visits?.length > 0) ? (
                  <div className="space-y-4">
                    {(serviceHistory?.service_visits || amc.service_visits).map((visit, idx) => (
                      <div 
                        key={idx}
                        className="p-4 bg-slate-900/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(visit.status)}
                              <span className="text-xs text-slate-500 capitalize">{visit.visit_type} Visit</span>
                            </div>
                            <div className="flex items-center gap-2 text-white">
                              <Calendar className="w-4 h-4 text-emerald-400" />
                              {visit.visit_date 
                                ? new Date(visit.visit_date).toLocaleDateString('en-IN', { 
                                    weekday: 'short',
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })
                                : '-'
                              }
                            </div>
                            {visit.technician_name && (
                              <p className="text-slate-400 text-sm mt-2">
                                Technician: {visit.technician_name}
                              </p>
                            )}
                          </div>
                          
                          {visit.status === 'completed' && visit.equipment_serviced?.length > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-slate-500 mb-1">Equipment Serviced</p>
                              <p className="text-emerald-400 text-sm">{visit.equipment_serviced.length} items</p>
                            </div>
                          )}
                        </div>
                        
                        {visit.remarks && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-500 mb-1">Remarks</p>
                            <p className="text-slate-300 text-sm">{visit.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No service visits recorded yet</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CustomerAMCDetail;
