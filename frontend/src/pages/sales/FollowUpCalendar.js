import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  PhoneCall, Car, Phone, MapPin, MessageSquare, Clock, Building2
} from 'lucide-react';

const followupTypes = [
  { id: 'cold_call', label: 'Cold Call', icon: PhoneCall, color: 'blue' },
  { id: 'site_visit', label: 'Site Visit', icon: Car, color: 'green' },
  { id: 'call_back', label: 'Call Back', icon: Phone, color: 'orange' },
  { id: 'visit_later', label: 'Visit Later', icon: MapPin, color: 'purple' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'slate' },
];

const statusColors = {
  scheduled: 'border-l-blue-500',
  pending: 'border-l-yellow-500',
  completed: 'border-l-green-500 opacity-50',
  cancelled: 'border-l-red-500 opacity-50',
  rescheduled: 'border-l-purple-500',
};

const FollowUpCalendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchCalendarData();
  }, [year, month]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/lead-management/followups/calendar?year=${year}&month=${month + 1}`);
      setCalendarData(res.data.calendar || {});
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month's days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: null
      });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        isCurrentMonth: true,
        date: dateStr,
        followups: calendarData[dateStr] || []
      });
    }
    
    // Next month's days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: null
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const getTypeInfo = (type) => {
    return followupTypes.find(t => t.id === type) || followupTypes[4];
  };

  const selectedDateFollowups = selectedDate ? (calendarData[selectedDate] || []) : [];

  return (
    <div data-testid="followup-calendar" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Follow-up Calendar</h1>
          <p className="text-slate-400 mt-1">View scheduled follow-ups by date</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/sales/lead-management')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/sales/lead-management/new')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Follow-up
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(day => (
              <div key={day} className="py-2 text-center text-xs font-medium text-slate-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayData, index) => {
                const isToday = dayData.date === todayStr;
                const isSelected = dayData.date === selectedDate;
                const hasFollowups = dayData.followups && dayData.followups.length > 0;
                
                return (
                  <div
                    key={index}
                    onClick={() => dayData.isCurrentMonth && dayData.date && setSelectedDate(dayData.date)}
                    className={`min-h-24 p-1 rounded-lg border transition-all ${
                      dayData.isCurrentMonth
                        ? isSelected
                          ? 'bg-amber-500/20 border-amber-500'
                          : isToday
                            ? 'bg-blue-500/10 border-blue-500/50'
                            : 'bg-slate-900/30 border-slate-700/50 hover:border-slate-600 cursor-pointer'
                        : 'bg-slate-900/10 border-transparent opacity-40'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      dayData.isCurrentMonth
                        ? isToday
                          ? 'text-blue-400'
                          : 'text-slate-300'
                        : 'text-slate-600'
                    }`}>
                      {dayData.day}
                    </div>
                    
                    {hasFollowups && (
                      <div className="space-y-0.5">
                        {dayData.followups.slice(0, 3).map((f, i) => {
                          const typeInfo = getTypeInfo(f.followup_type);
                          return (
                            <div
                              key={i}
                              className={`text-xs px-1 py-0.5 rounded truncate border-l-2 bg-slate-800/50 ${statusColors[f.status]}`}
                              title={f.title}
                            >
                              <span className={`text-${typeInfo.color}-400`}>{f.title}</span>
                            </div>
                          );
                        })}
                        {dayData.followups.length > 3 && (
                          <div className="text-xs text-slate-500 pl-1">
                            +{dayData.followups.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Details */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-400" />
              {selectedDate ? (
                new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              ) : (
                'Select a date'
              )}
            </h3>
          </div>

          {selectedDate ? (
            selectedDateFollowups.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {selectedDateFollowups.map(followup => {
                  const typeInfo = getTypeInfo(followup.followup_type);
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <div
                      key={followup.id}
                      onClick={() => navigate(`/sales/lead-management/followups/${followup.id}`)}
                      className={`bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 cursor-pointer transition-all border-l-4 ${statusColors[followup.status]}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${typeInfo.color}-500/20 flex-shrink-0`}>
                          <TypeIcon className={`w-4 h-4 text-${typeInfo.color}-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{followup.title}</p>
                          <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {followup.customer_name || followup.lead_company || followup.lead_name || 'Unknown'}
                          </p>
                          {followup.scheduled_time && (
                            <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {followup.scheduled_time}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-${typeInfo.color}-500/20 text-${typeInfo.color}-400`}>
                              {typeInfo.label}
                            </span>
                            <span className={`text-xs capitalize ${
                              followup.status === 'completed' ? 'text-green-400' :
                              followup.status === 'cancelled' ? 'text-red-400' :
                              'text-slate-400'
                            }`}>
                              {followup.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No follow-ups scheduled</p>
                <button
                  onClick={() => navigate('/sales/lead-management/new')}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors"
                >
                  Schedule Follow-up
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Click on a date to view follow-ups</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h4 className="text-slate-400 text-sm font-medium mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4">
          {followupTypes.map(type => (
            <div key={type.id} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-${type.color}-500`}></div>
              <span className="text-slate-300 text-sm">{type.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FollowUpCalendar;
