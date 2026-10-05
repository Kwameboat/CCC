type ToastKind = 'success' | 'error' | 'info';

const ensureHost = () => {
  let host = document.getElementById('ccc-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'ccc-toast-host';
    host.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(host);
  }
  return host;
};

export const showToast = (message: string, kind: ToastKind = 'info') => {
  const host = ensureHost();
  const el = document.createElement('div');
  const bg =
    kind === 'success' ? '#059669' : kind === 'error' ? '#e11d48' : '#0f172a';
  el.style.cssText = `
    pointer-events:auto;max-width:360px;padding:14px 18px;border-radius:16px;
    background:${bg};color:#fff;font:700 12px/1.4 Inter,system-ui,sans-serif;
    letter-spacing:0.04em;box-shadow:0 20px 40px rgba(0,0,0,.25);
    opacity:0;transform:translateY(8px);transition:all .25s ease;
  `;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 250);
  }, 3200);
};
