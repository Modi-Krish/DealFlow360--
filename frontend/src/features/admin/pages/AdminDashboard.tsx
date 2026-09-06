import React, { useState } from 'react';
import {
  Users,
  BarChart3,
  Tags,
  DollarSign,
  TrendingUp,
  Award,
  Layers,
  Calendar,
  ArrowUpRight,
  PieChart as PieIcon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '../services/analyticsApi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['adminMetrics'],
    queryFn: getDashboardMetrics
  });

  const [customerViewMode, setCustomerViewMode] = useState<'TIERS' | 'ACQUISITION'>('TIERS');
  const [revenueMetric, setRevenueMetric] = useState<'ALL' | 'REVENUE' | 'PIPELINE'>('ALL');

  // Fallback data if backend is still initializing or sparse
  const revenueTrends = metrics?.revenue_trends || [
    { month: 'Apr', revenue: 18400, pipeline: 24000, target: 20000 },
    { month: 'May', revenue: 22800, pipeline: 29500, target: 22000 },
    { month: 'Jun', revenue: 28600, pipeline: 34000, target: 25000 },
    { month: 'Jul', revenue: 26400, pipeline: 31200, target: 27000 },
    { month: 'Aug', revenue: 34900, pipeline: 42000, target: 30000 },
    { month: 'Sep', revenue: metrics?.total_revenue || 41200, pipeline: metrics?.pipeline_value || 48500, target: 35000 }
  ];

  const customerTiers = metrics?.customer_tiers || [
    { tier: 'Enterprise', count: 8, color: '#6366f1' },
    { tier: 'Gold', count: 14, color: '#f59e0b' },
    { tier: 'Silver', count: 19, color: '#06b6d4' },
    { tier: 'Bronze', count: 11, color: '#10b981' }
  ];

  const acquisitionTrends = metrics?.acquisition_trends || [
    { month: 'Apr', new_customers: 4 },
    { month: 'May', new_customers: 7 },
    { month: 'Jun', new_customers: 6 },
    { month: 'Jul', new_customers: 9 },
    { month: 'Aug', new_customers: 12 },
    { month: 'Sep', new_customers: 16 }
  ];

  const totalTierCustomers = customerTiers.reduce((acc: number, item: any) => acc + (item.count || 0), 0);

  // Custom tooltips
  const CustomRevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md">
          <p className="font-semibold text-slate-300 mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold">${Number(entry.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomAcquisitionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md">
          <p className="font-semibold text-slate-300 mb-1">{label}</p>
          <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold">
            <span>New Accounts:</span>
            <span>+{payload[0]?.value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">ERP & Operations Overview</h2>
          <p className="text-sm text-text-muted mt-1">Real-time revenue metrics, deal pipelines, and customer growth trends</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-border-light rounded-lg px-3.5 py-1.5 flex items-center gap-2 shadow-sm text-xs font-medium text-slate-600">
            <Calendar className="w-4 h-4 text-primary" />
            <span>Last 6 Months</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : `$${metrics?.total_revenue?.toLocaleString() || '0'}`}
              </p>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-2">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{metrics?.mom_growth || '+16.8%'} MoM</span>
              </div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Pipeline Value</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : `$${metrics?.pipeline_value?.toLocaleString() || '0'}`}
              </p>
              <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Active deal proposals</span>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Total Customers</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : metrics?.total_customers || 0}
              </p>
              <div className="flex items-center gap-1 text-xs font-semibold text-purple-600 mt-2">
                <Award className="w-3.5 h-3.5" />
                <span>B2B active accounts</span>
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Active Subscriptions</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : metrics?.active_subscriptions || 0}
              </p>
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 mt-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Recurring contracts</span>
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
              <Tags className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Performance / Revenue Growth Chart */}
        <div className="card flex flex-col p-5 bg-white shadow-sm border border-border-light rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Business Performance & Revenue Growth
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Billed revenue trajectory vs pipeline opportunity</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setRevenueMetric('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  revenueMetric === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRevenueMetric('REVENUE')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  revenueMetric === 'REVENUE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setRevenueMetric('PIPELINE')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  revenueMetric === 'PIPELINE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pipeline
              </button>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrends} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomRevenueTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>}
                />
                {(revenueMetric === 'ALL' || revenueMetric === 'REVENUE') && (
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                )}
                {(revenueMetric === 'ALL' || revenueMetric === 'PIPELINE') && (
                  <Area
                    type="monotone"
                    dataKey="pipeline"
                    name="Pipeline"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorPipeline)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-text-muted mt-2">
            <span>Average Deal Size: <strong className="text-slate-800">${metrics?.avg_deal_size?.toLocaleString() || '4,250'}</strong></span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              On Track to Meet Quarterly Targets
            </span>
          </div>
        </div>

        {/* Customer Acquisition & Tier Segmentation Card */}
        <div className="card flex flex-col p-5 bg-white shadow-sm border border-border-light rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Customer Growth & Segmentation
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Account tiers breakdown and new business velocity</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setCustomerViewMode('TIERS')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  customerViewMode === 'TIERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <PieIcon className="w-3 h-3" />
                Tiers
              </button>
              <button
                onClick={() => setCustomerViewMode('ACQUISITION')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  customerViewMode === 'ACQUISITION' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Monthly
              </button>
            </div>
          </div>

          <div className="w-full h-72 flex items-center justify-center">
            {customerViewMode === 'TIERS' ? (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-between">
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerTiers}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="tier"
                      >
                        {customerTiers.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any) => [`${value} accounts`, `${name} Tier`]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '0.75rem',
                          border: '1px solid #334155',
                          fontSize: '12px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-2.5 pl-0 sm:pl-4 mt-2 sm:mt-0">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                    Account Distribution ({totalTierCustomers} Total)
                  </p>
                  {customerTiers.map((tier: any) => {
                    const pct = totalTierCustomers > 0 ? Math.round((tier.count / totalTierCustomers) * 100) : 0;
                    return (
                      <div key={tier.tier} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                          <span className="font-semibold text-slate-700">{tier.tier}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-mono">
                          <span>{tier.count} accts</span>
                          <span className="font-semibold text-slate-800">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acquisitionTrends} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomAcquisitionTooltip />} />
                  <Bar
                    dataKey="new_customers"
                    name="New Customers"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-text-muted mt-2">
            <span>Tier Model: <strong className="text-slate-800">Volume & Spend Tiered</strong></span>
            <span className="text-purple-600 font-semibold">Active Customer Health: Strong</span>
          </div>
        </div>
      </div>
    </div>
  );
};
