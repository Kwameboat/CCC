
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Scan, Fingerprint, Phone, Search, 
  CheckCircle2, X, User, ArrowLeft,
  ShieldCheck, Smartphone, UserPlus,
  Mail, ChevronRight, CalendarDays, TrendingUp,
  Users, UserCheck, Star, FileBarChart2, 
  History, BarChart3, Loader2, Award
} from 'lucide-react';
import { Member } from '../types';
import { supabase } from '../lib/supabase';

interface AttendanceViewProps {
  members: Member[];
  onRefresh: () => void;
  activeBranchId: string;
}

interface CheckInRecord {
  id: string;
  name: string;
  time: string;
  method: string;
  status: 'In';
  isFirstTimer: boolean;
  memberId?: string;
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ members, onRefresh, activeBranchId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCheckedInMember, setLastCheckedInMember] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [registrationForm, setRegistrationForm] = useState({ name: '', phone: '', email: '', dob: '' });

  // 1. Fetch Current Service Logs
  useEffect(() => {
    fetchTodayLogs();

    // 2. REAL-TIME SUBSCRIPTION
    const channel = supabase
      .channel('attendance_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, (payload) => {
        const newLog = payload.new;
        if (newLog.branch_id === activeBranchId) {
          setCheckIns(prev => [{
            id: newLog.id,
            name: newLog.name,
            time: new Date(newLog.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: newLog.method,
            status: 'In',
            isFirstTimer: newLog.is_first_timer,
            memberId: newLog.member_id
          }, ...prev]);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [activeBranchId]);

  const fetchTodayLogs = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('branch_id', activeBranchId)
      .gte('created_at', today)
      .order('created_at', { ascending: false });
    
    if (data) {
      setCheckIns(data.map(log => ({
        id: log.id,
        name: log.name,
        time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: log.method,
        status: 'In',
        isFirstTimer: log.is_first_timer,
        memberId: log.member_id
      })));
    }
  };

  const stats = useMemo(() => {
    const total = checkIns.length;
    const firstTimers = checkIns.filter(c => c.isFirstTimer).length;
    return { total, firstTimers, regulars: total - firstTimers };
  }, [checkIns]);

  const handleCheckIn = async (member: Member | string, isFirstTimer: boolean = false) => {
    const name = typeof member === 'string' ? member : member.name;
    const memberId = typeof member === 'string' ? null : member.id;

    const { error } = await supabase.from('attendance').insert([{
      branch_id: activeBranchId,
      member_id: memberId,
      name: name,
      method: isKioskMode ? 'Kiosk' : 'Admin Panel',
      is_first_timer: isFirstTimer
    }]);

    if (!error) {
      setLastCheckedInMember(name);
      setShowSuccess(true);
      setSearchTerm('');
      setTimeout(() => setShowSuccess(false), 3000);
      setIsRegistering(false);
    }
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: newMember, error } = await supabase.from('members').insert([{
      branch_id: activeBranchId,
      name: registrationForm.name,
      email: registrationForm.email,
      phone: registrationForm.phone,
      category: 'Visitor',
      dept: 'First Timer'
    }]).select().single();

    if (newMember) {
      onRefresh();
      handleCheckIn(newMember as any, true);
    }
  };

  const filteredKioskMembers = useMemo(() => {
    const cleanQuery = searchTerm.trim().toLowerCase();
    if (cleanQuery.length < 2) return [];
    return members.filter(m => m.name.toLowerCase().includes(cleanQuery) || m.phone.includes(cleanQuery));
  }, [searchTerm, members]);

  if (isKioskMode) {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-950 flex flex-col text-white animate-fadeIn overflow-hidden">
        <div className="h-24 bg-slate-900 border-b border-white/5 flex items-center justify-between px-12 shrink-0 relative z-[1010]">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-gold-500 text-black rounded-2xl shadow-xl shadow-gold-500/20">
               <Fingerprint size={32} />
             </div>
             <div>
               <h1 className="text-2xl font-black uppercase tracking-tight text-gold-500">Kiosk Terminal</h1>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1">
                 <ShieldCheck size={14} className="text-gold-500" /> Digital Presence System v4
               </p>
             </div>
          </div>
          <button onClick={() => { setIsKioskMode(false); setIsRegistering(false); }} className="px-6 py-3 bg-white/5 hover:bg-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
            Exit Station
          </button>
        </div>

        {showSuccess && (
          <div className="absolute inset-0 z-[1100] bg-gold-500 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
            <div className="w-44 h-44 bg-slate-950 text-gold-500 rounded-[3rem] flex items-center justify-center mb-10 shadow-3xl animate-bounce">
              <CheckCircle2 size={110} strokeWidth={4} />
            </div>
            <h2 className="text-7xl font-black mb-6 uppercase tracking-tighter text-slate-950">Welcome Home!</h2>
            <p className="text-4xl text-slate-800 font-black uppercase max-w-2xl leading-tight">
              {lastCheckedInMember}
            </p>
          </div>
        )}

        {isRegistering ? (
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto relative z-[1005]">
            <div className="max-w-2xl w-full bg-slate-900 rounded-[3rem] p-12 border border-white/10 animate-slideUp">
              <button onClick={() => setIsRegistering(false)} className="flex items-center gap-2 text-gold-500 font-black uppercase text-xs tracking-widest mb-10">
                <ArrowLeft size={16} /> Back
              </button>
              <form onSubmit={handleQuickRegister} className="space-y-8">
                <input required placeholder="Your Full Name" className="w-full px-8 py-6 bg-slate-800 border-2 border-white/5 rounded-3xl text-2xl font-black focus:border-gold-500 outline-none" value={registrationForm.name} onChange={e => setRegistrationForm({...registrationForm, name: e.target.value})} />
                <input required placeholder="Phone Number" className="w-full px-8 py-6 bg-slate-800 border-2 border-white/5 rounded-3xl text-2xl font-black focus:border-gold-500 outline-none" value={registrationForm.phone} onChange={e => setRegistrationForm({...registrationForm, phone: e.target.value})} />
                <button type="submit" className="w-full py-7 bg-gold-500 text-black rounded-[2.5rem] text-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-gold-600 transition-all">Confirm Check-In</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden relative z-[1005]">
            <div className="w-full lg:w-2/3 p-8 flex flex-col items-center justify-center bg-slate-950">
               <div className="max-w-2xl w-full text-center space-y-12">
                  <h2 className="text-8xl font-black tracking-tighter uppercase leading-none">CHECK-IN</h2>
                  <div className="relative">
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500" size={44} />
                    <input autoFocus placeholder="Name or Phone..." className="w-full pl-24 pr-10 py-10 bg-slate-900 border-4 border-white/10 rounded-[3rem] text-4xl font-black focus:border-gold-500 outline-none transition-all shadow-3xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  {searchTerm.length >= 2 && (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredKioskMembers.length > 0 ? filteredKioskMembers.slice(0, 3).map(m => (
                        <button key={m.id} onClick={() => handleCheckIn(m)} className="flex items-center gap-8 p-8 bg-slate-900 border-2 border-white/5 rounded-[3rem] hover:border-gold-500 hover:bg-slate-800 transition-all text-left">
                          <div className="w-20 h-20 rounded-2xl bg-gold-500 text-black flex items-center justify-center font-black text-4xl uppercase">{m.name[0]}</div>
                          <div className="font-black text-4xl uppercase tracking-tighter">{m.name}</div>
                        </button>
                      )) : (
                        <button onClick={() => { setRegistrationForm({...registrationForm, name: searchTerm}); setIsRegistering(true); }} className="w-full py-10 border-4 border-dashed border-white/10 rounded-[4rem] text-slate-500 font-black text-2xl uppercase hover:bg-white/5">+ New Visitor Registration</button>
                      )}
                    </div>
                  )}
               </div>
            </div>
            <div className="hidden lg:flex lg:w-1/3 bg-slate-900 flex-col p-12 border-l border-white/5">
                <h3 className="text-xl font-black uppercase mb-8 tracking-widest text-slate-500">Live Service Feed</h3>
                <div className="space-y-4 overflow-y-auto">
                  {checkIns.map(c => (
                    <div key={c.id} className="p-6 bg-slate-950 rounded-3xl border border-white/5 flex justify-between items-center">
                       <div>
                          <div className="text-xl font-black text-slate-200 uppercase tracking-tighter">{c.name}</div>
                          <div className="text-[10px] text-gold-500 font-black uppercase tracking-widest mt-1">{c.method}</div>
                       </div>
                       <div className="text-xl font-black text-slate-600">{c.time}</div>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Turnout Monitoring</h2>
          <p className="text-slate-500 text-sm font-medium">Real-time attendance auditing for {activeBranchId}.</p>
        </div>
        <button onClick={() => setIsKioskMode(true)} className="px-8 py-3 bg-slate-950 text-gold-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl flex items-center gap-2">
          <Smartphone size={18} /> Launch Public Kiosk
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
               <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Arrivals</div>
               <div className="text-5xl font-black text-slate-900">{stats.total}</div>
            </div>
            <Users className="absolute -bottom-4 -right-4 w-24 h-24 text-gold-50 opacity-20" />
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">New Soul Count</div>
            <div className="text-5xl font-black text-gold-600">{stats.firstTimers}</div>
        </div>
        <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white">
            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">System Health</div>
            <div className="text-xl font-black text-gold-500 uppercase flex items-center gap-2 mt-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> 
               Live & Syncing
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm h-[500px] flex flex-col">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Audit Log Feed</h3>
            <span className="text-[10px] font-black text-gold-600 bg-gold-50 px-3 py-1 rounded-full uppercase">Today's Service</span>
         </div>
         <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {checkIns.map(check => (
              <div key={check.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-gold-500 flex items-center justify-center font-black">{check.name[0]}</div>
                    <div>
                       <div className="font-black text-slate-900 uppercase tracking-tight">{check.name}</div>
                       <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{check.method} Entry</div>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="font-black text-slate-900">{check.time}</div>
                    {check.isFirstTimer && <span className="text-[8px] font-black text-gold-600 uppercase">First Timer</span>}
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default AttendanceView;
