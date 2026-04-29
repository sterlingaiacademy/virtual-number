'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Settings, Save, Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    adminApi.getSettings().then((res) => {
      setPlans(res.data.plans || []);
      setLoading(false);
    });
  }, []);

  const handleSave = async (planId: string) => {
    setSaving(planId);
    try {
      await adminApi.updatePlan(planId, edits[planId]);
      const res = await adminApi.getSettings();
      setPlans(res.data.plans || []);
      setEdits((prev) => { const n = { ...prev }; delete n[planId]; return n; });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const setEdit = (planId: string, field: string, value: any) => {
    setEdits((prev) => ({ ...prev, [planId]: { ...(prev[planId] || {}), [field]: value } }));
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#8888aa] text-sm mt-1">Platform configuration and plan pricing</p>
      </div>

      <div className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" /> Plan Pricing
        </h2>

        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="h-20 shimmer rounded-xl" />)}</div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const edit = edits[plan.id] || {};
              const isEdited = !!edits[plan.id];
              return (
                <div key={plan.id} className="card-elevated p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{plan.name}</div>
                      <div className="text-xs text-[#555570] mt-0.5">Plan ID: {plan.id.slice(0, 8)}…</div>
                    </div>
                    {isEdited && (
                      <button
                        onClick={() => handleSave(plan.id)}
                        disabled={saving === plan.id}
                        className="btn-primary btn-sm"
                      >
                        {saving === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="label">Monthly Fee (₹)</label>
                      <input
                        type="number"
                        className="input"
                        value={edit.monthly_fee ?? plan.monthly_fee}
                        onChange={(e) => setEdit(plan.id, 'monthly_fee', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Per Minute Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={edit.per_minute_rate ?? plan.per_minute_rate}
                        onChange={(e) => setEdit(plan.id, 'per_minute_rate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Included Minutes</label>
                      <input
                        type="number"
                        className="input"
                        value={edit.included_minutes ?? plan.included_minutes ?? 0}
                        onChange={(e) => setEdit(plan.id, 'included_minutes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
