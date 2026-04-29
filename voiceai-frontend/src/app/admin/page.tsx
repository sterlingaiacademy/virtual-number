'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatRelative } from '@/lib/utils';
import {
  Users, Phone, PhoneIncoming, TrendingUp, Activity,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

interface Stats {
  total_clients: number;
  active_clients: number;
  total_numbers: number;
  active_calls: number;
  total_calls_today: number;
  revenue_this_month: number;
  pending_invoices: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getOverview(),
      adminApi.getCallsChart('7d'),
      adminApi.getTopClients(),
    ]).then(([s, c, t]) => {
      setStats(s.data);
      setChart(c.data.data || []);
      setTopClients(t.data.clients || []);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Clients',    value: stats.total_clients,    icon: <Users className="w-5 h-5" />,        color: 'text-purple-400',  bg: 'bg-purple-500/10' },
    { label: 'Phone Numbers',    value: stats.total_numbers,    icon: <Phone className="w-5 h-5" />,        color: 'text-blue-400',    bg: 'bg-blue-500/10' },
    { label: 'Calls Today',      value: stats.total_calls_today,icon: <PhoneIncoming className="w-5 h-5" />,color: 'text-green-400',   bg: 'bg-green-500/10' },
    { label: 'Monthly Revenue',  value: formatCurrency(stats.revenue_this_month), icon: <TrendingUp className="w-5 h-5" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10', isString: true },
  ] : [];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-[#8888aa] text-sm mt-1">Platform-wide metrics and activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <div key={i} className="stat-card h-28 shimmer" />)
          : statCards.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center`}>
                  {s.icon}
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-[#8888aa] text-sm mt-1">{s.label}</div>
            </div>
          ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calls chart */}
        <div className="card p-6 xl:col-span-2">
          <h2 className="text-base font-semibold text-white mb-6">Calls — Last 7 Days</h2>
          {loading ? (
            <div className="h-52 shimmer rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c47ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6c47ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="date" tick={{ fill: '#555570', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555570', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: '12px', color: '#e8e8f0' }}
                  cursor={{ stroke: '#6c47ff', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="calls" stroke="#6c47ff" strokeWidth={2} fill="url(#callGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top clients */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-6">Top Clients</h2>
          <div className="space-y-4">
            {loading
              ? Array(5).fill(0).map((_, i) => <div key={i} className="h-10 shimmer rounded-lg" />)
              : topClients.slice(0, 5).map((c, i) => (
                <div key={c.client_id} className="flex items-center gap-3">
                  <div className="w-6 text-[#555570] text-xs font-medium">{i + 1}.</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{c.business_name}</div>
                    <div className="text-xs text-[#8888aa]">{c.total_calls} calls</div>
                  </div>
                  <div className="text-xs text-purple-400 font-medium">{formatCurrency(c.revenue || 0)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Status alerts */}
      {stats && stats.pending_invoices > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-sm">
            <strong>{stats.pending_invoices}</strong> unpaid invoices pending. Visit Billing to manage them.
          </p>
        </div>
      )}
    </div>
  );
}
