import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Plus, Search, CheckCircle2, AlertCircle, X, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface ChurchEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

interface EventsViewProps {
  branchId: string;
}

const EventsView: React.FC<EventsViewProps> = ({ branchId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '', time: '', location: '' });

  const fetchEvents = async () => {
    if (!branchId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('branch_id', branchId)
      .order('event_date', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
      setEvents([]);
    } else {
      setEvents(
        (data || []).map((e) => ({
          id: e.id,
          name: e.name,
          date: e.event_date
            ? new Date(e.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—',
          time: e.event_time?.slice(0, 5) || '—',
          location: e.location,
          status: e.status || 'Upcoming',
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [branchId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('events').insert([
      {
        branch_id: branchId,
        name: formData.name.trim(),
        event_date: formData.date,
        event_time: formData.time,
        location: formData.location.trim(),
        status: 'Upcoming',
      },
    ]);
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Event published.', 'success');
    setIsModalOpen(false);
    setFormData({ name: '', date: '', time: '', location: '' });
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Event removed.', 'success');
    fetchEvents();
  };

  const filteredEvents = events.filter(
    (e) =>
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
        <div className="flex gap-2">
          <button onClick={fetchEvents} className="p-2 bg-white border border-slate-200 rounded-lg" aria-label="Refresh">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-lg text-sm font-bold hover:bg-gold-600 shadow-md"
          >
            <Plus size={18} /> Create Event
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Event Name</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{event.name}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{event.date}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={12} /> {event.time}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                          <MapPin size={14} className="text-slate-400" /> {event.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            event.status === 'Completed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {event.status === 'Completed' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600"
                          aria-label="Delete event"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {searchQuery ? 'No events match your search.' : 'No events scheduled for this branch yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Create New Event</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Event Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Time</label>
                  <input
                    required
                    type="time"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : null}
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
