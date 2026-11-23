import React, { useEffect, useMemo, useState } from 'react';
import {
  Radio,
  Plus,
  RefreshCw,
  Loader2,
  X,
  Play,
  Square,
  Trash2,
  Pencil,
  Copy,
  ExternalLink,
  Users,
  MessageCircle,
  EyeOff,
  CalendarClock,
  Globe,
  Lock,
  Server,
  Save,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import { parseStreamUrl, providerLabel, churchStreamUrl } from '../lib/embed';
import HlsPlayer from './HlsPlayer';

export interface LiveStream {
  id: string;
  branch_id: string | null;
  service_id: string | null;
  title: string;
  description: string | null;
  preacher: string | null;
  stream_url: string;
  replay_url: string | null;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'ended';
  is_public: boolean;
  chat_enabled: boolean;
  started_at: string | null;
  ended_at: string | null;
}

interface ChatMessage {
  id: string;
  stream_id: string;
  display_name: string;
  message: string;
  is_hidden: boolean;
  created_at: string;
}

interface OnlineServiceViewProps {
  branchId: string;
  branchName: string;
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultSchedule = () => {
  const d = new Date();
  // Next Sunday 9:00 local
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d.toISOString());
};

interface ServerSettings {
  web_url: string;
  rtmp_url: string;
  stream_path: string;
}

const emptyForm = () => ({
  source: 'link' as 'server' | 'link',
  title: '',
  preacher: '',
  description: '',
  streamUrl: '',
  scheduledAt: defaultSchedule(),
  isPublic: true,
  chatEnabled: true,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const STATUS_STYLE: Record<LiveStream['status'], string> = {
  live: 'bg-rose-600 text-white',
  scheduled: 'bg-gold-100 text-gold-800',
  ended: 'bg-slate-100 text-slate-500',
};

const OnlineServiceView: React.FC<OnlineServiceViewProps> = ({ branchId, branchName }) => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LiveStream | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [joinCount, setJoinCount] = useState<number | null>(null);

  const publicLink = `${window.location.origin}/live`;

  // ---- Church streaming server settings
  const [server, setServer] = useState<ServerSettings>({ web_url: '', rtmp_url: '', stream_path: 'live' });
  const [serverAvailable, setServerAvailable] = useState(true);
  const [serverOpen, setServerOpen] = useState(false);
  const [serverSaving, setServerSaving] = useState(false);
  const serverStreamUrl = server.web_url ? churchStreamUrl(server.web_url, server.stream_path) : null;

  useEffect(() => {
    supabase
      .from('streaming_settings')
      .select('web_url, rtmp_url, stream_path')
      .eq('id', 'main')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setServerAvailable(false);
          return;
        }
        if (data) {
          setServer({ web_url: data.web_url || '', rtmp_url: data.rtmp_url || '', stream_path: data.stream_path || 'live' });
          if (!data.web_url) setServerOpen(true);
        }
      });
  }, []);

  const saveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    const web = server.web_url.trim().replace(/\/+$/, '');
    const rtmp = server.rtmp_url.trim().replace(/\/+$/, '');
    if (web && !/^https:\/\/[^/\s]+$/i.test(web)) {
      showToast('Server web address must look like https://live.yourchurch.org', 'error');
      return;
    }
    if (rtmp && !/^rtmps?:\/\/[^/\s]+(:\d+)?$/i.test(rtmp)) {
      showToast('RTMP address must look like rtmp://live.yourchurch.org:1935', 'error');
      return;
    }
    setServerSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('streaming_settings').upsert({
      id: 'main',
      web_url: web || null,
      rtmp_url: rtmp || null,
      stream_path: server.stream_path || 'live',
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id || null,
    });
    setServerSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setServer({ ...server, web_url: web, rtmp_url: rtmp });
    showToast('Streaming server saved.', 'success');
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied.`, 'success');
    } catch {
      showToast(text, 'info');
    }
  };

  const fetchStreams = async () => {
    if (!branchId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('branch_id', branchId)
      .order('scheduled_at', { ascending: false })
      .limit(100);
    if (error) {
      if (/live_streams/.test(error.message) && /does not exist|schema cache/.test(error.message)) setSchemaMissing(true);
      else showToast(error.message, 'error');
      setStreams([]);
    } else {
      setSchemaMissing(false);
      setStreams((data || []) as LiveStream[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStreams();
  }, [branchId]);

  const liveStream = streams.find((s) => s.status === 'live') || null;
  const upcoming = useMemo(
    () =>
      streams
        .filter((s) => s.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [streams]
  );
  const past = streams.filter((s) => s.status === 'ended');

  // Focus the live stream (or next upcoming) for preview + moderation
  useEffect(() => {
    if (selectedId && streams.some((s) => s.id === selectedId)) return;
    setSelectedId(liveStream?.id || upcoming[0]?.id || past[0]?.id || null);
  }, [streams]);

  const selected = streams.find((s) => s.id === selectedId) || null;

  // Chat + join count for the selected stream (realtime)
  useEffect(() => {
    setChat([]);
    setJoinCount(null);
    if (!selected) return;
    let cancelled = false;

    const loadChat = async () => {
      const { data } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', selected.id)
        .order('created_at', { ascending: true })
        .limit(300);
      if (!cancelled) setChat((data || []) as ChatMessage[]);
    };
    const loadCount = async () => {
      const { data } = await supabase.rpc('online_join_count', { p_stream_id: selected.id });
      if (!cancelled && typeof data === 'number') setJoinCount(data);
    };
    loadChat();
    loadCount();

    const channel = supabase
      .channel(`staff-chat-${selected.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_chat_messages', filter: `stream_id=eq.${selected.id}` },
        () => loadChat()
      )
      .subscribe();
    const timer = selected.status === 'live' ? window.setInterval(loadCount, 20000) : undefined;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      if (timer) window.clearInterval(timer);
    };
  }, [selected?.id, selected?.status]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), source: serverStreamUrl ? 'server' : 'link', streamUrl: serverStreamUrl || '' });
    setModalOpen(true);
  };

  const openEdit = (s: LiveStream) => {
    setEditing(s);
    setForm({
      source: parseStreamUrl(s.stream_url).provider === 'hls' ? 'server' : 'link',
      title: s.title,
      preacher: s.preacher || '',
      description: s.description || '',
      streamUrl: s.stream_url,
      scheduledAt: toLocalInput(s.scheduled_at),
      isPublic: s.is_public,
      chatEnabled: s.chat_enabled,
    });
    setModalOpen(true);
  };

  const formEmbed = form.streamUrl ? parseStreamUrl(form.streamUrl) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.source === 'server' && !serverStreamUrl) {
      showToast('Set up the streaming server first (Online Service → Streaming server).', 'error');
      return;
    }
    if (form.source === 'link' && !/^https:\/\//i.test(form.streamUrl.trim())) {
      showToast('Stream link must start with https://', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      branch_id: branchId,
      title: form.title.trim(),
      preacher: form.preacher.trim() || null,
      description: form.description.trim() || null,
      stream_url: form.source === 'server' ? serverStreamUrl! : form.streamUrl.trim(),
      scheduled_at: new Date(form.scheduledAt).toISOString(),
      is_public: form.isPublic,
      chat_enabled: form.chatEnabled,
    };
    const { error } = editing
      ? await supabase.from('live_streams').update(payload).eq('id', editing.id)
      : await supabase.from('live_streams').insert([payload]);
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(editing ? 'Online service updated.' : 'Online service scheduled.', 'success');
    setModalOpen(false);
    fetchStreams();
  };

  const goLive = async (s: LiveStream) => {
    if (liveStream && liveStream.id !== s.id) {
      if (!window.confirm(`"${liveStream.title}" is already live. Go live with this one as well?`)) return;
    }
    setBusyId(s.id);
    let serviceId = s.service_id;
    // Link to an attendance service so online joins show up in Attendance
    if (!serviceId) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const { data: svc } = await supabase
        .from('services')
        .insert([
          {
            branch_id: branchId,
            name: `${s.title} (Online)`,
            service_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
            service_time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
            status: 'open',
            notes: 'Created automatically by Online Service',
          },
        ])
        .select('id')
        .single();
      serviceId = svc?.id || null;
    }
    const { error } = await supabase
      .from('live_streams')
      .update({ status: 'live', started_at: new Date().toISOString(), ended_at: null, service_id: serviceId })
      .eq('id', s.id);
    setBusyId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setSelectedId(s.id);
    showToast('You are live. Members can now watch and join at /live.', 'success');
    fetchStreams();
  };

  const endStream = async (s: LiveStream) => {
    if (!window.confirm(`End "${s.title}"? Members will see it as a replay.`)) return;
    setBusyId(s.id);
    const { error } = await supabase
      .from('live_streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        // Server streams aren't kept online after the broadcast (recordings stay on the server)
        replay_url: s.replay_url || (parseStreamUrl(s.stream_url).provider === 'hls' ? null : s.stream_url),
      })
      .eq('id', s.id);
    if (!error && s.service_id) {
      await supabase
        .from('services')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', s.service_id);
    }
    setBusyId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Online service ended.', 'success');
    fetchStreams();
  };

  const removeStream = async (s: LiveStream) => {
    if (!window.confirm(`Delete "${s.title}" and its chat history?`)) return;
    const { error } = await supabase.from('live_streams').delete().eq('id', s.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Online service deleted.', 'success');
    fetchStreams();
  };

  const toggleHidden = async (m: ChatMessage) => {
    const { error } = await supabase.from('live_chat_messages').update({ is_hidden: !m.is_hidden }).eq('id', m.id);
    if (error) showToast(error.message, 'error');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      showToast('Public link copied. Share it with members.', 'success');
    } catch {
      showToast(publicLink, 'info');
    }
  };

  if (schemaMissing) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-900 text-sm font-medium space-y-2">
        <div className="font-black uppercase tracking-tight">Online Service tables are missing</div>
        <p>
          Run <code className="font-bold">supabase/migrations/008_online_services.sql</code> from the repository in the Supabase
          SQL Editor, then refresh.
        </p>
      </div>
    );
  }

  const selectedEmbed = selected ? parseStreamUrl(selected.stream_url) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Online Service</h2>
          <p className="text-slate-500 text-sm font-medium">
            Stream services for {branchName || 'this branch'}. Members watch, join and chat at{' '}
            <a href="/live" target="_blank" rel="noreferrer" className="font-bold text-gold-700 hover:underline">
              /live
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2 page-actions">
          <button onClick={fetchStreams} className="p-2 bg-white border border-slate-200 rounded-xl" aria-label="Refresh">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
          >
            <Copy size={16} /> Copy member link
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600 shadow-md"
          >
            <Plus size={18} /> Schedule service
          </button>
        </div>
      </div>

      {/* Church streaming server */}
      {serverAvailable && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setServerOpen((o) => !o)}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left"
            aria-expanded={serverOpen}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Server size={20} className={server.web_url ? 'text-emerald-600' : 'text-slate-400'} />
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase tracking-widest text-slate-600">Streaming server</span>
                <span className="block text-xs text-slate-500 truncate">
                  {server.web_url ? `Connected: ${server.web_url}` : 'Not set up — stream inside the app for free with your own server'}
                </span>
              </span>
            </span>
            <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${serverOpen ? 'rotate-180' : ''}`} />
          </button>
          {serverOpen && (
            <div className="px-5 pb-5 grid gap-6 lg:grid-cols-2 border-t border-slate-100 pt-5">
              <form onSubmit={saveServer} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Set up the free server with <code className="font-bold">streaming-server/README.md</code> in the repository, then
                  enter the addresses its setup script prints.
                </p>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Server web address</label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    placeholder="https://live.yourchurch.org"
                    value={server.web_url}
                    onChange={(e) => setServer({ ...server, web_url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Server RTMP address</label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    placeholder="rtmp://live.yourchurch.org:1935"
                    value={server.rtmp_url}
                    onChange={(e) => setServer({ ...server, rtmp_url: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={serverSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60"
                >
                  {serverSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
              </form>
              <div className="rounded-2xl bg-slate-950 text-slate-200 p-5 text-sm space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-gold-400">OBS settings (Settings → Stream → Custom)</div>
                {server.rtmp_url ? (
                  <>
                    {[
                      ['Server', server.rtmp_url],
                      ['Stream key', `${server.stream_path || 'live'}?user=publisher&pass=YOUR-BROADCAST-PASSWORD`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 min-w-0 break-all text-gold-200">{value}</code>
                          <button
                            type="button"
                            onClick={() => copyText(value, label)}
                            className="p-1.5 rounded-md bg-white/10 hover:bg-white/20"
                            aria-label={`Copy ${label}`}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-slate-400">
                      Replace YOUR-BROADCAST-PASSWORD with the password chosen during server setup. Suggested: 720p, 30 fps,
                      2500–3500 Kbps, keyframe interval 1 s.
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 text-xs">Save the RTMP address to see the settings for your media team.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-3xl border shadow-sm ${liveStream ? 'bg-rose-600 border-rose-700 text-white' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <Radio size={22} className={liveStream ? 'animate-pulse' : 'text-slate-400'} />
            <div className="min-w-0">
              <div className={`text-[10px] font-black uppercase tracking-widest ${liveStream ? 'text-rose-100' : 'text-slate-500'}`}>
                {liveStream ? 'Live now' : 'Not live'}
              </div>
              <div className="font-black truncate">{liveStream ? liveStream.title : 'No stream running'}</div>
            </div>
          </div>
        </div>
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
          <CalendarClock size={22} className="text-gold-600" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Next scheduled</div>
            <div className="font-black truncate">{upcoming[0] ? fmtDate(upcoming[0].scheduled_at) : 'Nothing scheduled'}</div>
          </div>
        </div>
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Users size={22} className="text-emerald-600" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Joined online (selected)</div>
            <div className="text-2xl font-black">{joinCount ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Stream list */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 text-xs font-black uppercase tracking-widest text-slate-500">
            Services
          </div>
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
          ) : streams.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No online services yet. Click <b>Schedule service</b> and paste your YouTube, Facebook or Vimeo live link.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {[...(liveStream ? [liveStream] : []), ...upcoming, ...past]
                .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
                .map((s) => (
                  <li
                    key={s.id}
                    className={`p-4 cursor-pointer transition-colors ${selectedId === s.id ? 'bg-gold-50' : 'hover:bg-slate-50'}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${STATUS_STYLE[s.status]}`}>
                            {s.status}
                          </span>
                          {s.is_public ? (
                            <Globe size={12} className="text-slate-400" aria-label="Public" />
                          ) : (
                            <Lock size={12} className="text-slate-400" aria-label="Hidden from members" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900 truncate">{s.title}</div>
                        <div className="text-xs text-slate-500">
                          {fmtDate(s.scheduled_at)}
                          {s.preacher ? ` · ${s.preacher}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {s.status !== 'live' ? (
                          <button
                            onClick={() => goLive(s)}
                            disabled={busyId === s.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                          >
                            {busyId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                            {s.status === 'ended' ? 'Restart' : 'Go live'}
                          </button>
                        ) : (
                          <button
                            onClick={() => endStream(s)}
                            disabled={busyId === s.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                          >
                            {busyId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} fill="currentColor" />}
                            End
                          </button>
                        )}
                        <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md" aria-label="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => removeStream(s)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md" aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Preview + chat moderation */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="aspect-video bg-slate-950 flex items-center justify-center">
              {selected && selectedEmbed?.hlsUrl ? (
                <HlsPlayer key={selected.id} src={selectedEmbed.hlsUrl} title={selected.title} live={selected.status !== 'ended'} />
              ) : selected && selectedEmbed?.embedUrl ? (
                <iframe
                  key={selected.id}
                  src={selectedEmbed.embedUrl}
                  title={selected.title}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="text-center text-slate-400 text-sm p-6">
                  {selected ? (
                    <>
                      This link can't be previewed here.
                      <a
                        href={selected.stream_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 flex items-center justify-center gap-1 text-gold-400 font-bold"
                      >
                        Open stream <ExternalLink size={14} />
                      </a>
                    </>
                  ) : (
                    'Select a service to preview it.'
                  )}
                </div>
              )}
            </div>
            {selected && (
              <div className="p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-800">{selected.title}</span>
                <span>
                  {providerLabel(selectedEmbed?.provider || 'unknown')} ·{' '}
                  {selected.is_public ? 'Visible on /live' : 'Hidden from members'} · Chat {selected.chat_enabled ? 'on' : 'off'}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              <MessageCircle size={14} /> Live chat moderation
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {chat.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No chat messages yet.</div>
              ) : (
                chat.map((m) => (
                  <div key={m.id} className={`px-4 py-2.5 flex items-start justify-between gap-3 ${m.is_hidden ? 'opacity-50' : ''}`}>
                    <div className="min-w-0 text-sm">
                      <span className="font-bold text-slate-900">{m.display_name}</span>{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="text-slate-700 break-words">{m.message}</div>
                    </div>
                    <button
                      onClick={() => toggleHidden(m)}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600"
                    >
                      <EyeOff size={13} /> {m.is_hidden ? 'Unhide' : 'Hide'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden modal-sheet">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {editing ? 'Edit online service' : 'Schedule online service'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Service title</label>
                <input
                  required
                  maxLength={200}
                  placeholder="Sunday Celebration Service"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Video source</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['server', 'Church streaming server'],
                      ['link', 'YouTube / Facebook / Vimeo'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setForm({ ...form, source: id })}
                      className={`py-2.5 px-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                        form.source === id ? 'bg-gold-500 text-black border-gold-500' : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {form.source === 'server' ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  {serverStreamUrl ? (
                    <>
                      <div className="font-bold text-slate-700">Plays in the church app’s own player — no third-party app.</div>
                      <div className="mt-1 text-slate-500 break-all">{serverStreamUrl}</div>
                    </>
                  ) : (
                    <div className="text-amber-700 font-bold">
                      Set up the streaming server first (the “Streaming server” panel on this page).
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Live stream link</label>
                  <input
                    required
                    type="url"
                    placeholder="https://www.youtube.com/live/…"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={form.streamUrl}
                    onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
                  />
                  <p className={`mt-1 text-[11px] ${formEmbed && !formEmbed.embedUrl && !formEmbed.hlsUrl ? 'text-amber-600' : 'text-slate-400'}`}>
                    {formEmbed
                      ? formEmbed.embedUrl || formEmbed.hlsUrl
                        ? `${providerLabel(formEmbed.provider)} — will play inside the member page.`
                        : 'This link will open in a new tab instead of playing inside the page.'
                      : 'Paste the YouTube, Facebook or Vimeo live link (or your YouTube channel “/live” link).'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Starts</label>
                  <input
                    required
                    type="datetime-local"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preacher</label>
                  <input
                    maxLength={120}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={form.preacher}
                    onChange={(e) => setForm({ ...form, preacher: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
                  Show on member page
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.chatEnabled}
                    onChange={(e) => setForm({ ...form, chatEnabled: e.target.checked })}
                  />
                  Allow live chat
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gold-500 text-black rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gold-600 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : null}
                {editing ? 'Save changes' : 'Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineServiceView;
