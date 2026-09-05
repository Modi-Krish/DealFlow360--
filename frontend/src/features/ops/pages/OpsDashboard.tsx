import { Package, Truck, AlertTriangle } from 'lucide-react';

export const OpsDashboard = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">Operations Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Total Warehouses</p>
            <p className="text-3xl font-semibold text-white">4</p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Pending Fulfillment Orders</p>
            <p className="text-3xl font-semibold text-white">12</p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group border-danger/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="h-16 w-16 text-danger" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Inventory Shortages</p>
            <p className="text-3xl font-semibold text-danger">3</p>
          </div>
        </div>
      </div>
    </div>
  );
};
