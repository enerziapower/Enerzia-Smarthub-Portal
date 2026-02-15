import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, FileText, ShoppingCart, Target, 
  DollarSign, Calendar, ArrowUpRight, ArrowDownRight, RefreshCw,
  ArrowRight, Plus, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SalesDashboard = () => {
  const [stats, setStats] = useState({
    total_enquiries: 0,
    new_enquiries: 0,
    total_quotations: 0,
    active_quotations: 0,
    total_orders: 0,
    pending_orders: 0,
    monthly_revenue: 0,
    conversion_rate: 0
  });
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [recentQuotations, setRecentQuotations] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/sales/dashboard/stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch recent enquiries
      const enqRes = await fetch(`${API_URL}/api/sales/enquiries?limit=5`, { headers });
      if (enqRes.ok) {
        const enqData = await enqRes.json();
        setRecentEnquiries(enqData.enquiries || []);
      }

      // Fetch recent quotations
      const qtRes = await fetch(`${API_URL}/api/sales/quotations?limit=5`, { headers });
      if (qtRes.ok) {
        const qtData = await qtRes.json();
        setRecentQuotations(qtData.quotations || []);
      }

      // Fetch recent orders
      const ordRes = await fetch(`${API_URL}/api/sales/orders?limit=5`, { headers });
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setRecentOrders(ordData.orders || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const statCards = [
    { title: 'Total Enquiries', value: stats.total_enquiries, subValue: `${stats.new_enquiries} new`, icon: FileText, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Active Quotations', value: stats.active_quotations, subValue: `${stats.total_quotations} total`, icon: FileText, color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Pending Orders', value: stats.pending_orders, subValue: `${stats.total_orders} total`, icon: ShoppingCart, color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'Monthly Revenue', value: formatCurrency(stats.monthly_revenue), icon: DollarSign, color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Conversion Rate', value: `${stats.conversion_rate}%`, subValue: 'Enquiry to Order', icon: Target, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      site_visited: 'bg-purple-100 text-purple-700',
      quoted: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of sales performance and pipeline</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${card.lightColor}`}>
                <card.icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              {card.subValue && (
                <p className="text-xs text-slate-400 mt-1">{card.subValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Sales Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              to="/sales/enquiries" 
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">New Enquiry</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link 
              to="/sales/quotations" 
              className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-slate-700">Create Quotation</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link 
              to="/sales/orders" 
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-slate-700">View Orders</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Sales Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales Pipeline</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total_enquiries}</p>
              <p className="text-sm text-slate-500">Enquiries</p>
            </div>
            <ArrowRight className="w-6 h-6 text-slate-300 flex-shrink-0" />
            <div className="flex-1 text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total_quotations}</p>
              <p className="text-sm text-slate-500">Quotations</p>
            </div>
            <ArrowRight className="w-6 h-6 text-slate-300 flex-shrink-0" />
            <div className="flex-1 text-center p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total_orders}</p>
              <p className="text-sm text-slate-500">Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Enquiries */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Enquiries</h3>
            <Link to="/sales/enquiries" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentEnquiries.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No enquiries yet</p>
            ) : (
              recentEnquiries.slice(0, 5).map((enq) => (
                <div key={enq.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{enq.company_name}</p>
                    <p className="text-xs text-slate-500">{enq.enquiry_no}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(enq.status)}`}>
                    {enq.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Quotations</h3>
            <Link to="/sales/quotations" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentQuotations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No quotations yet</p>
            ) : (
              recentQuotations.slice(0, 5).map((qt) => (
                <div key={qt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{qt.customer_name}</p>
                    <p className="text-xs text-slate-500">{qt.quotation_no} • {formatCurrency(qt.total_amount)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(qt.status)}`}>
                    {qt.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Orders</h3>
            <Link to="/sales/orders" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No orders yet</p>
            ) : (
              recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">{order.order_no} • {formatCurrency(order.total_amount)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
