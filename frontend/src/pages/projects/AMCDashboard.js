import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Calendar, Clock, CheckCircle, XCircle, 
  Building2, Phone, Mail, FileText, ChevronRight, RefreshCw,
  TrendingUp, TrendingDown, Bell, Download, Eye, Edit,
  Filter, Search, ArrowUpRight, DollarSign, Users, Briefcase
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AMCDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiring_7_days: 0,
    expiring_15_days: 0,
    expiring_30_days: 0,
    total_value: 0,
    active_value: 0
  });
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [filterDays, setFilterDays] = useState(30);

  useEffect(() => {
    loadDashboardData();
  }, [filterDays]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all AMCs
      const amcResponse = await fetch(`${API}/api/amc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (amcResponse.ok) {
        const data = await amcResponse.json();
        const amcs = data.amcs || [];
        
        // Calculate statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let active = 0, expired = 0, expiring7 = 0, expiring15 = 0, expiring30 = 0;
        let totalValue = 0, activeValue = 0;
        const expiring = [];
        
        amcs.forEach(amc => {
          const endDate = new Date(amc.end_date);
          endDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
          const amcValue = parseFloat(amc.contract_value) || 0;
          
          totalValue += amcValue;
          
          if (daysUntilExpiry < 0) {
            expired++;
          } else {
            active++;
            activeValue += amcValue;
            
            if (daysUntilExpiry <= 7) {
              expiring7++;
              expiring.push({ ...amc, daysUntilExpiry, urgency: 'critical' });
            } else if (daysUntilExpiry <= 15) {
              expiring15++;
              expiring.push({ ...amc, daysUntilExpiry, urgency: 'warning' });
            } else if (daysUntilExpiry <= 30) {
              expiring30++;
              expiring.push({ ...amc, daysUntilExpiry, urgency: 'info' });
            }
          }
        });
        
        setStats({
          total: amcs.length,
          active,
          expired,
          expiring_7_days: expiring7,
          expiring_15_days: expiring15,
          expiring_30_days: expiring30,
          total_value: totalValue,
          active_value: activeValue
        });
        
        // Sort expiring contracts by days until expiry
        expiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        setExpiringContracts(expiring.filter(c => c.daysUntilExpiry <= filterDays));
        
        // Recent activity (last 5 modified AMCs)
        const sortedByDate = [...amcs].sort((a, b) => 
          new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
        );
        setRecentActivity(sortedByDate.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getUrgencyStyles = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  const getUrgencyBadge = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">EXPIRED</span>;
    } else if (daysUntilExpiry <= 7) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">{daysUntilExpiry}d LEFT</span>;
    } else if (daysUntilExpiry <= 15) {
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{daysUntilExpiry}d LEFT</span>;
    } else {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{daysUntilExpiry}d LEFT</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AMC Dashboard</h1>
          <p className="text-slate-500 mt-1">Monitor contract status and upcoming renewals</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/projects/amc/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileText size={16} />
            New AMC
          </button>
        </div>
      </div>

      {/* Alert Banner - Critical Expiring */}
      {stats.expiring_7_days > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Critical: {stats.expiring_7_days} contract(s) expiring within 7 days!</h3>
              <p className="text-sm text-red-600">Immediate action required to prevent service disruption</p>
            </div>
          </div>
          <button 
            onClick={() => setFilterDays(7)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            View All
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contracts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Contracts</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
              <p className="text-xs text-slate-400 mt-1">{formatCurrency(stats.total_value)} value</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Active Contracts</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
              <p className="text-xs text-emerald-500 mt-1">{formatCurrency(stats.active_value)} active value</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Expiring Soon</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.expiring_7_days + stats.expiring_15_days + stats.expiring_30_days}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">{stats.expiring_7_days} (7d)</span>
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{stats.expiring_15_days} (15d)</span>
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{stats.expiring_30_days} (30d)</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Expired */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Expired</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.expired}</p>
              <p className="text-xs text-red-400 mt-1">Requires renewal action</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring Contracts List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-slate-800">Expiring Contracts</h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterDays}
                onChange={(e) => setFilterDays(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>Next 7 days</option>
                <option value={15}>Next 15 days</option>
                <option value={30}>Next 30 days</option>
                <option value={60}>Next 60 days</option>
                <option value={90}>Next 90 days</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {expiringContracts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No contracts expiring in the next {filterDays} days</p>
                <p className="text-sm text-slate-400 mt-1">All contracts are in good standing</p>
              </div>
            ) : (
              expiringContracts.map((amc) => (
                <div 
                  key={amc.id} 
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${amc.urgency === 'critical' ? 'bg-red-50/50' : ''}`}
                  onClick={() => navigate(`/projects/amc/${amc.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{amc.client_name}</h3>
                        {getUrgencyBadge(amc.daysUntilExpiry)}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        <span className="font-medium">{amc.amc_number}</span> • {amc.location || 'No location'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Expires: {formatDate(amc.end_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign size={12} />
                          {formatCurrency(amc.contract_value || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/amc/${amc.id}`);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit AMC"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle renewal
                          navigate(`/projects/amc/${amc.id}?action=renew`);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                      >
                        Renew
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {expiringContracts.length > 0 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => navigate('/projects/amc')}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
              >
                View All Contracts <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/projects/amc/new')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FileText size={18} />
                <span className="font-medium">Create New AMC</span>
              </button>
              <button
                onClick={() => navigate('/projects/amc')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Eye size={18} />
                <span className="font-medium">View All Contracts</span>
              </button>
              <button
                onClick={() => navigate('/projects/project-reports')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">Generate Reports</span>
              </button>
            </div>
          </div>

          {/* Expiry Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Expiry Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-700">Critical (≤7 days)</span>
                </div>
                <span className="font-bold text-red-700">{stats.expiring_7_days}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm text-amber-700">Warning (8-15 days)</span>
                </div>
                <span className="font-bold text-amber-700">{stats.expiring_15_days}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-blue-700">Upcoming (16-30 days)</span>
                </div>
                <span className="font-bold text-blue-700">{stats.expiring_30_days}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((amc) => (
                <div 
                  key={amc.id}
                  className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                  onClick={() => navigate(`/projects/amc/${amc.id}`)}
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                    <Building2 size={14} className="text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{amc.client_name}</p>
                    <p className="text-xs text-slate-400">{amc.amc_number}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AMCDashboard;
