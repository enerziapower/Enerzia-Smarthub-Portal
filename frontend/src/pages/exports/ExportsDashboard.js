import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, Ship, FileText, DollarSign, Package, Clock, RefreshCw, 
  TrendingUp, Users, ArrowRight, AlertCircle
} from 'lucide-react';
import { exportsAPI } from '../../services/api';

const ExportsDashboard = () => {
  const [stats, setStats] = useState({
    total_customers: 0,
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    total_order_value_usd: 0,
    total_invoice_value_usd: 0,
    total_payment_received_usd: 0,
    outstanding_usd: 0
  });
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const statsResponse = await exportsAPI.getDashboardStats();
      setStats(statsResponse.data);
      
      // Load recent customers
      const customersResponse = await exportsAPI.getCustomers();
      setRecentCustomers((customersResponse.data || []).slice(0, 5));
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency, 
      minimumFractionDigits: 0 
    }).format(amount || 0);
  };

  const statCards = [
    { 
      title: 'Total Customers', 
      value: stats.total_customers, 
      icon: Users, 
      color: 'bg-cyan-50', 
      textColor: 'text-cyan-600',
      link: '/exports/customers'
    },
    { 
      title: 'Total Orders', 
      value: stats.total_orders, 
      icon: FileText, 
      color: 'bg-blue-50', 
      textColor: 'text-blue-600',
      link: '/exports/orders'
    },
    { 
      title: 'Pending Orders', 
      value: stats.pending_orders, 
      icon: Clock, 
      color: 'bg-amber-50', 
      textColor: 'text-amber-600',
      link: '/exports/orders'
    },
    { 
      title: 'Completed Orders', 
      value: stats.completed_orders, 
      icon: Package, 
      color: 'bg-green-50', 
      textColor: 'text-green-600',
      link: '/exports/orders'
    },
    { 
      title: 'Total Order Value', 
      value: formatCurrency(stats.total_order_value_usd), 
      icon: DollarSign, 
      color: 'bg-emerald-50', 
      textColor: 'text-emerald-600' 
    },
    { 
      title: 'Outstanding', 
      value: formatCurrency(stats.outstanding_usd), 
      icon: AlertCircle, 
      color: stats.outstanding_usd > 0 ? 'bg-red-50' : 'bg-slate-50', 
      textColor: stats.outstanding_usd > 0 ? 'text-red-600' : 'text-slate-600' 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exports Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of export operations</p>
        </div>
        <button 
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <Link 
            key={i} 
            to={card.link || '#'}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all hover:border-cyan-200"
          >
            <div className={`p-2 rounded-lg ${card.color} inline-block`}>
              <card.icon className={`w-5 h-5 ${card.textColor}`} />
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions & Recent Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to="/exports/customers" 
              className="flex items-center gap-3 p-4 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors"
            >
              <Users className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-medium text-slate-700">Customers</span>
            </Link>
            <Link 
              to="/exports/orders" 
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Orders</span>
            </Link>
            <Link 
              to="/exports/shipping" 
              className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Ship className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">Shipping</span>
            </Link>
            <Link 
              to="/exports/customs" 
              className="flex items-center gap-3 p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <Globe className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Customs</span>
            </Link>
            <Link 
              to="/exports/weekly-meeting" 
              className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-700">Weekly Meeting</span>
            </Link>
            <Link 
              to="/exports/reports" 
              className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Reports</span>
            </Link>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Export Customers</h3>
            <Link 
              to="/exports/customers"
              className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          
          {recentCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No customers yet</p>
              <Link 
                to="/exports/customers"
                className="text-sm text-cyan-600 hover:underline mt-2 inline-block"
              >
                Add your first customer
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCustomers.map((customer) => (
                <div 
                  key={customer.id} 
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-700 font-semibold">
                      {customer.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{customer.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Globe size={12} />
                      <span>{customer.country}</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        {customer.currency}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{customer.code}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Countries Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Export Markets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Oman', 'Singapore'].map((country) => {
            const customerCount = recentCustomers.filter(c => c.country === country).length;
            return (
              <div 
                key={country}
                className={`p-4 rounded-lg text-center ${
                  customerCount > 0 ? 'bg-cyan-50' : 'bg-slate-50'
                }`}
              >
                <Globe className={`w-6 h-6 mx-auto mb-2 ${
                  customerCount > 0 ? 'text-cyan-600' : 'text-slate-400'
                }`} />
                <p className="text-sm font-medium text-slate-700">{country}</p>
                <p className={`text-xs mt-1 ${
                  customerCount > 0 ? 'text-cyan-600' : 'text-slate-400'
                }`}>
                  {customerCount} customer{customerCount !== 1 ? 's' : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExportsDashboard;
