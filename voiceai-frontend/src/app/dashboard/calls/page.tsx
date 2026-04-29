'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/api';
import { formatDate, formatDuration, statusColor } from '@/lib/utils';
import { PhoneIncoming, Clock, ChevronRight, Download, Search } from 'lucide-react';

export default function ClientCallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await clientApi.getCalls({ search });
      setCalls(res.data.calls || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCall = async (call: any) => {
    setSelected(call);
    try {
      const res = await clientApi.getCallTranscript(call.id);
      setTranscript(res.data.transcript || []);
    } catch { setTranscript([]); }
  };

  const downloadRec = async (callId: string) => {
    const res = await clientApi.getCallRecording(callId);
    window.open(res.data.url, '_blank');
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Call History</h1>
        <p className="text-[#8888aa] text-sm mt-1">{total} total calls</p>
      </div>

      <div className="flex gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555570]" />
          <input className="input pl-10 w-64" placeholder="Search by number…" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <button className="btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 table-container">
          <table className="table">
            <thead>
              <tr><th>Caller</th><th>Duration</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {loading
                ? Array(8).fill(0).map((_, i) => <tr key={i}><td colSpan={5}><div className="h-10 shimmer rounded" /></td></tr>)
                : calls.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => openCall(c)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-500/10 rounded-full flex items-center justify-center">
                          <PhoneIncoming className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <span className="font-mono text-sm">{c.caller_number || 'Unknown'}</span>
                      </div>
                    </td>
                    <td><div className="flex items-center gap-1.5 text-[#8888aa]"><Clock className="w-3.5 h-3.5" />{formatDuration(c.duration_seconds)}</div></td>
                    <td><span className={statusColor(c.status)}>{c.status}</span></td>
                    <td className="text-[#555570] text-xs">{formatDate(c.started_at)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {c.recording_url && (
                          <button onClick={(e) => { e.stopPropagation(); downloadRec(c.id); }} className="btn-secondary btn-sm p-1.5">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#555570]" />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="card p-5 h-fit sticky top-8">
          {selected ? (
            <>
              <div className="mb-4">
                <h3 className="font-semibold text-white text-sm">Transcript</h3>
                <p className="text-xs text-[#555570] mt-1">{selected.caller_number} — {formatDuration(selected.duration_seconds)}</p>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcript.length === 0
                  ? <p className="text-[#555570] text-sm text-center py-8">No transcript available</p>
                  : transcript.map((t, i) => (
                    <div key={i} className={`flex gap-2 ${t.role === 'agent' ? 'flex-row-reverse' : ''}`}>
                      <div className="text-xs px-3 py-2 rounded-xl max-w-[85%]"
                        style={{ background: t.role === 'agent' ? 'rgba(108,71,255,0.15)' : '#16161f', color: t.role === 'agent' ? '#c4b5fd' : '#e8e8f0' }}>
                        {t.text || t.message}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <PhoneIncoming className="w-8 h-8 text-[#2e2e4e] mx-auto mb-3" />
              <p className="text-[#555570] text-sm">Click a call to view transcript</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
