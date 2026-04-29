'use client';

import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/api';
import { Headphones, Save, Loader2, RefreshCw } from 'lucide-react';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
];

export default function ClientAgentPage() {
  const [agent, setAgent] = useState<any>(null);
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    clientApi.getAgent().then((res) => {
      setAgent(res.data);
      setForm({
        name: res.data.name || '',
        voice_id: res.data.voice_id || '',
        system_prompt: res.data.system_prompt || '',
        first_message: res.data.first_message || '',
        language: res.data.language || 'en',
      });
      setVoices(res.data.available_voices || []);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clientApi.updateAgent(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8"><div className="h-96 shimmer rounded-2xl" /></div>;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agent Configuration</h1>
          <p className="text-[#8888aa] text-sm mt-1">Customise your AI phone agent's voice and behaviour</p>
        </div>
        {agent?.phone_number && (
          <div className="card px-4 py-2 text-sm">
            <span className="text-[#8888aa]">Your number: </span>
            <span className="text-white font-mono font-medium">{agent.phone_number}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-white">Identity</h2>

          <div>
            <label className="label">Agent Name</label>
            <input className="input" placeholder="Support Agent" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Language</label>
              <select className="input" value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Voice</label>
              <select className="input" value={form.voice_id}
                onChange={(e) => setForm({ ...form, voice_id: e.target.value })}>
                <option value="">Select a voice…</option>
                {voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-white">Conversation</h2>

          <div>
            <label className="label">First Message (Greeting)</label>
            <input className="input" placeholder="Hello! How can I help you today?" value={form.first_message}
              onChange={(e) => setForm({ ...form, first_message: e.target.value })} />
            <p className="text-xs text-[#555570] mt-1.5">The first thing your agent says when a call connects.</p>
          </div>

          <div>
            <label className="label">System Prompt (Agent Instructions)</label>
            <textarea
              className="input min-h-[160px] resize-y font-mono text-xs leading-relaxed"
              placeholder={`You are a helpful customer support agent for [Business Name].\nAlways be polite and professional.\nIf asked about pricing, redirect to our website.`}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            />
            <p className="text-xs text-[#555570] mt-1.5">Instructions that define your agent's personality, knowledge, and behaviour.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
