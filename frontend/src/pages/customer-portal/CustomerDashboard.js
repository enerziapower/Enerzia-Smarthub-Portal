import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, FileText, Calendar, Download, LogOut, 
  ChevronRight, Loader2, AlertCircle, CheckCircle2, 
  Clock, FileCheck, Wrench, Bell, User, Star, Headphones
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');
    
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }

    if (customerInfo) {
      setCustomer(JSON.parse(customerInfo));
    }

    loadDashboard(token);
    loadNotificationCount(token);
  }, [navigate]);

  const loadDashboard = async (token) => {
    try {
      const response = await fetch(`${API}/api/customer-portal/dashboard/full?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to load dashboard');
      }

      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationCount = async (token) => {
    try {
      const response = await fetch(`${API}/api/customer-portal/notifications?token=${token}&unread_only=true`);
      if (response.ok) {
        const data = await response.json();
        setUnreadNotifications(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    navigate('/customer-portal/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Customer Portal
              </h1>
              <p className="text-slate-400 text-sm">Enerzia Power Solutions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link
              to="/customer-portal/notifications"
              className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
            {/* Support */}
            <Link
              to="/customer-portal/support"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Support"
            >
              <Headphones className="w-5 h-5" />
            </Link>
            {/* Profile */}
            <Link
              to="/customer-portal/profile"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="My Profile"
            >
              <User className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-slate-700 mx-1"></div>
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{customer?.name}</p>
              <p className="text-slate-400 text-xs">{customer?.company_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            <Link 
              to="/customer-portal/dashboard" 
              className="py-3 text-emerald-400 border-b-2 border-emerald-400 text-sm font-medium whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link 
              to="/customer-portal/projects" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              My Projects
            </Link>
            <Link 
              to="/customer-portal/amcs" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              AMC Contracts
            </Link>
            <Link 
              to="/customer-portal/wcc" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              WCC
            </Link>
            <Link 
              to="/customer-portal/reports" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              Reports
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Welcome, {dashboard?.customer_name || customer?.name}
          </h2>
          <p className="text-slate-300">
            {dashboard?.company_name || customer?.company_name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            title="Projects"
            value={dashboard?.stats?.total_projects || 0}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Ongoing"
            value={dashboard?.stats?.ongoing_projects || 0}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Completed"
            value={dashboard?.stats?.completed_projects || 0}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="AMC Contracts"
            value={dashboard?.stats?.total_amcs || 0}
            icon={FileText}
            color="emerald"
          />
          <StatCard
            title="WCC"
            value={dashboard?.stats?.total_wcc || 0}
            icon={FileCheck}
            color="purple"
          />
          <StatCard
            title="Reports"
            value={dashboard?.stats?.total_reports || 0}
            icon={FileCheck}
            color="cyan"
          />
        </div>

        {/* Two Columns */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Service Visits */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Upcoming Service Visits
              </h3>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            
            {dashboard?.upcoming_visits?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.upcoming_visits.map((visit, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{visit.amc_no || 'AMC Service'}</p>
                        <p className="text-slate-400 text-xs mt-1 capitalize">
                          {visit.visit_type || 'Scheduled'} Visit
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-400 text-sm">
                          <Clock className="w-4 h-4" />
                          {new Date(visit.visit_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming visits scheduled</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <QuickActionCard
                title="View Projects"
                description="See all your linked projects"
                icon={FileText}
                href="/customer-portal/projects"
              />
              <QuickActionCard
                title="AMC Contracts"
                description="View maintenance contracts"
                icon={FileText}
                href="/customer-portal/amcs"
              />
              <QuickActionCard
                title="Work Completion Certificates"
                description="Download WCC documents"
                icon={FileCheck}
                href="/customer-portal/wcc"
              />
              <QuickActionCard
                title="Reports & Documents"
                description="Access test reports and certificates"
                icon={Download}
                href="/customer-portal/reports"
              />
              <QuickActionCard
                title="Submit Feedback"
                description="Rate our services"
                icon={Star}
                href="/customer-portal/feedback"
              />
              <QuickActionCard
                title="Download History"
                description="View your download history"
                icon={Clock}
                href="/customer-portal/downloads"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          © 2026 Enerzia Power Solutions. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  return (
    <div className={`p-5 rounded-xl border ${colorClasses[color]} bg-slate-800`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[1]}`} />
      </div>
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-white mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {value}
      </p>
    </div>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, href }) => {
  return (
    <Link 
      to={href}
      className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-900 transition-all group"
    >
      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-emerald-400" />
      </div>
      <div className="flex-1">
        <p className="text-white font-medium text-sm">{title}</p>
        <p className="text-slate-400 text-xs">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
    </Link>
  );
};

export default CustomerDashboard;
