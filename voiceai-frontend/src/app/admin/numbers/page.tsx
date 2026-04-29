'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate, statusColor } from '@/lib/utils';
import { Phone, Plus, UserCheck, Loader2, X, Trash2 } from 'lucide-react';

export default function AdminNumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: '', display_name: '' });
  const [assigning, setAssigning] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [numRes, clientRes] = await Promise.all([
        adminApi.getNumbers(),
        adminApi.getClients(),
      ]);
      setNumbers(numRes.data.numbers || []);
      setClients(clientRes.data.clients || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await adminApi.addNumber(form);
      setShowAdd(false);
      setForm({ number: '', display_name: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add number');
    } finally {
      setAdding(false);
    }
  };

  const handleAssign = async (numberId: string, clientId: string) => {
    if (!clientId) return;
    await adminApi.assignNumber(numberId, clientId);
    load();
  };

  const handleUnassign = async (numberId: string) => {
    if (!confirm('Unassign this number?')) return;
    await adminApi.unassignNumber(numberId);
    load();
  };

  const handleDelete = async (numberId: string) => {
    if (!confirm('Delete this number permanently?')) return;
    await adminApi.deleteNumber(numberId);
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Phone Numbers</h1>
          <p className="text-[#8888aa] text-sm mt-1">{numbers.length} numbers in pool</p>
        </div>
        <button id="add-number-btn" onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Number
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Display Name</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Assign</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="h-10 shimmer rounded" /></td></tr>)
              : numbers.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-purple-400" />
                      <span className="font-mono text-white">{n.number}</span>
                    </div>
                  </td>
                  <td className="text-[#8888aa]">{n.display_name || '—'}</td>
                  <td><span className={statusColor(n.status)}>{n.status}</span></td>
                  <td className="text-[#8888aa]">{n.business_name || <span className="text-[#555570] italic">Unassigned</span>}</td>
                  <td>
                    {!n.client_id ? (
                      <select className="input w-44 text-xs py-1.5"
                        value={assigning[n.id] || ''}
                        onChange={(e) => {
                          setAssigning({ ...assigning, [n.id]: e.target.value });
                          if (e.target.value) handleAssign(n.id, e.target.value);
                        }}>
                        <option value="">Assign to…</option>
                        {clients.filter(c => c.status === 'active').map((c) => (
                          <option key={c.id} value={c.id}>{c.business_name}</option>
                        ))}
                      </select>
                    ) : (
                      <button onClick={() => handleUnassign(n.id)} className="btn-secondary btn-sm">
                        Unassign
                      </button>
                    )}
                  </td>
                  <td>
                    <button onClick={() => handleDelete(n.id)} className="btn-danger btn-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Number Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add Phone Number</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-[#555570] hover:text-white" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Number (E.164 format)</label>
                <input className="input" placeholder="+919876543210" required value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })} />
              </div>
              <div>
                <label className="label">Display Name</label>
                <input className="input" placeholder="Mumbai Support Line" value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
