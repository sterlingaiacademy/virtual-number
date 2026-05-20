'use client';

import { useEffect, useState, useRef } from 'react';
import { clientApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, Plus, FileText, File, Globe, X, Upload, Loader2, Trash2 } from 'lucide-react';

export default function ClientKnowledgePage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formText, setFormText] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await clientApi.getKnowledge();
      setDocs(res.data.documents || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await clientApi.uploadKnowledge(form);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setIsSubmitting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleCreateText = async () => {
    if (!formName || !formText) return alert('Name and text are required');
    setIsSubmitting(true);
    try {
      await clientApi.createKnowledgeText({ name: formName, text: formText });
      setIsTextModalOpen(false);
      setFormName('');
      setFormText('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create text document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUrl = async () => {
    if (!formName || !formUrl) return alert('Name and URL are required');
    setIsSubmitting(true);
    try {
      await clientApi.createKnowledgeUrl({ name: formName, url: formUrl });
      setIsUrlModalOpen(false);
      setFormName('');
      setFormUrl('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add URL');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = async (doc: any) => {
    // If it's explicitly a url, maybe we don't edit it yet, or we could handle it differently.
    if (doc.type === 'url') {
       alert("URL editing is not supported yet.");
       return;
    }
    setIsSubmitting(true);
    try {
      const res = await clientApi.getKnowledgeContent(doc.id);
      setFormText(res.data.text || '');
      setFormName(doc.name);
      setEditingDocId(doc.id);
      setIsEditModalOpen(true);
    } catch (err: any) {
      alert('Cannot edit this document: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateText = async () => {
    if (!editingDocId || !formText) return;
    setIsSubmitting(true);
    try {
      await clientApi.updateKnowledgeText(editingDocId, { name: formName, text: formText });
      setIsEditModalOpen(false);
      setEditingDocId(null);
      setFormName('');
      setFormText('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update text document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"?`)) return;
    await clientApi.deleteKnowledge(id);
    load();
  };

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
      {/* Top Search Bar */}
      <div className="border-b border-gray-800 p-4 sticky top-0 bg-[#1e1e1e] z-10">
        <div className="relative mb-3">
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="w-full bg-transparent border-none text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-700 hover:bg-gray-800 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Type
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-700 hover:bg-gray-800 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Creator
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading ? (
          <div className="space-y-2">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-800 animate-pulse rounded-lg" />)}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No documents found. Try adding some below.
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.id} 
                onClick={() => doc.type !== 'url' ? openEditModal(doc) : null}
                className={`flex items-start gap-4 p-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group ${doc.type !== 'url' ? 'cursor-pointer' : ''}`}
              >
                <div className="mt-0.5">
                  {doc.type === 'url' ? <Globe className="w-6 h-6 text-gray-400" /> :
                   doc.type === 'text' ? <span className="font-serif text-xl text-gray-400 font-bold px-1 border border-gray-600 rounded">T</span> :
                   <File className="w-6 h-6 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-medium text-white mb-0.5 truncate">{doc.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{doc.id}</p>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, doc.id, doc.name)} 
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-700 rounded-md transition-all text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 border-t border-gray-800 bg-[#1e1e1e] flex items-center justify-center gap-3">
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.docx,.csv" onChange={handleUpload} />
        
        <button onClick={() => setIsUrlModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 font-medium transition-colors">
          <Globe className="w-5 h-5" /> Add URL
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 font-medium transition-colors" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} Add Files
        </button>
        <button onClick={() => { setFormName(''); setFormText(''); setIsTextModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 font-medium transition-colors">
          <span className="font-serif font-bold text-lg leading-none -mt-0.5">T</span> Create Text
        </button>
      </div>

      {/* Create Text Modal */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Create Text</h2>
              <button onClick={() => setIsTextModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2.5 text-white focus:border-blue-500 focus:outline-none" placeholder="Document title" />
              </div>
              <div className="h-64">
                <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
                <textarea value={formText} onChange={e => setFormText(e.target.value)} className="w-full h-full bg-[#2a2a2a] border border-gray-700 rounded p-2.5 text-white focus:border-blue-500 focus:outline-none resize-none" placeholder="Type or paste your content here..."></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button onClick={handleCreateText} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Text Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Edit Text</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2.5 text-white focus:border-blue-500 focus:outline-none" placeholder="Document title" />
              </div>
              <div className="h-64">
                <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
                <textarea value={formText} onChange={e => setFormText(e.target.value)} className="w-full h-full bg-[#2a2a2a] border border-gray-700 rounded p-2.5 text-white focus:border-blue-500 focus:outline-none resize-none" placeholder="Type or paste your content here..."></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button onClick={handleUpdateText} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium disabled:opacity-50">
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add URL Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Add URL</h2>
              <button onClick={() => setIsUrlModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2.5 text-white focus:border-blue-500 focus:outline-none" placeholder="URL title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
                <input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)} className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-2.5 text-white focus:border-blue-500 focus:outline-none" placeholder="https://example.com/docs" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button onClick={handleAddUrl} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium disabled:opacity-50">
                {isSubmitting ? 'Adding...' : 'Add URL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
