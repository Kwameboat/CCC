import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, CalendarClock, PlayCircle, Send, Loader2, CheckCircle2, ExternalLink, Users, MessageCircle } from 'lucide-react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { parseStreamUrl } from '../lib/embed';
import { CHURCH_NAME, CHURCH_NAME_UPPER } from '../lib/brand';
import Logo from './Logo';

interface PublicStream {
  id: string;
  title: string;
  description: string | null;
  preacher: string | null;
  stream_url: string;
  replay_url: string | null;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'ended';
  chat_enabled: boolean;
  started_at: string | null;
}

interface ChatMessage {
  id: string;
  display_name: string;
  message: string;
  created_at: string;
}

const VIEWER_KEY = 'ccc-live-viewer';
const JOINED_KEY = 'ccc-live-joined';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — fine */
  }
};

const REASONS: Record<string, string> = {
  invalid_name: 'Please enter your name (at least 2 letters).',
  invalid_phone: 'That phone number looks too long.',
  stream_not_found: 'This service is no longer available.',
  not_live: 'This service has not started yet. Please join when it goes live.',
  chat_closed: 'Chat is closed for this service.',
  invalid_message: 'Messages can be up to 500 characters.',
  slow_down: 'You are sending messages too quickly. Please wait a moment.',
};

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const useCountdown = (target: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: diff === 0 };
};

const Player: React.FC<{ url: string; title: string; autoplay?: boolean }> = ({ url, title, autoplay }) => {
  const embed = parseStreamUrl(url, { autoplay });
  if (!embed.embedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-6">
        <PlayCircle size={56} className="text-gold-500" />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-gold-500 text-black rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          Watch the service <ExternalLink size={14} />
        </a>
      </div>
    );
  }
  return (
    <iframe
      src={embed.embedUrl}
      title={title}
      className="w-full h-full"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
};

