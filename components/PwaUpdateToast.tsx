import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/** Brief overlay when an automatic PWA update is applying */
const PwaUpdateToast: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdating = () => setVisible(true);
    window.addEventListener('ccc:pwa-updating', onUpdating);
    return () => window.removeEventListener('ccc:pwa-updating', onUpdating);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[2000] pointer-events-none">
      <div className="mx-auto sm:mx-0 max-w-sm bg-slate-950 text-white rounded-2xl px-4 py-3 shadow-2xl border border-gold-500/40 flex items-center gap-3">
        <RefreshCw size={18} className="text-gold-400 animate-spin shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-widest text-gold-400">Updating CCC Console</div>
          <p className="text-[11px] text-slate-300 font-medium mt-0.5">New version installing — refreshing…</p>
        </div>
      </div>
    </div>
  );
};

export default PwaUpdateToast;
