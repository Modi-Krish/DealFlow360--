import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getCustomerQuotations, acceptQuotation, negotiateQuotation } from '../services/portalApi';
import { FileText, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

export const CustomerPortal = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const queryClient = useQueryClient();
  const [negotiateQuoteId, setNegotiateQuoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['customerQuotations', customerId],
    queryFn: () => getCustomerQuotations(customerId || ''),
    enabled: !!customerId,
  });

  const acceptMutation = useMutation({
    mutationFn: acceptQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerQuotations'] });
    }
  });

  const negotiateMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string, notes: string }) => negotiateQuotation(id, notes),
    onSuccess: () => {
      setNegotiateQuoteId(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['customerQuotations'] });
    }
  });

  if (!customerId) return <div className="text-text-main text-center">Invalid Portal Link</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center pb-4 border-b border-border-light">
        <div>
          <h2 className="text-3xl font-bold text-text-main tracking-tight">Your Quotations</h2>
          <p className="text-text-muted mt-2">Review, accept, or request changes to your pending deals.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-text-muted">Loading your deals...</div>
      ) : quotations?.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-main mb-2">No Active Quotations</h3>
          <p className="text-text-muted">You don't have any pending quotations to review at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {quotations?.map((q: any) => (
            <div key={q.id} className="card p-6 border-l-4 border-l-primary flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-text-main">{q.quotation_number}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    q.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    q.status === 'NEGOTIATING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    q.status === 'ALLOCATED' || q.status === 'CLOSED_WON' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-slate-500/10 text-text-muted border border-slate-500/20'
                  }`}>
                    {q.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Subtotal</p>
                    <p className="text-text-main">${q.subtotal}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Discount</p>
                    <p className="text-emerald-400">-${q.discount_total}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Tax</p>
                    <p className="text-text-main">${q.tax_total}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Grand Total</p>
                    <p className="text-text-main font-bold text-lg">${q.grand_total}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-light pt-4">
                  <p className="text-sm font-medium text-text-main mb-2">Items Included:</p>
                  <ul className="space-y-2">
                    {q.items.map((item: any) => (
                      <li key={item.id} className="text-sm text-text-muted flex justify-between">
                        <span>{item.quantity}x {item.product?.name || 'Product'}</span>
                        <span>${item.total_price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="md:w-64 flex flex-col justify-center space-y-3 border-t md:border-t-0 md:border-l border-border-light pt-4 md:pt-0 md:pl-6">
                {q.status === 'APPROVED' ? (
                  <>
                    <button 
                      onClick={() => acceptMutation.mutate(q.id)}
                      disabled={acceptMutation.isPending}
                      className="btn-primary w-full flex justify-center items-center py-2.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept Quote
                    </button>
                    <button 
                      onClick={() => setNegotiateQuoteId(q.id)}
                      className="btn-secondary w-full flex justify-center items-center py-2.5"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Request Changes
                    </button>
                  </>
                ) : q.status === 'NEGOTIATING' ? (
                  <div className="text-center p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    Pending review by sales team.
                  </div>
                ) : q.status === 'ALLOCATED' || q.status === 'CLOSED_WON' ? (
                  <div className="text-center p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                    Deal Accepted. Thank you!
                  </div>
                ) : (
                  <div className="text-center text-sm text-slate-500">
                    Not available for action.
                  </div>
                )}

                {negotiateQuoteId === q.id && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-sm text-text-main mb-2">What would you like to change?</p>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-border-light rounded-md p-2 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary mb-3"
                      rows={3}
                      placeholder="E.g. Can we do a 10% discount if we commit to an annual contract?"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => negotiateMutation.mutate({ id: q.id, notes })}
                        disabled={!notes || negotiateMutation.isPending}
                        className="btn-primary flex-1 py-1.5 text-xs"
                      >
                        Submit
                      </button>
                      <button 
                        onClick={() => setNegotiateQuoteId(null)}
                        className="btn-secondary flex-1 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
