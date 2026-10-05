import React, { useEffect, useState } from 'react';
import { Globe, Layout, Image, List, Settings, Eye, Plus, Trash2, Menu, Move, X, ShieldCheck } from 'lucide-react';
import { showToast } from '../lib/toast';

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  status: 'Published' | 'Draft';
  lastMod: string;
}

const STORAGE_KEY = 'ccc_cms_pages_v1';
const DEFAULT_PAGES: CmsPage[] = [
  { id: '1', title: 'Home Page', slug: '/', status: 'Published', lastMod: 'Synced' },
  { id: '2', title: 'Sermon Archive', slug: '/sermons', status: 'Published', lastMod: 'Synced' },
  { id: '3', title: 'Giving & Tithes', slug: '/give', status: 'Published', lastMod: 'Synced' },
  { id: '4', title: 'Our History', slug: '/about', status: 'Draft', lastMod: 'Synced' },
  { id: '5', title: 'Contact Us', slug: '/contact', status: 'Published', lastMod: 'Synced' },
];

const CMSView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pages');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pages, setPages] = useState<CmsPage[]>(DEFAULT_PAGES);
  const [newPage, setNewPage] = useState({ title: '', slug: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPages(JSON.parse(raw) as CmsPage[]);
    } catch {
      /* keep defaults */
    }
  }, []);

  const persist = (next: CmsPage[]) => {
    setPages(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newPage.slug.startsWith('/') ? newPage.slug : `/${newPage.slug}`;
    const page: CmsPage = {
      id: crypto.randomUUID(),
      title: newPage.title.trim(),
      slug,
      status: 'Draft',
      lastMod: new Date().toLocaleString(),
    };
    persist([page, ...pages]);
    setIsModalOpen(false);
    setNewPage({ title: '', slug: '' });
    showToast('Draft page created.', 'success');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this page?')) return;
    persist(pages.filter((p) => p.id !== id));
    showToast('Page removed.', 'success');
  };

  const toggleStatus = (id: string) => {
    persist(
      pages.map((p) =>
        p.id === id
          ? {
              ...p,
              status: p.status === 'Published' ? 'Draft' : 'Published',
              lastMod: new Date().toLocaleString(),
            }
          : p
      )
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Website Manager</h2>
            <span className="px-2 py-0.5 bg-gold-100 text-gold-800 text-[8px] font-black uppercase rounded-md border border-gold-200 flex items-center gap-1">
              <ShieldCheck size={10} /> Session Auth
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Manage public portal pages for Charis Christian Center.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => showToast('Public site preview is configured separately from this console.', 'info')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50"
          >
            <Eye size={18} /> Preview
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
              showToast('CMS changes saved.', 'success');
            }}
            className="flex items-center gap-2 px-6 py-2 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6 overflow-x-auto">
        {[
          { id: 'pages', label: 'Pages & Content', icon: Layout },
          { id: 'menus', label: 'Navigation Menus', icon: Menu },
          { id: 'sliders', label: 'Hero Sliders', icon: Image },
          { id: 'footer', label: 'Footer & Social', icon: List },
          { id: 'settings', label: 'General Config', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-tight border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-gold-500 text-gold-700' : 'border-transparent text-slate-400 hover:text-slate-600'
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
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Active Website Pages</h3>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gold-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus size={14} /> New Page
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {pages.map((page) => (
                  <div key={page.id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gold-50 rounded-2xl flex items-center justify-center text-gold-600">
                        <Layout size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{page.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">{page.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleStatus(page.id)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          page.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                      >
                        {page.status}
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl"
                        aria-label={`Delete ${page.title}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'menus' && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Main Navigation Editor</h3>
              </div>
              <div className="p-6 space-y-3">
                {['Home', 'Sermons', 'Events', 'Ministries', 'Giving', 'Store', 'About'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <Move size={18} className="text-slate-300" />
                      <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!['pages', 'menus'].includes(activeTab) && (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm font-medium">
              {activeTab} editor coming in a later release. Pages and menus are available now.
            </div>
          )}
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
          <h3 className="font-black text-lg mb-6 flex items-center gap-2 uppercase tracking-tight">
            <Globe size={20} className="text-gold-400" /> CMS Status
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-widest font-black mb-1">Pages</div>
              <div className="text-3xl font-black">{pages.length}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-widest font-black mb-1">Published</div>
              <div className="text-xl font-black text-emerald-400">{pages.filter((p) => p.status === 'Published').length}</div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              Access is gated by your console login. Page drafts are stored securely in this browser until a dedicated CMS backend is connected.
            </p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create New Portal Page</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPage} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Page Title</label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg"
                  value={newPage.title}
                  onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">URL Alias</label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold"
                  value={newPage.slug}
                  onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                  placeholder="testimonials"
                />
              </div>
              <button type="submit" className="w-full py-5 bg-gold-500 text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gold-600">
                Initialize Draft Page
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CMSView;
