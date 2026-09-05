import { useQuery } from '@tanstack/react-query';
import { getPriceLists } from '../services/adminApi';
import { Plus } from 'lucide-react';

export const PriceListsPage = () => {
  const { data: priceLists, isLoading } = useQuery({
    queryKey: ['priceLists'],
    queryFn: getPriceLists,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Price Lists</h2>
          <p className="text-sm text-slate-400 mt-1">Manage tier-specific and custom pricing</p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Create Price List
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-slate-400">Loading price lists...</div>
        ) : priceLists?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">No price lists configured.</div>
        ) : (
          priceLists?.map((list: any) => (
            <div key={list.id} className="card hover:border-slate-500 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">{list.name}</h3>
                <span className="px-2 py-1 text-xs font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {list.currency}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Customer Tier</span>
                  <span className="text-white font-medium">{list.customer_tier || 'All Tiers'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Items Covered</span>
                  <span className="text-white font-medium">{list.items?.length || 0} Products</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-700 flex justify-end">
                <span className="text-sm text-accent font-medium group-hover:underline">View Details</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
