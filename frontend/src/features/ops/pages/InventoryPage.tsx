import { Package } from 'lucide-react';

export const InventoryPage = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Warehouse Inventory</h2>
          <p className="text-sm text-text-muted mt-1">Real-time stock levels across all locations</p>
        </div>
      </div>
      
      <div className="card h-64 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-text-muted">Inventory visualization will appear here.</p>
        </div>
      </div>
    </div>
  );
};
