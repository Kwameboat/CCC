import { supabase } from './supabase';
import { CHURCH_NAME } from './brand';

/** Everything on the public website that staff can edit in Console → Website. */
export interface ServiceTime {
  day: string;
  name: string;
  time: string;
}
export interface TitledText {
  title: string;
  body: string;
}
export interface GiveMethod {
  label: string;
  details: string;
}

export interface SiteContent {
  hero: { eyebrow: string; title: string; subtitle: string; imageUrl: string };
  welcome: { title: string; body: string };
  serviceTimes: ServiceTime[];
  location: { address: string; mapQuery: string; directions: string };
  contact: { phone: string; email: string; whatsapp: string };
  about: { title: string; body: string; mission: string; vision: string };
  beliefs: TitledText[];
  pastor: { name: string; title: string; bio: string; photoUrl: string };
  ministries: TitledText[];
  give: { intro: string; methods: GiveMethod[] };
  socials: { youtube: string; facebook: string; instagram: string; tiktok: string };
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    eyebrow: 'Welcome home',
    title: CHURCH_NAME,
    subtitle: 'A family of believers growing in grace, rooted in the Word and reaching our city with the love of Christ.',
    imageUrl: '',
  },
  welcome: {
    title: 'You belong here',
    body:
      'Whether you are exploring faith for the first time or looking for a church family, there is a place for you at Charis Christian Center. Come as you are — we would love to meet you.',
  },
  serviceTimes: [{ day: 'Sunday', name: 'Celebration Service', time: '9:00 AM' }],
  location: { address: 'Accra, Ghana', mapQuery: 'Accra, Ghana', directions: '' },
  contact: { phone: '', email: '', whatsapp: '' },
  about: {
    title: 'Our story',
    body:
      'Charis Christian Center is a community built on the grace of God. We gather to worship, learn from the Scriptures, pray together and serve our community.',
    mission: 'To raise people who know God, grow in grace and make a difference in their world.',
    vision: 'A thriving church family transforming lives across our city and nation.',
  },
  beliefs: [
    { title: 'The Bible', body: 'We believe the Scriptures are the inspired Word of God and our guide for life.' },
    { title: 'Jesus Christ', body: 'We believe salvation is found in Jesus Christ alone, by grace through faith.' },
    { title: 'The Holy Spirit', body: 'We believe the Holy Spirit empowers every believer to live and serve.' },
  ],
  pastor: { name: '', title: 'Senior Pastor', bio: '', photoUrl: '' },
  ministries: [
    { title: 'Children', body: 'Fun, safe and Bible-centred teaching for our youngest members.' },
    { title: 'Youth', body: 'A place for teens and young adults to grow in faith and friendship.' },
    { title: 'Prayer', body: 'Standing together in prayer for our church, families and nation.' },
    { title: 'Outreach', body: 'Serving our community with practical love and the message of hope.' },
  ],
  give: {
    intro: 'Thank you for partnering with us through your tithes and offerings. Every gift helps us reach more people.',
    methods: [],
  },
  socials: { youtube: '', facebook: '', instagram: '', tiktok: '' },
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Deep-merge stored content over defaults so new fields always have a value. */
export const mergeSiteContent = (stored: unknown): SiteContent => {
  const merge = (base: unknown, over: unknown): unknown => {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (isObj(base)) {
      const out: Record<string, unknown> = { ...base };
      if (isObj(over)) for (const k of Object.keys(base)) out[k] = merge(base[k], over[k]);
      return out;
    }
    return typeof over === typeof base ? over : base;
  };
  return merge(DEFAULT_SITE_CONTENT, stored) as SiteContent;
};

export const loadSiteContent = async (): Promise<{ content: SiteContent; error: string | null }> => {
  const { data, error } = await supabase.from('site_content').select('content').eq('id', 'main').maybeSingle();
  if (error) return { content: DEFAULT_SITE_CONTENT, error: error.message };
  return { content: mergeSiteContent(data?.content), error: null };
};

/** Only allow https links (or mailto/tel built by us) in user-editable content. */
export const safeUrl = (raw: string): string | null => {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
};

export const whatsappLink = (num: string): string | null => {
  const digits = num.replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};
