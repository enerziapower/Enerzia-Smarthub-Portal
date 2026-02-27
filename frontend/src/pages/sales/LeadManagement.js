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
  { id: 'site_visit', label: 'Site Visit', icon: Car, color: 'emerald' },
  { id: 'call_back', label: 'Call Back', icon: Phone, color: 'amber' },
  { id: 'visit_later', label: 'Visit Later', icon: MapPin, color: 'violet' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'slate' },
];

const statusColors = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  rescheduled: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

const priorityColors = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-emerald-500/20 text-emerald-400',
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
            <div className={`p-2 rounded-lg ${
              typeInfo.color === 'blue' ? 'bg-blue-500/20' :
              typeInfo.color === 'emerald' ? 'bg-emerald-500/20' :
              typeInfo.color === 'amber' ? 'bg-amber-500/20' :
              typeInfo.color === 'violet' ? 'bg-violet-500/20' :
              'bg-slate-500/20'
            }`}>
              <TypeIcon className={`w-4 h-4 ${
                typeInfo.color === 'blue' ? 'text-blue-400' :
                typeInfo.color === 'emerald' ? 'text-emerald-400' :
                typeInfo.color === 'amber' ? 'text-amber-400' :
                typeInfo.color === 'violet' ? 'text-violet-400' :
                'text-slate-400'
              }`} />
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
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Follow-up
          </button>
        </div>
      </div>

      {/* Stats Cards - Colorful Gradient Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Today - Blue */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg">
          <p className="text-blue-100 text-sm font-medium">Today</p>
          <p className="text-4xl font-bold text-white mt-1">{stats?.today || 0}</p>
          <p className="text-blue-200 text-xs mt-2">scheduled for today</p>
        </div>
        
        {/* This Week - Green */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 shadow-lg">
          <p className="text-emerald-100 text-sm font-medium">This Week</p>
          <p className="text-4xl font-bold text-white mt-1">{stats?.this_week || 0}</p>
          <p className="text-emerald-200 text-xs mt-2">in next 7 days</p>
        </div>
        
        {/* Overdue - Red */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 shadow-lg">
          <p className="text-red-100 text-sm font-medium">Overdue</p>
          <p className="text-4xl font-bold text-white mt-1">{stats?.overdue || 0}</p>
          <p className="text-red-200 text-xs mt-2">needs attention</p>
        </div>
        
        {/* Completed - Purple */}
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 shadow-lg">
          <p className="text-violet-100 text-sm font-medium">Completed</p>
          <p className="text-4xl font-bold text-white mt-1">{stats?.by_status?.completed || 0}</p>
          <p className="text-violet-200 text-xs mt-2">follow-ups done</p>
        </div>
        
        {/* Total - Slate/Gray */}
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-5 shadow-lg border border-slate-500/30">
          <p className="text-slate-300 text-sm font-medium">Total Balance</p>
          <p className="text-4xl font-bold text-white mt-1">{stats?.total || 0}</p>
          <p className="text-slate-400 text-xs mt-2">{stats?.by_status?.scheduled || 0} pending</p>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          How Follow-ups Work
        </h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            Schedule follow-ups for cold calls, site visits, or callbacks
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            Link to existing customers or create new lead entries
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            Track outcomes and plan next actions when completed
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            View calendar to see scheduled activities at a glance
          </li>
        </ul>
      </div>

      {/* Follow-up Type Stats - Colorful Cards */}
      <div>
        <h3 className="text-white font-medium mb-4">By Type</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* Cold Call - Blue */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{stats?.by_type?.cold_call || 0}</p>
            <p className="text-blue-100 text-sm mt-1">Cold Call</p>
          </div>
          
          {/* Site Visit - Green */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 shadow-lg">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
              <Car className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{stats?.by_type?.site_visit || 0}</p>
            <p className="text-emerald-100 text-sm mt-1">Site Visit</p>
          </div>
          
          {/* Call Back - Orange/Amber */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 shadow-lg">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{stats?.by_type?.call_back || 0}</p>
            <p className="text-amber-100 text-sm mt-1">Call Back</p>
          </div>
          
          {/* Visit Later - Purple */}
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-4 shadow-lg">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{stats?.by_type?.visit_later || 0}</p>
            <p className="text-violet-100 text-sm mt-1">Visit Later</p>
          </div>
          
          {/* General - Gray */}
          <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-4 shadow-lg">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{stats?.by_type?.general || 0}</p>
            <p className="text-slate-200 text-sm mt-1">General</p>
          </div>
        </div>
      </div>

      {/* My Follow-ups Section */}
      <div>
        <h3 className="text-white font-medium mb-4">My Follow-ups</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overdue */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h4 className="text-red-400 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Overdue ({overdueFollowups.length})
              </h4>
              {overdueFollowups.length > 0 && (
                <button 
                  onClick={() => navigate('/sales/lead-management/followups?status=overdue')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h4 className="text-blue-400 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Today ({todayFollowups.length})
              </h4>
              {todayFollowups.length > 0 && (
                <button 
                  onClick={() => navigate('/sales/lead-management/followups?date=today')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h4 className="text-amber-400 font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Upcoming 7 Days ({upcomingFollowups.length})
              </h4>
              {upcomingFollowups.length > 0 && (
                <button 
                  onClick={() => navigate('/sales/lead-management/followups')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
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
    </div>
  );
};

export default LeadManagement;
