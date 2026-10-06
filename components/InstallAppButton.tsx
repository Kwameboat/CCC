import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Smartphone } from 'lucide-react';
import {
  canPromptInstall,
  isStandaloneDisplay,
  promptInstall,
  subscribeInstallAvailability,
} from '../lib/pwa';
import { showToast } from '../lib/toast';

type Variant = 'header' | 'banner' | 'login';

interface InstallAppButtonProps {
  variant?: Variant;
  className?: string;
}

const DISMISS_KEY = 'ccc_pwa_install_dismissed';

const InstallAppButton: React.FC<InstallAppButtonProps> = ({ variant = 'header', className = '' }) => {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    setAvailable(canPromptInstall());
    return subscribeInstallAvailability(() => {
      setAvailable(canPromptInstall());
      setInstalled(isStandaloneDisplay());
    });
  }, []);

  const handleInstall = async () => {
    setBusy(true);
    const result = await promptInstall();
    setBusy(false);
    if (result === 'accepted') {
      showToast('CCC Console installed. Open it from your home screen.', 'success');
      setInstalled(true);
      setAvailable(false);
    } else if (result === 'dismissed') {
      showToast('Install cancelled.', 'info');
    } else {
      // iOS / browsers without beforeinstallprompt — show guidance
      const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      showToast(
        isiOS
          ? 'On iPhone: Share → Add to Home Screen'
          : 'Use your browser menu → Install app / Add to Home Screen',
        'info'
      );
    }
  };

  const dismissBanner = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  if (installed) {
    if (variant === 'header') return null;
    return (
      <div className={`flex items-center gap-2 text-emerald-600 text-xs font-black uppercase tracking-widest ${className}`}>
        <CheckCircle2 size={16} /> App installed
      </div>
    );
  }

  // Always show a one-click control; if native prompt isn't ready yet, guide the user
  if (variant === 'banner') {
    if (dismissed) return null;
    return (
      <div className={`bg-slate-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gold-500/30 shadow-lg ${className}`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 bg-gold-500 text-black rounded-xl shrink-0">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0">
            <div className="font-black uppercase tracking-tight text-sm sm:text-base">Install CCC Console</div>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              One tap to add the app to your phone or computer — works offline for reopen.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={dismissBanner}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={busy}
            className="px-4 py-2.5 bg-gold-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gold-400 disabled:opacity-60"
          >
            <Download size={14} />
            {busy ? 'Opening…' : available ? 'Install App' : 'Install'}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'login') {
    return (
      <button
        type="button"
        onClick={handleInstall}
        disabled={busy}
        className={`w-full py-3.5 rounded-2xl border border-gold-500/40 bg-gold-500/10 text-gold-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gold-500 hover:text-black transition-all disabled:opacity-60 ${className}`}
      >
        <Download size={16} />
        {busy ? 'Opening…' : 'Install App — One Click'}
      </button>
    );
  }

  // header
  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={busy}
      title="Install CCC Console"
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gold-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-gold-400 transition-all disabled:opacity-60 shrink-0 ${className}`}
    >
      <Download size={14} />
      <span className="hidden sm:inline">{busy ? '…' : 'Install'}</span>
    </button>
  );
};

export default InstallAppButton;
