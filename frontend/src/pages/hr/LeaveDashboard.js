import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, Search, RefreshCw, Download, Filter,
  CheckCircle, XCircle, Clock, AlertCircle, BarChart3,
  TrendingUp, CalendarDays, User, ChevronDown, ChevronRight,
  Bell, FileText, UserMinus, Check, X
} from 'lucide-react';
import api, { employeeHubAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LeaveDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [leaveDetails, setLeaveDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);

  const departments = ['Projects', 'Accounts', 'Sales', 'Purchase', 'HR', 'Operations', 'Exports', 'Finance', 'Admin'];

  const leaveTypes = [
    { key: 'casual_leave', label: 'Casual Leave', short: 'CL', color: 'bg-blue-500' },
    { key: 'sick_leave', label: 'Sick Leave', short: 'SL', color: 'bg-red-500' },
    { key: 'earned_leave', label: 'Earned Leave', short: 'EL', color: 'bg-green-500' },
    { key: 'comp_off', label: 'Comp Off', short: 'CO', color: 'bg-purple-500' }
  ];

  useEffect(() => {
    fetchDashboardData();
    fetchEmployees();
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const res = await employeeHubAPI.getLeaveRequests({ status: 'pending' });
      setPendingRequests(res.data.requests || []);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/leave/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      let url = '/hr/employees?status=active';
      if (filterDepartment) url += `&department=${filterDepartment}`;
      const response = await api.get(url);
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchLeaveDetails = async (empId) => {
    try {
      const response = await api.get(`/hr/leave/employee-balance/${empId}`);
      setLeaveDetails(response.data);
    } catch (err) {
      console.error('Error fetching leave details:', err);
      setLeaveDetails(null);
    }
  };

  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp);
    fetchLeaveDetails(emp.emp_id);
  };

  const handleApprove = async (requestId) => {
    try {
      setProcessingId(requestId);
      setError('');
      await employeeHubAPI.approveLeaveRequest(requestId, user?.name || 'HR Admin');
      setSuccess('Leave approved successfully');
      fetchDashboardData();
      fetchPendingRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error approving leave:', err);
      setError(err.response?.data?.detail || 'Failed to approve leave');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingId(requestId);
      setError('');
      await employeeHubAPI.rejectLeaveRequest(requestId, user?.name || 'HR Admin');
      setSuccess('Leave rejected');
      fetchDashboardData();
      fetchPendingRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error rejecting leave:', err);
      setError(err.response?.data?.detail || 'Failed to reject leave');
      setTimeout(() => setError(''), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.emp_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage employee leave requests and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { fetchDashboardData(); fetchEmployees(); fetchPendingRequests(); }}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            data-testid="refresh-leave-dashboard"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Summary Cards */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`bg-white p-4 rounded-xl border-2 ${pendingRequests.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${pendingRequests.length > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                <Bell className={`w-5 h-5 ${pendingRequests.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${pendingRequests.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {pendingRequests.length}
                </p>
                <p className="text-sm text-slate-500">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{dashboardData.summary.approved_this_year}</p>
                <p className="text-sm text-slate-500">Approved (Year)</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{dashboardData.summary.days_on_leave_this_month}</p>
                <p className="text-sm text-slate-500">Days This Month</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{employees.length}</p>
                <p className="text-sm text-slate-500">Active Employees</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {[
            { id: 'pending', label: 'Pending Requests', icon: Clock, count: pendingRequests.length },
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'balances', label: 'Employee Balances', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Leave by Department</h3>
                {dashboardData.department_breakdown.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No leave data yet</p>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.department_breakdown.map(dept => (
                      <div key={dept.department} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{dept.department}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">{dept.count} requests</span>
                          <span className="font-medium text-slate-900">{dept.days} days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Leave Type Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Leave by Type</h3>
                {dashboardData.leave_type_breakdown.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No leave data yet</p>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.leave_type_breakdown.map(type => (
                      <div key={type.type} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{type.type}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">{type.count} requests</span>
                          <span className="font-medium text-slate-900">{type.days} days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low Balance Employees */}
              {dashboardData.low_balance_employees.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 p-6 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <UserMinus className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-slate-900">Low Leave Balance Alert</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {dashboardData.low_balance_employees.map(emp => (
                      <div key={emp.emp_id} className="p-3 bg-amber-50 rounded-lg">
                        <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.department}</p>
                        <p className="text-amber-600 font-semibold mt-1">{emp.total_remaining} days left</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Requests Tab */}
          {activeTab === 'pending' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p className="font-medium">No pending leave requests</p>
                  <p className="text-sm text-slate-400 mt-1">All caught up! Requests will appear here when employees apply for leave.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Leave Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dates</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Days</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-amber-50/30" data-testid={`leave-request-row-${request.id}`}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{request.user_name}</p>
                              <p className="text-xs text-slate-500">{request.department}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                              {request.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(request.from_date).toLocaleDateString('en-IN')} - {new Date(request.to_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-900">
                            {request.days}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-600 max-w-[200px] truncate" title={request.reason}>
                              {request.reason || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={processingId === request.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                                title="Approve"
                                data-testid={`approve-leave-${request.id}`}
                              >
                                {processingId === request.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={processingId === request.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                                title="Reject"
                                data-testid={`reject-leave-${request.id}`}
                              >
                                {processingId === request.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Employee Balances Tab */}
          {activeTab === 'balances' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Filters & Employee List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={filterDepartment}
                    onChange={(e) => { setFilterDepartment(e.target.value); fetchEmployees(); }}
                    className="px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">CL</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">SL</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">EL</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">CO</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.length === 0 ? (
                          <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No employees found</td></tr>
                        ) : (
                          filteredEmployees.map((emp) => {
                            const lb = emp.leave_balance || {};
                            const cl = lb.casual_leave?.remaining ?? 12;
                            const sl = lb.sick_leave?.remaining ?? 6;
                            const el = lb.earned_leave?.remaining ?? 15;
                            const co = lb.comp_off?.remaining ?? 2;
                            const total = cl + sl + el + co;
                            return (
                              <tr 
                                key={emp.emp_id} 
                                className={`hover:bg-slate-50 cursor-pointer ${selectedEmployee?.emp_id === emp.emp_id ? 'bg-blue-50' : ''}`}
                                onClick={() => handleEmployeeClick(emp)}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-white">{emp.name?.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                                      <p className="text-xs text-slate-500">{emp.emp_id} • {emp.department}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${cl <= 2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {cl}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${sl <= 1 ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600'}`}>
                                    {sl}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    {el}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                    {co}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`font-semibold ${total <= 5 ? 'text-red-600' : 'text-slate-900'}`}>{total}</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Employee Leave Details Panel */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">Leave Details</h3>
                </div>
                
                {selectedEmployee && leaveDetails ? (
                  <div className="p-4 space-y-4">
                    {/* Employee Info */}
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-white">{leaveDetails.emp_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{leaveDetails.emp_name}</p>
                        <p className="text-sm text-slate-500">{leaveDetails.emp_id} • {leaveDetails.department}</p>
                      </div>
                    </div>

                    {/* Leave Breakdown */}
                    <div className="space-y-3">
                      {leaveTypes.map(type => {
                        const balance = leaveDetails.leave_balance?.[type.key] || { total: 0, taken: 0, remaining: 0 };
                        return (
                          <div key={type.key} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                                <span className="font-medium text-slate-900 text-sm">{type.label}</span>
                              </div>
                              <span className="text-xs text-slate-500">{type.short}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-lg font-bold text-slate-900">{balance.total}</p>
                                <p className="text-xs text-slate-500">Total</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-red-600">{balance.taken}</p>
                                <p className="text-xs text-slate-500">Taken</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-green-600">{balance.remaining}</p>
                                <p className="text-xs text-slate-500">Balance</p>
                              </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-2">
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div 
                                  className={`${type.color} h-1.5 rounded-full`}
                                  style={{ width: `${balance.total ? (balance.taken / balance.total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Summary */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900">Total Remaining</span>
                        <span className="text-2xl font-bold text-blue-700">
                          {leaveDetails.total_remaining}
                        </span>
                      </div>
                    </div>

                    {/* Pending Requests */}
                    {leaveDetails.pending_requests > 0 && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-sm text-amber-700">
                          <strong>{leaveDetails.pending_requests}</strong> pending request(s)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Select an employee to view leave details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-4">
        {leaveTypes.map(type => (
          <div key={type.key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
            <span className="text-sm text-slate-600">{type.short} - {type.label}</span>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Leave → Payroll Integration</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>Employee Request:</strong> Employees submit leave from their workspace</li>
              <li><strong>HR Approval:</strong> Approved leaves auto-deduct from employee balance</li>
              <li><strong>LOP Calculation:</strong> Excess leaves (beyond balance) marked as Loss of Pay</li>
              <li><strong>Payroll:</strong> LOP days automatically deducted from monthly salary</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveDashboard;
