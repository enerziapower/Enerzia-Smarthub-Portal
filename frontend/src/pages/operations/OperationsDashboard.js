import React, { useState, useEffect } from 'react';
import { Settings, Wrench, Clock, CheckCircle, AlertTriangle, Calendar, RefreshCw, TrendingUp } from 'lucide-react';

const OperationsDashboard = () => {
  const [stats, setStats] = useState({ activeProjects: 0, pendingMaintenance: 0, completedTasks: 0, overdueItems: 0, resourceUtilization: 0, efficiency: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => { setStats({ activeProjects: 12, pendingMaintenance: 5, completedTasks: 45, overdueItems: 3, resourceUtilization: 78, efficiency: 92 }); setLoading(false); }, 500); }, []);

  const statCards = [
    { title: 'Active Projects', value: stats.activeProjects, icon: Settings, color: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Pending Maintenance', value: stats.pendingMaintenance, icon: Wrench, color: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'Completed Tasks', value: stats.completedTasks, icon: CheckCircle, color: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Overdue Items', value: stats.overdueItems, icon: AlertTriangle, color: 'bg-red-50', textColor: 'text-red-600' },
    { title: 'Resource Utilization', value: `${stats.resourceUtilization}%`, icon: TrendingUp, color: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Efficiency', value: `${stats.efficiency}%`, icon: TrendingUp, color: 'bg-teal-50', textColor: 'text-teal-600' },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Operations Dashboard</h1><p className="text-slate-500 mt-1">Operations and maintenance overview</p></div><button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"><RefreshCw className="w-4 h-4" />Refresh</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{statCards.map((card, i) => (<div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"><div className={`p-2 rounded-lg ${card.color} inline-block`}><card.icon className={`w-5 h-5 ${card.textColor}`} /></div><div className="mt-4"><p className="text-sm text-slate-500">{card.title}</p><p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p></div></div>))}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6"><h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3><div className="grid grid-cols-2 gap-3"><a href="/operations/resources" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Settings className="w-5 h-5 text-blue-600" /><span className="text-sm font-medium text-slate-700">Resources</span></a><a href="/operations/maintenance" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Wrench className="w-5 h-5 text-orange-600" /><span className="text-sm font-medium text-slate-700">Maintenance</span></a><a href="/operations/schedule" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Calendar className="w-5 h-5 text-purple-600" /><span className="text-sm font-medium text-slate-700">Schedule</span></a><a href="/operations/reports" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><TrendingUp className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-slate-700">Reports</span></a></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-6"><h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Maintenance</h3><div className="space-y-3"><div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg"><Wrench className="w-5 h-5 text-orange-600" /><div className="flex-1"><p className="text-sm font-medium text-slate-900">Generator Service</p><p className="text-xs text-slate-500">Due: 05/01/2025</p></div><span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">Pending</span></div><div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"><Wrench className="w-5 h-5 text-blue-600" /><div className="flex-1"><p className="text-sm font-medium text-slate-900">Vehicle Inspection</p><p className="text-xs text-slate-500">Due: 10/01/2025</p></div><span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Scheduled</span></div><div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /><div className="flex-1"><p className="text-sm font-medium text-slate-900">AC Maintenance</p><p className="text-xs text-slate-500">Completed: 28/12/2024</p></div><span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Done</span></div></div></div>
      </div>
    </div>
  );
};

export default OperationsDashboard;
