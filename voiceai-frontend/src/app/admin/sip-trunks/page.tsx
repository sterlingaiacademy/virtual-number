'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate, statusColor } from '@/lib/utils';
import { GitMerge, Plus, Trash2, Loader2, X } from 'lucide-react';

export default function AdminSipTrunksPage() {
  const [trunks, setTrunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', provider: '', sip_host: '', username: '', password: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSipTrunks();
      setTrunks(res.data.trunks || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await adminApi.createSipTrunk(form);
      setShowAdd(false);
      setForm({ name: '', provider: '', sip_host: '', username: '', password: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add SIP trunk');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete trunk "${name}"?`)) return;
    await adminApi.deleteSipTrunk(id);
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SIP Trunks</h1>
          <p className="text-[#8888aa] text-sm mt-1">Carrier SIP trunk configuration for LiveKit</p>
        </div>
        <button id="add-trunk-btn" onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Trunk
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider</th>
              <th>SIP Host</th>
              <th>LiveKit ID</th>
              <th>Status</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={7}><div className="h-10 shimmer rounded" /></td></tr>)
              : trunks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <GitMerge className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="text-[#8888aa]">{t.provider}</td>
                  <td className="font-mono text-xs text-[#8888aa]">{t.sip_host}</td>
                  <td className="font-mono text-xs text-[#555570]">{t.livekit_trunk_id || '—'}</td>
                  <td><span className={statusColor(t.status || 'active')}>{t.status || 'active'}</span></td>
                  <td className="text-[#555570] text-xs">{formatDate(t.created_at)}</td>
                  <td>
                    <button onClick={() => handleDelete(t.id, t.name)} className="btn-danger btn-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Trunk Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add SIP Trunk</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-[#555570] hover:text-white" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              {[
                { key: 'name', label: 'Trunk Name', placeholder: 'Tata Tele Trunk 1' },
                { key: 'provider', label: 'Provider', placeholder: 'Tata Tele / Airtel / Twilio' },
                { key: 'sip_host', label: 'SIP Host', placeholder: 'sip.example.com:5060' },
                { key: 'username', label: 'Username', placeholder: 'sip_username' },
                { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    className="input"
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.key !== 'password'}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Trunk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
