'use client';

import { useEffect, useState, useRef } from 'react';
import { clientApi } from '@/lib/api';
import { Search, Plus, FileText, File, Globe, X, Loader2, Trash2, AlignLeft } from 'lucide-react';

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
      if (err.response?.status === 404 || err.response?.data?.error === 'Document not found locally') {
        alert('This document was created outside of the dashboard or before editing was supported. To enable editing, please delete this document and recreate it here!');
      } else {
        alert('Cannot edit this document: ' + (err.response?.data?.error || err.message));
      }
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
      <div className="border-b border-gray-800/60 p-6 sticky top-0 bg-[#1e1e1e]/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto">
          <div className="relative mb-5">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="w-full bg-transparent border-none text-2xl font-light text-white placeholder-gray-600 focus:outline-none focus:ring-0 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-700/60 bg-[#2a2a2a]/50 hover:bg-[#333] hover:border-gray-600 text-sm font-medium transition-all text-gray-300">
              <Plus className="w-4 h-4 text-gray-400" /> Type
            </button>
            <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-700/60 bg-[#2a2a2a]/50 hover:bg-[#333] hover:border-gray-600 text-sm font-medium transition-all text-gray-300">
              <Plus className="w-4 h-4 text-gray-400" /> Creator
            </button>
          </div>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="h-[76px] bg-[#2a2a2a]/40 animate-pulse rounded-xl" />)}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-lg">No documents found.</p>
              <p className="text-sm text-gray-600 mt-1">Try adding some below.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredDocs.map((doc) => (
                <div 
                  key={doc.id} 
                  onClick={() => doc.type !== 'url' ? openEditModal(doc) : null}
                  className={`flex items-center gap-5 p-4 rounded-xl border border-transparent hover:border-gray-700/50 hover:bg-[#2a2a2a]/40 transition-all group ${doc.type !== 'url' ? 'cursor-pointer' : ''}`}
                >
                  <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-[#2a2a2a] border border-gray-700/50 shadow-sm">
                    {doc.type === 'url' ? <Globe className="w-5 h-5 text-gray-400" /> :
                     doc.type === 'text' ? <span className="font-serif text-[17px] text-gray-300 font-bold">T</span> :
                     <FileText className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-medium text-gray-200 mb-0.5 truncate tracking-wide">{doc.name}</h3>
                    <p className="text-[13px] text-gray-500 truncate font-mono">{doc.id}</p>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, doc.id, doc.name)} 
                    className="opacity-0 group-hover:opacity-100 p-2.5 bg-gray-800/0 hover:bg-gray-700/50 rounded-lg transition-all text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 p-1.5 bg-[#2a2a2a]/95 backdrop-blur-md border border-gray-700 shadow-2xl shadow-black/50 rounded-2xl flex items-center gap-1 z-20">
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.docx,.csv" onChange={handleUpload} />
        
        <button onClick={() => setIsUrlModalOpen(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-[#383838] text-sm font-medium transition-colors text-gray-200">
          <Globe className="w-4 h-4 text-gray-400" /> Add URL
        </button>
        <div className="w-[1px] h-6 bg-gray-700/50 mx-1"></div>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-[#383838] text-sm font-medium transition-colors text-gray-200" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <File className="w-4 h-4 text-gray-400" />} Add Files
        </button>
        <div className="w-[1px] h-6 bg-gray-700/50 mx-1"></div>
        <button onClick={() => { setFormName(''); setFormText(''); setIsTextModalOpen(true); }} className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-[#383838] text-sm font-medium transition-colors text-gray-200">
          <AlignLeft className="w-4 h-4 text-gray-400" /> Create Text
        </button>
      </div>

      {/* Create Text Modal */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-[#232323]">
              <h2 className="text-[17px] font-medium text-gray-100">Create Text</h2>
              <button onClick={() => setIsTextModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-md"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-5 bg-[#1e1e1e]">
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Document Title</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-[15px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all placeholder-gray-600" placeholder="e.g. Sales Script" />
              </div>
              <div className="h-80">
                <label className="block text-[13px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Content</label>
                <textarea value={formText} onChange={e => setFormText(e.target.value)} className="w-full h-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-[15px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none transition-all placeholder-gray-600" placeholder="Type or paste your raw text content here..."></textarea>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 bg-[#232323] flex justify-end gap-3">
              <button onClick={() => setIsTextModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all">Cancel</button>
              <button onClick={handleCreateText} disabled={isSubmitting} className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 transition-all">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Create Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Text Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-[#232323]">
              <h2 className="text-[17px] font-medium text-gray-100">Edit Text</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-md"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-5 bg-[#1e1e1e]">
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Document Title</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-[15px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all placeholder-gray-600" />
              </div>
              <div className="h-80">
                <label className="block text-[13px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Content</label>
                <textarea value={formText} onChange={e => setFormText(e.target.value)} className="w-full h-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-[15px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-none transition-all placeholder-gray-600"></textarea>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 bg-[#232323] flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all">Cancel</button>
              <button onClick={handleUpdateText} disabled={isSubmitting} className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 transition-all">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add URL Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-[#232323]">
              <h2 className="text-[17px] font-medium text-gray-100">Add URL</h2>
              <button onClick={() => setIsUrlModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-md"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-5 bg-[#1e1e1e]">
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Title</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-[15px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all placeholder-gray-600" placeholder="e.g. Help Center" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">URL</label>
                <input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-[15px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all placeholder-gray-600" placeholder="https://example.com/docs" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 bg-[#232323] flex justify-end gap-3">
              <button onClick={() => setIsUrlModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all">Cancel</button>
              <button onClick={handleAddUrl} disabled={isSubmitting} className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 transition-all">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Adding...' : 'Add URL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
