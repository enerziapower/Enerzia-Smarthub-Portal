import React, { useState, useEffect } from 'react';
import { 
  Clock, LogIn, LogOut, CheckCircle, XCircle, AlertCircle,
  Calendar, ChevronLeft, ChevronRight, Loader2, Download,
  Coffee, Plane, Sun, Timer, DollarSign, X
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
    workingDays: 0,
    effectivePresent: 0,
    lopDays: 0,
    totalWorkHours: 0,
    totalOvertime: 0,
    approvedOTHours: 0,
    approvedOTAmount: 0,
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
  const [selectedDay, setSelectedDay] = useState(null);

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
      setSummary(res.data.summary || {});
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

  // Generate calendar from attendance records
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const calendarDays = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add actual days from attendance records
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
      default: return 'bg-slate-200';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'present': return 'bg-green-50 border-green-200';
      case 'absent': return 'bg-red-50 border-red-200';
      case 'half-day': return 'bg-amber-50 border-amber-200';
      case 'on-leave': return 'bg-blue-50 border-blue-200';
      case 'holiday': return 'bg-purple-50 border-purple-200';
      case 'permission': return 'bg-cyan-50 border-cyan-200';
      default: return 'bg-white border-slate-200';
    }
  };

  const getStatusIcon = (record) => {
    if (!record) return null;
    const status = record.status;
    const details = record.details || {};
    
    // Check for overtime badge
    if (details.has_overtime) {
      return <Timer className="w-3 h-3 text-orange-500" />;
    }
    
    // Check for permission badge
    if (details.has_permission) {
      return <Coffee className="w-3 h-3 text-cyan-500" />;
    }
    
    switch (status) {
      case 'present': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'absent': return <XCircle className="w-3 h-3 text-red-600" />;
      case 'half-day': return <AlertCircle className="w-3 h-3 text-amber-600" />;
      case 'on-leave': return <Plane className="w-3 h-3 text-blue-600" />;
      case 'holiday': return <Sun className="w-3 h-3 text-purple-600" />;
      default: return null;
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
          <p className="text-slate-500 mt-1">Check-in, leaves, permissions, overtime - all in one view</p>
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
              {todayRecord?.check_in ? (
                todayRecord.check_out ? 'Day Completed' : 'Working'
              ) : 'Not Checked In'}
            </h2>
            {todayRecord?.check_in && (
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
            {!todayRecord?.check_in && (
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
            {todayRecord?.check_in && !todayRecord.check_out && (
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Present</p>
              <p className="text-lg font-bold text-green-600">{summary.present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-red-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Absent</p>
              <p className="text-lg font-bold text-red-600">{summary.absent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-amber-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Half Days</p>
              <p className="text-lg font-bold text-amber-600">{summary.halfDays}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Plane className="text-blue-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-slate-500">On Leave</p>
              <p className="text-lg font-bold text-blue-600">{summary.onLeave}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sun className="text-purple-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Holidays</p>
              <p className="text-lg font-bold text-purple-600">{summary.holidays || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Coffee className="text-cyan-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Permission</p>
              <p className="text-lg font-bold text-cyan-600">{summary.permission || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Timer className="text-orange-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-slate-500">OT Days</p>
              <p className="text-lg font-bold text-orange-600">{summary.overtimeDays || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards - Row 2: Work Hours, Overtime & Payroll Impact */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Total Work Hours</p>
              <p className="text-2xl font-bold">{summary.totalWorkHours || 0} hrs</p>
            </div>
            <Clock className="w-8 h-8 text-indigo-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Approved OT</p>
              <p className="text-2xl font-bold">{summary.approvedOTHours || 0} hrs</p>
            </div>
            <Timer className="w-8 h-8 text-orange-200" />
          </div>
          {summary.approvedOTAmount > 0 && (
            <p className="text-xs text-orange-200 mt-1">₹{summary.approvedOTAmount?.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Working Days</p>
              <p className="text-2xl font-bold">{summary.workingDays || 26}</p>
            </div>
            <Calendar className="w-8 h-8 text-emerald-200" />
          </div>
          <p className="text-xs text-emerald-200 mt-1">Effective: {summary.effectivePresent || 0} days</p>
        </div>
        <div className={`rounded-xl p-4 text-white ${summary.lopDays > 0 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-slate-500 to-slate-600'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${summary.lopDays > 0 ? 'text-red-100' : 'text-slate-300'}`}>LOP Days</p>
              <p className="text-2xl font-bold">{summary.lopDays || 0}</p>
            </div>
            <DollarSign className={`w-8 h-8 ${summary.lopDays > 0 ? 'text-red-200' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xs mt-1 ${summary.lopDays > 0 ? 'text-red-200' : 'text-slate-400'}`}>
            {summary.lopDays > 0 ? 'Will affect salary' : 'No deductions'}
          </p>
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
              <div key={day} className={`text-center text-xs font-medium py-2 ${day === 'Sun' ? 'text-purple-600' : 'text-slate-500'}`}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((item, idx) => {
              const isSunday = idx % 7 === 0;
              const record = item?.record;
              const status = record?.status;
              const details = record?.details || {};
              const today = new Date().toISOString().split('T')[0];
              const isToday = item?.date === today;
              const isFuture = item?.date > today;
              
              return (
                <div
                  key={idx}
                  onClick={() => item && record && setSelectedDay(item)}
                  className={`min-h-[60px] flex flex-col items-center justify-start p-1 rounded-lg text-sm border transition-all ${
                    item ? 'cursor-pointer hover:shadow-md' : ''
                  } ${
                    isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                  } ${
                    record ? getStatusBg(status) : (isSunday && !isFuture ? 'bg-purple-50 border-purple-100' : 'bg-white border-slate-100')
                  }`}
                  data-testid={item ? `calendar-day-${item.day}` : undefined}
                >
                  {item && (
                    <>
                      <span className={`font-medium text-xs ${
                        status ? 'text-slate-700' : (isSunday ? 'text-purple-600' : 'text-slate-400')
                      }`}>
                        {item.day}
                      </span>
                      
                      {/* Status indicator */}
                      {record && (
                        <div className="flex flex-col items-center mt-0.5">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                          
                          {/* Additional badges */}
                          <div className="flex gap-0.5 mt-0.5">
                            {details.has_overtime && (
                              <span className="text-[8px] bg-orange-500 text-white px-1 rounded">OT</span>
                            )}
                            {details.has_permission && (
                              <span className="text-[8px] bg-cyan-500 text-white px-1 rounded">P</span>
                            )}
                            {details.leave_type && (
                              <span className="text-[8px] bg-blue-500 text-white px-1 rounded truncate max-w-[30px]">
                                {details.leave_type.substring(0, 2)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Sunday marker for future/no-record days */}
                      {!record && isSunday && !isFuture && (
                        <Sun className="w-3 h-3 text-purple-400 mt-1" />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs border-t border-slate-100 pt-3">
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
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] bg-orange-500 text-white px-1 rounded">OT</span>
            <span className="text-slate-600">Overtime</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] bg-cyan-500 text-white px-1 rounded">P</span>
            <span className="text-slate-600">Permission</span>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && selectedDay.record && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {new Date(selectedDay.date).toLocaleDateString('en-IN', { 
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Status */}
              <div className={`p-3 rounded-lg ${getStatusBg(selectedDay.record.status)}`}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedDay.record)}
                  <span className="font-medium">{getStatusLabel(selectedDay.record.status)}</span>
                </div>
              </div>
              
              {/* Check-in/out times */}
              {(selectedDay.record.check_in || selectedDay.record.check_out) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Check In</p>
                    <p className="font-semibold text-slate-800">{selectedDay.record.check_in || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Check Out</p>
                    <p className="font-semibold text-slate-800">{selectedDay.record.check_out || '-'}</p>
                  </div>
                </div>
              )}
              
              {/* Work hours */}
              {selectedDay.record.work_hours > 0 && (
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-xs text-indigo-600">Work Hours</p>
                  <p className="font-semibold text-indigo-800">{selectedDay.record.work_hours} hours</p>
                </div>
              )}
              
              {/* Leave details */}
              {selectedDay.record.details?.leave_type && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-600">Leave Type</p>
                  <p className="font-semibold text-blue-800">{selectedDay.record.details.leave_type}</p>
                  {selectedDay.record.details.reason && (
                    <p className="text-sm text-blue-600 mt-1">{selectedDay.record.details.reason}</p>
                  )}
                </div>
              )}
              
              {/* Permission details */}
              {selectedDay.record.details?.has_permission && (
                <div className="bg-cyan-50 p-3 rounded-lg">
                  <p className="text-xs text-cyan-600">Permission</p>
                  <p className="font-semibold text-cyan-800">
                    {selectedDay.record.details.permission?.from_time} - {selectedDay.record.details.permission?.to_time}
                  </p>
                  {selectedDay.record.details.permission?.reason && (
                    <p className="text-sm text-cyan-600 mt-1">{selectedDay.record.details.permission.reason}</p>
                  )}
                </div>
              )}
              
              {/* Overtime details */}
              {selectedDay.record.details?.has_overtime && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-orange-600">Approved Overtime</p>
                  <p className="font-semibold text-orange-800">
                    {selectedDay.record.details.overtime_approved?.hours} hours
                    {selectedDay.record.details.overtime_approved?.amount > 0 && (
                      <span className="text-sm ml-2">(₹{selectedDay.record.details.overtime_approved.amount.toLocaleString()})</span>
                    )}
                  </p>
                  {selectedDay.record.details.overtime_approved?.reason && (
                    <p className="text-sm text-orange-600 mt-1">{selectedDay.record.details.overtime_approved.reason}</p>
                  )}
                </div>
              )}
              
              {/* Holiday details */}
              {selectedDay.record.details?.holiday_type && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-purple-600">Holiday</p>
                  <p className="font-semibold text-purple-800">
                    {selectedDay.record.details.name || (selectedDay.record.details.holiday_type === 'weekly_off' ? 'Weekly Off' : 'Public Holiday')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-2">📅 How My Attendance Works</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li><strong>Check In/Out:</strong> Mark your daily attendance from this page</li>
            <li><strong>Leaves:</strong> Approved leaves automatically appear on the calendar</li>
            <li><strong>Permissions:</strong> Approved permissions show with a "P" badge</li>
            <li><strong>Overtime:</strong> Approved OT shows with an "OT" badge and amount</li>
            <li><strong>Payroll:</strong> All data flows to HR for salary calculation (LOP, OT pay)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
