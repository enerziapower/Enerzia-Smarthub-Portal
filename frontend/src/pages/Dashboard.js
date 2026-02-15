import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, projectsAPI, billingAPI, seedData, adminHubAPI } from '../services/api';
import { TrendingUp, FolderOpen, IndianRupee, AlertCircle, CheckCircle2, Clock, Loader2, LayoutDashboard, Percent, Bell, Calendar, Gift } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [weeklyBilling, setWeeklyBilling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showWeeklyBreakdown, setShowWeeklyBreakdown] = useState(false);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState(null);
  const [showActiveProjects, setShowActiveProjects] = useState(false);
  const [activeProjectsData, setActiveProjectsData] = useState(null);
  const [showBillingBreakdown, setShowBillingBreakdown] = useState(false);
  const [billingBreakdownData, setBillingBreakdownData] = useState(null);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [completedProjectsData, setCompletedProjectsData] = useState(null);
  const [showAvgPending, setShowAvgPending] = useState(false);
  const [avgPendingData, setAvgPendingData] = useState(null);
  const [showAvgCompletion, setShowAvgCompletion] = useState(false);
  const [avgCompletionData, setAvgCompletionData] = useState(null);
  
  // Company Overview Data
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadCompanyOverviewData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, projectsRes, billingRes] = await Promise.all([
        dashboardAPI.getStats(),
        projectsAPI.getAll(),
        billingAPI.getWeekly(),
      ]);

      setStats(statsRes.data);
      setProjects(projectsRes.data);
      setWeeklyBilling(billingRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyOverviewData = async () => {
    try {
      const response = await adminHubAPI.getDashboardData();
      if (response.data) {
        setAnnouncements(response.data.announcements || []);
        setEvents(response.data.events || []);
        setHolidays(response.data.holidays || []);
      }
    } catch (error) {
      console.error('Error loading company overview data:', error);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      await seedData();
      await loadDashboardData();
    } catch (error) {
      console.error('Error seeding data:', error);
    } finally {
      setSeeding(false);
    }
  };

  const loadWeeklyBreakdown = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard/this-week-breakdown`);
      const data = await response.json();
      setWeeklyBreakdown(data);
      setShowWeeklyBreakdown(true);
    } catch (error) {
      console.error('Error loading weekly breakdown:', error);
    }
  };

  const loadActiveProjects = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard/active-projects-breakdown`);
      const data = await response.json();
      setActiveProjectsData(data);
      setShowActiveProjects(true);
    } catch (error) {
      console.error('Error loading active projects:', error);
    }
  };

  const loadBillingBreakdown = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard/total-billing-breakdown`);
      const data = await response.json();
      setBillingBreakdownData(data);
      setShowBillingBreakdown(true);
    } catch (error) {
      console.error('Error loading billing breakdown:', error);
    }
  };

  const loadCompletedProjects = async () => {
    try {
      const completedProjects = projects.filter(p => p.status === 'Completed');
      setCompletedProjectsData({ total: completedProjects.length, projects: completedProjects });
      setShowCompletedProjects(true);
    } catch (error) {
      console.error('Error loading completed projects:', error);
    }
  };

  const loadAvgPending = async () => {
    try {
      const activeProjects = projects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled');
      const avgPending = activeProjects.length > 0
        ? Math.round(activeProjects.reduce((sum, p) => sum + (100 - (p.completion_percentage || 0)), 0) / activeProjects.length)
        : 0;
      setAvgPendingData({ 
        average: avgPending, 
        total: activeProjects.length, 
        projects: activeProjects 
      });
      setShowAvgPending(true);
    } catch (error) {
      console.error('Error loading avg pending:', error);
    }
  };

  const loadAvgCompletion = async () => {
    try {
      const activeProjects = projects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled');
      const avgCompletion = activeProjects.length > 0
        ? Math.round(activeProjects.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / activeProjects.length)
        : 0;
      setAvgCompletionData({ 
        average: avgCompletion, 
        total: activeProjects.length, 
        projects: activeProjects 
      });
      setShowAvgCompletion(true);
    } catch (error) {
      console.error('Error loading avg completion:', error);
    }
  };

  // Calculate averages - Include all non-completed projects
  const ongoingProjects = projects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled');
  const avgPendingPercent = ongoingProjects.length > 0
    ? Math.round(ongoingProjects.reduce((sum, p) => sum + (100 - (p.completion_percentage || 0)), 0) / ongoingProjects.length)
    : 0;
  const avgCompletionPercent = ongoingProjects.length > 0
    ? Math.round(ongoingProjects.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / ongoingProjects.length)
    : 0;
  const completedProjectsCount = projects.filter(p => p.status === 'Completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Projects Created',
      value: stats?.total_projects || 0,
      icon: FolderOpen,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
      onClick: async () => {
        try {
          const response = await projectsAPI.getAll();
          const allProjects = response.data;
          setActiveProjectsData({ total: allProjects.length, projects: allProjects });
          setShowActiveProjects(true);
        } catch (error) {
          console.error('Error loading all projects:', error);
        }
      },
      clickable: true,
    },
    {
      title: 'Completed Projects',
      value: completedProjectsCount,
      icon: CheckCircle2,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      onClick: loadCompletedProjects,
      clickable: true,
    },
    {
      title: 'Total Billing',
      value: `₹${(stats?.total_billing || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      iconColor: 'text-emerald-600',
      onClick: loadBillingBreakdown,
      clickable: true,
    },
    {
      title: 'This Week Billing',
      value: `₹${(stats?.this_week_billing || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-700',
      iconColor: 'text-violet-600',
      onClick: loadWeeklyBreakdown,
      clickable: true,
    },
    {
      title: 'Avg. Completion Status',
      value: `${avgCompletionPercent}%`,
      subtitle: `${ongoingProjects.length} active projects`,
      icon: Percent,
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-700',
      iconColor: 'text-sky-600',
      onClick: loadAvgCompletion,
      clickable: true,
    },
    {
      title: 'Avg. Pending',
      value: `${avgPendingPercent}%`,
      subtitle: `${ongoingProjects.length} active projects`,
      icon: Clock,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-600',
      onClick: loadAvgPending,
      clickable: true,
    },
  ];

  const statusChartData = stats?.status_breakdown
    ? Object.entries(stats.status_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  const categoryChartData = stats?.category_breakdown
    ? Object.entries(stats.category_breakdown).map(([name, data]) => ({
        name,
        amount: data.value || 0,
        count: data.count || 0,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Seed Data Button */}
      {stats && stats.total_projects === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-600" size={20} />
            <p className="text-sm text-amber-700">No data found. Click to load sample projects.</p>
          </div>
          <button
            data-testid="seed-data-btn"
            onClick={handleSeedData}
            disabled={seeding}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {seeding ? 'Loading...' : 'Load Sample Data'}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              data-testid={`stat-card-${index}`}
              onClick={stat.clickable ? stat.onClick : undefined}
              className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-all duration-200 ${
                stat.clickable ? 'cursor-pointer hover:shadow-lg hover:scale-105 active:scale-100' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={stat.iconColor} size={24} strokeWidth={1.5} />
                </div>
                {stat.clickable && (
                  <span className="text-xs text-slate-400">Click for details</span>
                )}
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">{stat.title}</h3>
              <p className={`text-3xl font-bold tracking-tight ${stat.textColor}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                {stat.value}
              </p>
              {stat.subtitle && (
                <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Weekly Breakdown Modal */}
      {showWeeklyBreakdown && weeklyBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowWeeklyBreakdown(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  This Week Billing Breakdown
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Total: ₹{weeklyBreakdown.total.toLocaleString('en-IN')} from {weeklyBreakdown.count} projects
                </p>
              </div>
              <button
                onClick={() => setShowWeeklyBreakdown(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-3">
                {weeklyBreakdown.projects.map((project, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-300">{project.pid_no}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          project.category === 'PSS' ? 'bg-blue-100 text-blue-700' :
                          project.category === 'AS' ? 'bg-purple-100 text-purple-700' :
                          project.category === 'OSS' ? 'bg-pink-100 text-pink-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>{project.category}</span>
                      </div>
                      <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                      <p className="text-sm text-slate-500">{project.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-violet-600">₹{project.this_week_billing.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Active/All Projects Modal */}
      {showActiveProjects && activeProjectsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowActiveProjects(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-sky-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {activeProjectsData.total === stats?.active_projects ? 'Active (Ongoing) Projects' : 'All Projects'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Total: {activeProjectsData.total} projects
                </p>
              </div>
              <button onClick={() => setShowActiveProjects(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-3">
                {activeProjectsData.projects.map((project, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-300">{project.pid_no}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.category === 'PSS' ? 'bg-blue-100 text-blue-700' :
                            project.category === 'AS' ? 'bg-purple-100 text-purple-700' :
                            project.category === 'OSS' ? 'bg-pink-100 text-pink-700' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>{project.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.status === 'Ongoing' ? 'bg-sky-100 text-sky-700' :
                            project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            project.status === 'Need to Start' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>{project.status}</span>
                        </div>
                        <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                        <p className="text-sm text-slate-500">{project.client} • {project.engineer_in_charge || 'Unassigned'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-sky-600">{project.completion_percentage || 0}%</p>
                        <p className="text-xs text-slate-500">Complete</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 transition-all" style={{ width: `${project.completion_percentage || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Total Billing Breakdown Modal */}
      {showBillingBreakdown && billingBreakdownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowBillingBreakdown(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-emerald-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Total Billing Breakdown
                </h2>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-slate-600">PO Amount: <span className="font-semibold text-emerald-700">₹{billingBreakdownData.total_po_amount.toLocaleString('en-IN')}</span></span>
                  <span className="text-slate-600">Invoiced: <span className="font-semibold text-green-700">₹{billingBreakdownData.total_invoiced.toLocaleString('en-IN')}</span></span>
                  <span className="text-slate-600">Balance: <span className="font-semibold text-amber-700">₹{billingBreakdownData.total_balance.toLocaleString('en-IN')}</span></span>
                </div>
              </div>
              <button onClick={() => setShowBillingBreakdown(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-3">
                {billingBreakdownData.projects.map((project, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-300">{project.pid_no}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.category === 'PSS' ? 'bg-blue-100 text-blue-700' :
                            project.category === 'AS' ? 'bg-purple-100 text-purple-700' :
                            project.category === 'OSS' ? 'bg-pink-100 text-pink-700' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>{project.category}</span>
                        </div>
                        <h4 className="font-medium text-slate-900 mb-1">{project.project_name}</h4>
                        <p className="text-sm text-slate-500">{project.client}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-slate-500">PO Amount</p>
                        <p className="text-lg font-bold text-emerald-600">₹{project.po_amount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500">Invoiced</p>
                        <p className="text-sm font-semibold text-green-600">₹{project.invoiced_amount.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Balance (PO - Invoiced)</p>
                        <p className="text-sm font-semibold text-amber-600">₹{(project.po_amount - project.invoiced_amount).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Projects Modal */}
      {showCompletedProjects && completedProjectsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCompletedProjects(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-green-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Completed Projects</h2>
                <p className="text-sm text-slate-500 mt-1">Total: {completedProjectsData.total} projects</p>
              </div>
              <button onClick={() => setShowCompletedProjects(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-3">
                {completedProjectsData.projects.map((project, idx) => (
                  <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer" onClick={() => navigate('/projects')}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-green-300">{project.pid_no}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">100% Complete</span>
                        </div>
                        <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                        <p className="text-sm text-slate-500">{project.client}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">₹{(project.invoiced_amount || 0).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-500">Invoiced</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avg Pending Modal */}
      {showAvgPending && avgPendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAvgPending(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-amber-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Avg. Pending Work</h2>
                <p className="text-sm text-slate-500 mt-1">Average: {avgPendingData.average}% pending across {avgPendingData.total} ongoing projects</p>
              </div>
              <button onClick={() => setShowAvgPending(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-3">
                {avgPendingData.projects.map((project, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => navigate('/projects')}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-300">{project.pid_no}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${project.status === 'Ongoing' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>{project.status}</span>
                        </div>
                        <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                        <p className="text-sm text-slate-500">{project.client}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-600">{100 - (project.completion_percentage || 0)}%</p>
                        <p className="text-xs text-slate-500">Pending</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${100 - (project.completion_percentage || 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avg Completion Modal */}
      {showAvgCompletion && avgCompletionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAvgCompletion(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-sky-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Avg. Completion Status</h2>
                <p className="text-sm text-slate-500 mt-1">Average: {avgCompletionData.average}% complete across {avgCompletionData.total} ongoing projects</p>
              </div>
              <button onClick={() => setShowAvgCompletion(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-3">
                {avgCompletionData.projects.map((project, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => navigate('/projects')}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-300">{project.pid_no}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${project.status === 'Ongoing' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>{project.status}</span>
                        </div>
                        <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                        <p className="text-sm text-slate-500">{project.client}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-sky-600">{project.completion_percentage || 0}%</p>
                        <p className="text-xs text-slate-500">Complete</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-sky-200 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 transition-all" style={{ width: `${project.completion_percentage || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Billing Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="category-chart">
          <h3 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Category-wise Billing
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="amount" fill="#0f172a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="status-chart">
          <h3 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Project Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="35%"
                cy="50%"
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return percent > 0.05 ? (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  ) : null;
                }}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} projects`, name]} />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Company Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="company-overview">
        {/* Announcements */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="text-red-500" size={18} />
                <h3 className="font-semibold text-slate-800">Announcements</h3>
              </div>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {announcements.length} active
              </span>
            </div>
          </div>
          <div className="p-4 max-h-72 overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Bell className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No announcements</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div key={item.id} className={`p-3 rounded-lg border ${
                    item.priority === 'high' ? 'bg-red-50 border-red-200' :
                    item.priority === 'medium' ? 'bg-amber-50 border-amber-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-slate-800 text-sm">{item.title}</h4>
                      <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                        item.priority === 'high' ? 'bg-red-200 text-red-700' :
                        item.priority === 'medium' ? 'bg-amber-200 text-amber-700' :
                        'bg-green-200 text-green-700'
                      }`}>{item.priority}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-indigo-500" size={18} />
                <h3 className="font-semibold text-slate-800">Upcoming Events</h3>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                {events.length} scheduled
              </span>
            </div>
          </div>
          <div className="p-4 max-h-72 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Calendar className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {event.type === 'celebration' ? '🎉' :
                         event.type === 'training' ? '📚' :
                         event.type === 'meeting' ? '💼' :
                         event.type === 'launch' ? '🚀' : '📅'}
                      </span>
                      <h4 className="font-medium text-slate-800 text-sm">{event.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      <span>{event.time}</span>
                      <span>• {event.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="text-green-500" size={18} />
                <h3 className="font-semibold text-slate-800">Upcoming Holidays</h3>
              </div>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                {holidays.length} holidays
              </span>
            </div>
          </div>
          <div className="p-4 max-h-72 overflow-y-auto">
            {holidays.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Gift className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No upcoming holidays</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-medium ${
                      holiday.type === 'national' ? 'bg-blue-100 text-blue-700' :
                      holiday.type === 'regional' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      <span className="text-lg font-bold">{new Date(holiday.date).getDate()}</span>
                      <span className="text-[10px] uppercase">{new Date(holiday.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800 text-sm">{holiday.name}</h4>
                      <p className="text-xs text-slate-500">{holiday.day} • {holiday.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
