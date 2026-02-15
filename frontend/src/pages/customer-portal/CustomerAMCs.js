import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, FileText, LogOut, ChevronRight, Loader2, 
  AlertCircle, CheckCircle2, Clock, Calendar, Search,
  ArrowLeft
} from 'lucide-react';

const CustomerAMCs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [amcs, setAmcs] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

    loadAMCs(token);
  }, [navigate]);

  const loadAMCs = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/customer-portal/amcs?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to load AMCs');
      }

      const data = await response.json();
      setAmcs(data.amcs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    navigate('/customer-portal/login');
  };

  const filteredAmcs = amcs.filter(amc => {
    const matchesSearch = 
      amc.amc_no?.toLowerCase().includes(search.toLowerCase()) ||
      amc.project?.project_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || amc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
      expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Expired' },
      renewed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Renewed' },
      cancelled: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Cancelled' }
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
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{customer?.name}</p>
              <p className="text-slate-400 text-xs">{customer?.company_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            <Link 
              to="/customer-portal/dashboard" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link 
              to="/customer-portal/amcs" 
              className="py-3 text-emerald-400 border-b-2 border-emerald-400 text-sm font-medium whitespace-nowrap"
            >
              My AMC Contracts
            </Link>
            <Link 
              to="/customer-portal/reports" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              Reports & Documents
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link 
            to="/customer-portal/dashboard"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              My AMC Contracts
            </h2>
            <p className="text-slate-400 text-sm">View and manage your maintenance contracts</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by AMC number or project name..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="renewed">Renewed</option>
          </select>
        </div>

        {/* AMC List */}
        {filteredAmcs.length > 0 ? (
          <div className="space-y-4">
            {filteredAmcs.map((amc) => (
              <div 
                key={amc.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 text-slate-300">
                        {amc.amc_no || 'AMC-XXXXX'}
                      </span>
                      {getStatusBadge(amc.status)}
                    </div>
                    <h3 className="text-white font-medium text-lg">
                      {amc.project?.project_name || 'Project Name'}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      {amc.project?.location || 'Location'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Contract Period</p>
                      <p className="text-sm text-white">
                        {amc.contract_details?.start_date && 
                          new Date(amc.contract_details.start_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: '2-digit'
                          })
                        }
                        {' - '}
                        {amc.contract_details?.end_date && 
                          new Date(amc.contract_details.end_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: '2-digit'
                          })
                        }
                      </p>
                    </div>

                    <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Service Visits</p>
                      <p className="text-sm text-white flex items-center justify-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        {amc.service_visits?.length || 0} visits
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/customer-portal/amcs/${amc.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Equipment Summary */}
                {amc.equipment_list?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Equipment Covered:</p>
                    <div className="flex flex-wrap gap-2">
                      {amc.equipment_list.slice(0, 5).map((eq, idx) => (
                        <span 
                          key={idx}
                          className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-300"
                        >
                          {eq.equipment_name} ({eq.quantity})
                        </span>
                      ))}
                      {amc.equipment_list.length > 5 && (
                        <span className="text-xs text-slate-500">
                          +{amc.equipment_list.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-white font-medium mb-2">No AMC Contracts Found</h3>
            <p className="text-slate-400 text-sm">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'You don\'t have any AMC contracts linked to your account yet'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerAMCs;
