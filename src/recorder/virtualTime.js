// Injected via page.addInitScript() — runs before any page JS.
// Overrides all time sources with a virtual clock controllable from Node.
export const virtualTimeScript = `(() => {
  // Preserve originals before any overrides
  const _realRAF    = window.requestAnimationFrame.bind(window);
  const _realCAF    = window.cancelAnimationFrame.bind(window);

  // Exposed to Node via page.evaluate
  window.__realRAF = _realRAF;

  let virtualMs = 0;
  const rafQueue = [];
  const timers   = [];
  let   rafId    = 0;
  let   timerId  = 0;

  // Null out localStorage so the animation can't restore a saved scrub position
  try {
    const _nil = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, length: 0 };
    Object.defineProperty(window, 'localStorage', { get: () => _nil, configurable: true });
  } catch(_) {}

  window.__htvSetTime = (ms) => {
    virtualMs = ms;
    // Fire due timers in chronological order
    const due = timers.filter(t => !t.fired && t.at <= ms).sort((a, b) => a.at - b.at);
    for (const t of due) {
      t.fired = true;
      try { t.fn(); } catch(e) { console.warn('[htv-vt] timer error', e && e.message); }
      if (t.interval != null) {
        t.fired = false;
        t.at   += t.interval;
      }
    }
    // Flush rAF queue (copy first so re-queues go into next flush)
    const cbs = rafQueue.splice(0);
    for (const cb of cbs) {
      try { cb(ms); } catch(e) { console.warn('[htv-vt] rAF error', e && e.message); }
    }
  };

  // Override time sources
  Date.now          = () => virtualMs;
  performance.now   = () => virtualMs;

  // Override rAF
  window.requestAnimationFrame  = (cb) => { rafQueue.push(cb); return ++rafId; };
  window.cancelAnimationFrame   = ()   => {};

  // Override timers
  window.setTimeout  = (fn, ms = 0, ...args) => {
    const id = ++timerId;
    timers.push({ id, fn: () => fn(...args), at: virtualMs + (ms || 0), fired: false, interval: null });
    return id;
  };
  window.clearTimeout  = (id) => { const t = timers.find(t => t.id === id); if (t) t.fired = true; };
  window.setInterval   = (fn, ms = 0, ...args) => {
    const id = ++timerId;
    timers.push({ id, fn: () => fn(...args), at: virtualMs + (ms || 0), fired: false, interval: ms || 0 });
    return id;
  };
  window.clearInterval = (id) => { const t = timers.find(t => t.id === id); if (t) t.fired = true; };
})();`;
