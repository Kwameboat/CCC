/**
 * Turn a livestream / video page URL into an embeddable player URL.
 * Supports YouTube (watch, youtu.be, /live/, /embed/, /shorts/, channel live),
 * Vimeo (videos and live events) and Facebook videos. Returns null when the
 * link can't be embedded — callers should then show an "open stream" link.
 */
export type StreamProvider = 'youtube' | 'vimeo' | 'facebook' | 'hls' | 'unknown';

export interface StreamEmbed {
  provider: StreamProvider;
  embedUrl: string | null;
  /** Set for streams from the church streaming server — play with <HlsPlayer>. */
  hlsUrl?: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export const parseStreamUrl = (raw: string, opts: { autoplay?: boolean } = {}): StreamEmbed => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { provider: 'unknown', embedUrl: null };
  }
  if (url.protocol !== 'https:') return { provider: 'unknown', embedUrl: null };

  // ---- Church streaming server (HLS)
  if (/\.m3u8$/i.test(url.pathname)) {
    return { provider: 'hls', embedUrl: null, hlsUrl: url.toString() };
  }

  const host = url.hostname.replace(/^www\.|^m\./, '').toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  const auto = opts.autoplay ? '1' : '0';

  // ---- YouTube
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    let id: string | null = null;
    if (host === 'youtu.be') id = parts[0] || null;
    else if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (['live', 'embed', 'shorts', 'v'].includes(parts[0])) id = parts[1] || null;

    if (id && YT_ID.test(id)) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${id}?autoplay=${auto}&rel=0&modestbranding=1&playsinline=1`,
      };
    }
    // Channel's current live stream: youtube.com/channel/UCxxxx/live
    if (parts[0] === 'channel' && parts[1] && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1])) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/live_stream?channel=${parts[1]}&autoplay=${auto}&playsinline=1`,
      };
    }
    return { provider: 'youtube', embedUrl: null };
  }

  // ---- Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    if (parts[0] === 'event' && /^\d+$/.test(parts[1] || '')) {
      return { provider: 'vimeo', embedUrl: `https://vimeo.com/event/${parts[1]}/embed?autoplay=${auto}` };
    }
    const numeric = parts.find((p) => /^\d+$/.test(p));
    if (numeric) {
      return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${numeric}?autoplay=${auto}&playsinline=1` };
    }
    return { provider: 'vimeo', embedUrl: null };
  }

  // ---- Facebook
  if (host === 'facebook.com' || host === 'fb.watch' || host === 'web.facebook.com') {
    const href = encodeURIComponent(url.toString());
    return {
      provider: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&autoplay=${auto === '1'}`,
    };
  }

  return { provider: 'unknown', embedUrl: null };
};

export const providerLabel = (p: StreamProvider): string =>
  p === 'youtube'
    ? 'YouTube'
    : p === 'vimeo'
      ? 'Vimeo'
      : p === 'facebook'
        ? 'Facebook'
        : p === 'hls'
          ? 'Church streaming server'
          : 'External';

/** Build the HLS address for a path on the church streaming server. */
export const churchStreamUrl = (webUrl: string, path = 'live'): string | null => {
  try {
    const u = new URL(webUrl.trim());
    if (u.protocol !== 'https:') return null;
    const clean = path.replace(/[^A-Za-z0-9_-]/g, '') || 'live';
    return `${u.origin}/${clean}/index.m3u8`;
  } catch {
    return null;
  }
};
