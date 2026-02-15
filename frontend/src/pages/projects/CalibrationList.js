import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, FileText, Calendar, Building2, 
  ChevronRight, Download, Edit, Trash2,
  Clock, CheckCircle, AlertCircle, Gauge
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CalibrationList = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total_contracts: 0,
    active_contracts: 0,
    expired_contracts: 0,
    expiring_soon: 0,
    total_meters: 0
  });

  useEffect(() => {
    fetchContracts();
    fetchStats();
  }, [statusFilter]);

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/api/calibration`;
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error('Error fetching calibration contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/calibration/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (contractId) => {
    if (!window.confirm('Are you sure you want to delete this calibration contract?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/calibration/${contractId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchContracts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
    }
  };

  const handleDownloadPDF = async (contractId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/calibration-report/${contractId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Calibration_Report_${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      expired: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon size={12} />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const filteredContracts = contracts.filter(contract => {
    const customerName = contract.customer_info?.customer_name || '';
    const matchesSearch = 
      contract.contract_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.project?.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6" data-testid="calibration-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Calibration Services</h1>
          <p className="text-slate-500 mt-1">Manage Meter Calibration Contracts & Certificates</p>
        </div>
        <button
          onClick={() => navigate('/projects/calibration/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          data-testid="create-calibration-btn"
        >
          <Plus size={20} />
          New Contract
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Contracts</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total_contracts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active_contracts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-600">{stats.expiring_soon}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired_contracts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gauge className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Meters</p>
              <p className="text-2xl font-bold text-purple-600">{stats.total_meters}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by Contract No, Customer, or Project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="calibration-search-input"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              data-testid="calibration-status-filter"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contract List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading contracts...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-8 text-center">
            <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No Calibration Contracts Found</h3>
            <p className="text-slate-500 mt-1">Create your first calibration contract to get started</p>
            <button
              onClick={() => navigate('/projects/calibration/new')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Contract
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Contract No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Customer / Project</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Contract Period</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Meters</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50 transition-colors" data-testid={`calibration-row-${contract.id}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{contract.contract_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-800">{contract.customer_info?.customer_name || '-'}</p>
                          <p className="text-sm text-slate-500">{contract.project?.project_name || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span>
                          {contract.contract_details?.start_date} - {contract.contract_details?.end_date}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {contract.meter_list?.length || 0} meters
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/projects/calibration/${contract.id}`)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/projects/calibration/${contract.id}/edit`)}
                          className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(contract.id)}
                          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalibrationList;
