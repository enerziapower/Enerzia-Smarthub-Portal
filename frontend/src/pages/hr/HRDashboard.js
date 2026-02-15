import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Calendar, Clock, DollarSign, FileText, RefreshCw, TrendingUp, Award } from 'lucide-react';

const HRDashboard = () => {
  const [stats, setStats] = useState({ totalEmployees: 0, newHires: 0, onLeave: 0, pendingApprovals: 0, totalPayroll: 0, openPositions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => { setStats({ totalEmployees: 85, newHires: 5, onLeave: 8, pendingApprovals: 12, totalPayroll: 4500000, openPositions: 3 }); setLoading(false); }, 500); }, []);

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amt || 0);

  const statCards = [
    { title: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'New Hires (Month)', value: stats.newHires, icon: UserPlus, color: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'On Leave Today', value: stats.onLeave, icon: Calendar, color: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'bg-amber-50', textColor: 'text-amber-600' },
    { title: 'Monthly Payroll', value: formatCurrency(stats.totalPayroll), icon: DollarSign, color: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Open Positions', value: stats.openPositions, icon: Award, color: 'bg-teal-50', textColor: 'text-teal-600' },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900">HR & Admin Dashboard</h1><p className="text-slate-500 mt-1">Human resources overview</p></div><button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"><RefreshCw className="w-4 h-4" />Refresh</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{statCards.map((card, i) => (<div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"><div className={`p-2 rounded-lg ${card.color} inline-block`}><card.icon className={`w-5 h-5 ${card.textColor}`} /></div><div className="mt-4"><p className="text-sm text-slate-500">{card.title}</p><p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p></div></div>))}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6"><h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3><div className="grid grid-cols-2 gap-3"><a href="/hr/employees" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Users className="w-5 h-5 text-blue-600" /><span className="text-sm font-medium text-slate-700">Employees</span></a><a href="/hr/attendance" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Clock className="w-5 h-5 text-purple-600" /><span className="text-sm font-medium text-slate-700">Attendance</span></a><a href="/hr/leave" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><Calendar className="w-5 h-5 text-orange-600" /><span className="text-sm font-medium text-slate-700">Leave</span></a><a href="/hr/payroll" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"><DollarSign className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-slate-700">Payroll</span></a></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-6"><h3 className="text-lg font-semibold text-slate-900 mb-4">Department Distribution</h3><div className="space-y-3">{[{name: 'Projects', count: 25, color: 'bg-blue-500'}, {name: 'Sales', count: 15, color: 'bg-green-500'}, {name: 'Operations', count: 20, color: 'bg-purple-500'}, {name: 'Finance', count: 10, color: 'bg-amber-500'}, {name: 'HR', count: 5, color: 'bg-teal-500'}].map((dept, i) => (<div key={i} className="flex items-center gap-3"><span className="w-20 text-sm text-slate-600">{dept.name}</span><div className="flex-1 h-2 bg-slate-100 rounded-full"><div className={`h-full ${dept.color} rounded-full`} style={{width: `${(dept.count / 85) * 100}%`}}></div></div><span className="text-sm font-medium text-slate-900">{dept.count}</span></div>))}</div></div>
      </div>
    </div>
  );
};

export default HRDashboard;
