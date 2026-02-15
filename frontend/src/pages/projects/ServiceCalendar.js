import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Clock, User, MapPin, Building2, RefreshCw, Filter,
  CheckCircle, Circle, AlertCircle, X, Save, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ServiceCalendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [filterEngineer, setFilterEngineer] = useState('');
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [showVisitModal, setShowVisitModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all AMCs to get service visits
      const amcResponse = await fetch(`${API}/api/amc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch team members
      const teamResponse = await fetch(`${API}/api/department-team/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (amcResponse.ok) {
        const amcData = await amcResponse.json();
        const allVisits = [];
        
        // Extract service visits from AMCs
        (amcData.amcs || []).forEach(amc => {
          (amc.service_visits || []).forEach(visit => {
            if (visit.scheduled_date || visit.visit_date) {
              allVisits.push({
                ...visit,
                amc_id: amc.id,
                amc_number: amc.amc_number,
                client_name: amc.client_name,
                location: amc.location,
                date: visit.scheduled_date || visit.visit_date
              });
            }
          });
        });
        
        setVisits(allVisits);
      }

      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        setEngineers(teamData.filter(e => e.is_active !== false));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getVisitsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return visits.filter(visit => {
      const visitDate = new Date(visit.date).toISOString().split('T')[0];
      if (filterEngineer && visit.engineer !== filterEngineer) return false;
      return visitDate === dateStr;
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'scheduled':
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={12} className="text-emerald-600" />;
      case 'in progress':
        return <Clock size={12} className="text-blue-600" />;
      case 'cancelled':
        return <X size={12} className="text-red-600" />;
      default:
        return <Circle size={12} className="text-amber-600" />;
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Statistics
  const monthVisits = visits.filter(v => {
    const visitDate = new Date(v.date);
    return visitDate.getMonth() === currentDate.getMonth() && 
           visitDate.getFullYear() === currentDate.getFullYear();
  });
  
  const completedCount = monthVisits.filter(v => v.status?.toLowerCase() === 'completed').length;
  const pendingCount = monthVisits.filter(v => v.status?.toLowerCase() !== 'completed' && v.status?.toLowerCase() !== 'cancelled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Visit Calendar</h1>
          <p className="text-slate-500 mt-1">Schedule and track all service visits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{monthVisits.length}</p>
            <p className="text-xs text-slate-500">Total This Month</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-xs text-slate-500">Completed</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <label className="block text-xs text-slate-500 mb-1">Filter by Engineer</label>
          <select
            value={filterEngineer}
            onChange={(e) => setFilterEngineer(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
          >
            <option value="">All Engineers</option>
            {engineers.map(eng => (
              <option key={eng.id} value={eng.name}>{eng.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-xs font-semibold text-slate-500 bg-slate-50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayVisits = getVisitsForDate(day.date);
              const isToday = day.date.toDateString() === today.toDateString();
              const isSelected = selectedDate?.toDateString() === day.date.toDateString();
              
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day.date)}
                  className={`min-h-[100px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors
                    ${!day.isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'hover:bg-blue-50'}
                    ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}
                    ${isToday ? 'bg-amber-50' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayVisits.slice(0, 3).map((visit, vIdx) => (
                      <div
                        key={vIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVisit(visit);
                          setShowVisitModal(true);
                        }}
                        className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${getStatusColor(visit.status)}`}
                      >
                        {visit.client_name}
                      </div>
                    ))}
                    {dayVisits.length > 3 && (
                      <div className="text-xs text-slate-500 pl-1">+{dayVisits.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Selected Date Details */}
        <div className="space-y-4">
          {/* Selected Date Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-2">
              {selectedDate ? formatDate(selectedDate) : 'Select a date'}
            </h3>
            {selectedDate && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {getVisitsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No visits scheduled</p>
                ) : (
                  getVisitsForDate(selectedDate).map((visit, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedVisit(visit);
                        setShowVisitModal(true);
                      }}
                      className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(visit.status)}`}>
                          {visit.status || 'Scheduled'}
                        </span>
                        <span className="text-xs text-slate-400">{visit.visit_type || 'Service'}</span>
                      </div>
                      <h4 className="font-medium text-slate-800 text-sm">{visit.client_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{visit.amc_number}</p>
                      {visit.engineer && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <User size={10} />
                          {visit.engineer}
                        </p>
                      )}
                      {visit.location && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin size={10} />
                          {visit.location}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Status Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-sm text-slate-600">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-slate-600">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span className="text-sm text-slate-600">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-slate-600">Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Details Modal */}
      {showVisitModal && selectedVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Service Visit Details</h2>
              <button
                onClick={() => {
                  setShowVisitModal(false);
                  setSelectedVisit(null);
                }}
                className="p-2 hover:bg-slate-200 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedVisit.status)}`}>
                  {selectedVisit.status || 'Scheduled'}
                </span>
                <span className="text-sm text-slate-500">{selectedVisit.visit_type || 'Service Visit'}</span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedVisit.client_name}</h3>
                <p className="text-slate-500">{selectedVisit.amc_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(selectedVisit.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Engineer</label>
                  <p className="text-sm font-medium text-slate-800">{selectedVisit.engineer || 'Not assigned'}</p>
                </div>
              </div>

              {selectedVisit.location && (
                <div>
                  <label className="text-xs text-slate-500">Location</label>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
                    <MapPin size={14} />
                    {selectedVisit.location}
                  </p>
                </div>
              )}

              {selectedVisit.remarks && (
                <div>
                  <label className="text-xs text-slate-500">Remarks</label>
                  <p className="text-sm text-slate-600">{selectedVisit.remarks}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowVisitModal(false);
                    navigate(`/projects/amc/${selectedVisit.amc_id}`);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View AMC
                </button>
                <button
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCalendar;
