import React, { useState, useEffect } from 'react';
import { 
  Calendar, Download, FileSpreadsheet, FileText, Users, 
  Search, Filter, ChevronDown, Building2, Clock, 
  CheckCircle, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AttendanceManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchAttendance(selectedUser.id);
    }
  }, [selectedUser, month, year]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/attendance-reports/users`);
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAttendance = async (userId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/employee/attendance/${userId}?month=${month}&year=${year}`);
      const data = await res.json();
      setAttendanceData(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (userId, userName) => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance-reports/download/pdf/${userId}?month=${month}&year=${year}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_${userName}_${months[month - 1].label}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadExcel = async (userId, userName) => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance-reports/download/excel/${userId}?month=${month}&year=${year}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_${userName}_${months[month - 1].label}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadBulkExcel = async () => {
    setDownloading(true);
    try {
      let url = `${API_URL}/api/attendance-reports/download/bulk/excel?month=${month}&year=${year}`;
      if (departmentFilter) {
        url += `&department=${departmentFilter}`;
      }
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `All_Employees_Attendance_${months[month - 1].label}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading bulk Excel:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Get unique departments
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !departmentFilter || u.department?.toLowerCase() === departmentFilter.toLowerCase();
    return matchesSearch && matchesDept;
  });

  const getStatusBadge = (status) => {
    const badges = {
      present: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      absent: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      'half-day': { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle },
      'on-leave': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar },
    };
    const badge = badges[status] || badges.present;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="attendance-management">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-slate-500 mt-1">View and download employee attendance reports</p>
        </div>
        
        <button
          onClick={downloadBulkExcel}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          data-testid="download-bulk-btn"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Download All Employees
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="search-input"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              data-testid="department-filter"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Month Selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              data-testid="month-filter"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Year Selector */}
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
              data-testid="year-filter"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              Employees ({filteredUsers.length})
            </h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                  selectedUser?.id === u.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                data-testid={`user-item-${u.id}`}
              >
                <div className="font-medium text-slate-900">{u.name}</div>
                <div className="text-sm text-slate-500">{u.email}</div>
                <div className="text-xs text-slate-400 mt-1">{u.department || 'No Department'}</div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No employees found
              </div>
            )}
          </div>
        </div>

        {/* Attendance Details */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {selectedUser ? (
            <>
              {/* User Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedUser.name}</h2>
                  <p className="text-sm text-slate-500">{selectedUser.email} • {selectedUser.department}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadPDF(selectedUser.id, selectedUser.name)}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    data-testid="download-pdf-btn"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => downloadExcel(selectedUser.id, selectedUser.name)}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                    data-testid="download-excel-btn"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              {attendanceData && (
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-green-600">{attendanceData.summary?.present || 0}</div>
                    <div className="text-sm text-slate-500">Present</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-red-600">{attendanceData.summary?.absent || 0}</div>
                    <div className="text-sm text-slate-500">Absent</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-amber-600">{attendanceData.summary?.halfDays || 0}</div>
                    <div className="text-sm text-slate-500">Half Days</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-blue-600">{attendanceData.summary?.onLeave || 0}</div>
                    <div className="text-sm text-slate-500">On Leave</div>
                  </div>
                </div>
              )}

              {/* Attendance Table */}
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    <p className="text-slate-500 mt-2">Loading attendance...</p>
                  </div>
                ) : attendanceData?.records?.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Check In</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Check Out</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceData.records.map((record, idx) => (
                        <tr key={record.id || idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {new Date(record.date).toLocaleDateString('en-IN', { 
                              day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' 
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {record.check_in || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {record.check_out || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(record.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No attendance records found for {months[month - 1].label} {year}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600">Select an Employee</h3>
              <p className="text-slate-400 mt-1">Choose an employee from the list to view their attendance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;
