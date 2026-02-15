import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2,
  Building2, Calculator, Wallet, Target, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const ProjectProfitDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/project-profit/dashboard');
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching profit dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <AlertCircle className="inline mr-2" size={20} />
        {error}
      </div>
    );
  }

  const { summary, projects, top_profitable, low_margin } = dashboardData || {};

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Project Profitability</h1>
          <p className="text-slate-500">Track revenue, costs, and profit margins across projects</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary?.total_revenue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{summary?.total_projects || 0} projects with budget</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Budget</p>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary?.total_budget)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Allocated across all projects</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Actual Costs</p>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary?.total_actual_cost)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Wallet className="text-orange-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Total expenses recorded</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Gross Profit</p>
              <p className={`text-2xl font-bold ${(summary?.total_gross_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary?.total_gross_profit)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${(summary?.total_gross_profit || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {(summary?.total_gross_profit || 0) >= 0 ? 
                <TrendingUp className="text-green-600" size={24} /> : 
                <TrendingDown className="text-red-600" size={24} />
              }
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Avg Margin: <span className={`font-semibold ${(summary?.average_margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary?.average_margin || 0}%
            </span>
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Profitable Projects */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Top Profitable Projects</h2>
          </div>
          <div className="space-y-3">
            {top_profitable && top_profitable.length > 0 ? (
              top_profitable.map((project, idx) => (
                <div key={project.project_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 text-xs font-bold rounded">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-800">{project.pid_no}</p>
                      <p className="text-xs text-slate-500">{project.client}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{project.profit_margin}%</p>
                    <p className="text-xs text-slate-500">{formatCurrency(project.gross_profit)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">No projects with budget allocation yet</p>
            )}
          </div>
        </div>

        {/* Low Margin Projects */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-orange-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Projects Needing Attention</h2>
          </div>
          <div className="space-y-3">
            {low_margin && low_margin.length > 0 ? (
              low_margin.map((project, idx) => (
                <div key={project.project_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${
                      project.profit_margin < 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-800">{project.pid_no}</p>
                      <p className="text-xs text-slate-500">{project.client}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${project.profit_margin < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {project.profit_margin}%
                    </p>
                    <p className="text-xs text-slate-500">{formatCurrency(project.gross_profit)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">No low margin projects</p>
            )}
          </div>
        </div>
      </div>

      {/* All Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">All Projects with Budget</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Order Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Budget</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actual Cost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Profit</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Margin</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects && projects.length > 0 ? (
                projects.map((project) => (
                  <tr key={project.project_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{project.pid_no}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{project.project_name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{project.client}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">
                      {formatCurrency(project.order_value)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {formatCurrency(project.budget)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {formatCurrency(project.actual_cost)}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-medium ${
                      project.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(project.gross_profit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        project.profit_margin >= 20 ? 'bg-green-100 text-green-700' :
                        project.profit_margin >= 10 ? 'bg-blue-100 text-blue-700' :
                        project.profit_margin >= 0 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {project.profit_margin >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {project.profit_margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.budget_status === 'approved' ? 'bg-green-100 text-green-700' :
                        project.budget_status === 'revised' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {project.budget_status || 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                    No projects with budget allocation yet. Go to a project and allocate budget to see profitability analysis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectProfitDashboard;
