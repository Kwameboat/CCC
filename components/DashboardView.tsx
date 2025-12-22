
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  Users, TrendingUp, HandHeart, Calendar, ArrowUpRight, ArrowDownRight,
  Heart, Store, Mic2, Cake, MapPin, Globe
} from 'lucide-react';
import { Member, Branch } from '../types';

interface DashboardViewProps {
  members: Member[];
  branch: Branch;
  allMembers: Member[];
}

const attendanceData = [
  { name: 'Jan', count: 450 },
  { name: 'Feb', count: 520 },
  { name: 'Mar', count: 480 },
  { name: 'Apr', count: 610 },
  { name: 'May', count: 590 },
  { name: 'Jun', count: 720 },
];

const StatWidget = ({ title, value, change, positive, icon: Icon, color = 'gold' }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-3 bg-${color}-50 text-${color}-600 rounded-2xl`}>
        <Icon size={24} />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {change}
        {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      </div>
    </div>
    <div className="text-3xl font-black text-slate-900 relative z-10">{value}</div>
    <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1 relative z-10">{title}</div>
    <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-${color}-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full`}></div>
  </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ members, branch, allMembers }) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  
  const branchBirthdayMembers = members.filter(m => {
    if (!m.dob) return false;
    const dob = new Date(m.dob);
    return dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;
  });

  const getPhotoSrc = (photo: string) => {
    if (photo.startsWith('data:image')) return photo;
    return `https://picsum.photos/seed/${photo}/100/100`;
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
             <span className="text-xs font-bold text-gold-700">Org Total: {allMembers.length} Members</span>
          </div>
          <button className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95">Generate Global Audit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget title="Total Congregation" value={members.length.toLocaleString()} change="+4.2%" positive={true} icon={Users} color="gold" />
        <StatWidget title="Treasury (Mtd)" value="GH₵ 12,450" change="+1.8%" positive={true} icon={HandHeart} color="emerald" />
        <StatWidget title="Retention Rate" value="92%" change="-1.2%" positive={false} icon={TrendingUp} color="amber" />
        <StatWidget title="New Converts" value="12" change="+30%" positive={true} icon={Heart} color="rose" />
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
              <AreaChart data={attendanceData}>
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
