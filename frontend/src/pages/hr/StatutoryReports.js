import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Calendar, RefreshCw, Building2,
  Users, DollarSign, AlertCircle, CheckCircle, Printer,
  FileSpreadsheet, Eye
} from 'lucide-react';
import api from '../../services/api';

const StatutoryReports = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeReport, setActiveReport] = useState('epf');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = [2024, 2025, 2026, 2027];

  const reportTypes = [
    { id: 'epf', name: 'EPF Report', icon: Building2, color: 'blue', desc: 'Employee Provident Fund monthly return' },
    { id: 'esic', name: 'ESIC Report', icon: Users, color: 'cyan', desc: 'Employee State Insurance monthly return' },
    { id: 'professional-tax', name: 'Professional Tax', icon: DollarSign, color: 'purple', desc: 'State Professional Tax deductions' },
  ];

  useEffect(() => {
    fetchReportData();
  }, [activeReport, selectedMonth, selectedYear]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/hr/reports/${activeReport}/${selectedMonth}/${selectedYear}`);
      setReportData(response.data);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.response?.data?.detail || 'Failed to fetch report data');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const exportToCSV = () => {
    if (!reportData?.records) return;

    let headers, rows;

    if (activeReport === 'epf') {
      headers = ['Emp ID', 'Name', 'UAN', 'PF Account', 'Gross', 'Basic', 'EPF Wages', 'Employee EPF', 'Employer EPF', 'EPS', 'EDLI'];
      rows = reportData.records.map(r => [
        r.emp_id, r.emp_name, r.uan, r.pf_account, r.gross_salary, r.basic, r.epf_wages,
        r.employee_epf, r.employer_epf_share, r.eps, r.edli
      ]);
    } else if (activeReport === 'esic') {
      headers = ['Emp ID', 'Name', 'ESIC Number', 'Gross', 'ESIC Wages', 'Employee ESIC', 'Employer ESIC', 'Total'];
      rows = reportData.records.map(r => [
        r.emp_id, r.emp_name, r.esic_number, r.gross_salary, r.esic_wages,
        r.employee_esic, r.employer_esic, r.total
      ]);
    } else {
      headers = ['Emp ID', 'Name', 'Department', 'Gross Salary', 'Professional Tax'];
      rows = reportData.records.map(r => [
        r.emp_id, r.emp_name, r.department, r.gross_salary, r.professional_tax
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeReport}_report_${selectedMonth}_${selectedYear}.csv`;
    link.click();
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statutory Reports</h1>
          <p className="text-slate-500 mt-1">Generate EPF, ESIC, and Professional Tax reports</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            onClick={fetchReportData}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportTypes.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeReport === report.id 
                ? `border-${report.color}-500 bg-${report.color}-50` 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            data-testid={`report-${report.id}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeReport === report.id ? `bg-${report.color}-100` : 'bg-slate-100'}`}>
                <report.icon className={`w-5 h-5 ${activeReport === report.id ? `text-${report.color}-600` : 'text-slate-500'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${activeReport === report.id ? `text-${report.color}-900` : 'text-slate-900'}`}>
                  {report.name}
                </h3>
                <p className="text-xs text-slate-500">{report.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading report data...</div>
      ) : reportData ? (
        <div className="space-y-6 print:space-y-4" id="report-content">
          {/* Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 print:border print:p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{reportData.report_type}</h2>
                <p className="text-slate-500">
                  {months[selectedMonth-1].label} {selectedYear} • {reportData.employee_count} Employees
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV
                </button>
                <button
                  onClick={printReport}
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {activeReport === 'epf' && reportData.summary && (
                <>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Employee EPF</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(reportData.summary.total_employee_epf)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Employer EPF</p>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(reportData.summary.total_employer_epf)}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">EPS</p>
                    <p className="text-xl font-bold text-purple-900">{formatCurrency(reportData.summary.total_eps)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600">Grand Total</p>
                    <p className="text-xl font-bold text-amber-900">{formatCurrency(reportData.summary.grand_total)}</p>
                  </div>
                </>
              )}
              {activeReport === 'esic' && reportData.summary && (
                <>
                  <div className="p-3 bg-cyan-50 rounded-lg">
                    <p className="text-sm text-cyan-600">Employee ESIC</p>
                    <p className="text-xl font-bold text-cyan-900">{formatCurrency(reportData.summary.total_employee_esic)}</p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <p className="text-sm text-teal-600">Employer ESIC</p>
                    <p className="text-xl font-bold text-teal-900">{formatCurrency(reportData.summary.total_employer_esic)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg col-span-2">
                    <p className="text-sm text-emerald-600">Grand Total</p>
                    <p className="text-xl font-bold text-emerald-900">{formatCurrency(reportData.summary.grand_total)}</p>
                  </div>
                </>
              )}
              {activeReport === 'professional-tax' && (
                <div className="p-3 bg-purple-50 rounded-lg col-span-2 md:col-span-4">
                  <p className="text-sm text-purple-600">Total Professional Tax</p>
                  <p className="text-xl font-bold text-purple-900">{formatCurrency(reportData.total_pt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden print:border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Emp ID</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                    {activeReport === 'epf' && (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">UAN</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">EPF Wages</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Emp EPF</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Empr EPF</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">EPS</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">EDLI</th>
                      </>
                    )}
                    {activeReport === 'esic' && (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">ESIC No.</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">ESIC Wages</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Emp ESIC</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Empr ESIC</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Total</th>
                      </>
                    )}
                    {activeReport === 'professional-tax' && (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">Department</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Gross Salary</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Prof. Tax</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.records?.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                        No records found for this report
                      </td>
                    </tr>
                  ) : (
                    reportData.records?.map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{record.emp_id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{record.emp_name}</td>
                        {activeReport === 'epf' && (
                          <>
                            <td className="px-4 py-3 text-slate-600">{record.uan || '-'}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(record.epf_wages)}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(record.employee_epf)}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(record.employer_epf_share)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(record.eps)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(record.edli)}</td>
                          </>
                        )}
                        {activeReport === 'esic' && (
                          <>
                            <td className="px-4 py-3 text-slate-600">{record.esic_number || '-'}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(record.esic_wages)}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(record.employee_esic)}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(record.employer_esic)}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(record.total)}</td>
                          </>
                        )}
                        {activeReport === 'professional-tax' && (
                          <>
                            <td className="px-4 py-3 text-slate-600">{record.department}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(record.gross_salary)}</td>
                            <td className="px-4 py-3 text-right font-medium text-purple-600">{formatCurrency(record.professional_tax)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {reportData.records?.length > 0 && (
                  <tfoot className="bg-slate-50 font-medium">
                    <tr>
                      <td colSpan="2" className="px-4 py-3">TOTAL</td>
                      {activeReport === 'epf' && (
                        <>
                          <td></td>
                          <td className="px-4 py-3 text-right">-</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(reportData.summary.total_employee_epf)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(reportData.summary.total_employer_epf - reportData.summary.total_eps)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(reportData.summary.total_eps)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(reportData.summary.total_edli)}</td>
                        </>
                      )}
                      {activeReport === 'esic' && (
                        <>
                          <td></td>
                          <td className="px-4 py-3 text-right">-</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(reportData.summary.total_employee_esic)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(reportData.summary.total_employer_esic)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(reportData.summary.grand_total)}</td>
                        </>
                      )}
                      {activeReport === 'professional-tax' && (
                        <>
                          <td></td>
                          <td className="px-4 py-3 text-right">-</td>
                          <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(reportData.total_pt)}</td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StatutoryReports;
