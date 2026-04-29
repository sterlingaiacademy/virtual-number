'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor } from '@/lib/utils';
import { Receipt, Plus, Send, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, clientRes] = await Promise.all([
        adminApi.getBillingList(),
        adminApi.getClients(),
      ]);
      setInvoices(invRes.data.invoices || []);
      setClients(clientRes.data.clients || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generateInvoice = async () => {
    if (!selectedClientId) return;
    setGenerating(selectedClientId);
    try {
      await adminApi.generateInvoice(selectedClientId);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate invoice');
    } finally {
      setGenerating(null);
      setSelectedClientId('');
    }
  };

  const markPaid = async (id: string) => {
    await adminApi.markInvoicePaid(id);
    load();
  };

  const sendReminder = async (id: string) => {
    await adminApi.sendReminder(id);
    alert('Reminder sent!');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-[#8888aa] text-sm mt-1">Invoice management and payment tracking</p>
        </div>
        <div className="flex gap-3 items-center">
          <select className="input w-64" value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>
          <button
            id="generate-invoice-btn"
            onClick={generateInvoice}
            disabled={!selectedClientId || !!generating}
            className="btn-primary"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate Invoice
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(6).fill(0).map((_, i) => <tr key={i}><td colSpan={7}><div className="h-10 shimmer rounded" /></td></tr>)
              : invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#555570]" />
                      <span className="font-mono text-sm text-white">{inv.invoice_number}</span>
                    </div>
                  </td>
                  <td className="text-[#8888aa]">{inv.business_name}</td>
                  <td className="text-xs text-[#555570]">
                    {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                  </td>
                  <td className="font-medium text-white">{formatCurrency(inv.amount)}</td>
                  <td><span className={statusColor(inv.status)}>{inv.status}</span></td>
                  <td className="text-[#8888aa]">{formatDate(inv.due_date)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {inv.status === 'pending' && (
                        <>
                          <button onClick={() => markPaid(inv.id)} className="btn-success btn-sm" title="Mark Paid">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => sendReminder(inv.id)} className="btn-secondary btn-sm" title="Send Reminder">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
