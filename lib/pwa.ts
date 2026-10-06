/** PWA helpers: install prompt + automatic updates for installed apps */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let updateInProgress = false;

const VERSION_KEY = 'ccc_pwa_version';
const CHECK_INTERVAL_MS = 60_000; // every 1 minute while app is open

const notify = () => listeners.forEach((fn) => fn());

export const isStandaloneDisplay = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

export const canPromptInstall = (): boolean => !!deferredPrompt && !isStandaloneDisplay();

export const subscribeInstallAvailability = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  deferredPrompt = null;
  notify();
  await event.prompt();
  const choice = await event.userChoice;
  return choice.outcome;
};

const reloadForUpdate = () => {
  if (updateInProgress) return;
  updateInProgress = true;
  try {
    // Brief signal for UI listeners (optional toast)
    window.dispatchEvent(new CustomEvent('ccc:pwa-updating'));
  } catch {
    /* ignore */
  }
  // Give toast a moment, then hard-reload to the new SW-controlled page
  setTimeout(() => {
    window.location.reload();
  }, 600);
};

const activateWaitingWorker = (reg: ServiceWorkerRegistration) => {
  const waiting = reg.waiting;
  if (!waiting) return;
  waiting.postMessage({ type: 'SKIP_WAITING' });
};

const watchRegistration = (reg: ServiceWorkerRegistration) => {
  // New worker installing → activate ASAP
  reg.addEventListener('updatefound', () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        // Updated SW ready — activate and reload
        activateWaitingWorker(reg);
      }
    });
  });

  // If a waiting worker already exists (tab was open during deploy)
  if (reg.waiting && navigator.serviceWorker.controller) {
    activateWaitingWorker(reg);
  }
};

const checkVersionFile = async (reg: ServiceWorkerRegistration) => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      await reg.update();
      return;
    }
    const data = (await res.json()) as { version?: string };
    const next = data.version || '';
    const prev = sessionStorage.getItem(VERSION_KEY) || '';
    if (!prev) {
      sessionStorage.setItem(VERSION_KEY, next);
      await reg.update();
      return;
    }
    if (next && next !== prev) {
      sessionStorage.setItem(VERSION_KEY, next);
      await reg.update();
      // If updatefound doesn't fire (same SW bytes somehow), still force reload after update attempt
      if (reg.waiting) activateWaitingWorker(reg);
    } else {
      await reg.update();
    }
  } catch {
    try {
      await reg.update();
    } catch {
      /* offline */
    }
  }
};

export const registerServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });

  // When the new SW takes control, reload once so the installed app runs the new build
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    reloadForUpdate();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      reloadForUpdate();
    }
  });

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    watchRegistration(reg);

    // Immediate + periodic update checks (keeps phone installs current)
    const runCheck = () => checkVersionFile(reg);
    runCheck();
    setInterval(() => {
      if (document.visibilityState === 'visible') runCheck();
    }, CHECK_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') runCheck();
    });
    window.addEventListener('focus', () => runCheck());
    window.addEventListener('online', () => runCheck());
  } catch (err) {
    console.warn('Service worker registration failed:', err);
  }
};
