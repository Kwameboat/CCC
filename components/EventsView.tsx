
import React, { useState } from 'react';
import { Calendar, Users, MapPin, Clock, Plus, Search, Filter, MoreHorizontal, CheckCircle2, AlertCircle, X } from 'lucide-react';

const EventsView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState([
    { id: 1, name: 'Youth Revival Night', date: 'Oct 30, 2023', time: '6:00 PM', location: 'Main Sanctuary', registrations: 145, status: 'Upcoming' },
    { id: 2, name: 'Grace Conference 2023', date: 'Nov 12, 2023', time: '9:00 AM', location: 'City Center Hall', registrations: 420, status: 'Selling Out' },
    { id: 3, name: 'Leadership Workshop', date: 'Nov 15, 2023', time: '10:00 AM', location: 'Meeting Room B', registrations: 25, status: 'Upcoming' },
    { id: 4, name: 'Community Outreach', date: 'Oct 25, 2023', time: '8:00 AM', location: 'Downtown Square', registrations: 88, status: 'Completed' },
  ]);

  const [formData, setFormData] = useState({ name: '', date: '', time: '', location: '' });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent = {
      id: Date.now(),
      ...formData,
      registrations: 0,
      status: 'Upcoming'
    };
    setEvents([newEvent, ...events]);
    setIsModalOpen(false);
    setFormData({ name: '', date: '', time: '', location: '' });
  };

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Event Management</h2>
          <p className="text-slate-500">Coordinate services, seminars, and special programs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
        >
          <Plus size={18} /> Create Event
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex items-center gap-2 hover:bg-white bg-slate-50"><Filter size={16} /> Filter</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Event Name</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Registrations</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length > 0 ? filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 transition-colors group animate-fadeIn">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">{event.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">{event.date}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} /> {event.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {event.location}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{event.registrations}</div>
                      <Users size={14} className="text-slate-400" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      event.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
                      event.status === 'Selling Out' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {event.status === 'Completed' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 hover:bg-slate-200 rounded-md transition-colors">
                      <MoreHorizontal size={18} className="text-slate-400" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No events found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Create New Event</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Event Name</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Annual Youth Conference"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input 
                    required type="date" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Time</label>
                  <input 
                    required type="time" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Grace Hall"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all">
                Publish Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;
