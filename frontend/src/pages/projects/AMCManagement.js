import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, Calendar, Clock, CheckCircle, XCircle, 
  Building2, Phone, Mail, FileText, ChevronRight, RefreshCw,
  TrendingUp, Bell, Download, Eye, Edit, Trash2,
  Filter, Search, Plus, CalendarClock, Repeat, User, MapPin,
  Play, Pause, MoreVertical, ArrowUpRight
} from 'lucide-react';
import { scheduledInspectionsAPI, projectsAPI } from '../../services/api';
import { EQUIPMENT_TYPES } from './EquipmentTestReports';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Tab definitions
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'calendar', label: 'Service Calendar', icon: CalendarClock },
];

// Constants for Service Calendar
const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const INSPECTION_TYPES = [
  { value: 'equipment', label: 'Equipment Test', color: 'bg-amber-500' },
  { value: 'amc', label: 'AMC Visit', color: 'bg-blue-500' },
  { value: 'audit', label: 'Audit', color: 'bg-green-500' },
  { value: 'other', label: 'Other', color: 'bg-purple-500' },
];

const AMCManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  
  // Dashboard state
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0, active: 0, expired: 0,
    expiring_7_days: 0, expiring_15_days: 0, expiring_30_days: 0
  });
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [filterDays, setFilterDays] = useState(30);
  
  // Contracts state
  const [amcs, setAmcs] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Service Calendar state
  const [inspections, setInspections] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarDashboard, setCalendarDashboard] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState([]);

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/amc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const amcList = data.amcs || [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let active = 0, expired = 0, expiring7 = 0, expiring15 = 0, expiring30 = 0;
        const expiring = [];
        
        amcList.forEach(amc => {
          const endDateStr = amc.contract_details?.end_date || amc.end_date;
          if (!endDateStr) {
            active++; // If no end date, consider it active
            return;
          }
          const endDate = new Date(endDateStr);
          endDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
          
          if (isNaN(daysUntilExpiry)) {
            active++; // If invalid date, consider it active
            return;
          }
          
          if (daysUntilExpiry < 0) {
            expired++;
          } else {
            active++;
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
          total: amcList.length, active, expired,
          expiring_7_days: expiring7, expiring_15_days: expiring15, expiring_30_days: expiring30
        });
        
        const filtered = expiring.filter(c => c.daysUntilExpiry <= filterDays);
        filtered.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        setExpiringContracts(filtered);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, [filterDays]);

  // Load Contracts Data
  const loadContractsData = useCallback(async () => {
    setContractsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/api/amc`;
      if (statusFilter !== 'all') url += `?status=${statusFilter}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAmcs(data.amcs || []);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setContractsLoading(false);
    }
  }, [statusFilter]);

  // Load Service Calendar Data
  const loadCalendarData = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const params = {};
      if (filterType !== 'all') params.inspection_type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;

      const [inspRes, dashRes, projRes] = await Promise.all([
        scheduledInspectionsAPI.getAll(params),
        scheduledInspectionsAPI.getDashboard(),
        projectsAPI.getAll()
      ]);

      const inspData = inspRes.data?.inspections || inspRes.data || [];
      const projData = projRes.data?.projects || projRes.data || [];
      
      setInspections(inspData);
      setCalendarDashboard(dashRes.data);
      setProjects(projData);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setCalendarLoading(false);
    }
  }, [filterType, filterStatus]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboardData();
    else if (activeTab === 'contracts') loadContractsData();
    else if (activeTab === 'calendar') loadCalendarData();
  }, [activeTab, loadDashboardData, loadContractsData, loadCalendarData]);

  // Contract handlers
  const handleDeleteContract = async (amcId) => {
    if (!window.confirm('Are you sure you want to delete this AMC?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/amc/${amcId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) loadContractsData();
    } catch (error) {
      console.error('Error deleting AMC:', error);
    }
  };

  const handleDownloadPDF = async (amcId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/amc-report/${amcId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        // Ensure the blob has the correct PDF type
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AMC_Report_${amcId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || 'Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Please try again.');
    }
  };

  // Calendar handlers
  const handleCompleteInspection = async (inspection) => {
    try {
      await scheduledInspectionsAPI.complete(inspection.id, {
        completion_date: new Date().toISOString().split('T')[0],
        completed_by: user?.name
      });
      loadCalendarData();
    } catch (error) {
      console.error('Error completing inspection:', error);
    }
  };

  const handleDeleteInspection = async (id) => {
    if (!window.confirm('Delete this scheduled inspection?')) return;
    try {
      await scheduledInspectionsAPI.delete(id);
      loadCalendarData();
    } catch (error) {
      console.error('Error deleting inspection:', error);
    }
  };

  // Filter contracts by search
  const filteredAmcs = amcs.filter(amc => {
    if (!searchTerm) return true; // Show all when no search term
    const search = searchTerm.toLowerCase();
    return (
      (amc.customer_name || '').toLowerCase().includes(search) ||
      (amc.contract_number || amc.amc_no || '').toLowerCase().includes(search) ||
      (amc.site_location || '').toLowerCase().includes(search)
    );
  });

  // Filter inspections by search
  const filteredInspections = inspections.filter(insp => {
    const search = searchTerm.toLowerCase();
    return (
      insp.title?.toLowerCase().includes(search) ||
      insp.location?.toLowerCase().includes(search) ||
      insp.customer_name?.toLowerCase().includes(search)
    );
  });

  // Helper functions
  const getStatusBadge = (amc) => {
    const today = new Date();
    const endDate = new Date(amc.contract_details?.end_date || amc.end_date);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (isNaN(daysLeft)) return { label: 'Active', color: 'bg-green-100 text-green-700' };
    if (daysLeft < 0) return { label: 'Expired', color: 'bg-red-100 text-red-700' };
    if (daysLeft <= 7) return { label: 'Critical', color: 'bg-red-100 text-red-700' };
    if (daysLeft <= 30) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Active', color: 'bg-green-100 text-green-700' };
  };

  const getInspectionStatus = (inspection) => {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = inspection.next_due_date;
    
    if (inspection.status === 'paused') return { label: 'Paused', color: 'bg-slate-100 text-slate-600', icon: Pause };
    if (dueDate < today) return { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    if (dueDate === today) return { label: 'Due Today', color: 'bg-amber-100 text-amber-700', icon: Bell };
    return { label: 'Scheduled', color: 'bg-green-100 text-green-700', icon: CheckCircle };
  };

  const getTypeInfo = (type) => {
    return INSPECTION_TYPES.find(t => t.value === type) || { label: type, color: 'bg-slate-500' };
  };

  const getFrequencyLabel = (freq) => {
    return FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || freq;
  };

  return (
    <div className="space-y-6" data-testid="amc-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AMC Management</h1>
          <p className="text-slate-500 mt-1">Manage contracts, track renewals, and schedule service visits</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'contracts' && (
            <button
              onClick={() => navigate('/projects/amc/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              data-testid="new-contract-btn"
            >
              <Plus size={18} />
              New Contract
            </button>
          )}
          {activeTab === 'calendar' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              data-testid="schedule-visit-btn"
            >
              <Plus size={18} />
              Schedule Visit
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5">
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Contracts</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="text-blue-600" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Expiring Soon</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{stats.expiring_30_days}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="text-amber-600" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Expired</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.expired}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Alert Banner */}
          {stats.expiring_7_days > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-800">Urgent: {stats.expiring_7_days} contract(s) expiring within 7 days</h4>
                <p className="text-red-600 text-sm">Please review and initiate renewal process immediately.</p>
              </div>
              <button 
                onClick={() => setFilterDays(7)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                View Now
              </button>
            </div>
          )}

          {/* Expiring Contracts */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Expiring Contracts</h3>
              <select
                value={filterDays}
                onChange={(e) => setFilterDays(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
              >
                <option value={7}>Next 7 days</option>
                <option value={15}>Next 15 days</option>
                <option value={30}>Next 30 days</option>
                <option value={60}>Next 60 days</option>
                <option value={90}>Next 90 days</option>
              </select>
            </div>
            <div className="divide-y divide-slate-100">
              {dashboardLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              ) : expiringContracts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>No contracts expiring in the selected period</p>
                </div>
              ) : (
                expiringContracts.map(contract => (
                  <div key={contract.id} className="p-4 hover:bg-slate-50 flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${
                      contract.urgency === 'critical' ? 'bg-red-500' :
                      contract.urgency === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{contract.customer_name}</h4>
                      <p className="text-sm text-slate-500">{contract.site_location}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        contract.daysUntilExpiry <= 7 ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {contract.daysUntilExpiry} days left
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(contract.end_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/projects/amc/${contract.id}`)}
                      className="p-2 hover:bg-slate-200 rounded-lg"
                    >
                      <ChevronRight size={20} className="text-slate-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expiry Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertTriangle size={18} />
                <span className="font-medium">Critical (≤7 days)</span>
              </div>
              <p className="text-3xl font-bold text-red-700">{stats.expiring_7_days}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <Clock size={18} />
                <span className="font-medium">Warning (8-15 days)</span>
              </div>
              <p className="text-3xl font-bold text-amber-700">{stats.expiring_15_days}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Calendar size={18} />
                <span className="font-medium">Upcoming (16-30 days)</span>
              </div>
              <p className="text-3xl font-bold text-blue-700">{stats.expiring_30_days - stats.expiring_15_days}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer, contract number, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
              <button onClick={loadContractsData} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                <RefreshCw size={18} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Contracts List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {contractsLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              </div>
            ) : filteredAmcs.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="font-semibold text-slate-800">No AMC Contracts</h3>
                <p className="text-slate-500 mt-1">Create your first AMC contract to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAmcs.map(amc => {
                  const status = getStatusBadge(amc);
                  return (
                    <div key={amc.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Building2 className="text-blue-600" size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800">{amc.customer_name}</h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{amc.site_location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Valid Till</p>
                          <p className="font-medium">
                            {amc.contract_details?.end_date 
                              ? new Date(amc.contract_details.end_date).toLocaleDateString('en-IN')
                              : amc.end_date 
                                ? new Date(amc.end_date).toLocaleDateString('en-IN')
                                : '-'
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/projects/amc/${amc.id}`)}
                            className="p-2 hover:bg-slate-200 rounded-lg"
                            title="View"
                          >
                            <Eye size={18} className="text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(amc.id)}
                            className="p-2 hover:bg-slate-200 rounded-lg"
                            title="Download PDF"
                          >
                            <Download size={18} className="text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(amc.id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Stats */}
          {calendarDashboard && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <CalendarClock size={16} />
                  <span className="text-sm">Total Active</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{calendarDashboard.total_active || 0}</p>
              </div>
              <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <AlertTriangle size={16} />
                  <span className="text-sm">Overdue</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{calendarDashboard.overdue || 0}</p>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Bell size={16} />
                  <span className="text-sm">Due Today</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{calendarDashboard.due_today || 0}</p>
              </div>
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Calendar size={16} />
                  <span className="text-sm">This Week</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{calendarDashboard.this_week || 0}</p>
              </div>
              <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Clock size={16} />
                  <span className="text-sm">This Month</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{calendarDashboard.this_month || 0}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, location, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg"
              >
                <option value="all">All Types</option>
                {INSPECTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <button onClick={loadCalendarData} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                <RefreshCw size={18} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Inspections List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {calendarLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              </div>
            ) : filteredInspections.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarClock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="font-semibold text-slate-800">No Scheduled Visits</h3>
                <p className="text-slate-500 mt-1">Schedule your first service visit</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  <Plus size={18} className="inline mr-2" />
                  Schedule Visit
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInspections.map(inspection => {
                  const statusInfo = getInspectionStatus(inspection);
                  const typeInfo = getTypeInfo(inspection.inspection_type);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div key={inspection.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className={`${typeInfo.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                          <CalendarClock className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-800">{inspection.title}</h4>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <StatusIcon size={12} />
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {inspection.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Repeat size={14} />
                              {getFrequencyLabel(inspection.frequency)}
                            </span>
                            {inspection.assigned_to && (
                              <span className="flex items-center gap-1">
                                <User size={14} />
                                {inspection.assigned_to}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Next Due</p>
                          <p className={`font-semibold ${
                            statusInfo.label === 'Overdue' ? 'text-red-600' : 
                            statusInfo.label === 'Due Today' ? 'text-amber-600' : 'text-slate-800'
                          }`}>
                            {new Date(inspection.next_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCompleteInspection(inspection)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                          >
                            <CheckCircle size={14} />
                            Complete
                          </button>
                          <button
                            onClick={() => handleDeleteInspection(inspection.id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Inspection Modal */}
      {showCreateModal && (
        <CreateInspectionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadCalendarData(); }}
          projects={projects}
          user={user}
        />
      )}
    </div>
  );
};

// Create Inspection Modal Component
const CreateInspectionModal = ({ onClose, onCreated, projects, user }) => {
  const [formData, setFormData] = useState({
    title: '',
    inspection_type: 'amc',
    equipment_type: '',
    project_id: '',
    project_name: '',
    customer_name: '',
    location: '',
    frequency: 'monthly',
    assigned_to: user?.name || '',
    start_date: new Date().toISOString().split('T')[0],
    reminder_days: 3,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'project_id' && value) {
      const project = projects.find(p => p.id === value);
      if (project) {
        setFormData(prev => ({
          ...prev,
          project_name: project.project_name,
          customer_name: project.customer_name || '',
          location: project.location || ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.location) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await scheduledInspectionsAPI.create(formData);
      onCreated();
    } catch (error) {
      console.error('Error creating inspection:', error);
      alert('Failed to create inspection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Schedule Service Visit</h2>
          <p className="text-slate-500 text-sm mt-1">Set up a periodic service schedule with reminders</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Monthly AMC Visit - Site A"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type *</label>
              <select
                name="inspection_type"
                value={formData.inspection_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {INSPECTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency *</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {FREQUENCY_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location / Site *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Chennai Plant - Building A"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
              <input
                type="text"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Scheduling...' : 'Schedule Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AMCManagement;
