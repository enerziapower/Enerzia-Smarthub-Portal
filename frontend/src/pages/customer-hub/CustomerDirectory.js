import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Building2, Search, Plus, ChevronRight, 
  Loader2, AlertCircle, CheckCircle2, XCircle, FolderOpen
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerDirectory = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [portalFilter, setPortalFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [customersRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/customer-hub/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/customer-hub/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesPortal = 
      portalFilter === 'all' ||
      (portalFilter === 'active' && customer.portal_access && customer.password_hash) ||
      (portalFilter === 'inactive' && (!customer.portal_access || !customer.password_hash));
    
    return matchesSearch && matchesPortal;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Customer Hub
          </h1>
          <p className="text-slate-500 mt-1">Manage customer accounts and portal access</p>
        </div>
        <Link
          to="/customer-hub/new"
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total_customers}</p>
                <p className="text-sm text-slate-500">Total Customers</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active_portal_users}</p>
                <p className="text-sm text-slate-500">Active Portal Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FolderOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.customers_with_projects}</p>
                <p className="text-sm text-slate-500">With Linked Projects</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <select
          value={portalFilter}
          onChange={(e) => setPortalFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="all">All Customers</option>
          <option value="active">Portal Active</option>
          <option value="inactive">Portal Inactive</option>
        </select>
      </div>

      {/* Customer List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredCustomers.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {filteredCustomers.map((customer) => (
              <Link
                key={customer.id}
                to={`/customer-hub/${customer.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{customer.name}</h3>
                    <p className="text-sm text-slate-500">{customer.company_name}</p>
                    <p className="text-xs text-slate-400">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-2">
                      {customer.portal_access && customer.password_hash ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Portal Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          <XCircle className="w-3 h-3" />
                          No Portal Access
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {customer.linked_projects_count || 0} linked projects
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-slate-600 font-medium mb-1">No customers found</h3>
            <p className="text-slate-400 text-sm">
              {search ? 'Try adjusting your search' : 'Add your first customer to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDirectory;
