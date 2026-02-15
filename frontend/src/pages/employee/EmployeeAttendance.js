import React, { useState, useEffect } from 'react';
import { 
  Clock, LogIn, LogOut, CheckCircle, XCircle, AlertCircle,
  Calendar, ChevronLeft, ChevronRight, Loader2, Download, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeAttendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    halfDays: 0,
    onLeave: 0,
    holidays: 0,
    permission: 0,
    totalDays: 0,
    totalWorkHours: 0,
    totalOvertime: 0,
    overtimeDays: 0
  });
  const [officeTimings, setOfficeTimings] = useState({
    startTime: '09:30',
    endTime: '18:00',
    standardHours: 8.5
  });
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, [user, currentMonth, currentYear]);

  const fetchAttendance = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await employeeHubAPI.getAttendance(user.id, currentMonth, currentYear);
      setAttendance(res.data.records || []);
      setSummary(res.data.summary || {
        present: 0,
        absent: 0,
        halfDays: 0,
        onLeave: 0,
        holidays: 0,
        permission: 0,
        totalDays: 0,
        totalWorkHours: 0,
        totalOvertime: 0,
        overtimeDays: 0
      });
      if (res.data.officeTimings) {
        setOfficeTimings(res.data.officeTimings);
      }
      
      // Find today's record
      const today = new Date().toISOString().split('T')[0];
      const todayRec = res.data.records?.find(r => r.date === today);
      setTodayRecord(todayRec);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      await employeeHubAPI.checkIn(user?.id, user?.name || 'User');
      toast.success('Checked in successfully');
      fetchAttendance();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      await employeeHubAPI.checkOut(user?.id);
      toast.success('Checked out successfully');
      fetchAttendance();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });

  const downloadPDF = async () => {
    if (!user?.id) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance-reports/download/pdf/${user.id}?month=${currentMonth}&year=${currentYear}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `My_Attendance_${monthName}_${currentYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Attendance report downloaded');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  // Generate calendar days
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const calendarDays = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = attendance.find(a => a.date === dateStr);
    calendarDays.push({ day, date: dateStr, record });
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'half-day': return 'bg-amber-500';
      case 'on-leave': return 'bg-blue-500';
      case 'holiday': return 'bg-purple-500';
      case 'permission': return 'bg-cyan-500';
      default: return 'bg-slate-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'half-day': return 'Half Day';
      case 'on-leave': return 'On Leave';
      case 'holiday': return 'Holiday';
      case 'permission': return 'Permission';
      default: return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="employee-attendance">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Attendance</h1>
          <p className="text-slate-500 mt-1">Track your daily attendance and work hours</p>
        </div>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          data-testid="download-attendance-btn"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download Report
        </button>
      </div>

      {/* Today's Check In/Out */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Today - {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <h2 className="text-2xl font-bold mt-1">
              {todayRecord ? (
                todayRecord.check_out ? 'Day Completed' : 'Working'
              ) : 'Not Checked In'}
            </h2>
            {todayRecord && (
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-100">
                {todayRecord.check_in && (
                  <span className="flex items-center gap-1">
                    <LogIn size={14} />
                    In: {todayRecord.check_in}
                  </span>
                )}
                {todayRecord.check_out && (
                  <span className="flex items-center gap-1">
                    <LogOut size={14} />
                    Out: {todayRecord.check_out}
                  </span>
                )}
                {todayRecord.work_hours > 0 && (
                  <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">
                    <Clock size={14} />
                    {todayRecord.work_hours} hrs
                    {todayRecord.overtime > 0 && (
                      <span className="text-amber-200 ml-1">(+{todayRecord.overtime} OT)</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {!todayRecord && (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="flex items-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 disabled:opacity-50"
                data-testid="check-in-btn"
              >
                {checkingIn ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                Check In
              </button>
            )}
            {todayRecord && !todayRecord.check_out && (
              <button
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 disabled:opacity-50"
                data-testid="check-out-btn"
              >
                {checkingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                Check Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards - Row 1: Attendance Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Present</p>
              <p className="text-xl font-bold text-green-600">{summary.present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Absent</p>
              <p className="text-xl font-bold text-red-600">{summary.absent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Half Days</p>
              <p className="text-xl font-bold text-amber-600">{summary.halfDays}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">On Leave</p>
              <p className="text-xl font-bold text-blue-600">{summary.onLeave}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Holidays</p>
              <p className="text-xl font-bold text-purple-600">{summary.holidays || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Clock className="text-cyan-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Permission</p>
              <p className="text-xl font-bold text-cyan-600">{summary.permission || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Clock className="text-slate-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Days</p>
              <p className="text-xl font-bold text-slate-800">{summary.totalDays}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards - Row 2: Work Hours & Overtime (for Payroll) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Total Work Hours</p>
              <p className="text-2xl font-bold">{summary.totalWorkHours || 0} hrs</p>
            </div>
            <Clock className="w-10 h-10 text-indigo-200" />
          </div>
          <p className="text-xs text-indigo-200 mt-2">Standard: {officeTimings.standardHours} hrs/day</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total Overtime</p>
              <p className="text-2xl font-bold">{summary.totalOvertime || 0} hrs</p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-200" />
          </div>
          <p className="text-xs text-orange-200 mt-2">{summary.overtimeDays || 0} days with overtime</p>
        </div>
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm">Office Timings</p>
              <p className="text-xl font-bold">{officeTimings.startTime} - {officeTimings.endTime}</p>
            </div>
            <Calendar className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-xs text-slate-300 mt-2">{officeTimings.standardHours} hours = 1 working day</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Attendance Calendar</h2>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <span className="font-medium text-slate-800 min-w-[140px] text-center">
              {monthName} {currentYear}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((item, idx) => (
              <div
                key={idx}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                  item ? 'hover:bg-slate-50 cursor-pointer' : ''
                }`}
              >
                {item && (
                  <>
                    <span className={`font-medium ${
                      item.record ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {item.day}
                    </span>
                    {item.record && (
                      <div className={`w-2 h-2 rounded-full mt-1 ${getStatusColor(item.record.status)}`} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-slate-600">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-600">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600">Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600">On Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-600">Holiday</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
