import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { 
  CalendarDays, RefreshCw, ChevronLeft, ChevronRight,
  Filter, X, Clock, User, Building2, MapPin, Wrench,
  CheckCircle, AlertCircle, Clock4, Plus
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const localizer = momentLocalizer(moment);

const ServiceVisitCalendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [filters, setFilters] = useState({
    status: 'all',
    taskType: 'all',
    engineer: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [engineers, setEngineers] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/department-tasks?department=projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const allTasks = data.tasks || [];
        
        // Extract unique engineers and task types for filters
        const uniqueEngineers = [...new Set(allTasks.map(t => t.assigned_to).filter(Boolean))];
        const uniqueTaskTypes = [...new Set(allTasks.map(t => t.task_type).filter(Boolean))];
        
        setEngineers(uniqueEngineers);
        setTaskTypes(uniqueTaskTypes);
        setTasks(allTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Convert tasks to calendar events
  const events = useMemo(() => {
    return tasks
      .filter(task => {
        // Apply filters
        if (filters.status !== 'all' && task.status !== filters.status) return false;
        if (filters.taskType !== 'all' && task.task_type !== filters.taskType) return false;
        if (filters.engineer !== 'all' && task.assigned_to !== filters.engineer) return false;
        return true;
      })
      .filter(task => task.due_date || task.scheduled_date)
      .map(task => {
        const eventDate = new Date(task.scheduled_date || task.due_date);
        return {
          id: task.id,
          title: task.is_pre_project 
            ? `[Pre-Project] ${task.customer_name || task.title}`
            : `${task.project_name || task.title}`,
          start: eventDate,
          end: eventDate,
          allDay: true,
          resource: task
        };
      });
  }, [tasks, filters]);

  // Get event style based on status
  const eventStyleGetter = (event) => {
    const task = event.resource;
    let backgroundColor = '#3b82f6'; // Default blue
    let borderColor = '#2563eb';

    if (task.status === 'completed') {
      backgroundColor = '#10b981';
      borderColor = '#059669';
    } else if (task.status === 'in_progress') {
      backgroundColor = '#f59e0b';
      borderColor = '#d97706';
    } else if (task.status === 'overdue' || (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed')) {
      backgroundColor = '#ef4444';
      borderColor = '#dc2626';
    } else if (task.is_pre_project) {
      backgroundColor = '#8b5cf6';
      borderColor = '#7c3aed';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: `2px solid ${borderColor}`,
        display: 'block',
        fontSize: '12px',
        padding: '2px 4px'
      }
    };
  };

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView }) => (
    <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('PREV')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight size={20} className="text-slate-600" />
        </button>
        <h2 className="text-xl font-semibold text-slate-800 ml-4">{label}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 rounded-lg p-1">
          {['month', 'week', 'day', 'agenda'].map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                view === v 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Filter size={16} />
          Filters
        </button>
      </div>
    </div>
  );

  // Handle event click
  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
  };

  // Close event detail modal
  const closeEventDetail = () => {
    setSelectedEvent(null);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      overdue: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || statusStyles.pending}`}>
        {status?.replace('_', ' ').toUpperCase() || 'PENDING'}
      </span>
    );
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 bg-slate-50 min-h-screen" data-testid="service-visit-calendar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Visit Calendar</h1>
          <p className="text-slate-500 mt-1">View and manage all scheduled service visits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            data-testid="refresh-calendar-btn"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/projects/work-schedule')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            data-testid="new-task-btn"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
        <span className="text-sm text-slate-600 font-medium">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span className="text-xs text-slate-600">Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-xs text-slate-600">In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span className="text-xs text-slate-600">Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-xs text-slate-600">Overdue</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500"></div>
          <span className="text-xs text-slate-600">Pre-Project</span>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="filter-status"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Task Type:</label>
            <select
              value={filters.taskType}
              onChange={(e) => setFilters({ ...filters, taskType: e.target.value })}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="filter-task-type"
            >
              <option value="all">All Types</option>
              {taskTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Engineer:</label>
            <select
              value={filters.engineer}
              onChange={(e) => setFilters({ ...filters, engineer: e.target.value })}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="filter-engineer"
            >
              <option value="all">All Engineers</option>
              {engineers.map(eng => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setFilters({ status: 'all', taskType: 'all', engineer: 'all' })}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 650 }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
          components={{
            toolbar: CustomToolbar
          }}
          popup
          selectable
          className="p-4"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Tasks</p>
              <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
            </div>
            <CalendarDays className="w-8 h-8 text-slate-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-blue-600">
                {tasks.filter(t => t.status === 'pending').length}
              </p>
            </div>
            <Clock4 className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-amber-600">
                {tasks.filter(t => t.status === 'in_progress').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeEventDetail}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
            data-testid="event-detail-modal"
          >
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Task Details</h3>
              <button
                onClick={closeEventDetail}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                data-testid="close-modal-btn"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Pre-project badge */}
              {selectedEvent.is_pre_project && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  <Wrench size={14} />
                  Pre-Project Task
                </div>
              )}

              {/* Title and Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-slate-900">
                    {selectedEvent.title || selectedEvent.task_type}
                  </h4>
                  {selectedEvent.project_name && !selectedEvent.is_pre_project && (
                    <p className="text-sm text-slate-500 mt-1">
                      Project: {selectedEvent.project_name}
                    </p>
                  )}
                </div>
                {getStatusBadge(selectedEvent.status)}
              </div>

              {/* Customer/Client Info */}
              {(selectedEvent.customer_name || selectedEvent.client_name) && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {selectedEvent.customer_name || selectedEvent.client_name}
                    </p>
                    {selectedEvent.customer_site && (
                      <p className="text-xs text-slate-500">{selectedEvent.customer_site}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Due Date</p>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(selectedEvent.due_date || selectedEvent.scheduled_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Assigned To</p>
                    <p className="text-sm font-medium text-slate-800">
                      {selectedEvent.assigned_to || 'Unassigned'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Task Type */}
              {selectedEvent.task_type && (
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Task Type</p>
                    <p className="text-sm font-medium text-slate-800">{selectedEvent.task_type}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Contact Info for Pre-Project */}
              {selectedEvent.is_pre_project && selectedEvent.customer_contact && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-blue-600">Customer Contact</p>
                    <p className="text-sm font-medium text-blue-800">{selectedEvent.customer_contact}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={closeEventDetail}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  closeEventDetail();
                  navigate('/projects/work-schedule');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                data-testid="view-in-planner-btn"
              >
                View in Work Planner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceVisitCalendar;
