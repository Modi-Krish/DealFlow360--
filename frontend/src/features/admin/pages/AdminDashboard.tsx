import { Users, Package, FileText, Activity, BarChart3, Tags, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '../services/analyticsApi';

export const AdminDashboard = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['adminMetrics'],
    queryFn: getDashboardMetrics
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">ERP Overview</h2>
          <p className="text-sm text-text-muted mt-1">Real-time summary of your business operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white border border-border-light rounded-lg px-4 py-2 flex items-center shadow-sm">
            <span className="text-sm font-medium text-text-main">Today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : `$${metrics?.total_revenue?.toLocaleString() || '0'}`}
              </p>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-full">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Pipeline Value</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : `$${metrics?.pipeline_value?.toLocaleString() || '0'}`}
              </p>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-full">
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Total Customers</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : metrics?.total_customers || 0}
              </p>
            </div>
            <div className="bg-purple-50 p-2.5 rounded-full">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">Active Subscriptions</p>
              <p className="text-3xl font-bold text-text-main">
                {isLoading ? '...' : metrics?.active_subscriptions || 0}
              </p>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-full">
              <Tags className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card h-80 flex flex-col">
          <h3 className="text-lg font-bold text-text-main mb-4">Business Performance</h3>
          <div className="flex-1 flex items-center justify-center border border-dashed border-border-light rounded-lg bg-slate-50">
            <div className="text-center text-text-muted">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Revenue Growth Chart (Coming Soon)</p>
            </div>
          </div>
        </div>
        <div className="card h-80 flex flex-col">
          <h3 className="text-lg font-bold text-text-main mb-4">Customer Acquisition</h3>
          <div className="flex-1 flex items-center justify-center border border-dashed border-border-light rounded-lg bg-slate-50">
            <div className="text-center text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Customer Acquisition (Coming Soon)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
