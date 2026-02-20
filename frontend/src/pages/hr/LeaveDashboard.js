import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, Search, RefreshCw, Download, Filter,
  CheckCircle, XCircle, Clock, AlertCircle, BarChart3,
  TrendingUp, CalendarDays, User, ChevronDown, ChevronRight
} from 'lucide-react';
import api from '../../services/api';

const LeaveDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [leaveDetails, setLeaveDetails] = useState(null);
  const [error, setError] = useState('');

  const departments = ['Projects', 'Accounts', 'Sales', 'Purchase', 'HR', 'Operations', 'Exports', 'Finance', 'Admin'];

  const leaveTypes = [
    { key: 'casual_leave', label: 'Casual Leave', short: 'CL', color: 'bg-blue-500' },
    { key: 'sick_leave', label: 'Sick Leave', short: 'SL', color: 'bg-red-500' },
    { key: 'earned_leave', label: 'Earned Leave', short: 'EL', color: 'bg-green-500' },
    { key: 'comp_off', label: 'Comp Off', short: 'CO', color: 'bg-purple-500' }
  ];

  useEffect(() => {
    fetchEmployees();
  }, [filterDepartment]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let url = '/api/hr/employees?status=active';
      if (filterDepartment) url += `&department=${filterDepartment}`;
      const response = await api.get(url);
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveDetails = async (empId) => {
    try {
      const response = await api.get(`/api/hr/leave-balance/${empId}`);
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

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.emp_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary stats
  const totalEmployees = employees.length;
  const totalCL = employees.reduce((sum, e) => sum + (e.leave_balance?.casual_leave || 0), 0);
  const totalSL = employees.reduce((sum, e) => sum + (e.leave_balance?.sick_leave || 0), 0);
  const totalEL = employees.reduce((sum, e) => sum + (e.leave_balance?.earned_leave || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Dashboard</h1>
          <p className="text-slate-500 mt-1">Track and manage employee leave balances</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalEmployees}</p>
              <p className="text-sm text-slate-500">Active Employees</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCL}</p>
              <p className="text-sm text-slate-500">Total CL Balance</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalSL}</p>
              <p className="text-sm text-slate-500">Total SL Balance</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalEL}</p>
              <p className="text-sm text-slate-500">Total EL Balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            data-testid="search-input"
          />
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg"
          data-testid="department-filter"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={fetchEmployees} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Employee Leave Balances</h3>
          </div>
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
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No employees found</td></tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const lb = emp.leave_balance || {};
                    const total = (lb.casual_leave || 0) + (lb.sick_leave || 0) + (lb.earned_leave || 0) + (lb.comp_off || 0);
                    return (
                      <tr 
                        key={emp.emp_id} 
                        className={`hover:bg-slate-50 cursor-pointer ${selectedEmployee?.emp_id === emp.emp_id ? 'bg-blue-50' : ''}`}
                        onClick={() => handleEmployeeClick(emp)}
                        data-testid={`employee-row-${emp.emp_id}`}
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
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {lb.casual_leave || 0}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            {lb.sick_leave || 0}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {lb.earned_leave || 0}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {lb.comp_off || 0}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-semibold text-slate-900">{total}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
                  <span className="text-lg font-medium text-white">{leaveDetails.name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{leaveDetails.name}</p>
                  <p className="text-sm text-slate-500">{leaveDetails.emp_id}</p>
                </div>
              </div>

              {/* Leave Breakdown */}
              <div className="space-y-3">
                {leaveTypes.map(type => {
                  const balance = leaveDetails.leave_balance?.[type.key] || {};
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
                          <p className="text-lg font-bold text-slate-900">{balance.total || 0}</p>
                          <p className="text-xs text-slate-500">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-600">{balance.taken || 0}</p>
                          <p className="text-xs text-slate-500">Taken</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">{balance.remaining || balance.total || 0}</p>
                          <p className="text-xs text-slate-500">Balance</p>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div 
                            className={`${type.color} h-1.5 rounded-full`}
                            style={{ width: `${balance.total ? ((balance.taken || 0) / balance.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">Total Leaves Available</span>
                  <span className="text-2xl font-bold text-blue-700">
                    {Object.values(leaveDetails.leave_balance || {}).reduce((sum, lb) => sum + (lb.remaining || lb.total || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Select an employee to view leave details</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-4">
        {leaveTypes.map(type => (
          <div key={type.key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
            <span className="text-sm text-slate-600">{type.short} - {type.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaveDashboard;
