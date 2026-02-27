import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  Phone, MapPin, Calendar, Clock, User, Building2, Mail,
  Plus, Filter, Search, ChevronRight, AlertCircle, CheckCircle2,
  XCircle, RotateCcw, PhoneCall, Car, MessageSquare, MoreHorizontal,
  TrendingUp, Users, CalendarDays, ArrowRight
} from 'lucide-react';

const followupTypes = [
  { id: 'cold_call', label: 'Cold Call', icon: PhoneCall, color: 'blue' },
  { id: 'site_visit', label: 'Site Visit', icon: Car, color: 'green' },
  { id: 'call_back', label: 'Call Back', icon: Phone, color: 'orange' },
  { id: 'visit_later', label: 'Visit Later', icon: MapPin, color: 'purple' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'slate' },
];

const statusColors = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  rescheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const priorityColors = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

const LeadManagement = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [todayFollowups, setTodayFollowups] = useState([]);
  const [overdueFollowups, setOverdueFollowups] = useState([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, todayRes, overdueRes, upcomingRes] = await Promise.all([
        api.get('/lead-management/followups/stats'),
        api.get('/lead-management/followups/today'),
        api.get('/lead-management/followups/overdue'),
        api.get('/lead-management/followups/upcoming?days=7'),
      ]);
      setStats(statsRes.data);
      setTodayFollowups(todayRes.data.followups || []);
      setOverdueFollowups(overdueRes.data.followups || []);
      setUpcomingFollowups(upcomingRes.data.followups || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type) => {
    return followupTypes.find(t => t.id === type) || followupTypes[4];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleMarkComplete = async (followupId) => {
    try {
      await api.post(`/lead-management/followups/${followupId}/complete?outcome=Completed`);
      toast.success('Follow-up marked as completed');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  const FollowupCard = ({ followup, showDate = false }) => {
    const typeInfo = getTypeInfo(followup.followup_type);
    const TypeIcon = typeInfo.icon;
    
    return (
      <div 
        className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-all cursor-pointer"
        onClick={() => navigate(`/sales/lead-management/followups/${followup.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg bg-${typeInfo.color}-500/20`}>
              <TypeIcon className={`w-4 h-4 text-${typeInfo.color}-400`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate">{followup.title}</h4>
              <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3" />
                {followup.customer_name || followup.lead_company || followup.lead_name || 'Unknown'}
              </p>
              {showDate && (
                <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(followup.scheduled_date)}
                  {followup.scheduled_time && ` at ${followup.scheduled_time}`}
                </p>
              )}
              {!showDate && followup.scheduled_time && (
                <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {followup.scheduled_time}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[followup.priority]}`}>
              {followup.priority}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[followup.status]}`}>
              {followup.status}
            </span>
          </div>
        </div>
        {followup.assigned_to_name && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <User className="w-3 h-3" />
              {followup.assigned_to_name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMarkComplete(followup.id);
              }}
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              Complete
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="lead-management-dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Management</h1>
          <p className="text-slate-400 mt-1">Manage customer follow-ups and leads</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/sales/lead-management/calendar')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Calendar
          </button>
          <button
            onClick={() => navigate('/sales/lead-management/followups')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            All Follow-ups
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm">Today</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats?.today || 0}</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 text-sm">This Week</span>
            <CalendarDays className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats?.this_week || 0}</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-red-400 text-sm">Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats?.overdue || 0}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-green-400 text-sm">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats?.by_status?.completed || 0}</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-purple-400 text-sm">Scheduled</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats?.by_status?.scheduled || 0}</p>
        </div>
        
        <div className="bg-gradient-to-br from-slate-600/20 to-slate-800/20 border border-slate-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats?.total || 0}</p>
        </div>
      </div>

      {/* Follow-up Type Stats */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">By Type</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {followupTypes.map(type => (
            <div key={type.id} className={`bg-${type.color}-500/10 border border-${type.color}-500/20 rounded-lg p-3 text-center`}>
              <type.icon className={`w-5 h-5 text-${type.color}-400 mx-auto mb-2`} />
              <p className="text-xl font-bold text-white">{stats?.by_type?.[type.id] || 0}</p>
              <p className={`text-xs text-${type.color}-400`}>{type.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overdue */}
        <div className="bg-slate-800/30 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-red-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Overdue ({overdueFollowups.length})
            </h3>
            {overdueFollowups.length > 0 && (
              <button 
                onClick={() => navigate('/sales/lead-management/followups?status=overdue')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {overdueFollowups.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No overdue follow-ups</p>
            ) : (
              overdueFollowups.slice(0, 5).map(f => (
                <FollowupCard key={f.id} followup={f} showDate />
              ))
            )}
          </div>
        </div>

        {/* Today */}
        <div className="bg-slate-800/30 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-blue-400 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today ({todayFollowups.length})
            </h3>
            {todayFollowups.length > 0 && (
              <button 
                onClick={() => navigate('/sales/lead-management/followups?date=today')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {todayFollowups.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No follow-ups scheduled for today</p>
            ) : (
              todayFollowups.slice(0, 5).map(f => (
                <FollowupCard key={f.id} followup={f} />
              ))
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-slate-800/30 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-amber-400 font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Upcoming 7 Days ({upcomingFollowups.length})
            </h3>
            {upcomingFollowups.length > 0 && (
              <button 
                onClick={() => navigate('/sales/lead-management/followups')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {upcomingFollowups.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No upcoming follow-ups</p>
            ) : (
              upcomingFollowups.slice(0, 5).map(f => (
                <FollowupCard key={f.id} followup={f} showDate />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadManagement;
