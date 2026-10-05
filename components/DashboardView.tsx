
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Users, TrendingUp, HandHeart, Heart, Mic2, Cake, Globe } from 'lucide-react';
import { Member, Branch } from '../types';
import { supabase } from '../lib/supabase';

interface DashboardViewProps {
  members: Member[];
  branch: Branch;
  allMembers: Member[];
}

const StatWidget = ({ title, value, subtitle, icon: Icon }: { title: string; value: string | number; subtitle?: string; icon: React.ElementType }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="p-3 bg-gold-50 text-gold-600 rounded-2xl">
        <Icon size={24} />
      </div>
      {subtitle && (
        <div className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{subtitle}</div>
      )}
    </div>
    <div className="text-3xl font-black text-slate-900 relative z-10">{value}</div>
    <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1 relative z-10">{title}</div>
  </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ members, branch, allMembers }) => {
  const [financeStats, setFinanceStats] = useState({ totalBalance: 0, mtdIncome: 0 });
  const [attendanceChart, setAttendanceChart] = useState<{ name: string; count: number }[]>([]);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  
  const branchBirthdayMembers = members.filter(m => {
    if (!m.dob) return false;
    const dob = new Date(m.dob);
    return dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;
  });

  useEffect(() => {
    fetchDashboardTelemetry();
  }, [branch.id]);

  const fetchDashboardTelemetry = async () => {
    setIsLoadingStats(true);

    const { data: txData } = await supabase
      .from('transactions')
      .select('amount, type, created_at')
      .eq('branch_id', branch.id);

    if (txData) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const incomeTypes = new Set(['Tithe', 'Offering', 'Donation', 'Special Fund', 'Store']);
      const total = txData.reduce((acc, curr) => {
        const amt = Number(curr.amount);
        return incomeTypes.has(curr.type) ? acc + amt : acc - Math.abs(amt);
      }, 0);
      const mtdIncome = txData
        .filter((t) => incomeTypes.has(t.type) && new Date(t.created_at) >= monthStart)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      setFinanceStats({ totalBalance: total, mtdIncome });
    }

    const { data: attData } = await supabase
      .from('attendance')
      .select('created_at')
      .eq('branch_id', branch.id);

    const months: { name: string; key: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('en-US', { month: 'short' }),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        count: 0,
      });
    }
    (attData || []).forEach((row) => {
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.count += 1;
    });
    setAttendanceChart(months.map(({ name, count }) => ({ name, count })));
    setTodayAttendance(
      (attData || []).filter((row) => {
        const d = new Date(row.created_at);
        return d.toDateString() === now.toDateString();
      }).length
    );

    setIsLoadingStats(false);
  };

  const getPhotoSrc = (photo: string) => {
    if (photo?.startsWith('data:image')) return photo;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(photo || 'member')}`;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{branch.name} Terminal</h2>
          <p className="text-slate-500 text-sm font-medium">Real-time health monitoring for Charis Christian Center.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-gold-50 border border-gold-100 rounded-xl flex items-center gap-2">
             <Globe size={16} className="text-gold-600" />
             <span className="text-xs font-bold text-gold-700">Global Org: {allMembers.length} Members</span>
          </div>
          <button onClick={fetchDashboardTelemetry} className="p-2.5 bg-black text-white rounded-xl shadow-xl hover:bg-slate-900 transition-all">
            <TrendingUp size={18} className={isLoadingStats ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget title="Branch Congregation" value={members.length.toLocaleString()} subtitle="Live roster" icon={Users} />
        <StatWidget
          title="Treasury Balance"
          value={isLoadingStats ? '---' : `GH₵ ${financeStats.totalBalance.toLocaleString()}`}
          subtitle={isLoadingStats ? '…' : `MTD GH₵ ${financeStats.mtdIncome.toLocaleString()}`}
          icon={HandHeart}
        />
        <StatWidget
          title="Active Members"
          value={members.filter((m) => m.status === 'Active').length.toLocaleString()}
          subtitle={`${members.filter((m) => m.status !== 'Active').length} inactive`}
          icon={TrendingUp}
        />
        <StatWidget title="Today's Check-ins" value={isLoadingStats ? '---' : todayAttendance.toLocaleString()} subtitle="Attendance kiosk" icon={Heart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="font-black text-slate-900 uppercase tracking-tight">Turnout Analytics</h3>
               <p className="text-xs text-slate-400 font-bold uppercase">Growth trajectory for {branch.name}</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceChart}>
                <defs>
                  <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c59235" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#c59235" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px'}} 
                />
                <Area type="monotone" dataKey="count" stroke="#c59235" strokeWidth={5} fillOpacity={1} fill="url(#colorGold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Cake className="text-gold-500" size={20} /> Today's Celebrants
              </h3>
              <div className="w-10 h-10 bg-gold-50 text-gold-600 rounded-xl flex items-center justify-center animate-pulse">
                 <Heart size={18} fill="currentColor" />
              </div>
           </div>
           
           <div className="flex-1 space-y-4">
              {branchBirthdayMembers.length > 0 ? branchBirthdayMembers.map(m => (
                <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-[2rem] hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gold-100 group">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-2 ring-gold-100">
                    <img src={getPhotoSrc(m.photo)} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{m.name}</div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{m.dept} • {m.category}</div>
                  </div>
                  <button className="p-2.5 bg-gold-500 text-black rounded-xl hover:bg-gold-600 transition-all shadow-lg shadow-gold-100 active:scale-90">
                    <Mic2 size={14} />
                  </button>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-40 grayscale">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6 border-4 border-dashed border-slate-200">
                    <Cake size={40} />
                  </div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">No Celebrants Today</p>
                </div>
              )}
           </div>
           
           <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-ping"></div>
                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em]">CCC Global System Synced</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
