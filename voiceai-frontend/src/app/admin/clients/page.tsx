'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate, statusColor, getInitials, formatRelative } from '@/lib/utils';
import {
  Plus, Search, MoreVertical, UserCheck, UserX,
  Loader2, X, Eye, Trash2
} from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    business_name: '', email: '', phone: '', plan_id: '', address: '',
    elevenlabs_agent_id: '', elevenlabs_api_key: ''
  });
  const [plans, setPlans] = useState<any[]>([]);

  const load = async (q = search) => {
    setLoading(true);
    try {
      const [clientRes, settingsRes] = await Promise.all([
        adminApi.getClients({ search: q }),
        adminApi.getSettings(),
      ]);
      setClients(clientRes.data.clients || []);
      setTotal(clientRes.data.total || 0);
      setPlans(settingsRes.data.plans || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        business_name: form.business_name,
        contact_email: form.email,
        contact_phone: form.phone,
        address: form.address,
        plan: form.plan_id, // this is now storing the plan name
        login_email: form.email,
        login_password: 'Password123!', // Temporary default password
        elevenlabs_agent_id: form.elevenlabs_agent_id,
        elevenlabs_api_key: form.elevenlabs_api_key || undefined,
      };
      await adminApi.createClient(payload);
      setShowCreate(false);
      setForm({ business_name: '', email: '', phone: '', plan_id: '', address: '', elevenlabs_agent_id: '', elevenlabs_api_key: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = async (id: string, status: string) => {
    if (!confirm(`Are you sure you want to ${status === 'active' ? 'suspend' : 'activate'} this client?`)) return;
    if (status === 'active') await adminApi.suspendClient(id);
    else await adminApi.activateClient(id);
    load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This is irreversible.`)) return;
    await adminApi.deleteClient(id);
    load();
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-[#8888aa] text-sm mt-1">{total} businesses onboarded</p>
        </div>
        <button id="create-client-btn" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555570]" />
          <input
            id="client-search"
            className="input pl-10"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Contact</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="h-10 shimmer rounded" /></td></tr>
              ))
              : clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">
                        {getInitials(c.business_name)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{c.business_name}</div>
                        <div className="text-xs text-[#555570]">{c.phone_number || 'No number assigned'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-[#e8e8f0]">{c.contact_email}</div>
                    <div className="text-xs text-[#555570]">{c.contact_phone}</div>
                  </td>
                  <td><span className="badge badge-info">{c.plan || 'No Plan'}</span></td>
                  <td><span className={statusColor(c.status)}>{c.status}</span></td>
                  <td className="text-[#8888aa]">{formatDate(c.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSuspend(c.id, c.status)}
                        className={c.status === 'active' ? 'btn-danger btn-sm' : 'btn-success btn-sm'}
                        title={c.status === 'active' ? 'Suspend' : 'Activate'}
                      >
                        {c.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(c.id, c.business_name)} className="btn-danger btn-sm" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Onboard New Client</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#555570] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Business Name</label>
                  <input className="input" required value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Plan</label>
                  <select className="input" required value={form.plan_id}
                    onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
                    <option value="">Select a plan…</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.name}>{p.name} — ₹{p.monthly_fee}/mo</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">ElevenLabs Agent ID</label>
                  <input className="input" required placeholder="e.g. 7601kj7akhhsf3..." value={form.elevenlabs_agent_id}
                    onChange={(e) => setForm({ ...form, elevenlabs_agent_id: e.target.value })} />
                </div>
                <div>
                  <label className="label">ElevenLabs API Key (Optional)</label>
                  <input type="password" className="input" placeholder="Leaves empty to use default" value={form.elevenlabs_api_key}
                    onChange={(e) => setForm({ ...form, elevenlabs_api_key: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-[#555570]">A temporary password will be emailed to the client.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
