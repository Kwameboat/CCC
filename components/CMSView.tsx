import React, { useState } from 'react';
import { 
  Globe, Layout, Image, List, Settings, 
  ExternalLink, Eye, Save, Plus, Trash2, 
  Menu, Move, X, Lock, Key, Loader2, ShieldCheck,
  ChevronRight, ArrowRight
} from 'lucide-react';

const CMSView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('pages');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pages, setPages] = useState([
    { title: 'Home Page', slug: '/', status: 'Published', lastMod: '2 days ago' },
    { title: 'Sermon Archive', slug: '/sermons', status: 'Published', lastMod: '1 week ago' },
    { title: 'Giving & Tithes', slug: '/give', status: 'Published', lastMod: '3 days ago' },
    { title: 'Our History', slug: '/about', status: 'Draft', lastMod: '5 hours ago' },
    { title: 'Contact Us', slug: '/contact', status: 'Published', lastMod: '1 month ago' },
  ]);

  const [newPage, setNewPage] = useState({ title: '', slug: '' });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');

    // Simulated auth delay
    setTimeout(() => {
      if (password === 'admin123') { // Simple simulation, in real app this is backend auth
        setIsAuthenticated(true);
      } else {
        setError('Invalid administrative credentials. Access denied.');
      }
      setIsAuthenticating(false);
    }, 1200);
  };

  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    setPages([{ ...newPage, status: 'Draft', lastMod: 'Just now' }, ...pages]);
    setIsModalOpen(false);
    setNewPage({ title: '', slug: '' });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
           <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#4f46e5,transparent)]"></div>
              </div>
              <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-xl shadow-indigo-900/50">
                 <Lock size={40} />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter relative z-10">CMS Portal Access</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 relative z-10">Restricted Administrative Area</p>
           </div>
           
           <form onSubmit={handleLogin} className="p-10 space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-shake">
                   <X size={16} /> {error}
                </div>
              )}
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Security Token / Password</label>
                    <div className="relative">
                       <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                       <input 
                         type="password" 
                         required
                         autoFocus
                         className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                         placeholder="••••••••"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                       />
                    </div>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={isAuthenticating}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Verifying Access...
                  </>
                ) : (
                  <>
                    Unlock CMS <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 pt-4 opacity-50">
                 <ShieldCheck size={14} className="text-indigo-600" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encrypted Session Area</span>
              </div>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Website Manager</h2>
             <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase rounded-md border border-indigo-200">Admin Unlocked</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Customize your public-facing church portal.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-600 text-sm font-bold uppercase tracking-tight transition-colors">
            Logout
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
            <Eye size={18} /> Preview
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
            <Save size={18} /> Commit Changes
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'pages', label: 'Pages & Content', icon: Layout },
          { id: 'menus', label: 'Navigation Menus', icon: Menu },
          { id: 'sliders', label: 'Hero Sliders', icon: Image },
          { id: 'footer', label: 'Footer & Social', icon: List },
          { id: 'settings', label: 'General Config', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-tight border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'pages' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-fadeIn">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">Active Website Pages</h3>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                  >
                    <Plus size={14} /> New Page
                  </button>
               </div>
               <div className="divide-y divide-slate-100">
                  {pages.map((page, i) => (
                    <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                          <Layout size={24} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{page.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">{page.slug}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="hidden md:block">
                          <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Last Modified</div>
                          <div className="text-[11px] text-slate-600 font-bold">{page.lastMod}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          page.status === 'Published' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {page.status}
                        </span>
                        <div className="flex gap-2">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-xl transition-all"><ExternalLink size={18} /></button>
                          <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-rose-100 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'menus' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-fadeIn">
               <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">Main Navigation Editor</h3>
               </div>
               <div className="p-6 space-y-3">
                 {[
                   'Home', 'Sermons', 'Events', 'Ministries', 'Giving', 'Store', 'About'
                 ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:border-indigo-300 shadow-sm cursor-move transition-all active:scale-[0.98]">
                     <div className="flex items-center gap-4">
                       <Move size={18} className="text-slate-300" />
                       <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{item}</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <button className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest">Edit Link</button>
                        <button className="text-[10px] font-black text-slate-400 hover:text-rose-600 uppercase tracking-widest">Remove</button>
                     </div>
                   </div>
                 ))}
                 <button className="w-full p-4 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all mt-4">
                   + Add New Menu Item
                 </button>
               </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-black text-lg mb-6 flex items-center gap-2 uppercase tracking-tight">
                <Globe size={20} className="text-indigo-400" /> Site Pulse
              </h3>
              <div className="space-y-6">
                 <div>
                   <div className="text-slate-400 text-[10px] uppercase tracking-widest font-black mb-1">Active Visitors</div>
                   <div className="text-4xl font-black text-white">14,205 <span className="text-xs text-emerald-400 font-bold ml-1">+5%</span></div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                       <span>Server Load</span>
                       <span className="text-emerald-400">Stable</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-3/4 animate-pulse"></div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-slate-800/50 rounded-2xl border border-white/5">
                      <div className="text-slate-500 text-[8px] uppercase font-black tracking-widest mb-1">Uptime</div>
                      <div className="text-emerald-400 font-black text-xs">99.9%</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-2xl border border-white/5">
                      <div className="text-slate-500 text-[8px] uppercase font-black tracking-widest mb-1">Response</div>
                      <div className="text-amber-400 font-black text-xs">1.2s</div>
                    </div>
                 </div>
              </div>
            </div>
            <Globe className="absolute -bottom-10 -right-10 w-48 h-48 text-indigo-500/10 transition-transform group-hover:scale-110" />
          </div>
        </div>
      </div>

      {/* New Page Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create New Portal Page</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPage} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Page Title</label>
                <input 
                  required type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-lg"
                  value={newPage.title}
                  onChange={e => setNewPage({...newPage, title: e.target.value})}
                  placeholder="e.g. Digital Testimonials"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unique URL Alias</label>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">ecclesia.church/</span>
                  <input 
                    required type="text" 
                    className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    value={newPage.slug}
                    onChange={e => setNewPage({...newPage, slug: e.target.value})}
                    placeholder="testimonials"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                Initialize Draft Page
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default CMSView;