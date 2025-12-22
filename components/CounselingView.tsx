
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

const CounselingView: React.FC<CounselingViewProps> = ({ activeBranchId }) => {
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

  const [formState, setFormState] = useState({ 
    personName: '', 
    problem: '', 
    solution: '', 
    followUpStatus: 'Pending' as 'Solved' | 'Pending' | 'Ongoing'
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
        ...formState
      } : r));
    } else {
      const newRecord: CounselingRecord = {
        ...formState,
        id: Date.now().toString(),
        branchId: activeBranchId,
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
          <h2 className="text-2xl font-bold text-slate-900">Counseling & Welfare</h2>
          <p className="text-slate-500">Confidential log for spiritual guidance and member welfare.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all"
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
            <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl`}><stat.icon size={24} /></div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search sessions by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800"><Filter size={16} /> Filter Results</button>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRecords.length > 0 ? filteredRecords.map((record) => (
            <div key={record.id} className="p-6 hover:bg-slate-50/50 transition-colors group animate-fadeIn">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={16} />
                    </div>
                    <div className="text-sm font-black text-slate-900">{record.personName}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Calendar size={12} /> {record.date}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Bookmark size={12} /> {record.counselor}
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mt-2 ${
                      record.followUpStatus === 'Solved' ? 'bg-emerald-100 text-emerald-700' :
                      record.followUpStatus === 'Pending' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {record.followUpStatus === 'Solved' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {record.followUpStatus}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Stated Concern</div>
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{record.problem}"</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Recommended Solution</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{record.solution}</p>
                  </div>
                </div>

                <div className="flex lg:flex-col justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => handleOpenEdit(record)}
                     className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                   >
                     <Edit2 size={18} />
                   </button>
                   <button 
                     onClick={() => handleDeleteRecord(record.id)}
                     className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-400">
              No counseling records found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Counseling Session Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><HeartHandshake size={24} /></div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {isEditing ? 'Edit Counseling Session' : 'Log Counseling Session'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveRecord} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Congregant Name</label>
                  <input 
                    required type="text" 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-bold"
                    placeholder="Search or enter name..."
                    value={formState.personName}
                    onChange={e => setFormState({...formState, personName: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Current Status</label>
                  <select 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-bold appearance-none"
                    value={formState.followUpStatus}
                    onChange={e => setFormState({...formState, followUpStatus: e.target.value as any})}
                  >
                    <option value="Pending">Pending Follow-up</option>
                    <option value="Ongoing">Case Ongoing</option>
                    <option value="Solved">Case Solved / Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Confidential Case Notes (The Problem)</label>
                <textarea 
                  required 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all h-32 resize-none italic"
                  placeholder="Summarize the core concern presented by the member..."
                  value={formState.problem}
                  onChange={e => setFormState({...formState, problem: e.target.value})}
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Prescribed Solution & Follow-up</label>
                <textarea 
                  required 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all h-32 resize-none"
                  placeholder="Detail the spiritual guidance, practical advice, or institutional support recommended..."
                  value={formState.solution}
                  onChange={e => setFormState({...formState, solution: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-sm font-black text-slate-500 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest">Discard Entry</button>
                <button type="submit" className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all uppercase tracking-widest active:scale-95">
                  {isEditing ? 'Update Session' : 'Record Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounselingView;
