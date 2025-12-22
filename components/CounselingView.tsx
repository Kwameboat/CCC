
import React, { useState } from 'react';
import { 
  HeartHandshake, Plus, Search, Filter, 
  MessageSquare, User, Calendar, CheckCircle2, 
  Clock, AlertCircle, X, ChevronRight, Bookmark,
  Edit2, Trash2
} from 'lucide-react';
import { CounselingRecord } from '../types';

interface CounselingViewProps {
  activeBranchId: string;
}

interface FormState {
  personName: string;
  problem: string;
  solution: string;
  followUpStatus: 'Solved' | 'Pending' | 'Ongoing';
}

export default function CounselingView({ activeBranchId }: CounselingViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [records, setRecords] = useState<CounselingRecord[]>([
    { 
      id: '1', 
      branchId: activeBranchId,
      personName: 'Robert Wilson', 
      problem: 'Struggling with work-life balance and anxiety over family relocation.', 
      solution: 'Provided scriptural guidance on peace (Phil 4:6-7). Recommended professional career counseling alongside spiritual mentorship.', 
      followUpStatus: 'Ongoing', 
      date: 'Oct 24, 2023',
      counselor: 'Ps. Silas Okeke'
    },
    { 
      id: '2', 
      branchId: activeBranchId,
      personName: 'Sarah Connor', 
      problem: 'Grief after the loss of a close relative.', 
      solution: 'Joined the Grief Support Group. Assigned a deaconess for weekly prayer calls.', 
      followUpStatus: 'Solved', 
      date: 'Oct 15, 2023',
      counselor: 'Ps. Jane Smith'
    },
    { 
      id: '3', 
      branchId: activeBranchId,
      personName: 'Michael Jordan', 
      problem: 'Conflict resolution within the Youth Ministry team.', 
      solution: 'Facilitated a mediation session. Set new communication protocols for the department.', 
      followUpStatus: 'Solved', 
      date: 'Oct 10, 2023',
      counselor: 'Ps. Silas Okeke'
    },
  ]);

  const [formState, setFormState] = useState<FormState>({ 
    personName: '', 
    problem: '', 
    solution: '', 
    followUpStatus: 'Pending'
  });

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormState({ personName: '', problem: '', solution: '', followUpStatus: 'Pending' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: CounselingRecord) => {
    setIsEditing(true);
    setEditingId(record.id);
    setFormState({
      personName: record.personName,
      problem: record.problem,
      solution: record.solution,
      followUpStatus: record.followUpStatus
    });
    setIsModalOpen(true);
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Are you sure you want to delete this confidential record?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && editingId) {
      setRecords(records.map(r => r.id === editingId ? {
        ...r,
        personName: formState.personName,
        problem: formState.problem,
        solution: formState.solution,
        followUpStatus: formState.followUpStatus
      } : r));
    } else {
      const newRecord: CounselingRecord = {
        id: Date.now().toString(),
        branchId: activeBranchId,
        personName: formState.personName,
        problem: formState.problem,
        solution: formState.solution,
        followUpStatus: formState.followUpStatus,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        counselor: 'Dr. Silas Okeke', 
      };
      setRecords([newRecord, ...records]);
    }
    setIsModalOpen(false);
    setFormState({ personName: '', problem: '', solution: '', followUpStatus: 'Pending' });
  };

  const filteredRecords = records.filter(r => 
    r.personName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.counselor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Counseling & Welfare</h2>
          <p className="text-slate-500 text-sm font-medium">Confidential log for spiritual guidance and member welfare.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all"
        >
          <Plus size={18} /> New Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Sessions', value: records.length, icon: MessageSquare, color: 'indigo' },
          { label: 'Pending Follow-ups', value: records.filter(r => r.followUpStatus !== 'Solved').length, icon: Clock, color: 'amber' },
          { label: 'Successful Outcomes', value: records.filter(r => r.followUpStatus === 'Solved').length, icon: CheckCircle2, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-4 bg-slate-50 text-slate-600 rounded-2xl`}>
               <stat.icon size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search confidential records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-colors"><Filter size={16} /> Filter Terminal</button>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRecords.length > 0 ? filteredRecords.map((record) => (
            <div key={record.id} className="p-8 hover:bg-slate-50/50 transition-colors group animate-fadeIn">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
                      <User size={20} />
                    </div>
                    <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{record.personName}</div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar size={14} className="text-rose-500" /> {record.date}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Bookmark size={14} className="text-indigo-500" /> {record.counselor}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit mt-2 border ${
                      record.followUpStatus === 'Solved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      record.followUpStatus === 'Pending' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {record.followUpStatus === 'Solved' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {record.followUpStatus}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <AlertCircle size={12} /> Stated Concern
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed italic relative z-10">"{record.problem}"</p>
                  </div>
                  <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <HeartHandshake size={12} /> Prescribed Solution
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed relative z-10 font-medium">{record.solution}</p>
                  </div>
                </div>

                <div className="flex lg:flex-col justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                   <button 
                     onClick={() => handleOpenEdit(record)}
                     className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all"
                   >
                     <Edit2 size={20} />
                   </button>
                   <button 
                     onClick={() => handleDeleteRecord(record.id)}
                     className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm hover:shadow-xl transition-all"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-20 text-center text-slate-400 flex flex-col items-center">
              <div className="p-6 bg-slate-50 rounded-full mb-4">
                <Search size={40} className="opacity-20" />
              </div>
              <p className="font-black uppercase tracking-widest text-xs">No matching confidential records.</p>
            </div>
          )}
        </div>
      </div>

      {/* Counseling Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl shadow-rose-200 animate-pulse"><HeartHandshake size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {isEditing ? 'Modify Case File' : 'Log New Session'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Confidential Welfare Log</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-3 bg-white rounded-full shadow-lg border border-slate-100 transition-all hover:rotate-90"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveRecord} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Congregant Full Name</label>
                  <input 
                    required type="text" 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-black text-slate-800"
                    placeholder="Search member database..."
                    value={formState.personName}
                    onChange={e => setFormState({...formState, personName: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Escalation Status</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-black text-slate-800 appearance-none"
                    value={formState.followUpStatus}
                    onChange={e => setFormState({...formState, followUpStatus: e.target.value as any})}
                  >
                    <option value="Pending">Pending Review</option>
                    <option value="Ongoing">Active Counseling</option>
                    <option value="Solved">Case Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Confidential Case Notes</label>
                <textarea 
                  required 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-rose-500/10 outline-none transition-all h-32 resize-none italic text-slate-600"
                  placeholder="Record the stated concern in detail..."
                  value={formState.problem}
                  onChange={e => setFormState({...formState, problem: e.target.value})}
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recommended Spiritual Solution</label>
                <textarea 
                  required 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-rose-500/10 outline-none transition-all h-32 resize-none text-slate-800"
                  placeholder="Scriptural advice, action points, and welfare recommendations..."
                  value={formState.solution}
                  onChange={e => setFormState({...formState, solution: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-xs font-black text-slate-400 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-[0.2em]">Discard Draft</button>
                <button type="submit" className="flex-1 py-5 bg-rose-600 text-white rounded-2xl text-xs font-black shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all uppercase tracking-[0.2em] active:scale-95">
                  {isEditing ? 'Commit Changes' : 'Finalize Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
