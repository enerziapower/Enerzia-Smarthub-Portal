import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, TrendingUp, TrendingDown, Calendar, 
  Play, Lock, Unlock, Download, RefreshCw, CheckCircle,
  AlertCircle, Building2, FileText, BarChart3, ArrowUpRight,
  ArrowDownRight, Eye, Printer
} from 'lucide-react';
import api from '../../services/api';

const PayrollDashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dashboardData, setDashboardData] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = [2024, 2025, 2026, 2027];

  useEffect(() => {
    fetchDashboardData();
    fetchRunStatus();
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/payroll/dashboard/${selectedMonth}/${selectedYear}`);
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunStatus = async () => {
    try {
      const response = await api.get(`/hr/payroll/run-status/${selectedMonth}/${selectedYear}`);
      setRunStatus(response.data);
    } catch (err) {
      console.error('Error fetching run status:', err);
      setRunStatus(null);
    }
  };

  const handlePreviewPayroll = async () => {
    try {
      setProcessing(true);
      setError('');
      const response = await api.post('/hr/payroll/preview', {
        month: selectedMonth,
        year: selectedYear,
        fetch_attendance: true
      });
      setPreviewData(response.data);
      setActiveTab('preview');
      setSuccess('Payroll preview generated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate preview');
    } finally {
      setProcessing(false);
    }
  };

  const handleRunPayroll = async () => {
    if (!window.confirm(`Are you sure you want to process payroll for ${months[selectedMonth-1].label} ${selectedYear}? This will calculate salaries for all active employees.`)) {
      return;
    }

    try {
      setProcessing(true);
      setError('');
      const response = await api.post('/hr/payroll/bulk-run', {
        month: selectedMonth,
        year: selectedYear,
        fetch_attendance: true,
        processed_by: 'Admin'
      });
      setSuccess(response.data.message);
      fetchDashboardData();
      fetchRunStatus();
      setActiveTab('overview');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalizePayroll = async () => {
    if (!window.confirm(`Are you sure you want to FINALIZE payroll for ${months[selectedMonth-1].label} ${selectedYear}? This will lock the payroll and prevent further modifications.`)) {
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/hr/payroll/finalize/${selectedMonth}/${selectedYear}?finalized_by=Admin`);
      setSuccess('Payroll finalized successfully');
      fetchRunStatus();
      fetchDashboardData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to finalize payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlockPayroll = async () => {
    if (!window.confirm('Are you sure you want to UNLOCK the payroll? This will allow modifications.')) {
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/hr/payroll/unlock/${selectedMonth}/${selectedYear}?unlocked_by=Admin`);
      setSuccess('Payroll unlocked successfully');
      fetchRunStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to unlock payroll');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'not_processed': 'bg-slate-100 text-slate-700',
      'processed': 'bg-blue-100 text-blue-700',
      'finalized': 'bg-green-100 text-green-700'
    };
    const statusLabels = {
      'not_processed': 'Not Processed',
      'processed': 'Processed',
      'finalized': 'Finalized'
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusStyles[status] || statusStyles['not_processed']}`}>
        {statusLabels[status] || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Dashboard</h1>
          <p className="text-slate-500 mt-1">Process and manage monthly payroll</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
            data-testid="month-select"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
            data-testid="year-select"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            onClick={() => { fetchDashboardData(); fetchRunStatus(); }}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Status & Actions Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-slate-500">Period</p>
              <p className="font-semibold text-slate-900">{months[selectedMonth-1].label} {selectedYear}</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <p className="text-sm text-slate-500">Status</p>
              {getStatusBadge(runStatus?.status)}
            </div>
            {runStatus?.finalized_at && (
              <>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <p className="text-sm text-slate-500">Finalized</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(runStatus.finalized_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {runStatus?.status !== 'finalized' && (
              <>
                <button
                  onClick={handlePreviewPayroll}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  data-testid="preview-btn"
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button
                  onClick={handleRunPayroll}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  data-testid="run-payroll-btn"
                >
                  <Play className="w-4 h-4" /> {processing ? 'Processing...' : 'Run Payroll'}
                </button>
              </>
            )}
            
            {runStatus?.status === 'processed' && (
              <button
                onClick={handleFinalizePayroll}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                data-testid="finalize-btn"
              >
                <Lock className="w-4 h-4" /> Finalize
              </button>
            )}
            
            {runStatus?.status === 'finalized' && (
              <button
                onClick={handleUnlockPayroll}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                data-testid="unlock-btn"
              >
                <Unlock className="w-4 h-4" /> Unlock
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {['overview', 'preview', 'reports'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading dashboard...</div>
          ) : !dashboardData || dashboardData.status === 'no_data' ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">No Payroll Data</h3>
              <p className="text-slate-500 mt-1">Click "Run Payroll" to process salaries for this month</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total Gross</p>
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(dashboardData.summary.total_gross)}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  {dashboardData.comparison.gross_change_percent !== 0 && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${dashboardData.comparison.gross_change_percent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.comparison.gross_change_percent > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(dashboardData.comparison.gross_change_percent)}% from last month
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Net Payable</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.summary.total_net)}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total Deductions</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(dashboardData.summary.total_deductions)}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Employees</p>
                      <p className="text-2xl font-bold text-slate-900">{dashboardData.employee_count}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions & Employer Contributions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Deductions Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'EPF (Employee)', value: dashboardData.deductions_breakdown.epf_employee, color: 'bg-blue-500' },
                      { label: 'ESIC (Employee)', value: dashboardData.deductions_breakdown.esic_employee, color: 'bg-cyan-500' },
                      { label: 'Professional Tax', value: dashboardData.deductions_breakdown.professional_tax, color: 'bg-purple-500' },
                      { label: 'LOP Deduction', value: dashboardData.deductions_breakdown.lop_deduction, color: 'bg-orange-500' },
                      { label: 'Advance EMI', value: dashboardData.deductions_breakdown.advance_emi, color: 'bg-pink-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-sm text-slate-600">{item.label}</span>
                        </div>
                        <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Employer Contributions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">EPF (Employer 12%)</span>
                      <span className="font-medium text-slate-900">{formatCurrency(dashboardData.employer_contributions.epf)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">ESIC (Employer 3.25%)</span>
                      <span className="font-medium text-slate-900">{formatCurrency(dashboardData.employer_contributions.esic)}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">Total Employer Cost</span>
                      <span className="font-bold text-slate-900">{formatCurrency(dashboardData.employer_contributions.total)}</span>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-700">
                        <strong>Total CTC:</strong> {formatCurrency(dashboardData.summary.total_ctc)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Department-wise Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Employees</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Gross</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Deductions</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardData.department_breakdown.map(dept => (
                        <tr key={dept.department} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-900">{dept.department}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{dept.employee_count}</td>
                          <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(dept.gross)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(dept.deductions)}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(dept.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="space-y-6">
          {!previewData ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <Eye className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">No Preview Data</h3>
              <p className="text-slate-500 mt-1">Click "Preview" to see payroll calculations before processing</p>
            </div>
          ) : (
            <>
              {/* Preview Summary */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Payroll Preview - {months[previewData.month-1].label} {previewData.year}</h3>
                    <p className="text-sm text-blue-700">{previewData.employee_count} employees • Attendance data included</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-700">Total Net Payable</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(previewData.summary.total_net)}</p>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Attendance</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Gross</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">EPF</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">PT</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">LOP</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.records.map(record => (
                        <tr key={record.emp_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{record.emp_name}</p>
                            <p className="text-xs text-slate-500">{record.emp_id} • {record.department}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm ${record.attendance.lop_days > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {record.attendance.present_days}/{record.attendance.working_days}
                            </span>
                            {record.attendance.lop_days > 0 && (
                              <p className="text-xs text-red-500">LOP: {record.attendance.lop_days} days</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(record.earnings.gross)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(record.deductions.epf)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(record.deductions.professional_tax)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(record.deductions.lop_deduction)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(record.net_salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'EPF Report', icon: FileText, desc: 'Monthly EPF return data', endpoint: 'epf', color: 'blue' },
            { name: 'ESIC Report', icon: FileText, desc: 'Monthly ESIC return data', endpoint: 'esic', color: 'cyan' },
            { name: 'Professional Tax', icon: FileText, desc: 'PT deduction report', endpoint: 'professional-tax', color: 'purple' },
          ].map(report => (
            <div key={report.endpoint} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className={`p-3 bg-${report.color}-100 rounded-lg w-fit mb-4`}>
                <report.icon className={`w-6 h-6 text-${report.color}-600`} />
              </div>
              <h3 className="font-semibold text-slate-900">{report.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{report.desc}</p>
              <button
                onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/hr/reports/${report.endpoint}/${selectedMonth}/${selectedYear}`, '_blank')}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Download JSON
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayrollDashboard;
