import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, Target, DollarSign, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Search, RefreshCw, Eye, 
  Building2, Phone, Mail, MapPin, Calendar, Filter, ChevronRight,
  AlertCircle, Clock, Award, UserPlus, Activity
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [enquiryAnalysis, setEnquiryAnalysis] = useState(null);
  const [quoteAnalysis, setQuoteAnalysis] = useState(null);
  const [orderAnalysis, setOrderAnalysis] = useState(null);
  const [projections, setProjections] = useState(null);
  const [targeting, setTargeting] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customer360, setCustomer360] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async (endpoint, setter) => {
    try {
      const response = await fetch(`${API_URL}/api/customer-management/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setter(data);
      }
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchData('overview', setOverview),
        fetchData('enquiry-analysis', setEnquiryAnalysis),
        fetchData('quote-analysis', setQuoteAnalysis),
        fetchData('order-analysis', setOrderAnalysis),
        fetchData('projections', setProjections),
        fetchData('customer-targeting', setTargeting),
        fetchData('customers?limit=100', (data) => setCustomers(data.customers || []))
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchData]);

  const fetchCustomer360 = async (customerName) => {
    try {
      const response = await fetch(
        `${API_URL}/api/customer-management/customer/${encodeURIComponent(customerName)}/360`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}
      );
      if (response.ok) {
        const data = await response.json();
        setCustomer360(data);
        setSelectedCustomer(customerName);
      }
    } catch (error) {
      toast.error('Failed to load customer details');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'enquiry', label: 'Enquiry Analysis', icon: Target },
    { id: 'quote', label: 'Quote Analysis', icon: DollarSign },
    { id: 'order', label: 'Order Analysis', icon: TrendingUp },
    { id: 'projections', label: 'Projections', icon: Activity },
    { id: 'targeting', label: 'Customer Targeting', icon: UserPlus },
    { id: 'customers', label: 'All Customers', icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="customer-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-slate-500 mt-1">Complete customer analytics and revenue insights</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && overview && (
        <OverviewTab data={overview} formatCurrency={formatCurrency} formatNumber={formatNumber} onCustomerClick={fetchCustomer360} />
      )}

      {activeTab === 'enquiry' && enquiryAnalysis && (
        <EnquiryAnalysisTab data={enquiryAnalysis} formatCurrency={formatCurrency} formatNumber={formatNumber} />
      )}

      {activeTab === 'quote' && quoteAnalysis && (
        <QuoteAnalysisTab data={quoteAnalysis} formatCurrency={formatCurrency} />
      )}

      {activeTab === 'order' && orderAnalysis && (
        <OrderAnalysisTab data={orderAnalysis} formatCurrency={formatCurrency} formatNumber={formatNumber} />
      )}

      {activeTab === 'projections' && projections && (
        <ProjectionsTab data={projections} formatCurrency={formatCurrency} />
      )}

      {activeTab === 'targeting' && targeting && (
        <TargetingTab data={targeting} formatCurrency={formatCurrency} onCustomerClick={fetchCustomer360} />
      )}

      {activeTab === 'customers' && (
        <CustomersTab 
          customers={customers} 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          formatCurrency={formatCurrency}
          onCustomerClick={fetchCustomer360}
        />
      )}

      {/* Customer 360 Modal */}
      {selectedCustomer && customer360 && (
        <Customer360Modal 
          data={customer360} 
          customerName={selectedCustomer}
          onClose={() => { setSelectedCustomer(null); setCustomer360(null); }}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

// ============== OVERVIEW TAB ==============
const OverviewTab = ({ data, formatCurrency, formatNumber, onCustomerClick }) => {
  const { summary, enquiry_stats, top_customers } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <Users className="w-8 h-8 opacity-80 mb-2" />
          <p className="text-blue-100 text-sm">Total Customers</p>
          <p className="text-3xl font-bold">{formatNumber(summary.total_customers)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <Activity className="w-8 h-8 opacity-80 mb-2" />
          <p className="text-green-100 text-sm">Active Customers</p>
          <p className="text-3xl font-bold">{formatNumber(summary.active_customers)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <Target className="w-8 h-8 opacity-80 mb-2" />
          <p className="text-purple-100 text-sm">Pipeline Value</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.pipeline_value)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <DollarSign className="w-8 h-8 opacity-80 mb-2" />
          <p className="text-amber-100 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white">
          <TrendingUp className="w-8 h-8 opacity-80 mb-2" />
          <p className="text-rose-100 text-sm">Conversion Rate</p>
          <p className="text-3xl font-bold">{summary.conversion_rate}%</p>
        </div>
      </div>

      {/* Enquiry Stats & Top Customers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enquiry Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" /> Enquiry Funnel
          </h3>
          <div className="space-y-3">
            <FunnelBar label="Total Enquiries" value={enquiry_stats.total} max={enquiry_stats.total} color="bg-slate-500" />
            <FunnelBar label="New" value={enquiry_stats.new} max={enquiry_stats.total} color="bg-blue-500" />
            <FunnelBar label="Quoted" value={enquiry_stats.quoted} max={enquiry_stats.total} color="bg-yellow-500" />
            <FunnelBar label="Won" value={enquiry_stats.won} max={enquiry_stats.total} color="bg-green-500" />
            <FunnelBar label="Lost" value={enquiry_stats.lost} max={enquiry_stats.total} color="bg-red-500" />
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" /> Top Customers by Revenue
          </h3>
          <div className="space-y-2">
            {top_customers.slice(0, 8).map((customer, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                onClick={() => onCustomerClick(customer.name)}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>{idx + 1}</span>
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{customer.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(customer.total_value)}</p>
                  <p className="text-xs text-slate-500">{customer.order_count} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FunnelBar = ({ label, value, max, color }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{value}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

// ============== ENQUIRY ANALYSIS TAB ==============
const EnquiryAnalysisTab = ({ data, formatCurrency, formatNumber }) => {
  const { status_distribution, category_distribution, conversion_funnel, top_companies, monthly_trend } = data;

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-4xl font-bold text-slate-900">{formatNumber(conversion_funnel.total_enquiries)}</p>
          <p className="text-sm text-slate-500 mt-1">Total Enquiries</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-4xl font-bold text-yellow-600">{formatNumber(conversion_funnel.quoted)}</p>
          <p className="text-sm text-slate-500 mt-1">Quoted ({conversion_funnel.quote_rate}%)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-4xl font-bold text-green-600">{formatNumber(conversion_funnel.won)}</p>
          <p className="text-sm text-slate-500 mt-1">Won ({conversion_funnel.win_rate}%)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-4xl font-bold text-purple-600">{conversion_funnel.win_rate}%</p>
          <p className="text-sm text-slate-500 mt-1">Overall Win Rate</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Status Distribution</h3>
          <div className="space-y-2">
            {status_distribution.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700 capitalize">{s.status?.replace(/_/g, ' ') || 'Unknown'}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{s.count}</span>
                  <span className="text-xs text-slate-500 ml-2">({formatCurrency(s.value)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Category Distribution</h3>
          <div className="space-y-2">
            {category_distribution.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{c.category || 'Uncategorized'}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{c.count}</span>
                  <span className="text-xs text-slate-500 ml-2">({formatCurrency(c.value)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Companies */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Top Companies by Enquiry Count</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          {top_companies.slice(0, 10).map((c, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
              <p className="text-lg font-bold text-slate-900">{c.count} <span className="text-xs text-slate-500">enquiries</span></p>
              <p className="text-xs text-slate-500">{formatCurrency(c.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============== QUOTE ANALYSIS TAB ==============
const QuoteAnalysisTab = ({ data, formatCurrency }) => {
  const { summary, value_breakdown, aging, pending_quotes } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-bold text-slate-900">{summary.total_quotes}</p>
          <p className="text-xs text-slate-500">Total Quotes</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 text-center bg-green-50">
          <p className="text-3xl font-bold text-green-600">{summary.accepted_count}</p>
          <p className="text-xs text-slate-500">Accepted</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 text-center bg-red-50">
          <p className="text-3xl font-bold text-red-600">{summary.declined_count}</p>
          <p className="text-xs text-slate-500">Declined</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4 text-center bg-yellow-50">
          <p className="text-3xl font-bold text-yellow-600">{summary.pending_count}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 p-4 text-center bg-purple-50">
          <p className="text-3xl font-bold text-purple-600">{summary.win_rate}%</p>
          <p className="text-xs text-slate-500">Win Rate</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4 text-center bg-blue-50">
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.avg_quote_value)}</p>
          <p className="text-xs text-slate-500">Avg Quote</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Value Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Value Breakdown</h3>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Total Quote Value</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(value_breakdown.total_value)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Accepted Value</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(value_breakdown.accepted_value)}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600">Pending Value</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(value_breakdown.pending_value)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Declined Value</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(value_breakdown.declined_value)}</p>
            </div>
          </div>
        </div>

        {/* Quote Aging */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Pending Quote Aging
          </h3>
          <div className="space-y-3">
            {Object.entries(aging).map(([period, count]) => (
              <div key={period} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">{period}</span>
                <span className={`text-lg font-bold ${
                  period === '30+ days' ? 'text-red-600' : 
                  period === '15-30 days' ? 'text-orange-600' : 'text-slate-900'
                }`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Quotes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" /> Pending Quotes - Follow Up Required
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Enquiry No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Company</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Value</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Days Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending_quotes.map((q, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{q.enquiry_no}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{q.company_name}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(q.value)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 capitalize">
                      {q.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${q.days_pending > 30 ? 'text-red-600' : 'text-slate-600'}`}>
                      {q.days_pending} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============== ORDER ANALYSIS TAB ==============
const OrderAnalysisTab = ({ data, formatCurrency, formatNumber }) => {
  const { summary, top_customers, category_breakdown, recent_orders } = data;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <p className="text-green-100 text-sm">Total Orders</p>
          <p className="text-3xl font-bold">{formatNumber(summary.total_orders)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-blue-100 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.total_value)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <p className="text-purple-100 text-sm">Avg Order Value</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.avg_order_value)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <p className="text-amber-100 text-sm">Unique Customers</p>
          <p className="text-3xl font-bold">{formatNumber(summary.unique_customers)}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white">
          <p className="text-rose-100 text-sm">Repeat Customers</p>
          <p className="text-3xl font-bold">{formatNumber(summary.repeat_customers)}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-5 text-white">
          <p className="text-cyan-100 text-sm">Repeat Rate</p>
          <p className="text-3xl font-bold">{summary.repeat_rate}%</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Top Customers by Order Value</h3>
          <div className="space-y-2">
            {top_customers.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{c.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(c.value)}</p>
                  <p className="text-xs text-slate-500">{c.count} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Orders by Category</h3>
          <div className="space-y-2">
            {category_breakdown.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{c.category}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{c.count} orders</span>
                  <span className="text-xs text-slate-500 ml-2">({formatCurrency(c.value)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Enquiry No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Company</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Category</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Value</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent_orders.map((o, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{o.enquiry_no}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{o.company_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{o.date}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{o.category || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(o.value)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 capitalize">
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============== PROJECTIONS TAB ==============
const ProjectionsTab = ({ data, formatCurrency }) => {
  const { metrics, projections, pipeline_breakdown } = data;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Avg Monthly Revenue</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.avg_monthly_revenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Growth Rate</p>
          <p className={`text-2xl font-bold flex items-center gap-1 ${metrics.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.growth_rate >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            {Math.abs(metrics.growth_rate)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Pipeline Value</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.pipeline_value)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Weighted Pipeline</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.weighted_pipeline)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Projections */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Revenue Projections (Next 3 Months)
          </h3>
          <div className="space-y-3">
            {projections.map((p, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800">{p.month}</p>
                    <p className={`text-xs ${p.confidence === 'high' ? 'text-green-600' : p.confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                      Confidence: {p.confidence}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(p.projected_revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" /> Pipeline by Status
          </h3>
          <div className="space-y-2">
            {Object.entries(pipeline_breakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600 capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== TARGETING TAB ==============
const TargetingTab = ({ data, formatCurrency, onCustomerClick }) => {
  const { summary, prospects, dormant_customers, high_value_customers, follow_up_needed } = data;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-bold text-slate-900">{summary.total_customers}</p>
          <p className="text-xs text-slate-500">Total Customers</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{summary.active_customers}</p>
          <p className="text-xs text-slate-500">Active (6 months)</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{summary.prospects}</p>
          <p className="text-xs text-slate-500">Prospects</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{summary.dormant_customers}</p>
          <p className="text-xs text-slate-500">Dormant</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{summary.high_value_customers}</p>
          <p className="text-xs text-slate-500">High Value</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prospects */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" /> Prospects (No Enquiries Yet)
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {prospects.slice(0, 15).map((p, idx) => (
              <div key={idx} className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer" onClick={() => onCustomerClick(p.name)}>
                <p className="font-medium text-slate-800">{p.name}</p>
                <div className="flex gap-4 text-xs text-slate-500 mt-1">
                  {p.contact_person && <span>{p.contact_person}</span>}
                  {p.phone && <span>{p.phone}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dormant Customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" /> Dormant Customers (Need Re-engagement)
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {dormant_customers.slice(0, 15).map((d, idx) => (
              <div key={idx} className="p-3 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer" onClick={() => onCustomerClick(d.name)}>
                <p className="font-medium text-slate-800">{d.name}</p>
                <div className="flex gap-4 text-xs text-slate-500 mt-1">
                  {d.contact && <span>{d.contact}</span>}
                  {d.phone && <span>{d.phone}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Follow-up Needed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" /> Follow-up Required (Quoted &gt; 14 days)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Enquiry</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Company</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Value</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {follow_up_needed.map((f, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{f.enquiry_no}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{f.company_name}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(f.value)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${f.days_pending > 30 ? 'text-red-600' : 'text-orange-600'}`}>{f.days_pending}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============== ALL CUSTOMERS TAB ==============
const CustomersTab = ({ customers, searchTerm, setSearchTerm, formatCurrency, onCustomerClick }) => {
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Customer Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.slice(0, 50).map((c, idx) => (
          <div 
            key={idx} 
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onCustomerClick(c.name)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 truncate">{c.name}</h4>
                {c.contact_person && (
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3" /> {c.contact_person}
                  </p>
                )}
                {(c.location || c.city) && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {c.location || c.city}
                  </p>
                )}
              </div>
              <Eye className="w-4 h-4 text-slate-400" />
            </div>
            {c.analytics && (
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-900">{c.analytics.total_enquiries}</p>
                  <p className="text-xs text-slate-500">Enquiries</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{c.analytics.won_orders}</p>
                  <p className="text-xs text-slate-500">Won</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600">{c.analytics.pending_enquiries}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== CUSTOMER 360 MODAL ==============
const Customer360Modal = ({ data, customerName, onClose, formatCurrency }) => {
  const { customer, metrics, status_breakdown, recent_enquiries } = data;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{customerName}</h3>
            <p className="text-sm text-slate-500">Customer 360° View</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          {customer && (
            <div className="grid md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
              {customer.contact_person && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{customer.contact_person}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{customer.email}</span>
                </div>
              )}
              {(customer.location || customer.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{customer.location || customer.city}</span>
                </div>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{metrics.total_enquiries}</p>
              <p className="text-xs text-slate-500">Total Enquiries</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{metrics.won_count}</p>
              <p className="text-xs text-slate-500">Won</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{metrics.pending_count}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{metrics.win_rate}%</p>
              <p className="text-xs text-slate-500">Win Rate</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-amber-600">{formatCurrency(metrics.avg_order_value)}</p>
              <p className="text-xs text-slate-500">Avg Order</p>
            </div>
          </div>

          {/* Value Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-900 text-white rounded-lg p-5">
              <p className="text-slate-300 text-sm">Total Business Value</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.total_value)}</p>
            </div>
            <div className="bg-green-600 text-white rounded-lg p-5">
              <p className="text-green-100 text-sm">Won Value</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.won_value)}</p>
            </div>
            <div className="bg-yellow-500 text-white rounded-lg p-5">
              <p className="text-yellow-100 text-sm">Pending Value</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.pending_value)}</p>
            </div>
          </div>

          {/* Status Breakdown */}
          {status_breakdown && Object.keys(status_breakdown).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Enquiry Status Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(status_breakdown).map(([status, data]) => (
                  <div key={status} className="p-2 bg-slate-50 rounded text-center">
                    <p className="text-lg font-bold text-slate-800">{data.count}</p>
                    <p className="text-xs text-slate-500 capitalize">{status.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(data.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Enquiries */}
          {recent_enquiries && recent_enquiries.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Recent Enquiries</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Enquiry No</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Value</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recent_enquiries.slice(0, 5).map((e, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm font-medium">{e.enquiry_no}</td>
                        <td className="px-3 py-2 text-sm text-slate-500">{e.date}</td>
                        <td className="px-3 py-2 text-sm text-slate-600 truncate max-w-[200px]">{e.description}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(e.value)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            e.status === 'accepted' || e.status === 'invoiced' ? 'bg-green-100 text-green-700' :
                            e.status === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{e.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;
