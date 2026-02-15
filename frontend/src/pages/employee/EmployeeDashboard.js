import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, Calendar, CheckSquare, Receipt, Truck, Award, 
  FileBarChart, UserCircle, ChevronRight, Bell, AlertCircle,
  TrendingUp, CheckCircle, XCircle, Briefcase, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingLeaves: 0,
    pendingExpenses: 0,
    pendingOT: 0,
    totalLeaveBalance: 0,
    attendanceThisMonth: 0,
    achievements: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await employeeHubAPI.getDashboard(user.id);
      setStats(res.data.stats || {
        pendingLeaves: 0,
        pendingExpenses: 0,
        pendingOT: 0,
        totalLeaveBalance: 30,
        attendanceThisMonth: 22,
        achievements: 5
      });
      setRecentActivity(res.data.recentActivity || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default values on error
      setStats({
        pendingLeaves: 0,
        pendingExpenses: 0,
        pendingOT: 0,
        totalLeaveBalance: 30,
        attendanceThisMonth: 22,
        achievements: 5
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { name: 'My Attendance', href: '/employee/attendance', icon: Clock, color: 'bg-blue-500' },
    { name: 'Leave Request', href: '/employee/leave', icon: Calendar, color: 'bg-green-500' },
    { name: 'Expense Claim', href: '/employee/expenses', icon: Receipt, color: 'bg-amber-500' },
    { name: 'Overtime Request', href: '/employee/overtime', icon: Clock, color: 'bg-purple-500' },
    { name: 'Permission', href: '/employee/permission', icon: CheckSquare, color: 'bg-cyan-500' },
    { name: 'Transport', href: '/employee/transport', icon: Truck, color: 'bg-orange-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="employee-dashboard">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Employee'}!</h1>
            <p className="text-indigo-100 mt-1">Here's your workspace overview for today</p>
          </div>
          <div className="text-right">
            <p className="text-indigo-200 text-sm">Department</p>
            <p className="text-lg font-semibold">{user?.department || 'Not Assigned'}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Leave Balance</p>
              <p className="text-xl font-bold text-slate-800">{stats.totalLeaveBalance}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Attendance</p>
              <p className="text-xl font-bold text-slate-800">{stats.attendanceThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending OT</p>
              <p className="text-xl font-bold text-slate-800">{stats.pendingOT}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Leaves</p>
              <p className="text-xl font-bold text-slate-800">{stats.pendingLeaves}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Receipt className="text-cyan-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Claims</p>
              <p className="text-xl font-bold text-slate-800">{stats.pendingExpenses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <Award className="text-rose-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Achievements</p>
              <p className="text-xl font-bold text-slate-800">{stats.achievements}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                to={action.href}
                className="flex flex-col items-center p-4 rounded-xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group"
                data-testid={`quick-action-${action.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="text-white" size={24} />
                </div>
                <span className="text-sm font-medium text-slate-700 text-center">{action.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="mx-auto mb-3 text-slate-300" size={40} />
              <p>No recent activity</p>
              <p className="text-sm">Your requests and updates will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.status === 'approved' ? 'bg-green-100' :
                    activity.status === 'pending' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    {activity.status === 'approved' ? <CheckCircle className="text-green-600" size={20} /> :
                     activity.status === 'pending' ? <AlertCircle className="text-amber-600" size={20} /> :
                     <CheckCircle className="text-blue-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{activity.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(activity.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    activity.status === 'approved' ? 'bg-green-100 text-green-700' :
                    activity.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Journey */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">My Journey</h2>
            <Link to="/employee/journey" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Briefcase className="text-indigo-600" size={28} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Years with Enerzia</p>
                <p className="text-2xl font-bold text-slate-800">2.5 Years</p>
                <p className="text-xs text-indigo-600 mt-1">Joined: Aug 2023</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <Award className="mx-auto text-amber-500 mb-1" size={20} />
                <p className="text-lg font-bold text-slate-800">5</p>
                <p className="text-xs text-slate-500">Awards</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <TrendingUp className="mx-auto text-green-500 mb-1" size={20} />
                <p className="text-lg font-bold text-slate-800">2</p>
                <p className="text-xs text-slate-500">Promotions</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <CheckCircle className="mx-auto text-blue-500 mb-1" size={20} />
                <p className="text-lg font-bold text-slate-800">12</p>
                <p className="text-xs text-slate-500">Projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
