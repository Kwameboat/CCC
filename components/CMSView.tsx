import React, { useEffect, useState } from 'react';
import {
  Globe,
  Save,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Inbox,
  PenSquare,
  RefreshCw,
  Mail,
  Phone,
  Archive,
  CheckCheck,
  HandHeart,
  CalendarCheck,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import { DEFAULT_SITE_CONTENT, SiteContent, loadSiteContent } from '../lib/siteContent';

interface ContactMessage {
  id: string;
  kind: 'prayer' | 'contact' | 'visit';
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  status: 'new' | 'read' | 'archived';
  created_at: string;
}

const KIND_META: Record<ContactMessage['kind'], { label: string; icon: typeof Mail; tone: string }> = {
  prayer: { label: 'Prayer', icon: HandHeart, tone: 'bg-violet-50 text-violet-700' },
  visit: { label: 'Visit', icon: CalendarCheck, tone: 'bg-emerald-50 text-emerald-700' },
  contact: { label: 'Message', icon: MessageSquare, tone: 'bg-blue-50 text-blue-700' },
};

const inputCls = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-gold-500';
const labelCls = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1';

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
}> = ({ label, value, onChange, multiline, placeholder, hint }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {multiline ? (
      <textarea rows={4} className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    )}
    {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">{title}</h3>
      {action}
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </div>
);

const CMSView: React.FC = () => {
  const [tab, setTab] = useState<'content' | 'inbox'>('content');
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgFilter, setMsgFilter] = useState<'open' | 'archived'>('open');

  useEffect(() => {
    loadSiteContent().then(({ content: c, error }) => {
      if (error && /site_content/.test(error) && /does not exist|schema cache/.test(error)) setSchemaMissing(true);
      else if (error) showToast(error, 'error');
      setContent(c);
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('site_content')
      .upsert({ id: 'main', content, updated_at: new Date().toISOString(), updated_by: auth.user?.id || null });
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setDirty(false);
    showToast('Website updated. Changes are live.', 'success');
  };

  const fetchMessages = async () => {
    setMsgLoading(true);
    let q = supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200);
    q = msgFilter === 'archived' ? q.eq('status', 'archived') : q.neq('status', 'archived');
    const { data, error } = await q;
    setMsgLoading(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setMessages((data || []) as ContactMessage[]);
  };

  useEffect(() => {
    if (tab === 'inbox') fetchMessages();
  }, [tab, msgFilter]);

  const setStatus = async (m: ContactMessage, status: ContactMessage['status']) => {
    const { error } = await supabase.from('contact_messages').update({ status }).eq('id', m.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    fetchMessages();
  };

  const removeMessage = async (m: ContactMessage) => {
    if (!window.confirm(`Delete the message from ${m.name}? This can't be undone.`)) return;
    const { error } = await supabase.from('contact_messages').delete().eq('id', m.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    fetchMessages();
  };

  // Generic helpers for list fields
  const listUpdate = <T,>(key: 'serviceTimes' | 'beliefs' | 'ministries', items: T[]) =>
    update(key, items as unknown as SiteContent[typeof key]);

  if (schemaMissing) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-900 text-sm font-medium space-y-2">
        <div className="font-black uppercase tracking-tight">Website tables are missing</div>
        <p>
          Run <code className="font-bold">supabase/migrations/009_public_website.sql</code> from the repository in the Supabase SQL
          Editor, then refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Church Website</h2>
          <p className="text-slate-500 text-sm font-medium">Edit what visitors see on the public website and read their messages.</p>
        </div>
        <div className="flex flex-wrap gap-2 page-actions">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
          >
            <Globe size={16} /> View website <ExternalLink size={13} />
          </a>
          {tab === 'content' && (
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-2 px-5 py-2 bg-gold-500 text-black rounded-xl text-sm font-black hover:bg-gold-600 disabled:opacity-50 shadow-md"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {dirty ? 'Publish changes' : 'Saved'}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['content', 'Content', PenSquare],
            ['inbox', 'Inbox', Inbox],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
              tab === id ? 'bg-black text-gold-400' : 'bg-white border border-slate-200 text-slate-500'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'content' &&
        (loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Hero (top of the page)">
              <Field label="Small heading" value={content.hero.eyebrow} onChange={(v) => update('hero', { ...content.hero, eyebrow: v })} />
              <Field label="Main heading" value={content.hero.title} onChange={(v) => update('hero', { ...content.hero, title: v })} />
              <Field label="Intro text" multiline value={content.hero.subtitle} onChange={(v) => update('hero', { ...content.hero, subtitle: v })} />
              <Field
                label="Background photo link (optional)"
                value={content.hero.imageUrl}
                placeholder="https://…/church.jpg"
                hint="Must start with https://. Leave empty for the gold background."
                onChange={(v) => update('hero', { ...content.hero, imageUrl: v })}
              />
            </Card>

            <Card title="Welcome">
              <Field label="Heading" value={content.welcome.title} onChange={(v) => update('welcome', { ...content.welcome, title: v })} />
              <Field label="Text" multiline value={content.welcome.body} onChange={(v) => update('welcome', { ...content.welcome, body: v })} />
            </Card>

            <Card
              title="Service times"
              action={
                <button
                  onClick={() => listUpdate('serviceTimes', [...content.serviceTimes, { day: '', name: '', time: '' }])}
                  className="flex items-center gap-1 text-[11px] font-black uppercase text-gold-700"
                >
                  <Plus size={14} /> Add
                </button>
              }
            >
              {content.serviceTimes.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 items-end">
                  {(['day', 'name', 'time'] as const).map((k) => (
                    <div key={k}>
                      <label className={labelCls}>{k === 'name' ? 'Service' : k}</label>
                      <input
                        className={inputCls}
                        value={s[k]}
                        placeholder={k === 'day' ? 'Sunday' : k === 'time' ? '9:00 AM' : 'Celebration Service'}
                        onChange={(e) =>
                          listUpdate(
                            'serviceTimes',
                            content.serviceTimes.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => listUpdate('serviceTimes', content.serviceTimes.filter((_, j) => j !== i))}
                    className="p-2.5 text-slate-400 hover:text-rose-600"
                    aria-label="Remove service time"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </Card>

            <Card title="Location & contact">
              <Field label="Address" value={content.location.address} onChange={(v) => update('location', { ...content.location, address: v })} />
              <Field
                label="Map search"
                value={content.location.mapQuery}
                hint="What to search on Google Maps, e.g. the church name and area. Leave empty to hide the map."
                onChange={(v) => update('location', { ...content.location, mapQuery: v })}
              />
              <Field
                label="Directions (optional)"
                multiline
                value={content.location.directions}
                onChange={(v) => update('location', { ...content.location, directions: v })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Phone" value={content.contact.phone} onChange={(v) => update('contact', { ...content.contact, phone: v })} />
                <Field label="Email" value={content.contact.email} onChange={(v) => update('contact', { ...content.contact, email: v })} />
                <Field
                  label="WhatsApp number"
                  value={content.contact.whatsapp}
                  placeholder="233…"
                  onChange={(v) => update('contact', { ...content.contact, whatsapp: v })}
                />
              </div>
            </Card>

            <Card title="About">
              <Field label="Heading" value={content.about.title} onChange={(v) => update('about', { ...content.about, title: v })} />
              <Field label="Our story" multiline value={content.about.body} onChange={(v) => update('about', { ...content.about, body: v })} />
              <Field label="Mission" multiline value={content.about.mission} onChange={(v) => update('about', { ...content.about, mission: v })} />
              <Field label="Vision" multiline value={content.about.vision} onChange={(v) => update('about', { ...content.about, vision: v })} />
            </Card>

            <Card title="Pastor">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={content.pastor.name}
                  hint="Leave empty to hide this section."
                  onChange={(v) => update('pastor', { ...content.pastor, name: v })}
                />
                <Field label="Title" value={content.pastor.title} onChange={(v) => update('pastor', { ...content.pastor, title: v })} />
              </div>
              <Field label="Bio" multiline value={content.pastor.bio} onChange={(v) => update('pastor', { ...content.pastor, bio: v })} />
              <Field
                label="Photo link (optional)"
                value={content.pastor.photoUrl}
                placeholder="https://…/pastor.jpg"
                onChange={(v) => update('pastor', { ...content.pastor, photoUrl: v })}
              />
            </Card>

            {(
              [
                ['beliefs', 'What we believe'],
                ['ministries', 'Ministries'],
              ] as const
            ).map(([key, title]) => (
              <Card
                key={key}
                title={title}
                action={
                  <button
                    onClick={() => listUpdate(key, [...content[key], { title: '', body: '' }])}
                    className="flex items-center gap-1 text-[11px] font-black uppercase text-gold-700"
                  >
                    <Plus size={14} /> Add
                  </button>
                }
              >
                {content[key].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex gap-2">
                      <input
                        className={inputCls + ' font-bold'}
                        value={item.title}
                        placeholder="Title"
                        onChange={(e) => listUpdate(key, content[key].map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                      />
                      <button
                        onClick={() => listUpdate(key, content[key].filter((_, j) => j !== i))}
                        className="p-2.5 text-slate-400 hover:text-rose-600"
                        aria-label="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={item.body}
                      placeholder="Short description"
                      onChange={(e) => listUpdate(key, content[key].map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                    />
                  </div>
                ))}
              </Card>
            ))}

            <Card
              title="Giving"
              action={
                <button
                  onClick={() => update('give', { ...content.give, methods: [...content.give.methods, { label: '', details: '' }] })}
                  className="flex items-center gap-1 text-[11px] font-black uppercase text-gold-700"
                >
                  <Plus size={14} /> Add method
                </button>
              }
            >
              <Field label="Intro" multiline value={content.give.intro} onChange={(v) => update('give', { ...content.give, intro: v })} />
              {content.give.methods.length === 0 && (
                <p className="text-xs text-slate-400">Add Mobile Money, bank or other giving details. These are shown as text only.</p>
              )}
              {content.give.methods.map((g, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <input
                      className={inputCls + ' font-bold'}
                      value={g.label}
                      placeholder="e.g. Mobile Money"
                      onChange={(e) =>
                        update('give', {
                          ...content.give,
                          methods: content.give.methods.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                        })
                      }
                    />
                    <button
                      onClick={() => update('give', { ...content.give, methods: content.give.methods.filter((_, j) => j !== i) })}
                      className="p-2.5 text-slate-400 hover:text-rose-600"
                      aria-label="Remove giving method"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={g.details}
                    placeholder="Account name, number, reference…"
                    onChange={(e) =>
                      update('give', {
                        ...content.give,
                        methods: content.give.methods.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)),
                      })
                    }
                  />
                </div>
              ))}
            </Card>

            <Card title="Social media">
              {(['youtube', 'facebook', 'instagram', 'tiktok'] as const).map((k) => (
                <Field
                  key={k}
                  label={k}
                  value={content.socials[k]}
                  placeholder={`https://${k}.com/…`}
                  onChange={(v) => update('socials', { ...content.socials, [k]: v })}
                />
              ))}
            </Card>
          </div>
        ))}

      {tab === 'inbox' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {(['open', 'archived'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMsgFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest ${
                    msgFilter === f ? 'bg-gold-500 text-black' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {f === 'open' ? 'Inbox' : 'Archived'}
                </button>
              ))}
            </div>
            <button onClick={fetchMessages} className="p-2 bg-white border border-slate-200 rounded-lg" aria-label="Refresh">
              <RefreshCw size={16} className={msgLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {msgLoading && messages.length === 0 ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              {msgFilter === 'open' ? 'No messages yet. Prayer requests and visit plans from the website appear here.' : 'Nothing archived.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map((m) => {
                const meta = KIND_META[m.kind];
                return (
                  <li key={m.id} className={`p-5 ${m.status === 'new' ? 'bg-gold-50/40' : ''}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${meta.tone}`}>
                            <meta.icon size={12} /> {meta.label}
                          </span>
                          {m.status === 'new' && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-gold-700">New</span>
                          )}
                          <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <div className="font-black text-slate-900 mt-1">{m.name}</div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-1">
                          {m.email && (
                            <a href={`mailto:${m.email}`} className="flex items-center gap-1 hover:text-gold-700">
                              <Mail size={12} /> {m.email}
                            </a>
                          )}
                          {m.phone && (
                            <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-gold-700">
                              <Phone size={12} /> {m.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {m.status === 'new' && (
                          <button
                            onClick={() => setStatus(m, 'read')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600"
                          >
                            <CheckCheck size={13} /> Mark read
                          </button>
                        )}
                        <button
                          onClick={() => setStatus(m, m.status === 'archived' ? 'read' : 'archived')}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600"
                        >
                          <Archive size={13} /> {m.status === 'archived' ? 'Restore' : 'Archive'}
                        </button>
                        <button onClick={() => removeMessage(m)} className="p-1.5 text-slate-400 hover:text-rose-600" aria-label="Delete message">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-700 whitespace-pre-line break-words">{m.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CMSView;
