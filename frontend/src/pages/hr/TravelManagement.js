import React, { useState, useEffect } from 'react';
import { 
  Car, Bike, MapPin, Calendar, Download, FileSpreadsheet,
  CheckCircle, XCircle, AlertCircle, Loader2, Search,
  Building2, ChevronDown, Eye, Settings, Save, Camera,
  Clock, User, Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TravelManagement = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [rates, setRates] = useState({ two_wheeler_rate: 4.25, four_wheeler_rate: 9.0 });
  const [savingRates, setSavingRates] = useState(false);
  const [viewingTrip, setViewingTrip] = useState(null);
  const [processing, setProcessing] = useState(false);

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const departments = ['PROJECTS', 'ACCOUNTS', 'SALES', 'PURCHASE', 'EXPORTS', 'FINANCE', 'HR', 'OPERATIONS'];

  useEffect(() => {
    fetchTrips();
    fetchRates();
  }, [currentMonth, currentYear, statusFilter, departmentFilter]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/travel-log/all-trips?month=${currentMonth}&year=${currentYear}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (departmentFilter) url += `&department=${departmentFilter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setTrips(data.trips || []);
      setSummary(data.summary || {});
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/travel-log/rates`);
      const data = await res.json();
      setRates(data);
    } catch (error) {
      console.error('Error fetching rates:', error);
    }
  };

  const saveRates = async () => {
    setSavingRates(true);
    try {
      const res = await fetch(`${API_URL}/api/travel-log/rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates)
      });
      if (res.ok) {
        toast.success('Rates updated successfully');
        setShowRateSettings(false);
      }
    } catch (error) {
      toast.error('Failed to update rates');
    } finally {
      setSavingRates(false);
    }
  };

  const approveTrip = async (tripId) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/travel-log/trip/${tripId}/approve?approved_by=${user?.name || 'HR'}`, {
        method: 'PUT'
      });
      if (res.ok) {
        toast.success('Trip approved');
        fetchTrips();
        setViewingTrip(null);
      }
    } catch (error) {
      toast.error('Failed to approve trip');
    } finally {
      setProcessing(false);
    }
  };

  const rejectTrip = async (tripId, reason = '') => {
    const rejectReason = reason || prompt('Enter rejection reason:');
    if (rejectReason === null) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/travel-log/trip/${tripId}/reject?rejected_by=${user?.name || 'HR'}&reason=${encodeURIComponent(rejectReason)}`, {
        method: 'PUT'
      });
      if (res.ok) {
        toast.success('Trip rejected');
        fetchTrips();
        setViewingTrip(null);
      }
    } catch (error) {
      toast.error('Failed to reject trip');
    } finally {
      setProcessing(false);
    }
  };

  const bulkApprove = async () => {
    if (selectedTrips.length === 0) {
      toast.error('Select trips to approve');
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/travel-log/bulk-approve?approved_by=${user?.name || 'HR'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: selectedTrips, approved_by: user?.name || 'HR' })
      });
      if (res.ok) {
        toast.success(`${selectedTrips.length} trips approved`);
        setSelectedTrips([]);
        fetchTrips();
      }
    } catch (error) {
      toast.error('Failed to bulk approve');
    } finally {
      setProcessing(false);
    }
  };

  const downloadExcel = async () => {
    try {
      let url = `${API_URL}/api/travel-log/report/download/excel?month=${currentMonth}&year=${currentYear}`;
      if (departmentFilter) url += `&department=${departmentFilter}`;
      
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Travel_Report_${months[currentMonth - 1].label}_${currentYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const filteredTrips = trips.filter(trip => {
    if (!searchTerm) return true;
    return trip.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           trip.from_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           trip.to_location?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleSelectTrip = (tripId) => {
    setSelectedTrips(prev => 
      prev.includes(tripId) 
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = filteredTrips.filter(t => t.status === 'pending').map(t => t.id);
    setSelectedTrips(pendingIds);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle }
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="travel-management">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Travel Log Management</h1>
          <p className="text-slate-500 mt-1">Review and approve employee travel allowances</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowRateSettings(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            data-testid="rate-settings-btn"
          >
            <Settings className="w-4 h-4" />
            Rate Settings
          </button>
          <button
            onClick={downloadExcel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            data-testid="download-excel-btn"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{summary.total_trips || 0}</div>
          <div className="text-sm text-slate-500">Total Trips</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{summary.total_distance?.toFixed(1) || 0} km</div>
          <div className="text-sm text-slate-500">Total Distance</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">₹{summary.total_allowance?.toFixed(2) || 0}</div>
          <div className="text-sm text-slate-500">Total Allowance</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{summary.pending || 0}</div>
          <div className="text-sm text-slate-500">Pending Approval</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{summary.approved || 0}</div>
          <div className="text-sm text-slate-500">Approved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Month/Year */}
          <div className="flex gap-2">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2026, 2025, 2024].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTrips.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-700 font-medium">{selectedTrips.length} trip(s) selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTrips([])}
              className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-50 border border-slate-200"
            >
              Clear
            </button>
            <button
              onClick={bulkApprove}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve All'}
            </button>
          </div>
        </div>
      )}

      {/* Select All Pending */}
      <div className="flex justify-end">
        <button
          onClick={selectAllPending}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Select all pending trips
        </button>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : filteredTrips.length > 0 ? (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                  <input
                    type="checkbox"
                    checked={selectedTrips.length === filteredTrips.filter(t => t.status === 'pending').length && selectedTrips.length > 0}
                    onChange={selectAllPending}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Distance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Allowance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.map(trip => (
                <tr key={trip.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {trip.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedTrips.includes(trip.id)}
                        onChange={() => toggleSelectTrip(trip.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{trip.user_name}</div>
                    <div className="text-xs text-slate-500">{trip.department}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(trip.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    <div className="text-xs text-slate-400">{trip.time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">{trip.from_location} → {trip.to_location}</div>
                    <div className="text-xs text-slate-500">{trip.purpose}</div>
                  </td>
                  <td className="px-4 py-3">
                    {trip.vehicle_type === 'two_wheeler' ? (
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <Bike className="w-4 h-4" /> 2W
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-purple-600">
                        <Car className="w-4 h-4" /> 4W
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{trip.distance?.toFixed(1)} km</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">₹{trip.allowance?.toFixed(2)}</td>
                  <td className="px-4 py-3">{getStatusBadge(trip.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingTrip(trip)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {trip.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveTrip(trip.id)}
                            disabled={processing}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectTrip(trip.id)}
                            disabled={processing}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No travel logs found</h3>
            <p className="text-slate-400 mt-1">Adjust filters or wait for employees to log trips</p>
          </div>
        )}
      </div>

      {/* Rate Settings Modal */}
      {showRateSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Travel Allowance Rates</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-blue-600" />
                    Two-Wheeler Rate (₹/km)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rates.two_wheeler_rate}
                  onChange={(e) => setRates({ ...rates, two_wheeler_rate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-purple-600" />
                    Four-Wheeler Rate (₹/km)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rates.four_wheeler_rate}
                  onChange={(e) => setRates({ ...rates, four_wheeler_rate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRateSettings(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRates}
                disabled={savingRates}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingRates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Rates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Detail Modal */}
      {viewingTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">Trip Details</h2>
              <button onClick={() => setViewingTrip(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{viewingTrip.user_name}</div>
                  <div className="text-sm text-slate-500">{viewingTrip.department}</div>
                </div>
                <div className="ml-auto">{getStatusBadge(viewingTrip.status)}</div>
              </div>

              {/* Trip Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Date & Time</div>
                  <div className="font-medium">{viewingTrip.date} • {viewingTrip.time}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Vehicle</div>
                  <div className="font-medium flex items-center gap-1">
                    {viewingTrip.vehicle_type === 'two_wheeler' ? (
                      <><Bike className="w-4 h-4 text-blue-600" /> Two Wheeler</>
                    ) : (
                      <><Car className="w-4 h-4 text-purple-600" /> Four Wheeler</>
                    )}
                  </div>
                </div>
              </div>

              {/* Route */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-xs text-slate-500">From</div>
                    <div className="font-medium">{viewingTrip.from_location}</div>
                  </div>
                </div>
                <div className="ml-2 border-l-2 border-dashed border-slate-300 h-4"></div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-xs text-slate-500">To</div>
                    <div className="font-medium">{viewingTrip.to_location}</div>
                  </div>
                </div>
              </div>

              {/* KM & Allowance */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Start KM</div>
                  <div className="font-medium">{viewingTrip.start_km}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">End KM</div>
                  <div className="font-medium">{viewingTrip.end_km}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Distance</div>
                  <div className="font-bold text-lg">{viewingTrip.distance?.toFixed(1)} km</div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <div className="text-xs text-emerald-600">Allowance @ ₹{viewingTrip.rate_applied}/km</div>
                <div className="text-2xl font-bold text-emerald-700">₹{viewingTrip.allowance?.toFixed(2)}</div>
              </div>

              {/* Purpose & Notes */}
              <div>
                <div className="text-xs text-slate-500">Purpose</div>
                <div className="font-medium">{viewingTrip.purpose}</div>
              </div>
              
              {viewingTrip.notes && (
                <div>
                  <div className="text-xs text-slate-500">Notes</div>
                  <div className="text-sm text-slate-600">{viewingTrip.notes}</div>
                </div>
              )}

              {/* Photos */}
              {(viewingTrip.start_photo || viewingTrip.end_photo) && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">Odometer Photos</div>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingTrip.start_photo && (
                      <a href={`${API_URL}/api/uploads${viewingTrip.start_photo}`} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
                          <Camera className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="text-xs text-center text-slate-500 mt-1">Start Photo</div>
                      </a>
                    )}
                    {viewingTrip.end_photo && (
                      <a href={`${API_URL}/api/uploads${viewingTrip.end_photo}`} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
                          <Camera className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="text-xs text-center text-slate-500 mt-1">End Photo</div>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {viewingTrip.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-xs text-red-600 font-medium">Rejection Reason</div>
                  <div className="text-sm text-red-700">{viewingTrip.rejection_reason}</div>
                </div>
              )}

              {/* Actions */}
              {viewingTrip.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => rejectTrip(viewingTrip.id)}
                    disabled={processing}
                    className="flex-1 py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveTrip(viewingTrip.id)}
                    disabled={processing}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelManagement;
