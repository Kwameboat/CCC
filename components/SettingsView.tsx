import React, { useEffect, useState } from 'react';
import {
  Shield, Zap, Loader2, MapPin, Plus, Church, CheckCircle2, Activity,
  Terminal, Copy, Check, ExternalLink, Rocket, ShieldCheck, Cloud,
  Database, Wallet, ChevronRight, Save, X
} from 'lucide-react';
import { Branch } from '../types';
import { checkSupabaseConnection, supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import StaffManager from './StaffManager';

type SettingsSection = 'db' | 'deployment' | 'roles' | 'branches' | 'payments' | 'automations';

interface SettingsViewProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  onBranchesChanged?: () => void;
  userRole?: string;
  currentUserId?: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  branches,
  setBranches,
  onBranchesChanged,
  userRole = 'admin',
  currentUserId,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    userRole === 'admin' ? 'roles' : 'deployment'
  );  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; tables: string[] }>({
    connected: false,
    tables: [],
  });
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    location: '',
    code: '',
    timezone: 'GMT',
    isHQ: false,
  });

  useEffect(() => {
    verifyConnection();
  }, []);

  const verifyConnection = async () => {
    const isConnected = await checkSupabaseConnection();
    setDbStatus({
      connected: isConnected,
      tables: isConnected
        ? ['branches', 'profiles', 'members', 'services', 'attendance', 'attendance_alerts', 'counseling', 'transactions', 'sermons', 'events', 'products', 'broadcasts']
        : [],
    });
  };

  const handleCopySchema = async () => {
    try {
      const res = await fetch('/supabase/schema.sql');
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText(
          'Open supabase/schema.sql in the repository and run it in the Supabase SQL Editor.'
        );
      }
      setIsCopied(true);
      showToast('Schema instructions copied.', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showToast('Copy failed. Open supabase/schema.sql manually.', 'error');
    }
  };

  const handleRegisterCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchSaving(true);
    const { data, error } = await supabase
      .from('branches')
      .insert([
        {
          name: branchForm.name.trim(),
          location: branchForm.location.trim(),
          code: branchForm.code.trim().toUpperCase(),
          timezone: branchForm.timezone.trim() || 'GMT',
          is_hq: branchForm.isHQ,
        },
      ])
      .select('*')
      .single();
    setBranchSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    const mapped: Branch = {
      id: data.id,
      name: data.name,
      location: data.location,
      code: data.code,
      isHQ: data.is_hq,
      timezone: data.timezone || 'GMT',
    };
    setBranches((prev) => [...prev, mapped]);
    setBranchModalOpen(false);
    setBranchForm({ name: '', location: '', code: '', timezone: 'GMT', isHQ: false });
    showToast('Campus registered.', 'success');
    onBranchesChanged?.();
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'deployment':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/10">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                    <Rocket size={24} className="text-gold-400" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Production Launch Checklist</h3>
                </div>
                <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-xl">
                  Live URL: <span className="text-gold-400">https://ccc-neon-nu.vercel.app</span>
                </p>
                <ol className="space-y-3 text-sm text-slate-300 list-decimal list-inside">
                  <li>In Vercel → Project → Settings → Environment Variables, set <code className="text-gold-300">VITE_SUPABASE_URL</code> and <code className="text-gold-300">VITE_SUPABASE_ANON_KEY</code>.</li>
                  <li>Do not set <code className="text-gold-300">VITE_ENABLE_DEMO_LOGIN</code> in Production.</li>
                  <li>In Supabase SQL Editor, run <code className="text-gold-300">supabase/schema.sql</code> (v7.0).</li>
                  <li>For existing DBs, also run <code className="text-gold-300">supabase/migrations/003_service_attendance.sql</code> (per-service attendance + absence alerts).</li>
                  <li>Create staff users under Supabase Authentication → Users.</li>
                  <li>Enable Realtime for the <code className="text-gold-300">attendance</code> table if kiosk live feed is needed.</li>
                  <li>Redeploy after env changes.</li>
                </ol>
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gold-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gold-600"
                >
                  Open Vercel Dashboard <ExternalLink size={14} />
                </a>
              </div>
              <Cloud className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5" />
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
                  <p className="text-sm text-slate-500 font-medium">Apply <code>supabase/schema.sql</code> in the Supabase SQL Editor.</p>
                </div>
                <div
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${
                    dbStatus.connected
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`}
                >
                  <Activity size={20} className={dbStatus.connected ? 'animate-pulse' : ''} />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest">Node Status</div>
                    <div className="text-xs font-black uppercase mt-1">{dbStatus.connected ? 'Live Sync' : 'Offline'}</div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-950 rounded-[2.5rem] text-white space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gold-500 rounded-2xl text-black">
                      <Terminal size={24} />
                    </div>
                    <h4 className="text-lg font-black uppercase tracking-tight">Schema v7.0</h4>
                  </div>
                  <button
                    onClick={handleCopySchema}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {isCopied ? 'Copied' : 'Copy Hint'}
                  </button>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Production schema lives in the repo at <span className="text-gold-400">supabase/schema.sql</span>. It creates
                  branches, profiles, members, services, attendance, attendance_alerts, counseling, transactions, sermons, events, products, broadcasts,
                  RLS policies, and the auth profile trigger.
                </p>
                <div className="flex flex-wrap gap-2">
                  {dbStatus.tables.map((t) => (
                    <span key={t} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight flex items-center gap-2 pt-2">
                  <ShieldCheck size={14} className="text-gold-500" /> Authenticated staff policies enabled — tighten per-role later if needed.
                </div>
              </div>
            </div>
          </div>
        );

      case 'branches':
        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6 gap-4 flex-wrap">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Campus Manager</h3>
                <p className="text-sm text-slate-500 font-medium">Register and manage multi-site campuses.</p>
              </div>
              <button
                onClick={() => setBranchModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-gold-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black"
              >
                <Plus size={16} /> Register Campus
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {branches.map((branch) => (
                <div key={branch.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-gold-300 transition-all">
                  <div className={`p-3 rounded-2xl w-fit mb-4 ${branch.isHQ ? 'bg-gold-500 text-black' : 'bg-white text-slate-400 border border-slate-200'}`}>
                    <Church size={24} />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{branch.name}</h4>
                  <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">{branch.location}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase mt-3 tracking-widest">
                    {branch.code} · {branch.timezone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 animate-fadeIn">
            <h3 className="text-xl font-black uppercase tracking-tight">Payment Gateways</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Manual ledger entry is live. For Paystack / Hubtel webhooks, add a Supabase Edge Function that verifies
              signatures server-side and inserts into <code>transactions</code>. Never store secret keys in the browser.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {['Paystack', 'Hubtel', 'Flutterwave', 'Stripe'].map((p) => (
                <div key={p} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="font-black text-sm uppercase">{p}</div>
                  <div className="text-[10px] font-bold text-amber-600 uppercase mt-1">Pending Edge Function</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'roles':
        return (
          <div className="space-y-6 animate-fadeIn">
            <StaffManager currentUserId={currentUserId} currentUserRole={userRole} />
            <div className="bg-white rounded-3xl border border-slate-200 p-6 text-sm text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-800 mb-2">One-time database step</p>
              If module checkboxes fail to save, run{' '}
              <code className="text-gold-700">supabase/migrations/002_staff_permissions.sql</code> in the Supabase SQL Editor,
              then refresh.
              <button
                type="button"
                className="ml-3 text-gold-700 font-black uppercase text-[10px] tracking-widest hover:underline"
                onClick={async () => {
                  try {
                    const res = await fetch('/supabase/migrations/002_staff_permissions.sql');
                    const text = await res.text();
                    await navigator.clipboard.writeText(text);
                    showToast('Staff permissions SQL copied.', 'success');
                  } catch {
                    showToast('Open supabase/migrations/002_staff_permissions.sql manually.', 'info');
                  }
                }}
              >
                Copy SQL
              </button>
            </div>
          </div>
        );

      case 'automations':
        return (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 animate-fadeIn">
            <h3 className="text-xl font-black uppercase tracking-tight">Logic Streams</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Birthday detection is live in Communication. SMS/email delivery requires a provider (Hubtel, Twilio, Resend)
              wired through an Edge Function that reads queued <code>broadcasts</code> rows.
            </p>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-sm font-medium">
              Broadcast composer currently queues messages. Connect a provider to mark them Sent.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const navItems = [
    { id: 'roles', label: 'Staff & Access', icon: Shield },
    { id: 'deployment', label: 'Vercel Deployment', icon: Rocket },
    { id: 'db', label: 'Database Node', icon: Database },
    { id: 'branches', label: 'Site Architecture', icon: MapPin },
    { id: 'payments', label: 'Paystack / Hubtel', icon: Wallet },
    { id: 'automations', label: 'Logic Streams', icon: Zap },
  ] as const;

  return (
    <div className="space-y-6 relative pb-10">
      {showSavedToast && (
        <div className="fixed top-8 right-8 z-[1000] bg-gold-500 text-black px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3">
          <CheckCircle2 size={24} />
          <span className="font-black text-sm uppercase tracking-tight">Settings Noted</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Administrative Terminal</h2>
          <p className="text-slate-500 text-sm font-medium">Production control center for Charis Christian Center.</p>
        </div>
        <button
          onClick={() => {
            setIsSaving(true);
            verifyConnection().finally(() => {
              setIsSaving(false);
              setShowSavedToast(true);
              setTimeout(() => setShowSavedToast(false), 2500);
              showToast('Connection rechecked.', 'success');
            });
          }}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-gold-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Checking…' : 'Recheck Cloud'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="space-y-2 bg-white p-3 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSection === item.id
                  ? 'bg-gold-500 text-black shadow-xl shadow-gold-500/20'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-gold-600'
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {activeSection === item.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="lg:col-span-3">{renderSection()}</div>
      </div>

      {branchModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Register Campus</h3>
              <button onClick={() => setBranchModalOpen(false)} className="p-1 text-slate-400" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegisterCampus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Campus Name</label>
                <input
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                <input
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  value={branchForm.location}
                  onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Code</label>
                  <input
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    placeholder="ACC-02"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Timezone</label>
                  <input
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                    value={branchForm.timezone}
                    onChange={(e) => setBranchForm({ ...branchForm, timezone: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={branchForm.isHQ}
                  onChange={(e) => setBranchForm({ ...branchForm, isHQ: e.target.checked })}
                />
                Mark as HQ
              </label>
              <button
                type="submit"
                disabled={branchSaving}
                className="w-full py-3 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {branchSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                Save Campus
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
