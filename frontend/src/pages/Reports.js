import React, { useState } from 'react';
import { projectsAPI } from '../services/api';
import { Download, Calendar, Filter, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePicker } from '../components/ui/date-picker';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    reportType: 'all',
    groupBy: 'category',
    startDate: '',
    endDate: '',
    period: 'all', // all, week, month, custom
  });

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = {
        report_type: filters.reportType,
        group_by: filters.groupBy,
      };

      if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        params.start_date = filters.startDate;
        params.end_date = filters.endDate;
      }

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reports/custom?${new URLSearchParams(params)}`
      );
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await projectsAPI.exportExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await projectsAPI.exportPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Custom Reports
          </h2>
          <p className="text-sm text-slate-500 mt-1">Generate customized reports with filters</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-all"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium hover:bg-rose-100 transition-all"
          >
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Report Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Group By</label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">All Projects</option>
              <option value="status">Status Wise</option>
              <option value="category">Category Wise</option>
              <option value="client">Client Wise</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Start Date */}
          {filters.period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <DatePicker
                  value={filters.startDate}
                  onChange={(val) => setFilters({ ...filters, startDate: val })}
                  placeholder="Select start date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <DatePicker
                  value={filters.endDate}
                  onChange={(val) => setFilters({ ...filters, endDate: val })}
                  placeholder="Select end date"
                  className="h-10 border-slate-200 focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={generateReport}
            disabled={loading}
            data-testid="generate-report-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Filter size={16} />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Total Projects</p>
              <p className="text-3xl font-bold text-slate-900">{reportData.total_projects}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Total Budget</p>
              <p className="text-3xl font-bold text-blue-600">₹{reportData.total_budget.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-amber-600">₹{reportData.total_expenses.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 mb-1">PID Savings</p>
              <p className={`text-3xl font-bold ${reportData.total_pid_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{reportData.total_pid_savings.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Charts */}
          {filters.groupBy && reportData.data.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {filters.groupBy.charAt(0).toUpperCase() + filters.groupBy.slice(1)} Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="group" stroke="#64748b" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#0ea5e9" name="Projects" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">PID Savings by {filters.groupBy}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.data}
                      dataKey="pid_savings"
                      nameKey="group"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {reportData.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Data Table */}
          {filters.groupBy && reportData.data.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Detailed Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">
                        {filters.groupBy}
                      </th>
                      <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">Count</th>
                      <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">Budget</th>
                      <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">Expenses</th>
                      <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">PID Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <td className="py-4 px-4 text-sm font-medium text-slate-900">{item.group}</td>
                        <td className="py-4 px-4 text-sm text-right font-mono text-slate-600">{item.count}</td>
                        <td className="py-4 px-4 text-sm text-right font-mono text-slate-600">
                          ₹{item.budget.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-sm text-right font-mono text-slate-600">
                          ₹{item.expenses.toLocaleString('en-IN')}
                        </td>
                        <td className={`py-4 px-4 text-sm text-right font-mono font-semibold ${item.pid_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{item.pid_savings.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
