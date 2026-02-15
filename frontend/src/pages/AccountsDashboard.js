import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, TrendingUp, AlertCircle, Clock, DollarSign, 
  CheckCircle, XCircle, Upload, RefreshCw, Calendar,
  ArrowUpRight, ArrowDownRight, Percent
} from 'lucide-react';
import { accountsAPI } from '../services/api';

const AccountsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.getDashboardStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">{error}</p>
          <button 
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats?.invoices?.total || 0,
      subValue: formatCurrency(stats?.invoices?.total_amount),
      icon: FileText,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Domestic Invoices',
      value: stats?.invoices?.domestic || 0,
      subValue: formatCurrency(stats?.invoices?.domestic_amount),
      icon: TrendingUp,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Export Invoices',
      value: stats?.invoices?.export || 0,
      subValue: formatCurrency(stats?.invoices?.export_amount),
      icon: ArrowUpRight,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Overdue Invoices',
      value: stats?.overdue?.count || 0,
      subValue: formatCurrency(stats?.overdue?.amount),
      icon: AlertCircle,
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Retention Pending',
      value: stats?.retention?.count || 0,
      subValue: formatCurrency(stats?.retention?.amount),
      icon: Clock,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      title: 'Collections',
      value: '-',
      subValue: formatCurrency(stats?.collections?.total_collected),
      icon: DollarSign,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Pending Tasks',
      value: stats?.tasks?.pending || 0,
      subValue: `${stats?.tasks?.overdue || 0} overdue`,
      icon: CheckCircle,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'TDS Pending',
      value: stats?.tds?.pending_count || 0,
      subValue: formatCurrency(stats?.tds?.pending_amount),
      icon: Percent,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Dashboard</h1>
          <p className="text-slate-500 mt-1">Financial overview and key metrics</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${card.lightColor}`}>
                <card.icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              <p className={`text-sm ${card.textColor} mt-1`}>{card.subValue}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Invoice Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Domestic</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${stats?.invoices?.total ? (stats.invoices.domestic / stats.invoices.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 w-12 text-right">{stats?.invoices?.domestic || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Export</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${stats?.invoices?.total ? (stats.invoices.export / stats.invoices.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 w-12 text-right">{stats?.invoices?.export || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">SEZ</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${stats?.invoices?.total ? (stats.invoices.sez / stats.invoices.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 w-12 text-right">{stats?.invoices?.sez || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/invoices" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">View Invoices</span>
            </a>
            <a href="/retention" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-slate-700">Retention</span>
            </a>
            <a href="/payments" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Payments</span>
            </a>
            <a href="/tasks" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <CheckCircle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-700">Tasks</span>
            </a>
            <a href="/tds" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <Percent className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">TDS</span>
            </a>
            <a href="/weekly-meeting" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">Weekly Meeting</span>
            </a>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Invoice Value</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(stats?.invoices?.total_amount)}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Total Overdue</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(stats?.overdue?.amount)}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Retention Pending</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{formatCurrency(stats?.retention?.amount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsDashboard;
