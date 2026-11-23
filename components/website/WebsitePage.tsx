import React, { useEffect, useMemo, useState } from 'react';
import {
  Radio,
  PlayCircle,
  MapPin,
  Clock,
  Phone,
  Mail,
  CalendarDays,
  Heart,
  HandHeart,
  Users,
  BookOpen,
  Menu,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Youtube,
  Facebook,
  Instagram,
  MessageCircle,
  ChevronRight,
  Gift,
  Mic2,
} from 'lucide-react';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { CHURCH_NAME, CHURCH_NAME_UPPER } from '../../lib/brand';
import { DEFAULT_SITE_CONTENT, SiteContent, loadSiteContent, safeUrl, whatsappLink } from '../../lib/siteContent';
import Logo from '../Logo';

interface StreamLite {
  id: string;
  title: string;
  preacher: string | null;
  status: 'scheduled' | 'live' | 'ended';
  scheduled_at: string;
  started_at: string | null;
}
interface EventLite {
  id: string;
  name: string;
  event_date: string;
  event_time: string;
  location: string;
}
interface SermonLite {
  id: string;
  title: string;
  preacher: string;
  type: string;
  created_at: string;
}
interface BranchLite {
  id: string;
  name: string;
  location: string;
  is_hq: boolean;
}

const NAV = [
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'ministries', label: 'Ministries' },
  { id: 'events', label: 'Events' },
  { id: 'messages', label: 'Messages' },
  { id: 'give', label: 'Give' },
  { id: 'contact', label: 'Contact' },
];

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const REASONS: Record<string, string> = {
  invalid_name: 'Please enter your name.',
  invalid_message: 'Please write a short message.',
  invalid_email: 'That email address doesn’t look right.',
  invalid_phone: 'That phone number is too long.',
  slow_down: 'You’ve sent a few messages already. Please try again in a few minutes.',
};

