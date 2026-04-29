'use client';

import { useEffect, useState, useRef } from 'react';
import { clientApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { BookOpen, Upload, Trash2, File, Loader2 } from 'lucide-react';

export default function ClientKnowledgePage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await clientApi.getKnowledge();
      setDocs(res.data.documents || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await clientApi.uploadKnowledge(form);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await clientApi.deleteKnowledge(id);
    load();
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-[#8888aa] text-sm mt-1">Documents your AI agent uses to answer questions</p>
        </div>
        <div>
          <input ref={fileRef} type="file" id="file-upload" className="hidden"
            accept=".pdf,.txt,.docx,.csv" onChange={handleUpload} />
          <button id="upload-doc-btn" onClick={() => fileRef.current?.click()} className="btn-primary" disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#8888aa]">Supported: PDF, TXT, DOCX, CSV — max 10MB. Files are synced to your ElevenLabs agent automatically.</p>
      </div>

      <div className="space-y-3">
        {loading
          ? Array(3).fill(0).map((_, i) => <div key={i} className="h-16 shimmer rounded-xl" />)
          : docs.length === 0
          ? (
            <div className="card p-12 text-center">
              <File className="w-10 h-10 text-[#2e2e4e] mx-auto mb-3" />
              <p className="text-[#555570] text-sm">No documents yet. Upload your FAQs, pricing sheets, or product catalogue.</p>
            </div>
          )
          : docs.map((doc) => (
            <div key={doc.id} className="card-elevated p-4 flex items-center gap-4">
              <div className="text-2xl">{doc.mime_type?.includes('pdf') ? '📄' : '📃'}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm truncate">{doc.name}</div>
                <div className="text-xs text-[#555570] mt-0.5">{formatDate(doc.created_at)}</div>
              </div>
              <span className="badge badge-active text-xs">Synced</span>
              <button onClick={() => handleDelete(doc.id, doc.name)} className="btn-danger btn-sm p-2">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
