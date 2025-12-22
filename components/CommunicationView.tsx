import React, { useState } from 'react';
import { 
  Send, Mail, MessageSquare, Search, History, Layout, Settings, 
  CheckCircle2, Cake, Zap, ChevronRight, Play
} from 'lucide-react';
import { Member } from '../types';

interface CommunicationViewProps {
  members: Member[];
}

const CommunicationView: React.FC<CommunicationViewProps> = ({ members }) => {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'composer' | 'birthdays'>('broadcasts');
  const [broadcasts, setBroadcasts] = useState([
    { id: 1, subject: 'Sunday Service Reminder', type: 'SMS', recipients: '1,240', status: 'Sent', date: 'Oct 28, 2023' },
    { id: 2, subject: 'Grace Conference Invitation', type: 'Email', recipients: '3,500', status: 'In Progress', date: 'Oct 29, 2023' },
    { id: 3, subject: 'Tithes & Offerings Update', type: 'Email', recipients: '850', status: 'Draft', date: 'Oct 27, 2023' },
  ]);

  const [composerData, setComposerData] = useState({
    subject: '',
    content: '',
    type: 'Email Only',
    target: 'All Active Members'
  });

  const handleSend = () => {
    if (!composerData.subject || !composerData.content) return;
    const newBroadcast = {
      id: Date.now(),
      subject: composerData.subject,
      type: composerData.type.includes('SMS') ? 'SMS' : 'Email',
      recipients: '2,845',
      status: 'Sent',
      date: 'Just now'
    };
    setBroadcasts([newBroadcast, ...broadcasts]);
    setComposerData({ ...composerData, subject: '', content: '' });
    alert("Message broadcast initiated successfully!");
  };

  // Logic for birthday celebrants today
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const birthdayCelebrants = members.filter(m => {
    if (!m.dob) return false;
    const dob = new Date(m.dob);
    return dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;
  });

  const getPhotoSrc = (photo: string) => {
    if (photo.startsWith('data:image')) return photo;
    return `https://picsum.photos/seed/${photo}/100/100`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Broadcasting Center</h2>
          <p className="text-slate-500">Communicate with members via automated SMS and Emails.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
           {[
             { id: 'broadcasts', label: 'History', icon: History },
             { id: 'composer', label: 'New Message', icon: Send },
             { id: 'birthdays', label: 'Birthdays', icon: Cake },
           ].map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
             <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fadeIn">
               <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">Broadcast History</h3>
                 <button className="text-xs font-bold text-indigo-600">View Detailed Logs</button>
               </div>
               <div className="divide-y divide-slate-100">
                 {broadcasts.map((b) => (
                   <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-lg ${b.type === 'SMS' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                         {b.type === 'SMS' ? <MessageSquare size={18} /> : <Mail size={18} />}
                       </div>
                       <div>
                         <div className="text-sm font-bold text-slate-900">{b.subject}</div>
                         <div className="text-xs text-slate-500">{b.recipients} recipients • {b.date}</div>
                       </div>
                     </div>
                     <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                       b.status === 'Sent' ? 'bg-emerald-100 text-emerald-700' : 
                       b.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'
                     }`}>
                       {b.status}
                     </span>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {activeTab === 'composer' && (
             <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-fadeIn">
               <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">Quick Message Composer</h3>
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Group</label>
                     <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                       <option>All Active Members</option>
                       <option>Staff & Pastors</option>
                       <option>Youth Ministry</option>
                       <option>Event Attendees</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Channel</label>
                     <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
                       <option>Email & SMS</option>
                       <option>Email Only</option>
                       <option>SMS Only</option>
                     </select>
                   </div>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subject</label>
                   <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" placeholder="Enter subject..." />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Message Content</label>
                   <textarea className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-48 resize-none outline-none" placeholder="Start typing..."></textarea>
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                   <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Start Broadcast</button>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'birthdays' && (
             <div className="space-y-6 animate-fadeIn">
               <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800">Birthday Automation Engine</h3>
                      <p className="text-xs text-slate-500">Managing today's celebrations and scheduled greetings.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                      <Zap size={14} className="animate-pulse" />
                      <span className="text-[10px] font-bold uppercase">System Active</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {birthdayCelebrants.length > 0 ? birthdayCelebrants.map(m => (
                       <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                <img src={getPhotoSrc(m.photo)} alt={m.name} className="w-full h-full object-cover" />
                             </div>
                             <div>
                                <div className="text-sm font-bold text-slate-900">{m.name}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{m.phone}</div>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-emerald-500 uppercase px-2 py-1 bg-white rounded-lg shadow-sm">Scheduled</span>
                             <button className="p-2 text-indigo-600 bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" title="Manual Trigger">
                                <Play size={14} fill="currentColor" />
                             </button>
                          </div>
                       </div>
                     )) : (
                       <div className="col-span-full py-12 text-center">
                          <Cake className="mx-auto text-slate-200 mb-2" size={48} />
                          <p className="text-sm text-slate-400 font-medium">No celebrations recorded for today's date.</p>
                       </div>
                     )}
                  </div>
               </div>

               <div className="bg-indigo-700 text-white p-6 rounded-3xl relative overflow-hidden shadow-xl">
                  <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-2">Automated Greeting Rules</h3>
                    <p className="text-indigo-100 text-xs mb-4">
                      Members receive a personalized SMS and Email at 08:00 AM on their birthday. 
                      Template: "Happy Birthday [Name]!..."
                    </p>
                    <button onClick={() => alert("Redirecting to Settings...")} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                      <Settings size={14} /> Configure Template
                    </button>
                  </div>
                  <CheckCircle2 className="absolute -bottom-6 -right-6 w-32 h-32 text-indigo-600 opacity-30" />
               </div>
             </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings size={18} className="text-slate-600" /> Infrastructure</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-semibold text-slate-700">SMS Gateway</span>
                </div>
                <span className="text-xs font-bold text-slate-400">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-semibold text-slate-700">Email Relay</span>
                </div>
                <span className="text-xs font-bold text-slate-400">Connected</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4">Communications Stats</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <div className="text-[10px] text-slate-400 font-bold uppercase">Success Rate</div>
                   <div className="text-xl font-black text-indigo-600">98.2%</div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-600 w-[98%]"></div>
                </div>
                <div className="flex justify-between items-end mt-4">
                   <div className="text-[10px] text-slate-400 font-bold uppercase">Delivery Latency</div>
                   <div className="text-xl font-black text-emerald-600">&lt; 2s</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationView;