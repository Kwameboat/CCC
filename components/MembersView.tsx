import React, { useState, useRef } from 'react';
import {
  Search, Download, UserPlus,
  UserCircle2, X, Edit2, QrCode as QrIcon, Camera, Printer,
  CalendarDays, Loader2, RefreshCw, Trash2
} from 'lucide-react';
import { Member } from '../types';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface MembersViewProps {
  members: Member[];
  onRefresh: () => void;
  activeBranchId: string;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  category: 'Member',
  dept: '',
  photo: '',
  dob: '',
  status: 'Active',
};

const MembersView: React.FC<MembersViewProps> = ({ members, onRefresh, activeBranchId }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIDCardOpen, setIsIDCardOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormState(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setIsEditing(true);
    setSelectedMember(member);
    setFormState({
      name: member.name,
      email: member.email || '',
      phone: member.phone,
      category: member.category || 'Member',
      dept: member.dept || '',
      photo: member.photo,
      dob: member.dob || '',
      status: member.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Permanently delete this member record?')) return;
    setIsProcessing(true);
    const { error } = await supabase.from('members').delete().eq('id', id);
    setIsProcessing(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Member deleted.', 'success');
    onRefresh();
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.phone.trim()) {
      showToast('Phone number is required.', 'error');
      return;
    }
    setIsProcessing(true);

    const payload = {
      name: formState.name.trim(),
      email: formState.email.trim() || null,
      phone: formState.phone.trim(),
      category: formState.category,
      dept: formState.dept.trim() || null,
      status: formState.status,
      photo_url: formState.photo || null,
      dob: formState.dob || null,
      branch_id: activeBranchId,
    };

    const { error } =
      isEditing && selectedMember
        ? await supabase.from('members').update(payload).eq('id', selectedMember.id)
        : await supabase.from('members').insert([payload]);

    setIsProcessing(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast(isEditing ? 'Member updated.' : 'Member registered.', 'success');
    setIsModalOpen(false);
    onRefresh();
  };

  const handleExportCsv = () => {
    const branchMembers = members.filter((m) => m.branchId === activeBranchId);
    const header = ['Name', 'Email', 'Phone', 'Category', 'Department', 'Status', 'DOB'];
    const rows = branchMembers.map((m) =>
      [m.name, m.email, m.phone, m.category, m.dept, m.status, m.dob]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ccc-members-${activeBranchId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${branchMembers.length} members.`, 'success');
  };

  const handleViewID = (member: Member) => {
    setSelectedMember(member);
    setIsIDCardOpen(true);
  };

  const handlePrint = () => {
    const cardElement = document.getElementById('member-id-card');
    if (!cardElement) return;
    setIsGenerating(true);
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      setIsGenerating(false);
      return;
    }

    const content = `
      <html>
        <head>
          <title>Member ID - ${selectedMember?.name}</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
        </head>
        <body class="flex items-center justify-center min-h-screen bg-white">
          <div class="scale-[1.5] origin-center">
            ${cardElement.outerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); window.close(); }, 800);
            };
          <\/script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      showToast('Photo must be under 500KB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setFormState({ ...formState, photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const getPhotoSrc = (photo: string) => {
    if (photo && photo.startsWith('data:image')) return photo;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(photo || 'user')}`;
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.phone || '').includes(searchQuery);
    const matchesBranch = member.branchId === activeBranchId;
    if (activeTab === 'all') return matchesSearch && matchesBranch;
    return matchesSearch && matchesBranch && (member.status || '').toLowerCase() === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Congregation Directory</h2>
          <p className="text-slate-500 text-sm font-medium">Member records for the active branch.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-gold-600"
            aria-label="Refresh members"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50"
          >
            <Download size={18} /> Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-2 bg-gold-500 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gold-600 shadow-xl shadow-gold-100"
          >
            <UserPlus size={18} /> New Soul
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['All', 'Active', 'Inactive'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === tab.toLowerCase()
                    ? 'bg-white text-gold-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none font-bold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4">Birthday</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
                          <img src={getPhotoSrc(member.photo)} alt={member.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{member.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">
                            {member.phone || member.email || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-black text-gold-600 uppercase tracking-widest">{member.category}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{member.dept || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-black uppercase">
                        <CalendarDays size={14} className="text-slate-400" />
                        {member.dob
                          ? new Date(member.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          member.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {member.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => handleOpenEdit(member)} className="p-2 hover:bg-gold-50 text-slate-400 hover:text-gold-600 rounded-xl" aria-label="Edit member">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteMember(member.id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl" aria-label="Delete member">
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => handleViewID(member)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl" aria-label="View ID card">
                          <QrIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                    No members found for this branch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isIDCardOpen && selectedMember && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6">
            <div
              id="member-id-card"
              className="w-[320px] h-[500px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative border-8 border-gold-500/10 flex flex-col"
            >
              <div className="h-32 bg-slate-950 p-6 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-1 z-10">
                  <div className="text-gold-500 font-black text-xl tracking-[0.2em]">C.C.C</div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Charis Center</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center px-8 -mt-10 z-10">
                <div className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-slate-200 mb-6">
                  <img src={getPhotoSrc(selectedMember.photo)} className="w-full h-full object-cover" alt="" />
                </div>
                <h3 className="text-xl font-black text-slate-900 text-center leading-tight mb-1 uppercase tracking-tighter">
                  {selectedMember.name}
                </h3>
                <p className="text-gold-600 font-black uppercase tracking-[0.2em] text-[10px] mb-6">{selectedMember.category}</p>
                <div className="w-full space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Member ID</span>
                    <span className="font-mono text-slate-700">#{selectedMember.id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsIDCardOpen(false)}
                className="px-6 py-2 bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/30"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                disabled={isGenerating}
                className="px-8 py-2 bg-gold-500 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gold-600 flex items-center gap-2"
              >
                <Printer size={16} /> Print ID
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {isEditing ? 'Edit Identity' : 'Register New Soul'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveMember} className="p-8 space-y-5">
              <div className="flex justify-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-28 h-28 rounded-[2rem] bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                    {formState.photo ? (
                      <img src={getPhotoSrc(formState.photo)} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <UserCircle2 size={56} className="text-slate-300" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-[2rem] flex items-center justify-center transition-all">
                    <Camera size={24} className="text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Legal Name</label>
                  <input
                    required
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email</label>
                  <input
                    type="email"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Phone</label>
                  <input
                    required
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                  <select
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  >
                    {['Member', 'Worker', 'Pastor', 'Visitor', 'First Timer'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Department</label>
                  <input
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                    value={formState.dept}
                    onChange={(e) => setFormState({ ...formState, dept: e.target.value })}
                    placeholder="e.g. Choir"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">DOB</label>
                  <input
                    type="date"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                    value={formState.dob}
                    onChange={(e) => setFormState({ ...formState, dob: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Status</label>
                  <select
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-5 bg-gold-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gold-100 hover:bg-gold-600 disabled:opacity-70 flex items-center justify-center gap-3"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : isEditing ? 'Commit Updates' : 'Establish Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersView;
