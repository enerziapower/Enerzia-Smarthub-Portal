import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank, Receipt, CreditCard,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw, Filter,
  Calendar, Building2, Users, Package, ShoppingCart, Clock, AlertTriangle,
  CheckCircle, XCircle, ChevronRight, Download, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FinanceDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [savings, setSavings] = useState(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [deptPerformance, setDeptPerformance] = useState(null);
  const [trends, setTrends] = useState(null);
  const [kpis, setKpis] = useState(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      
      const [overviewRes, profitRes, cashRes, savingsRes, expenseRes, paymentRes, deptRes, trendsRes, kpisRes] = await Promise.all([
        fetch(`${API_URL}/api/finance-dashboard/overview`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/order-profitability?limit=20`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/cash-flow?months=6`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/savings-analysis`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/expense-breakdown`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/payment-status`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/department-performance`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/monthly-trends?months=6`, { headers }),
        fetch(`${API_URL}/api/finance-dashboard/kpis`, { headers })
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (profitRes.ok) setProfitability(await profitRes.json());
      if (cashRes.ok) setCashFlow(await cashRes.json());
      if (savingsRes.ok) setSavings(await savingsRes.json());
      if (expenseRes.ok) setExpenseBreakdown(await expenseRes.json());
      if (paymentRes.ok) setPaymentStatus(await paymentRes.json());
      if (deptRes.ok) setDeptPerformance(await deptRes.json());
      if (trendsRes.ok) setTrends(await trendsRes.json());
      if (kpisRes.ok) setKpis(await kpisRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompact = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return formatCurrency(amount);
  };

  // Stat Card Component
  const StatCard = ({ title, value, subValue, icon: Icon, trend, color = 'blue', size = 'normal' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      amber: 'bg-amber-50 text-amber-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600',
      cyan: 'bg-cyan-50 text-cyan-600'
    };

    return (
      <div className={`bg-white rounded-xl border border-slate-200 ${size === 'large' ? 'p-6' : 'p-4'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            <p className={`font-bold text-slate-900 ${size === 'large' ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
            {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    );
  };

  // Progress Bar Component
  const ProgressBar = ({ value, max, color = 'blue', showLabel = true }) => {
    const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      amber: 'bg-amber-500',
      red: 'bg-red-500'
    };

    return (
      <div className="w-full">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClasses[color]} transition-all duration-300`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {showLabel && (
          <p className="text-xs text-slate-500 mt-1">{percent.toFixed(0)}%</p>
        )}
      </div>
    );
  };

  // Overview Tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCompact(overview?.revenue?.total)}
          subValue={`${overview?.revenue?.orders_count || 0} orders`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Total Costs"
          value={formatCompact(overview?.costs?.total_cost)}
          subValue={`Purchase: ${formatCompact(overview?.costs?.total_purchase)}`}
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="Gross Profit"
          value={formatCompact(overview?.profit?.gross_profit)}
          subValue={`Margin: ${overview?.profit?.margin_percent || 0}%`}
          icon={TrendingUp}
          color={overview?.profit?.gross_profit >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Pending Payments"
          value={formatCompact(overview?.pending?.payments)}
          subValue={`${overview?.pending?.payments_count || 0} milestones`}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* KPIs Section */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue KPIs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" /> Revenue Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Avg Order Value</span>
                <span className="font-semibold">{formatCurrency(kpis.revenue_kpis?.avg_order_value)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">This Month</span>
                <span className="font-semibold">{formatCompact(kpis.revenue_kpis?.monthly_revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Orders</span>
                <span className="font-semibold">{kpis.revenue_kpis?.total_orders || 0}</span>
              </div>
            </div>
          </div>

          {/* Profitability KPIs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" /> Profitability
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Profit Margin</span>
                <span className={`font-semibold ${kpis.profitability_kpis?.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.profitability_kpis?.profit_margin || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Cost Ratio</span>
                <span className="font-semibold">{kpis.profitability_kpis?.cost_ratio || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Gross Profit</span>
                <span className={`font-semibold ${kpis.profitability_kpis?.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCompact(kpis.profitability_kpis?.gross_profit)}
                </span>
              </div>
            </div>
          </div>

          {/* Collection KPIs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" /> Collections
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Collection Rate</span>
                <span className="font-semibold">{kpis.collection_kpis?.collection_rate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Pending</span>
                <span className="font-semibold">{formatCompact(kpis.collection_kpis?.pending_receivables)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Overdue</span>
                <span className="font-semibold text-red-600">{formatCompact(kpis.collection_kpis?.overdue_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trends Chart */}
      {trends?.trends && trends.trends.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Monthly Financial Trends</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Simple bar chart representation */}
              <div className="flex items-end justify-between gap-4 h-48">
                {trends.trends.map((t, idx) => {
                  const maxVal = Math.max(...trends.trends.map(x => x.revenue));
                  const revenueHeight = maxVal > 0 ? (t.revenue / maxVal) * 100 : 0;
                  const costHeight = maxVal > 0 ? (t.total_cost / maxVal) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="flex items-end gap-1 h-40 w-full justify-center">
                        <div 
                          className="w-6 bg-blue-500 rounded-t transition-all"
                          style={{ height: `${revenueHeight}%` }}
                          title={`Revenue: ${formatCurrency(t.revenue)}`}
                        />
                        <div 
                          className="w-6 bg-amber-500 rounded-t transition-all"
                          style={{ height: `${costHeight}%` }}
                          title={`Cost: ${formatCurrency(t.total_cost)}`}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{t.month_name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span className="text-sm text-slate-600">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded" />
                  <span className="text-sm text-slate-600">Cost</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Profitability Tab
  const ProfitabilityTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      {profitability?.totals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total Revenue" value={formatCompact(profitability.totals.total_revenue)} icon={DollarSign} color="blue" />
          <StatCard title="Purchase Cost" value={formatCompact(profitability.totals.total_purchase)} icon={Package} color="amber" />
          <StatCard title="Expenses" value={formatCompact(profitability.totals.total_expenses)} icon={Receipt} color="red" />
          <StatCard title="Total Profit" value={formatCompact(profitability.totals.total_profit)} icon={TrendingUp} color="green" />
          <StatCard title="Avg Margin" value={`${profitability.totals.avg_margin}%`} icon={PieChart} color="purple" />
        </div>
      )}

      {/* Order-wise P&L Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Order-wise Profit & Loss</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Order Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Purchase</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Expenses</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Profit</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Margin</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profitability?.orders?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                profitability?.orders?.map((order) => (
                  <tr key={order.order_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{order.order_no}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">{order.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(order.order_value)}</td>
                    <td className="px-4 py-3 text-sm text-right text-amber-600">{formatCurrency(order.purchase_cost)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(order.execution_expenses)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${order.actual_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(order.actual_profit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.profit_margin >= 30 ? 'bg-green-100 text-green-700' :
                        order.profit_margin >= 15 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.profit_margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Cash Flow Tab
  const CashFlowTab = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Expected Cash Inflow</h3>
        <p className="text-3xl font-bold">{formatCurrency(cashFlow?.summary?.total_expected_inflow)}</p>
        <p className="text-purple-200 mt-1">Next {cashFlow?.summary?.months_covered || 6} months</p>
      </div>

      {/* Monthly Projections */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Monthly Cash Flow Projections</h3>
        <div className="space-y-4">
          {cashFlow?.projections?.map((p, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-24">
                <p className="font-medium text-slate-900">{p.month_name}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Expected Inflow</span>
                  <span className="font-semibold text-green-600">{formatCurrency(p.expected_inflow)}</span>
                </div>
                <ProgressBar 
                  value={p.expected_inflow} 
                  max={cashFlow?.summary?.total_expected_inflow / 2} 
                  color="green" 
                  showLabel={false}
                />
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">{p.milestone_count} payments due</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Status */}
      {paymentStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overdue Payments */}
          {paymentStatus.summary?.overdue_count > 0 && (
            <div className="bg-white rounded-xl border border-red-200 p-5">
              <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> 
                Overdue Payments ({paymentStatus.summary.overdue_count})
              </h3>
              <p className="text-2xl font-bold text-red-600 mb-4">{formatCurrency(paymentStatus.summary.total_overdue)}</p>
              <div className="space-y-2">
                {paymentStatus.overdue_orders?.slice(0, 5).map((o, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <div>
                      <p className="font-medium text-slate-900">{o.order_no}</p>
                      <p className="text-xs text-slate-500">{o.customer}</p>
                    </div>
                    <p className="font-semibold text-red-600">{formatCurrency(o.pending)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Collections */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" /> 
              Pending Collections ({paymentStatus.summary?.partially_paid_count + paymentStatus.summary?.unpaid_count})
            </h3>
            <p className="text-2xl font-bold text-slate-900 mb-4">{formatCurrency(paymentStatus.summary?.total_receivable)}</p>
            <div className="space-y-2">
              {paymentStatus.partially_paid?.slice(0, 3).map((o, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <div>
                    <p className="font-medium text-slate-900">{o.order_no}</p>
                    <p className="text-xs text-slate-500">{o.customer}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(o.pending)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Savings Tab
  const SavingsTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      {savings?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-5 border border-green-200">
            <p className="text-sm text-green-700 mb-1">Total Savings</p>
            <p className="text-2xl font-bold text-green-700">{formatCompact(savings.summary.grand_total_savings)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
            <p className="text-sm text-blue-700 mb-1">Purchase Savings</p>
            <p className="text-2xl font-bold text-blue-700">{formatCompact(savings.summary.total_purchase_savings)}</p>
            <p className="text-xs text-blue-600 mt-1">{savings.summary.purchase_savings_percent}% under budget</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
            <p className="text-sm text-purple-700 mb-1">Execution Savings</p>
            <p className="text-2xl font-bold text-purple-700">{formatCompact(savings.summary.total_execution_savings)}</p>
            <p className="text-xs text-purple-600 mt-1">{savings.summary.execution_savings_percent}% under budget</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-sm text-slate-700 mb-1">Budget Compliance</p>
            <p className="text-2xl font-bold text-slate-900">
              {savings.summary.total_purchase_budget + savings.summary.total_execution_budget > 0 
                ? Math.round(((savings.summary.total_purchase_actual + savings.summary.total_execution_actual) / 
                   (savings.summary.total_purchase_budget + savings.summary.total_execution_budget)) * 100)
                : 0}%
            </p>
            <p className="text-xs text-slate-600 mt-1">of allocated budget used</p>
          </div>
        </div>
      )}

      {/* Order-wise Savings Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Order-wise Budget vs Actual</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Order Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Purchase Budget</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Purchase Actual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Execution Budget</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Execution Actual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savings?.orders?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No configured orders found
                  </td>
                </tr>
              ) : (
                savings?.orders?.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{order.order_no}</p>
                      <p className="text-xs text-slate-500">{order.customer}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(order.order_value)}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600">{formatCurrency(order.purchase_budget)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={order.purchase_actual <= order.purchase_budget ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(order.purchase_actual)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-purple-600">{formatCurrency(order.execution_budget)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={order.execution_actual <= order.execution_budget ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(order.execution_actual)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${order.total_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(order.total_savings)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Expenses Tab
  const ExpensesTab = () => (
    <div className="space-y-6">
      {/* Category Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Expense Breakdown by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category List */}
          <div className="space-y-3">
            {expenseBreakdown?.categories?.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                    <span className="text-sm text-slate-900">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-slate-500 w-12 text-right">{cat.percentage}%</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-5">
            <h4 className="font-medium text-slate-900 mb-4">Expense Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Approved</span>
                <span className="font-semibold">{formatCurrency(expenseBreakdown?.grand_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Categories</span>
                <span className="font-semibold">{expenseBreakdown?.categories?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Top Category</span>
                <span className="font-semibold">{expenseBreakdown?.categories?.[0]?.label || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      {deptPerformance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Purchase Dept */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-600" /> Purchase Dept
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Requests</span>
                <span className="font-semibold">{deptPerformance.purchase?.requests?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">PO Value</span>
                <span className="font-semibold">{formatCompact(deptPerformance.purchase?.orders?.total_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Efficiency</span>
                <span className="font-semibold text-green-600">{deptPerformance.purchase?.efficiency || 0}%</span>
              </div>
            </div>
          </div>

          {/* Sales Dept */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" /> Sales Dept
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Orders</span>
                <span className="font-semibold">{deptPerformance.sales?.orders_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Revenue</span>
                <span className="font-semibold">{formatCompact(deptPerformance.sales?.total_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Avg Order</span>
                <span className="font-semibold">{formatCurrency(deptPerformance.sales?.avg_order_value)}</span>
              </div>
            </div>
          </div>

          {/* Accounts Dept */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-600" /> Accounts Dept
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Approved Expenses</span>
                <span className="font-semibold">{deptPerformance.accounts?.expenses_by_status?.approved?.count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Pending</span>
                <span className="font-semibold text-amber-600">
                  {(deptPerformance.accounts?.expenses_by_status?.pending?.count || 0) + 
                   (deptPerformance.accounts?.expenses_by_status?.submitted?.count || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Approval Rate</span>
                <span className="font-semibold text-green-600">{deptPerformance.accounts?.approval_rate || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="finance-dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
          <p className="text-slate-500 mt-1">Order-wise P&L, cash flow projections, and financial KPIs</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'profitability', label: 'Order P&L' },
          { id: 'cashflow', label: 'Cash Flow' },
          { id: 'savings', label: 'Savings Report' },
          { id: 'expenses', label: 'Expenses & Depts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'profitability' && <ProfitabilityTab />}
          {activeTab === 'cashflow' && <CashFlowTab />}
          {activeTab === 'savings' && <SavingsTab />}
          {activeTab === 'expenses' && <ExpensesTab />}
        </>
      )}
    </div>
  );
};

export default FinanceDashboard;
