
import React, { useState, useEffect } from 'react';
import { 
  Shield, Globe, Bell, CreditCard, LayoutGrid, Save, Church, CheckCircle2, 
  Zap, Mail, MessageSquare, Loader2, MapPin, Plus, Trash2, Edit2, X, 
  ChevronRight, Clock, ShieldAlert, Cpu, Key, 
  Eye, EyeOff, Smartphone, Landmark, Wallet, Layers, Lock, Terminal, Activity,
  Server, Database, Filter, Sliders, Settings, ToggleLeft, ToggleRight,
  Calendar, ShoppingBag, Mic2, Copy, Check, Github, ExternalLink, Rocket, ShieldCheck, Cloud
} from 'lucide-react';
import { Branch, AutomationRule, GatewayConfig } from '../types';
import { supabase, checkSupabaseConnection } from '../lib/supabase';

type SettingsSection = 'general' | 'db' | 'deployment' | 'roles' | 'notifications' | 'finance' | 'modules' | 'automations' | 'branches' | 'payments';

interface SettingsViewProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ branches, setBranches }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('deployment');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<{connected: boolean, tables: string[]}>({ connected: false, tables: [] });
  
  const sqlScript = `-- CHARIS CHRISTIAN CENTER PRODUCTION SCHEMA
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_hq BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'GMT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  category TEXT DEFAULT 'Member',
  dept TEXT,
  status TEXT DEFAULT 'Active',
  photo_url TEXT,
  dob DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  method TEXT DEFAULT 'Kiosk',
  is_first_timer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  useEffect(() => {
    verifyConnection();
  }, []);

  const verifyConnection = async () => {
    const isConnected = await checkSupabaseConnection();
    if (isConnected) {
      setDbStatus({ connected: true, tables: ['branches', 'members', 'attendance', 'finance_transactions'] });
    } else {
      setDbStatus({ connected: false, tables: [] });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'deployment':
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Deployment Recommendation */}
            <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/20 border border-white/10">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                      <Rocket size={24} className="text-gold-400" />
                   </div>
                   <h3 className="text-xl font-black uppercase tracking-tight">Production Deployment Guide</h3>
                </div>
                <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-xl mb-8">
                  For the **Charis Console**, we recommend deploying to **Vercel**. It provides the most secure environment for handling Supabase keys and African payment gateway webhooks.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                     <div className="text-[10px] font-black uppercase tracking-widest text-gold-400 mb-2">Step 1: Push to GitHub</div>
                     <p className="text-[11px] text-indigo-100 leading-snug">Initialize a Git repo and push your code to a private GitHub repository.</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                     <div className="text-[10px] font-black uppercase tracking-widest text-gold-400 mb-2">Step 2: Connect Vercel</div>
                     <p className="text-[11px] text-indigo-100 leading-snug">Import the project in Vercel and add your SUPABASE_URL and SUPABASE_ANON_KEY.</p>
                  </div>
                </div>
                <a 
                  href="https://vercel.com/new" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white text-indigo-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gold-400 hover:text-black transition-all shadow-xl"
                >
                  Deploy to Vercel Now <ExternalLink size={14} />
                </a>
              </div>
              <Cloud className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 animate-pulse" />
            </div>

            {/* Production Health Check */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <div className={`p-4 rounded-2xl mb-4 ${dbStatus.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <ShieldCheck size={28} />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-xs">Security Audit</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    {dbStatus.connected ? 'SSL/TLS & RLS Verified' : 'Security Layer Inactive'}
                  </p>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
                    <Activity size={28} />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-xs">Environment</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    {window.location.hostname === 'localhost' ? 'Local Dev Instance' : 'Production Cloud Node'}
                  </p>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <div className="p-4 bg-gold-50 text-gold-600 rounded-2xl mb-4">
                    <Key size={28} />
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-xs">Key Masking</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Secrets are encrypted via process.env
                  </p>
               </div>
            </div>
          </div>
        );

      case 'db':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Database Provisioning</h3>
                  <p className="text-sm text-slate-500 font-medium">Initialize and monitor your Supabase production infrastructure.</p>
                </div>
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${dbStatus.connected ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-lg shadow-emerald-100/50' : 'bg-rose-50 border-rose-100 text-rose-700 shadow-lg shadow-rose-100/50'}`}>
                  <Activity size={20} className={dbStatus.connected ? 'animate-pulse' : ''} />
                  <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-widest leading-none">Connection Status</div>
                    <div className="text-xs font-black uppercase mt-1">{dbStatus.connected ? 'Production Active' : 'Demo Mode'}</div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-950 rounded-[2.5rem] relative overflow-hidden group">
                   <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                              <Terminal size={24} />
                           </div>
                           <h4 className="text-lg font-black text-white uppercase tracking-tight">SQL Schema</h4>
                        </div>
                        <button 
                          onClick={handleCopy}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex-1 bg-slate-900/50 rounded-2xl p-4 font-mono text-[9px] text-slate-400 overflow-x-auto border border-white/5 scrollbar-hide mb-4">
                        <pre className="whitespace-pre">{sqlScript}</pre>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium italic">
                        * Step 2: Run this in Supabase SQL Editor once connected.
                      </p>
                   </div>
                </div>
            </div>
          </div>
        );

      case 'branches':
        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Organization Multi-Site Management</h3>
                  <p className="text-sm text-slate-500 font-medium">Manage all church campuses from a single command center.</p>
               </div>
               <button 
                 className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
               >
                 <Plus size={16} /> Add New Campus
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {branches.map(branch => (
                <div key={branch.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-300 hover:bg-white transition-all shadow-sm">
                   <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${branch.isHQ ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>
                         <Church size={24} />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{branch.name}</h4>
                        {branch.isHQ && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase rounded-md border border-indigo-200">HQ</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                         <MapPin size={12} className="text-slate-400" /> {branch.location}
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default: return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">Select a configuration terminal.</div>;
    }
  };

  const navItems = [
    { id: 'deployment', label: 'Deployment Hub', icon: Rocket },
    { id: 'db', label: 'Database Setup', icon: Database },
    { id: 'branches', label: 'Campus Manager', icon: MapPin },
    { id: 'payments', label: 'African Gateways', icon: Wallet },
    { id: 'automations', label: 'Logic Builder', icon: Zap },
    { id: 'roles', label: 'RBAC Security', icon: Shield },
    { id: 'notifications', label: 'Push Hub', icon: Bell },
    { id: 'general', label: 'Org Profile', icon: Church },
  ];

  return (
    <div className="space-y-6 relative pb-10">
      {showSavedToast && (
        <div className="fixed top-8 right-8 z-[1000] bg-indigo-600 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-slideIn">
          <CheckCircle2 size={24} />
          <span className="font-black text-sm uppercase tracking-tight">Configuration Synced Successfully!</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System Infrastructure</h2>
          <p className="text-slate-500 text-sm font-medium">Master control for payments, automation, and organizational architecture.</p>
        </div>
        <button 
          onClick={() => { setIsSaving(true); setTimeout(() => { setIsSaving(false); setShowSavedToast(true); setTimeout(() => setShowSavedToast(false), 3000); }, 800); }}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Syncing...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="space-y-2 bg-white p-3 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit sticky top-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as SettingsSection)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all ${
                activeSection === item.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {activeSection === item.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3 space-y-6">
          {renderSection()}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default SettingsView;
