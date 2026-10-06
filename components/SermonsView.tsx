import React, { useEffect, useState } from 'react';
import { Mic2, Video, FileText, Plus, Search, Play, Eye, X, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface Sermon {
  id: string;
  title: string;
  preacher: string;
  type: string;
  views: number;
  date: string;
}

interface SermonsViewProps {
  branchId: string;
}

const SermonsView: React.FC<SermonsViewProps> = ({ branchId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', preacher: '', type: 'Video' });

  const fetchSermons = async () => {
    if (!branchId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) {
      showToast(error.message, 'error');
      setSermons([]);
    } else {
      setSermons(
        (data || []).map((s) => ({
          id: s.id,
          title: s.title,
          preacher: s.preacher,
          type: s.type || 'Video',
          views: s.views_count ?? 0,
          date: s.created_at
            ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—',
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSermons();
  }, [branchId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('sermons').insert([
      {
        branch_id: branchId,
        title: formData.title.trim(),
        preacher: formData.preacher.trim(),
        type: formData.type,
        views_count: 0,
      },
    ]);
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Sermon published.', 'success');
    setIsModalOpen(false);
    setFormData({ title: '', preacher: '', type: 'Video' });
    fetchSermons();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sermon record?')) return;
    const { error } = await supabase.from('sermons').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Sermon removed.', 'success');
    fetchSermons();
  };

  const filteredSermons = sermons.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.preacher.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sermon Library</h2>
          <p className="text-slate-500">Manage audio, video, and text transcripts of church messages.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSermons} className="p-2 bg-white border border-slate-200 rounded-lg" aria-label="Refresh">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-lg text-sm font-bold hover:bg-gold-600 shadow-md"
          >
            <Plus size={18} /> Upload Message
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Video Catalog', count: sermons.filter((s) => s.type === 'Video').length, icon: Video, tone: 'bg-rose-50 text-rose-600' },
          { label: 'Audio Podcasts', count: sermons.filter((s) => s.type === 'Audio').length, icon: Mic2, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Transcripts', count: sermons.filter((s) => s.type === 'Text').length, icon: FileText, tone: 'bg-emerald-50 text-emerald-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${card.tone}`}>
                <card.icon size={24} />
              </div>
              <div>
                <div className="text-2xl font-black">{card.count}</div>
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search sermons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-gold-500 bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto table-scroll">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Sermon Info</th>
                  <th className="px-6 py-4">Preacher</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Views</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSermons.length > 0 ? (
                  filteredSermons.map((sermon) => (
                    <tr key={sermon.id} className="hover:bg-slate-50/50 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              sermon.type === 'Video'
                                ? 'bg-rose-50 text-rose-500'
                                : sermon.type === 'Audio'
                                  ? 'bg-blue-50 text-blue-500'
                                  : 'bg-emerald-50 text-emerald-500'
                            }`}
                          >
                            {sermon.type === 'Video' ? (
                              <Play size={20} fill="currentColor" />
                            ) : sermon.type === 'Audio' ? (
                              <Mic2 size={20} />
                            ) : (
                              <FileText size={20} />
                            )}
                          </div>
                          <div className="text-sm font-bold text-slate-900">{sermon.title}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-bold">{sermon.preacher}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-widest">
                          {sermon.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <Eye size={14} className="text-slate-400" /> {sermon.views}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{sermon.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(sermon.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600"
                          aria-label="Delete sermon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {searchQuery ? `No sermons matching "${searchQuery}".` : 'No sermons published for this branch yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Upload New Sermon</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Message Title</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preacher</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  value={formData.preacher}
                  onChange={(e) => setFormData({ ...formData, preacher: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Media Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['Video', 'Audio', 'Text'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                        formData.type === type
                          ? 'bg-gold-500 text-black border-gold-500'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : null}
                Publish Message
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SermonsView;
