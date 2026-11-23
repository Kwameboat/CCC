import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Radio, Volume2, VolumeX, Maximize, Play } from 'lucide-react';

interface HlsPlayerProps {
  src: string;
  title: string;
  autoplay?: boolean;
  /** Live streams retry while the broadcaster hasn't started yet. */
  live?: boolean;
}

type PlayerState = 'loading' | 'playing' | 'waiting' | 'paused' | 'error';

/**
 * The church's own video player for streams from the church streaming server (HLS / .m3u8).
 * Safari/iOS play HLS natively; other browsers use hls.js (loaded only when needed).
 */
const HlsPlayer: React.FC<HlsPlayerProps> = ({ src, title, autoplay = true, live = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [muted, setMuted] = useState(autoplay); // browsers only allow muted autoplay
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let retryTimer: number | undefined;
    let hls: { destroy: () => void } | null = null;

    const tryPlay = () => {
      video.play().then(
        () => setNeedsTap(false),
        () => setNeedsTap(true)
      );
    };

    const scheduleRetry = () => {
      if (destroyed || !live) return;
      setState('waiting');
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(start, 5000);
    };

    const start = async () => {
      if (destroyed) return;
      hls?.destroy();
      hls = null;

      // Native HLS (Safari, iOS, some Android browsers)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.onerror = () => scheduleRetry();
        video.onloadedmetadata = () => autoplay && tryPlay();
        video.load();
        return;
      }

      const { default: Hls } = await import('hls.js');
      if (destroyed) return;
      if (!Hls.isSupported()) {
        setState('error');
        return;
      }
      const instance = new Hls({ lowLatencyMode: true, backBufferLength: 30, liveDurationInfinity: true });
      hls = instance;
      instance.on(Hls.Events.MANIFEST_PARSED, () => autoplay && tryPlay());
      instance.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          instance.recoverMediaError();
        } else {
          // Network error: stream not started yet, ended, or connection dropped
          instance.destroy();
          hls = null;
          scheduleRetry();
        }
      });
      instance.loadSource(src);
      instance.attachMedia(video);
    };

    const onPlaying = () => setState('playing');
    const onWaiting = () => setState((s) => (s === 'playing' ? 'loading' : s));
    const onPause = () => setState((s) => (s === 'playing' ? 'paused' : s));
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('pause', onPause);

    setState('loading');
    start();

    return () => {
      destroyed = true;
      window.clearTimeout(retryTimer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('pause', onPause);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [src, live, autoplay]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => undefined);
  };

  const goFullscreen = () => {
    const el = wrapRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => undefined);
    else if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iOS
  };

  const tapToPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    v.play().then(() => setNeedsTap(false)).catch(() => undefined);
  };

  return (
    <div ref={wrapRef} className="relative w-full h-full bg-black group">
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        muted={muted}
        controls={state === 'playing' || state === 'paused'}
        title={title}
        aria-label={title}
      />

      {state === 'playing' && live && (
        <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
        </span>
      )}

      {state === 'playing' && (
        <div className="absolute top-3 right-3 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={goFullscreen}
            className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label="Full screen"
          >
            <Maximize size={16} />
          </button>
        </div>
      )}

      {state === 'playing' && muted && !needsTap && (
        <button
          onClick={toggleMute}
          className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500 text-black text-xs font-black uppercase tracking-widest shadow-lg"
        >
          <VolumeX size={14} /> Tap to unmute
        </button>
      )}

      {needsTap && state !== 'waiting' && (
        <button onClick={tapToPlay} className="absolute inset-0 flex items-center justify-center bg-black/40" aria-label="Play">
          <span className="w-20 h-20 rounded-full bg-gold-500 text-black flex items-center justify-center shadow-2xl">
            <Play size={34} fill="currentColor" />
          </span>
        </button>
      )}

      {(state === 'loading' || state === 'waiting' || state === 'error') && !needsTap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-300 pointer-events-none">
          {state === 'loading' && <Loader2 size={40} className="animate-spin text-gold-500" />}
          {state === 'waiting' && (
            <>
              <Radio size={44} className="text-gold-500 animate-pulse mb-3" />
              <div className="font-black text-white">Waiting for the broadcast to start…</div>
              <div className="text-xs mt-1">This will start playing automatically.</div>
            </>
          )}
          {state === 'error' && <div className="font-bold">This browser can’t play the stream. Please try Chrome, Safari or Firefox.</div>}
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
