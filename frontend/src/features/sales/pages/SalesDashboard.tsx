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
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Sales Overview</h2>
          <p className="text-sm text-text-muted mt-1">Real-time summary of your sales pipeline</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white border border-border-light rounded-lg px-4 py-2 flex items-center shadow-sm">
            <span className="text-sm font-medium text-text-main">This Month</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <p className="text-sm font-medium text-text-muted mb-2">My Pipeline</p>
              <p className="text-3xl font-bold text-text-main">
                ${activeQuotations.reduce((sum: number, q: any) => sum + parseFloat(q.grand_total), 0).toLocaleString()}
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
              <p className="text-sm font-medium text-text-muted mb-2">Active Quotes</p>
              <p className="text-3xl font-bold text-text-main">{activeQuotations.length}</p>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-full">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-text-main">Deal Health Alerts</h3>
            <button className="text-sm font-medium text-primary hover:text-emerald-700">View All</button>
          </div>
          <div className="space-y-3">
            {!healthReports || healthReports.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border-light rounded-lg bg-slate-50">
                <p className="text-text-muted text-sm">No deals are currently at risk.</p>
              </div>
            ) : (
              healthReports.map((report: any) => (
                <div key={report.quotation_id} className={`p-4 rounded-xl border flex justify-between items-center ${
                  report.health.is_at_risk 
                    ? 'bg-red-50/50 border-red-100' 
                    : 'bg-white border-border-light'
                }`}>
                  <div>
                    <h4 className="text-text-main font-semibold">{report.quotation_number}</h4>
                    <div className="flex gap-2 mt-2">
                      {report.health.risk_factors.map((factor: string, i: number) => (
                        <span key={i} className="badge bg-slate-100 text-slate-600">
                          {factor}
                        </span>
                      ))}
                      {report.health.risk_factors.length === 0 && (
                        <span className="badge bg-emerald-50 text-emerald-700">
                          Healthy
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${report.health.is_at_risk ? 'text-red-500' : 'text-emerald-500'}`}>
                      {report.health.health_score}
                    </p>
                    <p className="text-xs text-text-muted font-medium uppercase tracking-wider mt-1">Score</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-text-main">Recent Quotations</h3>
            <button className="text-sm font-medium text-primary hover:text-emerald-700">View All</button>
          </div>
          <div className="space-y-2">
            {activeQuotations.slice(0, 5).map((q: any) => (
              <div key={q.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-emerald-50 text-emerald-700 font-medium">SO</span>
                    <p className="font-semibold text-text-main">{q.quotation_number}</p>
                  </div>
                  <p className="text-sm text-text-muted mt-1">Total: ${q.grand_total}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-main mb-1">${q.grand_total}</p>
                  <span className={`badge ${
                    q.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {q.status}
                  </span>
                </div>
              </div>
            ))}
            {activeQuotations.length === 0 && (
              <div className="p-8 text-center border border-dashed border-border-light rounded-lg bg-slate-50">
                <p className="text-text-muted text-sm">No recent quotations found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
