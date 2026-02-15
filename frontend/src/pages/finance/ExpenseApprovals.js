import React, { useState, useEffect } from 'react';
import { 
  Receipt, CheckCircle, XCircle, Clock, IndianRupee,
  User, FileText, Loader2, Search, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const ExpenseApprovals = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchClaims();
  }, [filter]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await employeeHubAPI.getExpenseClaims(params);
      setClaims(res.data.claims || []);
    } catch (error) {
      console.error('Error fetching expense claims:', error);
      toast.error('Failed to load expense claims');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claimId) => {
    try {
      setProcessingId(claimId);
      await employeeHubAPI.approveExpenseClaim(claimId, user?.name || 'Finance Admin');
      toast.success('Expense claim approved');
      fetchClaims();
    } catch (error) {
      console.error('Error approving claim:', error);
      toast.error('Failed to approve claim');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claimId) => {
    try {
      setProcessingId(claimId);
      await employeeHubAPI.rejectExpenseClaim(claimId, user?.name || 'Finance Admin');
      toast.success('Expense claim rejected');
      fetchClaims();
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast.error('Failed to reject claim');
    } finally {
      setProcessingId(null);
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

  const getCategoryBadge = (category) => {
    const colors = {
      'Travel': 'bg-blue-100 text-blue-700',
      'Food': 'bg-orange-100 text-orange-700',
      'Transport': 'bg-purple-100 text-purple-700',
      'Accommodation': 'bg-green-100 text-green-700',
      'Communication': 'bg-cyan-100 text-cyan-700',
      'Miscellaneous': 'bg-slate-100 text-slate-700'
    };
    return colors[category] || colors['Miscellaneous'];
  };

  const filteredClaims = claims.filter(claim => 
    claim.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const pendingAmount = claims.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0);
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const approvedAmount = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0);
  const rejectedCount = claims.filter(c => c.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="expense-approvals">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expense Approvals</h1>
          <p className="text-slate-500 mt-1">Review and approve employee expense claims</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Claims</p>
              <p className="text-xl font-bold text-slate-800">{pendingCount}</p>
              <p className="text-sm text-amber-600">₹{pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-xl font-bold text-slate-800">{approvedCount}</p>
              <p className="text-sm text-green-600">₹{approvedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="text-xl font-bold text-slate-800">{rejectedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Claims</p>
              <p className="text-xl font-bold text-slate-800">{claims.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name, department, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="search-expense-claims"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredClaims.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No expense claims found</p>
            <p className="text-sm text-slate-400">Claims will appear here when employees submit expenses</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClaims.map((claim) => (
              <div key={claim.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-slate-100 rounded-full">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{claim.user_name}</p>
                        <p className="text-sm text-slate-500">{claim.department}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadge(claim.category)}`}>
                        {claim.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(claim.status)}`}>
                        {claim.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-11 space-y-1">
                      <p className="text-lg font-bold text-slate-800 flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" />
                        {claim.amount?.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Description:</span> {claim.description}
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Date:</span> {claim.date}
                      </p>
                      {claim.receipt_url && (
                        <a 
                          href={claim.receipt_url.startsWith('http') ? claim.receipt_url : `${API}${claim.receipt_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Receipt
                        </a>
                      )}
                      <p className="text-xs text-slate-400">
                        Submitted: {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {claim.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(claim.id)}
                        disabled={processingId === claim.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        data-testid={`approve-expense-${claim.id}`}
                      >
                        {processingId === claim.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(claim.id)}
                        disabled={processingId === claim.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        data-testid={`reject-expense-${claim.id}`}
                      >
                        {processingId === claim.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseApprovals;
