import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, CheckSquare, Users, Calendar, Clock, 
  TrendingUp, AlertCircle, Bell, PartyPopper, Loader2,
  FolderKanban, Calculator, ShoppingCart, Package, Globe,
  PiggyBank, Briefcase, Cog, ChevronRight, Circle, CheckCircle,
  Star, Megaphone, Gift, Coffee, Cake
} from 'lucide-react';
import { projectsAPI, departmentTeamAPI, adminHubAPI } from '../services/api';

// Department configuration
const DEPARTMENTS = [
  { code: 'projects', name: 'Projects', icon: FolderKanban, color: 'blue' },
  { code: 'accounts', name: 'Accounts', icon: Calculator, color: 'emerald' },
  { code: 'sales', name: 'Sales', icon: ShoppingCart, color: 'orange' },
  { code: 'purchase', name: 'Purchase', icon: Package, color: 'violet' },
  { code: 'exports', name: 'Exports', icon: Globe, color: 'cyan' },
  { code: 'finance', name: 'Finance', icon: PiggyBank, color: 'pink' },
  { code: 'hr', name: 'HR & Admin', icon: Briefcase, color: 'amber' },
  { code: 'operations', name: 'Operations', icon: Cog, color: 'slate' },
];

const CompanyOverview = () => {
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState({});
  const [projectStats, setProjectStats] = useState({ total: 0, ongoing: 0, completed: 0 });
  const [teamStats, setTeamStats] = useState({ total: 0, active: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  
  // Real data from Admin APIs
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    loadData();
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const response = await adminHubAPI.getDashboardData();
      if (response.data) {
        setAnnouncements(response.data.announcements || []);
        setEvents(response.data.events || []);
        setHolidays(response.data.holidays || []);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects data
      const projectsRes = await projectsAPI.getAll();
      const projects = projectsRes.data || [];
      
      setProjectStats({
        total: projects.length,
        ongoing: projects.filter(p => p.status === 'Ongoing' || p.status === 'In Progress').length,
        completed: projects.filter(p => p.status === 'Completed').length,
      });

      // Extract action items from all projects for task stats
      const allTasks = [];
      projects.forEach(project => {
        if (project.action_items && project.action_items.length > 0) {
          project.action_items.forEach(item => {
            allTasks.push({
              ...item,
              project_name: project.project_name,
              pid_no: project.pid_no,
            });
          });
        }
      });

      // Calculate task stats
      const pending = allTasks.filter(t => t.status !== 'Completed').length;
      const completed = allTasks.filter(t => t.status === 'Completed').length;
      const overdue = allTasks.filter(t => {
        if (t.status === 'Completed') return false;
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date();
      }).length;

      setTaskStats({ total: allTasks.length, pending, completed, overdue });
      setRecentTasks(allTasks.slice(0, 8));

      // Load team members count
      let totalMembers = 0;
      let activeMembers = 0;
      for (const dept of DEPARTMENTS) {
        try {
          const teamRes = await departmentTeamAPI.getTeam(dept.code);
          const members = teamRes.data || [];
          totalMembers += members.length;
          activeMembers += members.filter(m => m.is_active !== false).length;
        } catch (e) {
          // Skip if department team doesn't exist
        }
      }
      setTeamStats({ total: totalMembers, active: activeMembers });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutGrid className="text-blue-600" size={28} />
            Company Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">Welcome! Here's what's happening across the organization</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Projects</p>
              <p className="text-3xl font-bold mt-1">{projectStats.total}</p>
              <p className="text-blue-200 text-xs mt-1">{projectStats.ongoing} ongoing</p>
            </div>
            <FolderKanban size={40} className="text-blue-300 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Tasks Completed</p>
              <p className="text-3xl font-bold mt-1">{taskStats.completed || 0}</p>
              <p className="text-emerald-200 text-xs mt-1">of {taskStats.total || 0} total</p>
            </div>
            <CheckSquare size={40} className="text-emerald-300 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">Pending Tasks</p>
              <p className="text-3xl font-bold mt-1">{taskStats.pending || 0}</p>
              <p className="text-amber-200 text-xs mt-1">{taskStats.overdue || 0} overdue</p>
            </div>
            <Clock size={40} className="text-amber-300 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm">Team Members</p>
              <p className="text-3xl font-bold mt-1">{teamStats.total}</p>
              <p className="text-violet-200 text-xs mt-1">{teamStats.active} active</p>
            </div>
            <Users size={40} className="text-violet-300 opacity-80" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
            <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
              {announcements.length} active
            </span>
          </div>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Megaphone className="mx-auto mb-2 opacity-50" size={32} />
              <p className="text-sm">No announcements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className={`p-4 rounded-lg border-l-4 ${
                  ann.priority === 'high' ? 'bg-red-50 border-red-500' :
                  ann.priority === 'medium' ? 'bg-amber-50 border-amber-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{ann.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{ann.content || ann.message}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        ann.priority === 'high' ? 'bg-red-200 text-red-700' :
                        ann.priority === 'medium' ? 'bg-amber-200 text-amber-700' :
                        'bg-green-200 text-green-700'
                      }`}>{ann.priority}</span>
                      <p className="text-xs text-slate-500 mt-1">{formatDate(ann.created_at || ann.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events & Holidays */}
        <div className="space-y-4">
          {/* Events */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                {events.length}
              </span>
            </div>
            {events.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Calendar className="mx-auto mb-2 opacity-50" size={28} />
                <p className="text-sm">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 4).map(event => {
                  const getEventIcon = (type) => {
                    switch(type) {
                      case 'meeting': return Calendar;
                      case 'training': return AlertCircle;
                      case 'celebration': return Gift;
                      default: return PartyPopper;
                    }
                  };
                  const EventIcon = getEventIcon(event.type);
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        event.type === 'meeting' ? 'bg-blue-100 text-blue-600' :
                        event.type === 'training' ? 'bg-amber-100 text-amber-600' :
                        event.type === 'celebration' ? 'bg-pink-100 text-pink-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        <EventIcon size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{event.title}</p>
                        <p className="text-xs text-slate-500">{getDaysUntil(event.date)} • {event.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Holidays */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Gift size={20} className="text-pink-600" />
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Holidays</h2>
              <span className="ml-auto text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                {holidays.length}
              </span>
            </div>
            {holidays.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Gift className="mx-auto mb-2 opacity-50" size={28} />
                <p className="text-sm">No upcoming holidays</p>
              </div>
            ) : (
              <div className="space-y-2">
                {holidays.slice(0, 4).map(holiday => (
                  <div key={holiday.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        holiday.type === 'national' ? 'bg-blue-500' :
                        holiday.type === 'regional' ? 'bg-green-500' :
                        'bg-purple-500'
                      }`}></div>
                      <span className="text-sm text-slate-900">{holiday.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500">{formatDate(holiday.date)}</span>
                      {holiday.day && <span className="text-xs text-slate-400 ml-1">({holiday.day})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks from All Departments */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare size={20} className="text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Task Updates</h2>
          </div>
          <span className="text-xs text-slate-500">Across all departments</span>
        </div>
        {recentTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentTasks.map((task, idx) => (
              <div key={idx} className="p-3 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-2">
                  {task.status === 'Completed' ? (
                    <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{task.action || 'Task'}</p>
                    <p className="text-xs text-slate-500 truncate">{task.pid_no}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {task.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <CheckSquare size={32} className="mx-auto mb-2 text-slate-300" />
            <p>No tasks found</p>
          </div>
        )}
      </div>

      {/* Department Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Departments at a Glance</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {DEPARTMENTS.map(dept => {
            const DeptIcon = dept.icon;
            const colorClasses = {
              blue: 'bg-blue-50 text-blue-600 border-blue-200',
              emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
              orange: 'bg-orange-50 text-orange-600 border-orange-200',
              violet: 'bg-violet-50 text-violet-600 border-violet-200',
              cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
              pink: 'bg-pink-50 text-pink-600 border-pink-200',
              amber: 'bg-amber-50 text-amber-600 border-amber-200',
              slate: 'bg-slate-100 text-slate-600 border-slate-300',
            };
            return (
              <div key={dept.code} className={`p-4 rounded-xl border text-center hover:shadow-md transition-shadow cursor-pointer ${colorClasses[dept.color]}`}>
                <DeptIcon size={24} className="mx-auto mb-2" />
                <p className="text-xs font-medium truncate">{dept.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Coffee size={20} className="text-amber-400" />
          <h2 className="text-lg font-semibold">Daily Tip</h2>
        </div>
        <p className="text-slate-300 text-sm">
          "The key to successful project management is clear communication. Keep your team informed and aligned with regular updates and status meetings."
        </p>
      </div>
    </div>
  );
};

export default CompanyOverview;
