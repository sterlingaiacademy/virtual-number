'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor } from '@/lib/utils';
import { Receipt, CreditCard, Download, Loader2 } from 'lucide-react';

export default function ClientBillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    clientApi.getBilling().then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  const handlePay = async (invoiceId: string, razorpayOrderId: string) => {
    // In production this opens Razorpay checkout
    alert(`Razorpay checkout for order: ${razorpayOrderId}`);
  };

  if (loading) return <div className="p-8"><div className="h-96 shimmer rounded-2xl" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-[#8888aa] text-sm mt-1">Your invoices and payment history</p>
      </div>

      {/* Current plan */}
      {data?.plan && (
        <div className="card p-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#555570] uppercase tracking-wider mb-1">Current Plan</div>
            <div className="text-xl font-bold text-white">{data.plan.name}</div>
            <div className="text-sm text-[#8888aa] mt-1">
              ₹{data.plan.monthly_fee}/month · ₹{data.plan.per_minute_rate}/minute
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#555570] uppercase tracking-wider mb-1">Pending Balance</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(data.pending_amount || 0)}</div>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(!data?.invoices || data.invoices.length === 0)
              ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#555570]">
                    No invoices yet
                  </td>
                </tr>
              )
              : data.invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#555570]" />
                      <span className="font-mono text-sm text-white">{inv.invoice_number}</span>
                    </div>
                  </td>
                  <td className="text-xs text-[#555570]">
                    {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                  </td>
                  <td className="font-medium text-white">{formatCurrency(inv.amount)}</td>
                  <td><span className={statusColor(inv.status)}>{inv.status}</span></td>
                  <td className="text-[#8888aa] text-sm">{formatDate(inv.due_date)}</td>
                  <td>
                    {inv.status === 'pending' ? (
                      <button
                        onClick={() => handlePay(inv.id, inv.razorpay_order_id)}
                        className="btn-primary btn-sm"
                        disabled={paying === inv.id}
                      >
                        {paying === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                        Pay Now
                      </button>
                    ) : (
                      <button className="btn-secondary btn-sm" title="Download PDF">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
