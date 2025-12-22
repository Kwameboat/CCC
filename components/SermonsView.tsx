
import React, { useState } from 'react';
import { Mic2, Video, FileText, Plus, Search, Filter, MoreVertical, Play, Download, Eye, X } from 'lucide-react';

const SermonsView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sermons, setSermons] = useState([
    { id: 1, title: 'The Power of Perseverance', preacher: 'Ps. Silas Okeke', date: 'Oct 22, 2023', views: '2.4k', type: 'Video', duration: '45:20' },
    { id: 2, title: 'Walking in Divine Grace', preacher: 'Ps. Sarah Johnson', date: 'Oct 15, 2023', views: '1.8k', type: 'Audio', duration: '32:15' },
    { id: 3, title: 'Building a Faithful Family', preacher: 'Ps. Mike Peterson', date: 'Oct 08, 2023', views: '950', type: 'Text', duration: 'N/A' },
    { id: 4, title: 'The Heart of Worship', preacher: 'Ps. Silas Okeke', date: 'Oct 01, 2023', views: '3.1k', type: 'Video', duration: '52:00' },
  ]);

  const [formData, setFormData] = useState({ title: '', preacher: 'Ps. Silas Okeke', type: 'Video' });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const newSermon = {
      id: Date.now(),
      title: formData.title,
      preacher: formData.preacher,
      date: 'Just now',
      views: '0',
      type: formData.type,
      duration: '00:00'
    };
    setSermons([newSermon, ...sermons]);
    setIsModalOpen(false);
    setFormData({ title: '', preacher: 'Ps. Silas Okeke', type: 'Video' });
  };

  const filteredSermons = sermons.filter(s => 
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md transition-all"
        >
          <Plus size={18} /> Upload Message
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Video size={24} /></div>
            <div>
              <div className="text-2xl font-black">{sermons.filter(s => s.type === 'Video').length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Video Catalog</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Mic2 size={24} /></div>
            <div>
              <div className="text-2xl font-black">{sermons.filter(s => s.type === 'Audio').length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Audio Podcasts</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><FileText size={24} /></div>
            <div>
              <div className="text-2xl font-black">{sermons.filter(s => s.type === 'Text').length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Transcripts</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search sermons..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
            />
          </div>
          <button className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex items-center gap-2 hover:bg-white bg-slate-50 transition-colors"><Filter size={16} /> Filter</button>
        </div>
        <div className="overflow-x-auto">
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
              {filteredSermons.length > 0 ? filteredSermons.map((sermon) => (
                <tr key={sermon.id} className="hover:bg-slate-50/50 transition-colors group animate-fadeIn">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                        sermon.type === 'Video' ? 'bg-rose-50 text-rose-500' :
                        sermon.type === 'Audio' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                      }`}>
                        {sermon.type === 'Video' ? <Play size={20} fill="currentColor" /> : 
                         sermon.type === 'Audio' ? <Mic2 size={20} /> : <FileText size={20} />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 cursor-pointer">{sermon.title}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sermon.duration}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-bold">{sermon.preacher}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-widest">{sermon.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-bold flex items-center gap-1.5 pt-7">
                    <Eye size={14} className="text-slate-400" /> {sermon.views}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{sermon.date}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600"><Download size={16} /></button>
                      <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No sermons found matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-md overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Upload New Sermon</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Message Title</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Walking in Divine Favor"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preacher</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.preacher}
                  onChange={e => setFormData({...formData, preacher: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Media Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Video', 'Audio', 'Text'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type})}
                      className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                        formData.type === type ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                 <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                    <Plus size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-400">Drag & Drop Media File</p>
                 </div>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all">
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
