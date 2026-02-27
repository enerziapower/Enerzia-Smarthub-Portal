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
  { id: 'site_visit', label: 'Site Visit', icon: Car, color: 'emerald' },
  { id: 'call_back', label: 'Call Back', icon: Phone, color: 'amber' },
  { id: 'visit_later', label: 'Visit Later', icon: MapPin, color: 'violet' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'slate' },
];

const statusBorderColors = {
  scheduled: 'border-l-blue-500',
  pending: 'border-l-yellow-500',
  completed: 'border-l-emerald-500 opacity-60',
  cancelled: 'border-l-red-500 opacity-60',
  rescheduled: 'border-l-violet-500',
};

const typeColors = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
  slate: { bg: 'bg-gray-100', text: 'text-gray-700' },
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

  const generateCalendarDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: null
      });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        isCurrentMonth: true,
        date: dateStr,
        followups: calendarData[dateStr] || []
      });
    }
    
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
          <h1 className="text-2xl font-bold text-gray-900">Follow-up Calendar</h1>
          <p className="text-gray-500 mt-1">View scheduled follow-ups by date</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/sales/lead-management')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/sales/lead-management/new')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Follow-up
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(day => (
              <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
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
                          ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-200'
                          : isToday
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                        : 'bg-gray-50 border-transparent opacity-40'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      dayData.isCurrentMonth
                        ? isToday
                          ? 'text-emerald-600'
                          : 'text-gray-900'
                        : 'text-gray-400'
                    }`}>
                      {dayData.day}
                    </div>
                    
                    {hasFollowups && (
                      <div className="space-y-0.5">
                        {dayData.followups.slice(0, 3).map((f, i) => {
                          const typeInfo = getTypeInfo(f.followup_type);
                          const colors = typeColors[typeInfo.color] || typeColors.slate;
                          return (
                            <div
                              key={i}
                              className={`text-xs px-1 py-0.5 rounded truncate border-l-2 ${statusBorderColors[f.status]} ${colors.bg}`}
                              title={f.title}
                            >
                              <span className={colors.text}>{f.title}</span>
                            </div>
                          );
                        })}
                        {dayData.followups.length > 3 && (
                          <div className="text-xs text-gray-500 pl-1">
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
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-500" />
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
                  const colors = typeColors[typeInfo.color] || typeColors.slate;
                  
                  return (
                    <div
                      key={followup.id}
                      onClick={() => navigate(`/sales/lead-management/followups/${followup.id}`)}
                      className={`bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-gray-300 cursor-pointer transition-all border-l-4 ${statusBorderColors[followup.status]}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
                          <TypeIcon className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium truncate">{followup.title}</p>
                          <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {followup.customer_name || followup.lead_company || followup.lead_name || 'Unknown'}
                          </p>
                          {followup.scheduled_time && (
                            <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {followup.scheduled_time}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                              {typeInfo.label}
                            </span>
                            <span className={`text-xs capitalize ${
                              followup.status === 'completed' ? 'text-emerald-600' :
                              followup.status === 'cancelled' ? 'text-red-600' :
                              'text-gray-500'
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
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No follow-ups scheduled</p>
                <button
                  onClick={() => navigate('/sales/lead-management/new')}
                  className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors"
                >
                  Schedule Follow-up
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Click on a date to view follow-ups</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h4 className="text-gray-500 text-sm font-medium mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4">
          {followupTypes.map(type => {
            const colors = typeColors[type.color] || typeColors.slate;
            return (
              <div key={type.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors.bg.replace('100', '500')}`}></div>
                <span className="text-gray-700 text-sm">{type.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FollowUpCalendar;
