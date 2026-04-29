'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { PhoneIncoming, Clock, TrendingUp, Mic } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([clientApi.getOverview(), clientApi.getCallsChart('7d')])
      .then(([s, c]) => {
        setStats(s.data);
        setChart(c.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Calls This Month', value: stats.calls_this_month, icon: <PhoneIncoming className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Minutes', value: formatDuration(stats.total_seconds_this_month || 0), icon: <Clock className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10', isString: true },
    { label: 'Active Number', value: stats.phone_number || 'Not assigned', icon: <Mic className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-500/10', isString: true },
    { label: 'Current Plan', value: stats.plan_name || 'No Plan', icon: <TrendingUp className="w-5 h-5" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10', isString: true },
  ] : [];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="gradient-text">{user?.business_name || 'there'}</span>
        </h1>
        <p className="text-[#8888aa] text-sm mt-1">Here's your AI agent activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <div key={i} className="stat-card h-28 shimmer" />)
          : statCards.map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-4`}>
                {s.icon}
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-[#8888aa] text-sm mt-1">{s.label}</div>
            </div>
          ))}
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-white mb-6">Call Volume — Last 7 Days</h2>
        {loading ? <div className="h-52 shimmer rounded-xl" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c47ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c47ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fill: '#555570', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555570', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: '12px', color: '#e8e8f0' }} />
              <Area type="monotone" dataKey="calls" stroke="#6c47ff" strokeWidth={2} fill="url(#clientGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
