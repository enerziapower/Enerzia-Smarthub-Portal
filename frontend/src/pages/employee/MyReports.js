import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Eye, Calendar, Filter, Search,
  Clock, CheckCircle, XCircle, AlertCircle, Loader2,
  FileBarChart, Receipt, Plane, Car
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const MyReports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leave');
  const [loading, setLoading] = useState(true);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [permissionHistory, setPermissionHistory] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [leaveRes, permissionRes, expenseRes] = await Promise.all([
        employeeHubAPI.getLeaveRequests({ user_id: user?.id }),
        employeeHubAPI.getPermissionRequests({ user_id: user?.id }),
        employeeHubAPI.getExpenseClaims({ user_id: user?.id })
      ]);
      
      setLeaveHistory(leaveRes.data.requests || []);
      setPermissionHistory(permissionRes.data.requests || []);
      setExpenseHistory(expenseRes.data.claims || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const tabs = [
    { id: 'leave', name: 'Leave History', icon: Calendar, count: leaveHistory.length },
    { id: 'permission', name: 'Permission History', icon: Clock, count: permissionHistory.length },
    { id: 'expense', name: 'Expense History', icon: Receipt, count: expenseHistory.length },
  ];

  // Stats
  const leaveStats = {
    total: leaveHistory.length,
    approved: leaveHistory.filter(l => l.status === 'approved').length,
    pending: leaveHistory.filter(l => l.status === 'pending').length,
    rejected: leaveHistory.filter(l => l.status === 'rejected').length,
    totalDays: leaveHistory.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.days || 0), 0)
  };

  const expenseStats = {
    total: expenseHistory.length,
    approved: expenseHistory.filter(e => e.status === 'approved').length,
    pending: expenseHistory.filter(e => e.status === 'pending').length,
    totalAmount: expenseHistory.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="my-reports">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Reports</h1>
          <p className="text-slate-500 mt-1">View your leave, permission, and expense history</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Leave Taken</p>
              <p className="text-xl font-bold text-slate-800">{leaveStats.totalDays} days</p>
              <p className="text-xs text-slate-400">{leaveStats.approved} approved requests</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Permissions</p>
              <p className="text-xl font-bold text-slate-800">{permissionHistory.length}</p>
              <p className="text-xs text-slate-400">{permissionHistory.filter(p => p.status === 'approved').length} approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Expenses Claimed</p>
              <p className="text-xl font-bold text-slate-800">₹{expenseStats.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-slate-400">{expenseStats.approved} approved claims</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Requests</p>
              <p className="text-xl font-bold text-slate-800">{leaveStats.pending + expenseStats.pending}</p>
              <p className="text-xs text-slate-400">Awaiting approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {/* Leave History Tab */}
          {activeTab === 'leave' && (
            <div className="space-y-3">
              {leaveHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No leave history found</p>
                </div>
              ) : (
                leaveHistory.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(leave.status)}
                      <div>
                        <p className="font-medium text-slate-800">{leave.type}</p>
                        <p className="text-sm text-slate-500">
                          {leave.from_date} to {leave.to_date} ({leave.days} day{leave.days > 1 ? 's' : ''})
                        </p>
                        <p className="text-xs text-slate-400">{leave.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(leave.status)}`}>
                        {leave.status?.toUpperCase()}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        Applied: {new Date(leave.applied_on).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Permission History Tab */}
          {activeTab === 'permission' && (
            <div className="space-y-3">
              {permissionHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No permission history found</p>
                </div>
              ) : (
                permissionHistory.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(perm.status)}
                      <div>
                        <p className="font-medium text-slate-800">{perm.type}</p>
                        <p className="text-sm text-slate-500">
                          {perm.date} at {perm.time} ({perm.duration})
                        </p>
                        <p className="text-xs text-slate-400">{perm.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(perm.status)}`}>
                        {perm.status?.toUpperCase()}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        Requested: {new Date(perm.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Expense History Tab */}
          {activeTab === 'expense' && (
            <div className="space-y-3">
              {expenseHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No expense history found</p>
                </div>
              ) : (
                expenseHistory.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(expense.status)}
                      <div>
                        <p className="font-medium text-slate-800">{expense.category}</p>
                        <p className="text-sm text-slate-500">{expense.description}</p>
                        <p className="text-xs text-slate-400">Date: {expense.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">₹{expense.amount?.toLocaleString()}</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(expense.status)}`}>
                        {expense.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyReports;
