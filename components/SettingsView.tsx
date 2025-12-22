
import React, { useState, useEffect } from 'react';
import { 
  Shield, Globe, Bell, CreditCard, LayoutGrid, Save, Church, CheckCircle2, 
  Zap, Mail, MessageSquare, Loader2, MapPin, Plus, Trash2, Edit2, X, 
  ChevronRight, Clock, ShieldAlert, Cpu, Key, 
  Eye, EyeOff, Smartphone, Landmark, Wallet, Layers, Lock, Terminal, Activity,
  Server, Database, Filter, Sliders, Settings, ToggleLeft, ToggleRight,
  Calendar, ShoppingBag, Mic2, Copy, Check, Github, ExternalLink, Rocket, ShieldCheck, Cloud
} from 'lucide-react';
import { Branch } from '../types';
import { checkSupabaseConnection } from '../lib/supabase';

type SettingsSection = 'general' | 'db' | 'deployment' | 'roles' | 'notifications' | 'finance' | 'modules' | 'automations' | 'branches' | 'payments';

interface SettingsViewProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ branches, setBranches }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('db');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<{connected: boolean, tables: string[]}>({ connected: false, tables: [] });
  
  const sqlScript = `-- CHARIS CHRISTIAN CENTER: MASTER PRODUCTION SCHEMA v4.5
-- Run this in your Supabase SQL Editor to complete your node setup.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_hq BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'GMT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Members Table
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

-- 4. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  method TEXT DEFAULT 'Kiosk',
  is_first_timer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Counseling Table
CREATE TABLE IF NOT EXISTS counseling (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT,
  follow_up_status TEXT DEFAULT 'Pending',
  counselor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Transactions Table (Finance)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL, 
  method TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Sermons Table
CREATE TABLE IF NOT EXISTS sermons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  preacher TEXT NOT NULL,
  type TEXT DEFAULT 'Video',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create Products Table (Store)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable RLS & Initial HQ Seed
INSERT INTO branches (name, location, code, is_hq) 
VALUES ('CCC Global HQ', 'Accra, Ghana', 'HQ-ACC', true)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 11. Global Access Policy
DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "Staff Access" ON branches FOR ALL TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Staff Access" ON members FOR ALL TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Staff Access" ON attendance FOR ALL TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Staff Access" ON counseling FOR ALL TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Staff Access" ON transactions FOR ALL TO authenticated USING (true)';
EXCEPTION WHEN others THEN NULL;
END $$;`;

  useEffect(() => {
    verifyConnection();
  }, []);

  const verifyConnection = async () => {
    const isConnected = await checkSupabaseConnection();
    if (isConnected) {
      setDbStatus({ connected: true, tables: ['branches', 'members', 'attendance', 'counseling', 'transactions', 'sermons', 'events', 'products'] });
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
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/10">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                      <Rocket size={24} className="text-gold-400" />
                   </div>
                   <h3 className="text-xl font-black uppercase tracking-tight">Vercel Deployment Guide</h3>
                </div>
                <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-xl mb-8">
                  Deploying to Vercel ensures your API keys are masked and your African Payment Webhooks are received with 99.9% uptime.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                     <div className="text-[10px] font-black uppercase tracking-widest text-gold-400 mb-2">Step 1: Push to GitHub</div>
                     <p className="text-[11px] text-slate-400 leading-snug">Connect your private repository to a Vercel Project.</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                     <div className="text-[10px] font-black uppercase tracking-widest text-gold-400 mb-2">Step 2: Add Keys</div>
                     <p className="text-[11px] text-slate-400 leading-snug">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Environment Variables.</p>
                  </div>
                </div>
                <a 
                  href="https://vercel.com/new" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gold-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gold-600 transition-all shadow-xl shadow-gold-900/20"
                >
                  Go to Vercel Dashboard <ExternalLink size={14} />
                </a>
              </div>
              <Cloud className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 animate-pulse" />
            </div>
          </div>
        );

      case 'db':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cloud Provisioning</h3>
                  <p className="text-sm text-slate-500 font-medium">Initialize your Postgres tables on the Supabase Cloud Node.</p>
                </div>
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${dbStatus.connected ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-lg' : 'bg-rose-50 border-rose-100 text-rose-700 shadow-lg'}`}>
                  <Activity size={20} className={dbStatus.connected ? 'animate-pulse' : ''} />
                  <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-widest leading-none">Node Status</div>
                    <div className="text-xs font-black uppercase mt-1">{dbStatus.connected ? 'Live Sync' : 'Offline / Demo'}</div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-950 rounded-[2.5rem] relative overflow-hidden group">
                   <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-gold-500 rounded-2xl text-black">
                              <Terminal size={24} />
                           </div>
                           <h4 className="text-lg font-black text-white uppercase tracking-tight">Database DDL Master Script</h4>
                        </div>
                        <button 
                          onClick={handleCopy}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {isCopied ? 'Copied to Clipboard' : 'Copy Script'}
                        </button>
                      </div>
                      <div className="flex-1 bg-slate-900/50 rounded-2xl p-4 font-mono text-[9px] text-slate-400 overflow-x-auto border border-white/5 scrollbar-hide mb-4">
                        <pre className="whitespace-pre">{sqlScript}</pre>
                      </div>
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
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Campus Manager</h3>
                  <p className="text-sm text-slate-500 font-medium">Architecture for multi-site church expansion.</p>
               </div>
               <button 
                 className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-gold-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
               >
                 <Plus size={16} /> Register Campus
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {branches.map(branch => (
                <div key={branch.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-gold-300 transition-all shadow-sm">
                   <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${branch.isHQ ? 'bg-gold-500 text-black' : 'bg-white text-slate-400 border border-slate-200'}`}>
                         <Church size={24} />
                      </div>
                   </div>
                   <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{branch.name}</h4>
                   <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">{branch.location}</div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default: return <div className="p-20 text-center text-slate-400 font-black uppercase tracking-[0.3em]">Module Terminal Locked.</div>;
    }
  };

  const navItems = [
    { id: 'db', label: 'Database Node', icon: Database },
    { id: 'deployment', label: 'Cloud Gateway', icon: Rocket },
    { id: 'branches', label: 'Site Architecture', icon: MapPin },
    { id: 'payments', label: 'Paystack / Hubtel', icon: Wallet },
    { id: 'automations', label: 'Logic Streams', icon: Zap },
    { id: 'roles', label: 'RBAC Encryption', icon: Shield },
    { id: 'general', label: 'Global Branding', icon: Church },
  ];

  return (
    <div className="space-y-6 relative pb-10">
      {showSavedToast && (
        <div className="fixed top-8 right-8 z-[1000] bg-gold-500 text-black px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-slideIn">
          <CheckCircle2 size={24} />
          <span className="font-black text-sm uppercase tracking-tight">System Synced to Cloud</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Administrative Terminal</h2>
          <p className="text-slate-500 text-sm font-medium">Control center for Charis Christian Center's global infrastructure.</p>
        </div>
        <button 
          onClick={() => { setIsSaving(true); setTimeout(() => { setIsSaving(false); setShowSavedToast(true); setTimeout(() => setShowSavedToast(false), 3000); }, 800); }}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-gold-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-gold-900/10 transition-all disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Syncing Node...' : 'Commit Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="space-y-2 bg-white p-3 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as SettingsSection)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSection === item.id 
                  ? 'bg-gold-500 text-black shadow-xl shadow-gold-500/20 scale-[1.02]' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-gold-600'
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {activeSection === item.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3">
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