const LiveServicePage: React.FC = () => {
  const [streams, setStreams] = useState<PublicStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [replayId, setReplayId] = useState<string | null>(null);

  const [viewer, setViewer] = useState<{ name: string; phone: string }>(() => readJson(VIEWER_KEY, { name: '', phone: '' }));
  const [joined, setJoined] = useState<string[]>(() => readJson(JOINED_KEY, [] as string[]));
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');
  const [joinCount, setJoinCount] = useState<number | null>(null);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `Watch Live | ${CHURCH_NAME}`;
  }, []);

  const fetchStreams = async () => {
    const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const [liveRes, upcomingRes, pastRes] = await Promise.all([
      supabase.from('live_streams').select('*').eq('status', 'live').order('started_at', { ascending: false }),
      supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_at', since)
        .order('scheduled_at', { ascending: true })
        .limit(6),
      supabase.from('live_streams').select('*').eq('status', 'ended').order('scheduled_at', { ascending: false }).limit(9),
    ]);
    const err = liveRes.error || upcomingRes.error || pastRes.error;
    if (err) setLoadError('Online services are not available right now. Please try again shortly.');
    else setLoadError('');
    setStreams([...(liveRes.data || []), ...(upcomingRes.data || []), ...(pastRes.data || [])] as PublicStream[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      setLoadError('Online services are not configured.');
      return;
    }
    fetchStreams();
    const channel = supabase
      .channel('public-live-streams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => fetchStreams())
      .subscribe();
    const poll = window.setInterval(fetchStreams, 60000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, []);

  const live = streams.filter((s) => s.status === 'live');
  const upcoming = streams.filter((s) => s.status === 'scheduled');
  const replays = streams.filter((s) => s.status === 'ended');
  const [activeLiveId, setActiveLiveId] = useState<string | null>(null);
  const current = live.find((s) => s.id === activeLiveId) || live[0] || null;
  const replay = replays.find((s) => s.id === replayId) || null;
  const next = upcoming[0] || null;
  const countdown = useCountdown(!current ? next?.scheduled_at || null : null);
  const hasJoined = current ? joined.includes(current.id) : false;

  // Join count while live
  useEffect(() => {
    setJoinCount(null);
    if (!current) return;
    const load = async () => {
      const { data } = await supabase.rpc('online_join_count', { p_stream_id: current.id });
      if (typeof data === 'number') setJoinCount(data);
    };
    load();
    const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, [current?.id]);

  // Chat for the live stream
  useEffect(() => {
    setChat([]);
    if (!current || !current.chat_enabled) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('live_chat_messages')
        .select('id, display_name, message, created_at')
        .eq('stream_id', current.id)
        .order('created_at', { ascending: false })
        .limit(150);
      if (!cancelled) setChat(((data || []) as ChatMessage[]).reverse());
    };
    load();
    const channel = supabase
      .channel(`public-chat-${current.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `stream_id=eq.${current.id}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setChat((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev.slice(-149), m]));
        }
      )
      .subscribe();
    const t = window.setInterval(load, 30000); // picks up messages hidden by moderators
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(t);
    };
  }, [current?.id, current?.chat_enabled]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat.length]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setJoining(true);
    setJoinMsg('');
    const name = viewer.name.trim();
    const { data, error } = await supabase.rpc('join_online_service', {
      p_stream_id: current.id,
      p_name: name,
      p_phone: viewer.phone.trim() || null,
    });
    setJoining(false);
    const res = (data || {}) as { ok?: boolean; reason?: string; member?: boolean; name?: string };
    if (error || !res.ok) {
      setJoinMsg(REASONS[res.reason || ''] || 'Could not join right now. Please try again.');
      return;
    }
    writeJson(VIEWER_KEY, { name, phone: viewer.phone.trim() });
    const nextJoined = Array.from(new Set([...joined, current.id])).slice(-50);
    setJoined(nextJoined);
    writeJson(JOINED_KEY, nextJoined);
    setJoinMsg(res.member ? `Welcome, ${res.name}! Your attendance is recorded.` : `Welcome, ${name}! Glad you're worshipping with us.`);
    setJoinCount((c) => (c === null ? c : c + (res && (res as { already?: boolean }).already ? 0 : 1)));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !draft.trim()) return;
    setSending(true);
    setChatError('');
    const { data, error } = await supabase.rpc('post_live_chat', {
      p_stream_id: current.id,
      p_name: viewer.name.trim(),
      p_message: draft.trim(),
    });
    setSending(false);
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (error || !res.ok) {
      setChatError(REASONS[res.reason || ''] || 'Message not sent. Please try again.');
      return;
    }
    setDraft('');
  };

  const featured = useMemo(() => {
    if (current) return { url: current.stream_url, title: current.title, autoplay: true };
    if (replay) return { url: replay.replay_url || replay.stream_url, title: replay.title, autoplay: true };
    return null;
  }, [current?.id, replay?.id]);

  return (
    <div className="min-h-[100dvh] bg-black text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={36} hideText />
            <div className="min-w-0">
              <div className="font-black text-xs sm:text-sm tracking-tight text-gold-500 truncate">{CHURCH_NAME_UPPER}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Online Church</div>
            </div>
          </div>
          {current ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Live now
            </span>
          ) : (
            <span className="px-3 py-1.5 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
              Offline
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
        {loading ? (
          <div className="py-32 flex justify-center">
            <Loader2 className="animate-spin text-gold-500" size={36} />
          </div>
        ) : (
          <>
            {loadError && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm font-medium">{loadError}</div>
            )}

            {live.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {live.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveLiveId(s.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                      current?.id === s.id ? 'bg-gold-500 text-black border-gold-500' : 'border-white/15 text-slate-300'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Player */}
              <div className="lg:col-span-2 space-y-4">
                <div className="aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-[0_32px_64px_-16px_rgba(197,146,53,0.25)]">
                  {featured ? (
                    <Player key={featured.url} url={featured.url} title={featured.title} autoplay={featured.autoplay} />
                  ) : next && countdown ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[radial-gradient(circle_at_50%_0%,rgba(197,146,53,0.35),transparent_60%)]">
                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gold-400 mb-3">Next service</div>
                      <div className="text-xl sm:text-3xl font-black mb-6">{next.title}</div>
                      <div className="flex gap-2 sm:gap-4">
                        {[
                          ['Days', countdown.days],
                          ['Hours', countdown.hours],
                          ['Mins', countdown.minutes],
                          ['Secs', countdown.seconds],
                        ].map(([label, value]) => (
                          <div key={label} className="w-16 sm:w-20 py-3 rounded-2xl bg-white/5 border border-white/10">
                            <div className="text-2xl sm:text-3xl font-black tabular-nums">{String(value).padStart(2, '0')}</div>
                            <div className="text-[9px] uppercase tracking-widest text-slate-400">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 text-sm text-slate-400">
                        {countdown.done ? 'Starting soon — this page updates automatically.' : fmtWhen(next.scheduled_at)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <Radio size={48} className="text-gold-500 mb-4" />
                      <div className="font-black text-white text-lg">No service is live right now</div>
                      <div className="text-sm mt-1">Check back at service time — this page updates automatically.</div>
                    </div>
                  )}
                </div>

                {(current || replay) && (
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-xl sm:text-2xl font-black">{(current || replay)!.title}</h1>
                      {replay && !current && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-white/10 text-slate-300">Replay</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      {(current || replay)!.preacher ? `${(current || replay)!.preacher} · ` : ''}
                      {fmtWhen((current || replay)!.started_at || (current || replay)!.scheduled_at)}
                    </div>
                    {(current || replay)!.description && (
                      <p className="text-sm text-slate-300 mt-3 whitespace-pre-line">{(current || replay)!.description}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Join + chat */}
              <aside className="bg-white/[0.03] border border-white/10 rounded-3xl flex flex-col min-h-[420px] lg:max-h-[640px] overflow-hidden">
                <div className="p-5 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black uppercase tracking-widest text-gold-400">Join the service</div>
                    {current && joinCount !== null && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Users size={13} /> {joinCount} joined
                      </span>
                    )}
                  </div>

                  {!current ? (
                    <p className="text-sm text-slate-400 mt-3">
                      When the service goes live you can join here so the church knows you're worshipping with us.
                    </p>
                  ) : hasJoined ? (
                    <div className="mt-3 flex items-start gap-2 text-sm text-emerald-300">
                      <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                      <span>{joinMsg || `You've joined as ${viewer.name}. Enjoy the service!`}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleJoin} className="mt-3 space-y-3">
                      <input
                        required
                        maxLength={80}
                        placeholder="Your name"
                        autoComplete="name"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-gold-500 text-sm"
                        value={viewer.name}
                        onChange={(e) => setViewer({ ...viewer, name: e.target.value })}
                      />
                      <input
                        type="tel"
                        maxLength={20}
                        placeholder="Phone (optional — members are matched automatically)"
                        autoComplete="tel"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-gold-500 text-sm"
                        value={viewer.phone}
                        onChange={(e) => setViewer({ ...viewer, phone: e.target.value })}
                      />
                      <button
                        type="submit"
                        disabled={joining}
                        className="w-full py-3 bg-gold-500 text-black rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {joining && <Loader2 size={14} className="animate-spin" />} Join online
                      </button>
                      {joinMsg && <p className="text-xs text-amber-300">{joinMsg}</p>}
                    </form>
                  )}
                </div>

                <div className="px-5 pt-4 text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <MessageCircle size={14} /> Live chat
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 text-sm">
                  {!current ? (
                    <p className="text-slate-500">Chat opens when the service is live.</p>
                  ) : !current.chat_enabled ? (
                    <p className="text-slate-500">Chat is turned off for this service.</p>
                  ) : chat.length === 0 ? (
                    <p className="text-slate-500">Be the first to say hello 👋</p>
                  ) : (
                    chat.map((m) => (
                      <div key={m.id} className="break-words">
                        <span className="font-bold text-gold-400">{m.display_name}</span>{' '}
                        <span className="text-slate-200">{m.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                {current?.chat_enabled && (
                  <form onSubmit={handleSend} className="p-4 border-t border-white/10">
                    {!hasJoined ? (
                      <p className="text-xs text-slate-500">Join the service above to chat.</p>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            maxLength={500}
                            placeholder="Say something…"
                            className="flex-1 min-w-0 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-gold-500 text-sm"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                          />
                          <button
                            type="submit"
                            disabled={sending || !draft.trim()}
                            className="px-4 bg-gold-500 text-black rounded-xl disabled:opacity-50"
                            aria-label="Send message"
                          >
                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          </button>
                        </div>
                        {chatError && <p className="text-xs text-amber-300 mt-2">{chatError}</p>}
                      </>
                    )}
                  </form>
                )}
              </aside>
            </section>

            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gold-400 mb-4">Upcoming services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((s) => (
                    <div key={s.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <CalendarClock size={14} className="text-gold-500" /> {fmtWhen(s.scheduled_at)}
                      </div>
                      <div className="font-black mt-2">{s.title}</div>
                      {s.preacher && <div className="text-xs text-slate-400 mt-1">{s.preacher}</div>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {replays.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gold-400 mb-4">Watch again</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {replays.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setReplayId(s.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`text-left p-5 rounded-2xl border transition-colors ${
                        replayId === s.id ? 'bg-gold-500/10 border-gold-500/50' : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <PlayCircle size={14} className="text-gold-500" /> {fmtWhen(s.started_at || s.scheduled_at)}
                      </div>
                      <div className="font-black mt-2">{s.title}</div>
                      {s.preacher && <div className="text-xs text-slate-400 mt-1">{s.preacher}</div>}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} {CHURCH_NAME}
      </footer>
    </div>
  );
};

export default LiveServicePage;
