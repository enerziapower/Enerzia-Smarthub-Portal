import React, { useState, useEffect } from 'react';
import { billingAPI, dashboardAPI } from '../services/api';
import { TrendingUp, IndianRupee, Loader2, Calendar, BarChart3, LineChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';

const Billing = () => {
  const [weeklyBilling, setWeeklyBilling] = useState([]);
  const [cumulativeBilling, setCumulativeBilling] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [billingRes, cumulativeRes, statsRes] = await Promise.all([
        billingAPI.getWeekly(),
        billingAPI.getCumulative(),
        dashboardAPI.getStats(),
      ]);

      setWeeklyBilling(billingRes.data);
      setCumulativeBilling(cumulativeRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const categoryColors = {
    pss: '#0ea5e9',
    as: '#8b5cf6',
    oss: '#ec4899',
    cs: '#10b981',
  };

  // Custom tooltip for better formatting
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-semibold text-slate-900">₹{entry.value.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="total-billing-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-slate-50 p-2 rounded-lg">
              <IndianRupee className="text-slate-600" size={20} />
            </div>
            <h4 className="text-sm font-medium text-slate-500">Total Billing</h4>
          </div>
          <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ₹{(stats?.total_billing || 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-sky-50 p-2 rounded-lg">
              <TrendingUp className="text-sky-600" size={20} />
            </div>
            <h4 className="text-sm font-medium text-slate-500">PSS</h4>
          </div>
          <p className="text-2xl font-bold text-sky-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ₹{(stats?.category_breakdown?.PSS?.amount || 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-violet-50 p-2 rounded-lg">
              <TrendingUp className="text-violet-600" size={20} />
            </div>
            <h4 className="text-sm font-medium text-slate-500">AS</h4>
          </div>
          <p className="text-2xl font-bold text-violet-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ₹{(stats?.category_breakdown?.AS?.amount || 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-pink-50 p-2 rounded-lg">
              <TrendingUp className="text-pink-600" size={20} />
            </div>
            <h4 className="text-sm font-medium text-slate-500">OSS & CS</h4>
          </div>
          <p className="text-2xl font-bold text-pink-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
            ₹{((stats?.category_breakdown?.OSS?.amount || 0) + (stats?.category_breakdown?.CS?.amount || 0)).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Weekly Billing Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="weekly-billing-chart">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 rounded-lg">
            <BarChart3 className="text-slate-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Weekly Billing Trend
            </h3>
            <p className="text-sm text-slate-500">Category-wise billing per calendar week (Mon-Sun)</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={weeklyBilling}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="week" 
              stroke="#64748b" 
              style={{ fontSize: '11px' }} 
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#64748b" 
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="pss" name="PSS" fill={categoryColors.pss} radius={[4, 4, 0, 0]} />
            <Bar dataKey="as" name="AS" fill={categoryColors.as} radius={[4, 4, 0, 0]} />
            <Bar dataKey="oss" name="OSS" fill={categoryColors.oss} radius={[4, 4, 0, 0]} />
            <Bar dataKey="cs" name="CS" fill={categoryColors.cs} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Trend */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="cumulative-billing-chart">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 rounded-lg">
            <TrendingUp className="text-slate-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Cumulative Billing Trend
            </h3>
            <p className="text-sm text-slate-500">Running total of billing over calendar weeks</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={cumulativeBilling}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={categoryColors.pss} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={categoryColors.pss} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="week" 
              stroke="#64748b" 
              style={{ fontSize: '11px' }}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#64748b" 
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="total" name="Total" stroke="#0f172a" strokeWidth={2} fill="url(#colorTotal)" />
            <Line type="monotone" dataKey="pss" name="PSS" stroke={categoryColors.pss} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="as" name="AS" stroke={categoryColors.as} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="oss" name="OSS" stroke={categoryColors.oss} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="cs" name="CS" stroke={categoryColors.cs} strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" data-testid="weekly-breakdown-table">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Week-wise Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">Week</th>
                <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">PSS</th>
                <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">AS</th>
                <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">OSS</th>
                <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">CS</th>
                <th className="py-3 px-4 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {weeklyBilling.map((week, index) => (
                <tr
                  key={index}
                  data-testid={`week-row-${index}`}
                  className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                >
                  <td className="py-4 px-4 text-sm font-medium text-slate-900">{week.week}</td>
                  <td className="py-4 px-4 text-sm text-right font-mono text-slate-600">
                    ₹{week.pss.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-mono text-slate-600">
                    ₹{week.as.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-mono text-slate-600">
                    ₹{week.oss.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-mono text-slate-600">
                    ₹{week.cs.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-4 text-sm text-right font-mono font-semibold text-slate-900">
                    ₹{week.total.toLocaleString('en-IN')}
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

export default Billing;
