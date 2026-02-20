import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Calendar, Users, Play, Download, Eye, RefreshCw, 
  CheckCircle, AlertCircle, FileText, TrendingUp, Building,
  Calculator, Wallet, CreditCard, ArrowRight, Filter
} from 'lucide-react';
import api from '../../services/api';

const PayrollProcessing = () => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // list, detail
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [statutoryReport, setStatutoryReport] = useState(null);
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    fetchEmployees();
    fetchPayrollRecords();
  }, [selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees?status=active');
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchPayrollRecords = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/hr/payroll?month=${selectedMonth}&year=${selectedYear}`);
      setPayrollRecords(response.data || []);
    } catch (err) {
      console.error('Error fetching payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatutoryReport = async () => {
    try {
      const response = await api.get(`/api/hr/reports/statutory/${selectedMonth}/${selectedYear}`);
      setStatutoryReport(response.data);
    } catch (err) {
      console.error('Error fetching statutory report:', err);
    }
  };

  const runPayroll = async () => {
    if (!window.confirm(`Are you sure you want to run payroll for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}?`)) {
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      const response = await api.post('/hr/payroll/run', {
        month: selectedMonth,
        year: selectedYear,
        employee_ids: selectedEmployees.length > 0 ? selectedEmployees : []
      });
      
      setSuccess(`Payroll processed for ${response.data.records?.length || 0} employees`);
      fetchPayrollRecords();
      fetchStatutoryReport();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const viewPayslip = (record) => {
    setSelectedRecord(record);
    setViewMode('detail');
  };

  const totalGross = payrollRecords.reduce((sum, r) => sum + (r.gross_salary || 0), 0);
  const totalNet = payrollRecords.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const totalDeductions = payrollRecords.reduce((sum, r) => sum + (r.total_deductions || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Processing</h1>
          <p className="text-slate-500 mt-1">Process monthly salary and generate payslips</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={runPayroll}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {processing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Payroll</>
            )}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{payrollRecords.length}</p>
              <p className="text-sm text-slate-500">Employees Processed</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">₹{totalGross.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Total Gross</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><Calculator className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">₹{totalDeductions.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Total Deductions</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Wallet className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">₹{totalNet.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Net Payable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Records Table */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Payroll Records - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </h3>
            <button onClick={fetchStatutoryReport} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              <FileText className="w-4 h-4" /> View Statutory Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">EPF</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">ESIC</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">PT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">LOP</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net Salary</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : payrollRecords.length === 0 ? (
                  <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                    No payroll records found. Click "Run Payroll" to process.
                  </td></tr>
                ) : (
                  payrollRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{record.emp_name}</p>
                          <p className="text-xs text-slate-500">{record.emp_id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.department}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">₹{record.gross_salary?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">₹{record.deductions?.epf?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">
                        {record.deductions?.esic_applicable ? `₹${record.deductions?.esic?.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">₹{record.deductions?.professional_tax?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">
                        {record.lop_days > 0 ? `${record.lop_days}d / ₹${record.deductions?.lop_deduction?.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">₹{record.net_salary?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => viewPayslip(record)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Payslip"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Detail View */}
      {viewMode === 'detail' && selectedRecord && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-900">
              Payslip - {selectedRecord.emp_name} ({selectedRecord.emp_id})
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const API_URL = process.env.REACT_APP_BACKEND_URL || '';
                  window.open(`${API_URL}/api/hr/payslip/${selectedRecord.id}/pdf`, '_blank');
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                data-testid="download-payslip-btn"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
              >
                Back to List
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Info */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-3">Employee Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Name:</span><span>{selectedRecord.emp_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Employee ID:</span><span>{selectedRecord.emp_id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Department:</span><span>{selectedRecord.department}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Designation:</span><span>{selectedRecord.designation}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Pay Period:</span><span>{months.find(m => m.value === selectedRecord.month)?.label} {selectedRecord.year}</span></div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-3">Attendance Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Days in Month:</span><span>{selectedRecord.days_in_month}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Working Days:</span><span>{selectedRecord.working_days}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Days Present:</span><span>{selectedRecord.present_days}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">LOP Days:</span><span className="text-red-600">{selectedRecord.lop_days}</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Earnings */}
              <div className="border border-green-200 rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                  <h4 className="font-medium text-green-800">Earnings</h4>
                </div>
                <div className="p-4 space-y-2">
                  {selectedRecord.earnings && Object.entries(selectedRecord.earnings).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span>₹{value?.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-green-700 pt-2 border-t">
                    <span>Gross Salary</span>
                    <span>₹{selectedRecord.gross_salary?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                  <h4 className="font-medium text-red-800">Deductions</h4>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">EPF (Employee 12%)</span>
                    <span>₹{selectedRecord.deductions?.epf?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">ESIC (0.75%)</span>
                    <span>{selectedRecord.deductions?.esic_applicable ? `₹${selectedRecord.deductions?.esic?.toLocaleString()}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Professional Tax</span>
                    <span>₹{selectedRecord.deductions?.professional_tax?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">LOP Deduction</span>
                    <span>₹{selectedRecord.deductions?.lop_deduction?.toLocaleString()}</span>
                  </div>
                  {selectedRecord.deductions?.advance_emi > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Advance EMI</span>
                      <span>₹{selectedRecord.deductions?.advance_emi?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-red-700 pt-2 border-t">
                    <span>Total Deductions</span>
                    <span>₹{selectedRecord.total_deductions?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Net Salary Payable</p>
                  <p className="text-3xl font-bold text-blue-700">₹{selectedRecord.net_salary?.toLocaleString()}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p>Bank: {selectedRecord.bank_account || 'N/A'}</p>
                  <p>IFSC: {selectedRecord.bank_ifsc || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Employer Contributions */}
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Employer Contributions (Not deducted from salary)</h4>
              <div className="flex gap-6 text-sm">
                <div><span className="text-slate-600">EPF (12%): </span><span className="font-medium">₹{selectedRecord.employer_contributions?.epf?.toLocaleString()}</span></div>
                <div><span className="text-slate-600">ESIC (3.25%): </span><span className="font-medium">₹{selectedRecord.employer_contributions?.esic?.toLocaleString()}</span></div>
                <div><span className="text-slate-600">CTC: </span><span className="font-medium">₹{selectedRecord.ctc?.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Report Modal */}
      {statutoryReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900">
                Statutory Report - {months.find(m => m.value === statutoryReport.month)?.label} {statutoryReport.year}
              </h3>
              <button onClick={() => setStatutoryReport(null)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-700">{statutoryReport.employee_count}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Total Gross Salary</p>
                  <p className="text-2xl font-bold text-green-700">₹{statutoryReport.summary?.total_gross_salary?.toLocaleString()}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b">
                  <h4 className="font-medium">EPF Summary</h4>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Employee Contribution (12%)</span><span>₹{statutoryReport.summary?.epf?.employee_contribution?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Employer Contribution (12%)</span><span>₹{statutoryReport.summary?.epf?.employer_contribution?.toLocaleString()}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-2"><span>Total EPF</span><span>₹{statutoryReport.summary?.epf?.total?.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b">
                  <h4 className="font-medium">ESIC Summary</h4>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Eligible Employees (≤₹21,000)</span><span>{statutoryReport.summary?.esic?.eligible_employees}</span></div>
                  <div className="flex justify-between"><span>Employee Contribution (0.75%)</span><span>₹{statutoryReport.summary?.esic?.employee_contribution?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Employer Contribution (3.25%)</span><span>₹{statutoryReport.summary?.esic?.employer_contribution?.toLocaleString()}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-2"><span>Total ESIC</span><span>₹{statutoryReport.summary?.esic?.total?.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b">
                  <h4 className="font-medium">Professional Tax (Tamil Nadu)</h4>
                </div>
                <div className="p-4">
                  <div className="flex justify-between font-semibold"><span>Total PT</span><span>₹{statutoryReport.summary?.professional_tax?.total?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollProcessing;
