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
        <h2 className="text-2xl font-bold text-white tracking-tight">System Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Total Revenue</p>
            <p className="text-3xl font-semibold text-white">
              {isLoading ? '...' : `$${metrics?.total_revenue?.toLocaleString() || '0'}`}
            </p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Pipeline Value</p>
            <p className="text-3xl font-semibold text-white">
              {isLoading ? '...' : `$${metrics?.pipeline_value?.toLocaleString() || '0'}`}
            </p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Total Customers</p>
            <p className="text-3xl font-semibold text-white">
              {isLoading ? '...' : metrics?.total_customers || 0}
            </p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Tags className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Active Subscriptions</p>
            <p className="text-3xl font-semibold text-white">
              {isLoading ? '...' : metrics?.active_subscriptions || 0}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card h-80 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Revenue Growth Chart (Coming Soon)</p>
          </div>
        </div>
        <div className="card h-80 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Customer Acquisition (Coming Soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