const SectionTitle: React.FC<{ eyebrow: string; title: string; light?: boolean; center?: boolean }> = ({ eyebrow, title, light, center }) => (
  <div className={`mb-10 ${center ? 'text-center' : ''}`}>
    <div className="text-[11px] font-black uppercase tracking-[0.35em] text-gold-500 mb-3">{eyebrow}</div>
    <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
  </div>
);

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const WebsitePage: React.FC = () => {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [live, setLive] = useState<StreamLite | null>(null);
  const [nextStream, setNextStream] = useState<StreamLite | null>(null);
  const [replays, setReplays] = useState<StreamLite[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [sermons, setSermons] = useState<SermonLite[]>([]);
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [formKind, setFormKind] = useState<'prayer' | 'contact' | 'visit'>('prayer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [formResult, setFormResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    document.title = `${CHURCH_NAME} | Welcome`;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadStreams = async () => {
    const [liveRes, nextRes, pastRes] = await Promise.all([
      supabase.from('live_streams').select('id,title,preacher,status,scheduled_at,started_at').eq('status', 'live').limit(1),
      supabase
        .from('live_streams')
        .select('id,title,preacher,status,scheduled_at,started_at')
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date(Date.now() - 6 * 3600 * 1000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1),
      supabase
        .from('live_streams')
        .select('id,title,preacher,status,scheduled_at,started_at')
        .eq('status', 'ended')
        .order('scheduled_at', { ascending: false })
        .limit(3),
    ]);
    setLive((liveRes.data?.[0] as StreamLite) || null);
    setNextStream((nextRes.data?.[0] as StreamLite) || null);
    setReplays((pastRes.data || []) as StreamLite[]);
  };

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    loadSiteContent().then(({ content: c }) => setContent(c));
    loadStreams();
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    supabase
      .from('events')
      .select('id,name,event_date,event_time,location')
      .gte('event_date', iso)
      .order('event_date', { ascending: true })
      .limit(6)
      .then(({ data }) => setEvents((data || []) as EventLite[]));
    supabase
      .from('sermons')
      .select('id,title,preacher,type,created_at')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setSermons((data || []) as SermonLite[]));
    supabase
      .from('branches')
      .select('id,name,location,is_hq')
      .order('is_hq', { ascending: false })
      .then(({ data }) => setBranches((data || []) as BranchLite[]));

    const channel = supabase
      .channel('website-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => loadStreams())
      .subscribe();
    const poll = window.setInterval(loadStreams, 90000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, []);

  const c = content;
  const heroImage = c.hero.imageUrl ? safeUrl(c.hero.imageUrl) : null;
  const pastorPhoto = c.pastor.photoUrl ? safeUrl(c.pastor.photoUrl) : null;
  const wa = c.contact.whatsapp ? whatsappLink(c.contact.whatsapp) : null;
  const socials = useMemo(
    () =>
      [
        { icon: Youtube, label: 'YouTube', url: safeUrl(c.socials.youtube) },
        { icon: Facebook, label: 'Facebook', url: safeUrl(c.socials.facebook) },
        { icon: Instagram, label: 'Instagram', url: safeUrl(c.socials.instagram) },
        { icon: PlayCircle, label: 'TikTok', url: safeUrl(c.socials.tiktok) },
        { icon: MessageCircle, label: 'WhatsApp', url: wa },
      ].filter((s) => s.url),
    [c.socials, wa]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFormResult(null);
    const { data, error } = await supabase.rpc('submit_contact_message', {
      p_kind: formKind,
      p_name: form.name,
      p_email: form.email || null,
      p_phone: form.phone || null,
      p_message: form.message,
    });
    setSending(false);
    const res = (data || {}) as { ok?: boolean; reason?: string };
    if (error || !res.ok) {
      setFormResult({ ok: false, text: REASONS[res.reason || ''] || 'Something went wrong. Please try again.' });
      return;
    }
    setForm({ name: '', email: '', phone: '', message: '' });
    setFormResult({
      ok: true,
      text:
        formKind === 'prayer'
          ? 'Thank you. Our prayer team will be praying with you.'
          : formKind === 'visit'
            ? 'Wonderful! We look forward to welcoming you.'
            : 'Thank you for reaching out. We’ll get back to you soon.',
    });
  };

  const WatchButton: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'sm' }) => (
    <a
      href="/live"
      className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-full font-black uppercase tracking-widest transition-transform hover:scale-[1.03] ${
        size === 'lg' ? 'px-7 py-4 text-xs sm:text-sm' : 'px-4 py-2 text-[10px] sm:text-[11px]'
      } ${live ? 'bg-rose-600 text-white shadow-[0_0_30px_rgba(225,29,72,0.5)]' : 'bg-gold-500 text-black'}`}
    >
      {live ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> : <PlayCircle size={size === 'lg' ? 18 : 14} />}
      {live ? 'Watch Live' : 'Watch Online'}
    </a>
  );

  return (
    <div className="bg-white text-slate-900 font-sans">
      {/* ---------- Navigation ---------- */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all ${
          scrolled || menuOpen ? 'bg-black/90 backdrop-blur border-b border-white/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 min-w-0" aria-label="Back to top">
            <Logo size={38} hideText />
            <span className="font-black text-xs sm:text-sm tracking-tight text-gold-500 truncate">{CHURCH_NAME_UPPER}</span>
          </button>
          <nav className="hidden xl:flex items-center gap-6">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => scrollTo(n.id)}
                className="text-[11px] font-black uppercase tracking-widest text-slate-300 hover:text-gold-400"
              >
                {n.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <WatchButton />
            <button
              className="xl:hidden p-2 text-white"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="xl:hidden border-t border-white/10 bg-black px-4 py-4 grid grid-cols-2 gap-2">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setMenuOpen(false);
                  scrollTo(n.id);
                }}
                className="text-left px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-200 bg-white/5"
              >
                {n.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative min-h-[100svh] flex items-center bg-black text-white overflow-hidden">
        {heroImage ? (
          <>
            <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
          </>
        ) : (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 -left-40 w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-gold-600/30 blur-[140px]" />
            <div className="absolute -bottom-40 -right-40 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-gold-900/40 blur-[140px]" />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-20 w-full">
          <div className="max-w-3xl">
            {live && (
              <a
                href="/live"
                className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-rose-600/20 border border-rose-500/40 text-rose-200 text-xs font-bold"
              >
                <Radio size={14} className="animate-pulse" /> Live now: {live.title}
                <ChevronRight size={14} />
              </a>
            )}
            <div className="text-[11px] sm:text-xs font-black uppercase tracking-[0.4em] text-gold-400 mb-5">{c.hero.eyebrow}</div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">{c.hero.title}</h1>
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">{c.hero.subtitle}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <WatchButton size="lg" />
              <button
                onClick={() => {
                  setFormKind('visit');
                  scrollTo('contact');
                }}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/25 text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-white/10"
              >
                Plan a visit
              </button>
            </div>
            {!live && nextStream && (
              <div className="mt-8 text-sm text-slate-400">
                Next online service: <span className="text-white font-bold">{nextStream.title}</span> · {fmtDay(nextStream.scheduled_at)},{' '}
                {new Date(nextStream.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Service times strip ---------- */}
      <section id="services" className="bg-gold-500 text-black scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-6 md:grid-cols-[1fr_auto] items-center">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.serviceTimes.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <Clock size={22} className="shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{s.day}</div>
                  <div className="font-black text-lg leading-tight">{s.name}</div>
                  <div className="font-bold">{s.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 md:max-w-xs">
            <MapPin size={22} className="shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Join us at</div>
              <div className="font-black leading-snug">{c.location.address}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Welcome ---------- */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Heart className="mx-auto text-gold-500 mb-6" size={34} />
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">{c.welcome.title}</h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">{c.welcome.body}</p>
        </div>
      </section>

      {/* ---------- About ---------- */}
      <section id="about" className="bg-slate-50 py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid gap-12 lg:grid-cols-2 items-start">
          <div>
            <SectionTitle eyebrow="About us" title={c.about.title} />
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{c.about.body}</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="p-6 rounded-3xl bg-white border border-slate-200">
                <div className="text-[10px] font-black uppercase tracking-widest text-gold-600 mb-2">Our mission</div>
                <p className="font-bold text-slate-800 leading-snug">{c.about.mission}</p>
              </div>
              <div className="p-6 rounded-3xl bg-white border border-slate-200">
                <div className="text-[10px] font-black uppercase tracking-widest text-gold-600 mb-2">Our vision</div>
                <p className="font-bold text-slate-800 leading-snug">{c.about.vision}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-[11px] font-black uppercase tracking-[0.35em] text-gold-500">What we believe</div>
            {c.beliefs.map((b, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white border border-slate-200 flex gap-4">
                <BookOpen className="text-gold-500 shrink-0" size={22} />
                <div>
                  <div className="font-black text-slate-900">{b.title}</div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pastor ---------- */}
      {c.pastor.name && (
        <section className="bg-black text-white py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-12 md:grid-cols-[minmax(0,320px)_1fr] items-center">
            <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-gold-600/40 to-slate-900 border border-white/10 flex items-center justify-center">
              {pastorPhoto ? (
                <img src={pastorPhoto} alt={c.pastor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-7xl font-black text-gold-400/80">
                  {c.pastor.name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')}
                </span>
              )}
            </div>
            <div>
              <SectionTitle eyebrow={c.pastor.title || 'Our pastor'} title={c.pastor.name} light />
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">{c.pastor.bio}</p>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Ministries ---------- */}
      <section id="ministries" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="Get involved" title="Ministries" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.ministries.map((m, i) => (
              <div key={i} className="group p-7 rounded-3xl border border-slate-200 hover:border-gold-400 hover:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center mb-5 group-hover:bg-gold-500 group-hover:text-black transition-colors">
                  <Users size={22} />
                </div>
                <div className="font-black text-lg">{m.title}</div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Online church banner ---------- */}
      <section className="px-4 sm:px-6">
        <div className="max-w-7xl mx-auto rounded-[2.5rem] bg-black text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(197,146,53,0.45),transparent_55%)]" />
          <div className="relative p-8 sm:p-14 grid gap-8 md:grid-cols-[1fr_auto] items-center">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.35em] text-gold-400 mb-3">
                <Radio size={14} /> Online church
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                {live ? `We're live: ${live.title}` : 'Worship with us from anywhere'}
              </h2>
              <p className="mt-3 text-slate-300 max-w-xl">
                Watch our services live, join the online congregation, chat with the church family and catch up on past messages.
              </p>
            </div>
            <WatchButton size="lg" />
          </div>
        </div>
      </section>

      {/* ---------- Events ---------- */}
      <section id="events" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle eyebrow="What's coming up" title="Upcoming events" />
          {events.length === 0 ? (
            <p className="text-slate-500">New events will be announced here soon. Follow us on social media for updates.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev) => {
                const d = new Date(`${ev.event_date}T00:00:00`);
                return (
                  <div key={ev.id} className="p-6 rounded-3xl border border-slate-200 flex gap-5">
                    <div className="w-16 shrink-0 rounded-2xl bg-black text-white text-center py-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gold-400">
                        {d.toLocaleDateString([], { month: 'short' })}
                      </div>
                      <div className="text-2xl font-black">{d.getDate()}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-lg leading-tight">{ev.name}</div>
                      <div className="text-sm text-slate-500 mt-2 flex items-center gap-1.5">
                        <CalendarDays size={14} /> {d.toLocaleDateString([], { weekday: 'long' })} · {fmtTime(ev.event_time)}
                      </div>
                      <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPin size={14} /> {ev.location}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Messages ---------- */}
      <section id="messages" className="bg-slate-50 py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow="Be encouraged" title="Recent messages" />
            <a href="/live" className="mb-10 inline-flex items-center gap-1 text-sm font-black text-gold-700 hover:underline">
              All online services <ChevronRight size={16} />
            </a>
          </div>
          {replays.length === 0 && sermons.length === 0 ? (
            <p className="text-slate-500">Messages will appear here after our services.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {replays.map((r) => (
                <a key={r.id} href="/live" className="group rounded-3xl overflow-hidden bg-white border border-slate-200 hover:shadow-xl transition-all">
                  <div className="aspect-video bg-gradient-to-br from-slate-900 to-black flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(197,146,53,0.35),transparent_60%)]" />
                    <PlayCircle size={52} className="relative text-gold-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {fmtShort(r.started_at || r.scheduled_at)}
                    </div>
                    <div className="font-black mt-1">{r.title}</div>
                    {r.preacher && <div className="text-sm text-slate-500">{r.preacher}</div>}
                  </div>
                </a>
              ))}
              {sermons.slice(0, Math.max(0, 6 - replays.length)).map((s) => (
                <div key={s.id} className="p-6 rounded-3xl bg-white border border-slate-200 flex gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center">
                    <Mic2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {s.type} · {fmtShort(s.created_at)}
                    </div>
                    <div className="font-black mt-1">{s.title}</div>
                    <div className="text-sm text-slate-500">{s.preacher}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Give ---------- */}
      <section id="give" className="py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Gift className="mx-auto text-gold-500 mb-6" size={34} />
          <SectionTitle eyebrow="Generosity" title="Give" center />
          <p className="-mt-4 text-slate-600 max-w-2xl mx-auto leading-relaxed">{c.give.intro}</p>
          {c.give.methods.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 text-left">
              {c.give.methods.map((g, i) => (
                <div key={i} className="p-6 rounded-3xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 font-black">
                    <HandHeart size={18} className="text-gold-600" /> {g.label}
                  </div>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-line font-medium">{g.details}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500">Giving details are available from the church office.</p>
          )}
        </div>
      </section>

      {/* ---------- Contact / prayer / visit ---------- */}
      <section id="contact" className="bg-black text-white py-20 sm:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="We'd love to hear from you" title="Get in touch" light />
            <div className="space-y-5">
              <div className="flex gap-4">
                <MapPin className="text-gold-500 shrink-0" size={22} />
                <div>
                  <div className="font-black">{c.location.address}</div>
                  {c.location.directions && <p className="text-sm text-slate-400 mt-1 whitespace-pre-line">{c.location.directions}</p>}
                </div>
              </div>
              {c.serviceTimes.length > 0 && (
                <div className="flex gap-4">
                  <Clock className="text-gold-500 shrink-0" size={22} />
                  <div className="text-sm text-slate-300 space-y-1">
                    {c.serviceTimes.map((s, i) => (
                      <div key={i}>
                        <span className="font-bold text-white">{s.day}</span> · {s.name} · {s.time}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {c.contact.phone && (
                <a href={`tel:${c.contact.phone.replace(/[^\d+]/g, '')}`} className="flex gap-4 hover:text-gold-400">
                  <Phone className="text-gold-500 shrink-0" size={22} /> <span className="font-bold">{c.contact.phone}</span>
                </a>
              )}
              {c.contact.email && (
                <a href={`mailto:${c.contact.email}`} className="flex gap-4 hover:text-gold-400">
                  <Mail className="text-gold-500 shrink-0" size={22} /> <span className="font-bold break-all">{c.contact.email}</span>
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="flex gap-4 hover:text-gold-400">
                  <MessageCircle className="text-gold-500 shrink-0" size={22} /> <span className="font-bold">Chat on WhatsApp</span>
                </a>
              )}
            </div>
            {c.location.mapQuery && (
              <div className="mt-8 rounded-3xl overflow-hidden border border-white/10 aspect-[16/10]">
                <iframe
                  title="Map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(c.location.mapQuery)}&output=embed`}
                  className="w-full h-full grayscale-[40%]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
            {branches.length > 1 && (
              <div className="mt-8">
                <div className="text-[11px] font-black uppercase tracking-[0.35em] text-gold-500 mb-3">Our locations</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {branches.map((b) => (
                    <div key={b.id} className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm">
                      <div className="font-bold">{b.name}</div>
                      <div className="text-slate-400">{b.location}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] bg-white/[0.04] border border-white/10 p-6 sm:p-8">
            <div className="grid grid-cols-3 gap-2 mb-6">
              {(
                [
                  ['prayer', 'Prayer request'],
                  ['visit', 'Plan a visit'],
                  ['contact', 'Message us'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setFormKind(k);
                    setFormResult(null);
                  }}
                  className={`px-2 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                    formKind === k ? 'bg-gold-500 text-black' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {formResult?.ok ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={44} className="mx-auto text-emerald-400 mb-4" />
                <p className="font-bold">{formResult.text}</p>
                <button onClick={() => setFormResult(null)} className="mt-6 text-sm text-gold-400 font-bold hover:underline">
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  required
                  maxLength={80}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-gold-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="email"
                    maxLength={160}
                    placeholder="Email (optional)"
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-gold-500"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <input
                    type="tel"
                    maxLength={30}
                    placeholder="Phone (optional)"
                    autoComplete="tel"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-gold-500"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <textarea
                  required
                  rows={5}
                  maxLength={3000}
                  placeholder={
                    formKind === 'prayer'
                      ? 'How can we pray for you?'
                      : formKind === 'visit'
                        ? 'When are you planning to visit? Anything we should know (children, accessibility)?'
                        : 'Your message'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-gold-500"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                {formKind === 'prayer' && (
                  <p className="text-xs text-slate-500">Prayer requests are seen only by our pastoral team.</p>
                )}
                {formResult && !formResult.ok && <p className="text-sm text-amber-300">{formResult.text}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 rounded-xl bg-gold-500 text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-slate-950 text-slate-400 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-8 md:grid-cols-3 items-start">
          <div className="flex items-center gap-3">
            <Logo size={44} hideText />
            <div>
              <div className="font-black text-sm text-gold-500">{CHURCH_NAME_UPPER}</div>
              <div className="text-xs">{c.location.address}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="hover:text-gold-400">
                {n.label}
              </button>
            ))}
            <a href="/live" className="hover:text-gold-400">
              Watch online
            </a>
          </div>
          <div className="flex md:justify-end gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url!}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:text-gold-400 hover:border-gold-500"
              >
                <s.icon size={18} />
              </a>
            ))}
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap justify-between gap-2 text-[11px]">
            <span>
              © {new Date().getFullYear()} {CHURCH_NAME}. All rights reserved.
            </span>
            <a href="/console" className="hover:text-gold-400">
              Staff login
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WebsitePage;
