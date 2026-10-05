import React, { useEffect, useMemo, useState } from 'react';
import { Send, Mail, MessageSquare, History, Cake, Zap, Settings } from 'lucide-react';
import { Member } from '../types';
import { showToast } from '../lib/toast';

interface CommunicationViewProps {
  members: Member[];
}

interface Broadcast {
  id: string;
  subject: string;
  type: string;
  recipients: number;
  status: string;
  date: string;
  content: string;
}

const STORAGE_KEY = 'ccc_broadcast_log_v1';

const loadBroadcasts = (): Broadcast[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Broadcast[]) : [];
  } catch {
    return [];
  }
};

const CommunicationView: React.FC<CommunicationViewProps> = ({ members }) => {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'composer' | 'birthdays'>('broadcasts');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [composerData, setComposerData] = useState({
    subject: '',
    content: '',
    type: 'Email Only',
    target: 'All Active Members',
  });

  useEffect(() => {
    setBroadcasts(loadBroadcasts());
  }, []);

  const persist = (next: Broadcast[]) => {
    setBroadcasts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const activeMembers = useMemo(
    () => members.filter((m) => (m.status || 'Active') === 'Active'),
    [members]
  );

  const recipientCount = useMemo(() => {
    if (composerData.target === 'All Active Members') return activeMembers.length;
    if (composerData.target === 'Youth Ministry') {
      return activeMembers.filter((m) => /youth/i.test(m.dept || '') || /youth/i.test(m.category || '')).length;
    }
    if (composerData.target === 'Staff & Pastors') {
      return activeMembers.filter((m) => /pastor|staff|leader/i.test(m.category || '') || /pastor|staff/i.test(m.dept || '')).length;
    }
    return activeMembers.length;
  }, [composerData.target, activeMembers]);

  const handleSend = () => {
    if (!composerData.subject.trim() || !composerData.content.trim()) {
      showToast('Subject and message are required.', 'error');
      return;
    }
    if (recipientCount === 0) {
      showToast('No recipients match this target group.', 'error');
      return;
    }

    const channel = composerData.type.includes('SMS') && composerData.type.includes('Email')
      ? 'Email & SMS'
      : composerData.type.includes('SMS')
        ? 'SMS'
        : 'Email';

    const entry: Broadcast = {
      id: crypto.randomUUID(),
      subject: composerData.subject.trim(),
      type: channel.includes('SMS') && !channel.includes('Email') ? 'SMS' : channel.includes('Email') && !channel.includes('SMS') ? 'Email' : 'Email',
      recipients: recipientCount,
      status: 'Queued',
      date: new Date().toLocaleString(),
      content: composerData.content.trim(),
    };

    persist([entry, ...broadcasts]);
    setComposerData({ ...composerData, subject: '', content: '' });
    setActiveTab('broadcasts');
    showToast(
      `Broadcast queued for ${recipientCount} member(s). Connect an SMS/email provider in Settings to deliver.`,
      'success'
    );
  };

  const today = new Date();
  const birthdayCelebrants = members.filter((m) => {
    if (!m.dob) return false;
    const dob = new Date(m.dob);
    return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
  });

  const getPhotoSrc = (photo: string) => {
    if (photo?.startsWith('data:image')) return photo;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(photo || 'member')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Broadcasting Center</h2>
          <p className="text-slate-500">Compose member messages and track birthday celebrants.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'broadcasts', label: 'History', icon: History },
            { id: 'composer', label: 'New Message', icon: Send },
            { id: 'birthdays', label: 'Birthdays', icon: Cake },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-white text-gold-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'broadcasts' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Broadcast History</h3>
                <p className="text-xs text-slate-500 mt-1">Queued locally until an SMS/email provider is connected.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {broadcasts.length > 0 ? (
                  broadcasts.map((b) => (
                    <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${b.type === 'SMS' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {b.type === 'SMS' ? <MessageSquare size={18} /> : <Mail size={18} />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{b.subject}</div>
                          <div className="text-xs text-slate-500">
                            {b.recipients.toLocaleString()} recipients • {b.date}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {b.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-400 text-sm">No broadcasts yet. Compose a message to get started.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'composer' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">Quick Message Composer</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Group</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={composerData.target}
                      onChange={(e) => setComposerData({ ...composerData, target: e.target.value })}
                    >
                      <option>All Active Members</option>
                      <option>Staff & Pastors</option>
                      <option>Youth Ministry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Channel</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={composerData.type}
                      onChange={(e) => setComposerData({ ...composerData, type: e.target.value })}
                    >
                      <option>Email & SMS</option>
                      <option>Email Only</option>
                      <option>SMS Only</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium">Estimated recipients: {recipientCount}</p>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                    placeholder="Enter subject..."
                    value={composerData.subject}
                    onChange={(e) => setComposerData({ ...composerData, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Message Content</label>
                  <textarea
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-48 resize-none outline-none"
                    placeholder="Start typing..."
                    value={composerData.content}
                    onChange={(e) => setComposerData({ ...composerData, content: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSend}
                    className="px-6 py-2 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600 transition-all"
                  >
                    Queue Broadcast
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'birthdays' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800">Today&apos;s Birthday Celebrants</h3>
                  <p className="text-xs text-slate-500">Pulled live from the member directory.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                  <Zap size={14} />
                  <span className="text-[10px] font-bold uppercase">{birthdayCelebrants.length} Today</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {birthdayCelebrants.length > 0 ? (
                  birthdayCelebrants.map((m) => (
                    <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                        <img src={getPhotoSrc(m.photo)} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{m.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{m.phone || m.email || 'No contact'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center">
                    <Cake className="mx-auto text-slate-200 mb-2" size={48} />
                    <p className="text-sm text-slate-400 font-medium">No celebrations recorded for today.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings size={18} /> Delivery Status
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="font-semibold text-amber-800">SMS Gateway</span>
                <span className="text-xs font-bold text-amber-600">Not Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="font-semibold text-amber-800">Email Relay</span>
                <span className="text-xs font-bold text-amber-600">Not Connected</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Broadcasts are saved and queued. Wire Hubtel, Twilio, or Resend via a Supabase Edge Function for live delivery.
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-2">Audience Snapshot</h3>
            <div className="text-3xl font-black text-gold-600">{activeMembers.length}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Active members in branch</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationView;
