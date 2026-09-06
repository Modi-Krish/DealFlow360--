import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Truck, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../shared/store/authStore';
import { getApprovals } from '../../admin/services/adminRbacApi';

export const OpsDashboard = () => {
  const { user, hasPermission } = useAuthStore();
  const isFinance = (user?.role || '').toLowerCase() === 'finance';
  const canViewApprovals = hasPermission('approval.view');

  const { data: approvalsRes } = useQuery({
    queryKey: ['approvals'],
    queryFn: getApprovals,
    enabled: canViewApprovals,
  });

  const pendingApprovalsCount = approvalsRes?.data?.length ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">
            {isFinance ? 'Finance & Operations Workspace' : 'Operations Dashboard'}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {isFinance
              ? 'Review pending deal approvals, billing reconciliations, and logistics health.'
              : 'Warehouse dispatch, fulfillment pipeline, and inventory status.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {canViewApprovals && (
          <Link
            to="/ops/approvals"
            className="card relative overflow-hidden group hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-muted mb-1">Approvals Queue</p>
                <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-semibold text-text-main">{pendingApprovalsCount}</p>
              <span className="text-xs text-primary font-medium mt-1 inline-block">
                {pendingApprovalsCount === 1 ? '1 deal awaiting sign-off' : `${pendingApprovalsCount} deals awaiting sign-off`}
              </span>
            </div>
          </Link>
        )}

        <Link
          to="/ops/warehouse"
          className="card relative overflow-hidden group hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted mb-1">Total Warehouses</p>
              <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-semibold text-text-main">4</p>
            <span className="text-xs text-text-muted mt-1 inline-block">Active distribution nodes</span>
          </div>
        </Link>
        
        <Link
          to="/ops/fulfillment"
          className="card relative overflow-hidden group hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted mb-1">Pending Fulfillment Orders</p>
              <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-semibold text-text-main">12</p>
            <span className="text-xs text-text-muted mt-1 inline-block">Orders in allocation / split</span>
          </div>
        </Link>
        
        <Link
          to="/ops/inventory"
          className="card relative overflow-hidden group border-danger/50 hover:border-danger transition-all hover:shadow-md cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="h-16 w-16 text-danger" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted mb-1">Inventory Shortages</p>
              <ArrowRight className="w-4 h-4 text-danger opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-semibold text-danger">3</p>
            <span className="text-xs text-danger font-medium mt-1 inline-block">Low stock SKUs requiring reorder</span>
          </div>
        </Link>
      </div>
    </div>
  );
};
