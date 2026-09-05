import { useQuery } from '@tanstack/react-query';
import { getQuotations } from '../services/quotationApi';
import { getDealHealth } from '../../admin/services/analyticsApi';
import { FileText, DollarSign } from 'lucide-react';

export const SalesDashboard = () => {
  const { data: quotations } = useQuery({ queryKey: ['quotations'], queryFn: getQuotations });
  const { data: healthReports } = useQuery({ queryKey: ['dealHealth'], queryFn: getDealHealth });

  const activeQuotations = quotations?.filter((q: any) => q.status !== 'CLOSED_WON' && q.status !== 'CLOSED_LOST') || [];
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">Sales Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">My Pipeline</p>
            <p className="text-3xl font-semibold text-white">
              ${activeQuotations.reduce((sum: number, q: any) => sum + parseFloat(q.grand_total), 0).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Active Quotes</p>
            <p className="text-3xl font-semibold text-white">{activeQuotations.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <h3 className="text-lg font-medium text-white mb-4">Deal Health Alerts</h3>
          <div className="space-y-4">
            {!healthReports || healthReports.length === 0 ? (
              <p className="text-slate-400 text-sm">No deals are currently at risk.</p>
            ) : (
              healthReports.map((report: any) => (
                <div key={report.quotation_id} className={`p-4 rounded-lg border flex justify-between items-center ${
                  report.health.is_at_risk 
                    ? 'bg-danger/10 border-danger/20' 
                    : 'bg-slate-800/50 border-slate-700'
                }`}>
                  <div>
                    <h4 className="text-white font-medium">{report.quotation_number}</h4>
                    <div className="flex gap-2 mt-1">
                      {report.health.risk_factors.map((factor: string, i: number) => (
                        <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          {factor}
                        </span>
                      ))}
                      {report.health.risk_factors.length === 0 && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                          Healthy
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${report.health.is_at_risk ? 'text-danger' : 'text-emerald-400'}`}>
                      {report.health.health_score}
                    </p>
                    <p className="text-xs text-slate-400">Score</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-white mb-4">Recent Quotations</h3>
          <div className="space-y-4">
            {activeQuotations.slice(0, 5).map((q: any) => (
              <div key={q.id} className="flex justify-between items-center p-3 hover:bg-slate-800 rounded-lg transition-colors">
                <div>
                  <p className="font-medium text-white">{q.quotation_number}</p>
                  <p className="text-sm text-slate-400">Total: ${q.grand_total}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  q.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {q.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
