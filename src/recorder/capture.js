import { chromium }   from 'playwright';
import fs              from 'node:fs/promises';
import path            from 'node:path';
import { virtualTimeScript } from './virtualTime.js';
import { startServer }       from './server.js';

// The DC runtime replaces the raw <x-dc> template with <div id="dc-root"> and renders
// into it. Scoping to #dc-root is what distinguishes the *mounted* stage from the raw
// template — the raw template also carries [data-screen-label], but with unresolved
// {{ }} bindings, and capturing it produces a static, mis-rendered frame.
const STAGE_SELECTOR = '#dc-root [data-screen-label]';

/** Anything an author marks with this attribute is hidden before capture. */
const DEFAULT_HIDE = ['[data-htv-hide]'];

function hideCss(extraSelectors = []) {
  const selectors = [...DEFAULT_HIDE, ...extraSelectors];
  return `${selectors.join(',\n')} { display: none !important; }\n* { cursor: none !important; }`;
}

/**
 * Poll (from Node, on a real timer) until the DC runtime has mounted #dc-root and resolved
 * its {{ }} bindings, or the timeout elapses. Returns true if mounted, false on timeout.
 */
async function waitForMount(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const isReady = () => {
    const root = document.getElementById('dc-root');
    if (!root) return false;                                   // <x-dc> not yet replaced
    const stage = root.querySelector('[data-screen-label]');
    if (!stage) return false;                                  // React hasn't committed content
    return !(stage.getAttribute('data-screen-label') || '').includes('{{'); // bindings evaluated
  };
  for (;;) {
    if (await page.evaluate(isReady)) return true;
    if (Date.now() >= deadline) return false;
    await new Promise(r => setTimeout(r, 100));
  }
}

/**
 * Deterministically capture every frame of an animation to a PNG sequence.
 *
 * @param {object} opts
 * @param {string}   opts.projectRoot     - absolute path to the project folder (served as the web root)
 * @param {string}   opts.animationFile   - path relative to projectRoot, e.g. "animations/Intro.dc.html"
 * @param {number}   opts.duration        - animation duration in seconds
 * @param {number}   opts.fps             - frames per second
 * @param {number}   opts.width           - viewport width (native master resolution)
 * @param {number}   opts.height          - viewport height
 * @param {string}   opts.framesDir       - absolute path to write PNGs into
 * @param {string[]} [opts.hideSelectors] - extra CSS selectors to hide before capture
 * @param {boolean}  [opts.alpha]         - capture with transparent background
 * @param {boolean}  [opts.verbose]
 * @returns {Promise<number>}             - number of frames written
 */
export async function captureFrames({
  projectRoot, animationFile, duration, fps, width, height, framesDir,
  hideSelectors = [], alpha = false, verbose = false,
}) {
  await fs.mkdir(framesDir, { recursive: true });

  const server  = await startServer(projectRoot);
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport:          { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Capture-time diagnostics. The DC runtime loads React/ReactDOM from a CDN; a blocked
    // or slow request there is the most likely reason a page never mounts. Collect these
    // always, stream them in verbose, and dump them if readiness times out — otherwise the
    // failure is silent and looks like a rendering bug.
    const diagnostics = [];
    const record = (line) => {
      diagnostics.push(line);
      if (verbose) console.log(line);
    };
    page.on('console', (msg) => {
      const type = msg.type();
      if (verbose || type === 'error' || type === 'warning') {
        record(`  [page console.${type}] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => record(`  [page error] ${err.message}`));
    page.on('requestfailed', (req) => {
      const reason = req.failure()?.errorText || 'unknown';
      record(`  [request failed] ${req.url()} — ${reason}`);
    });

    // Virtual clock must be injected before any page JS runs
    await page.addInitScript({ content: virtualTimeScript });

    const animUrl = `${server.url}/${animationFile.split(path.sep).map(encodeURIComponent).join('/')}`;
    if (verbose) console.log(`  Loading ${animUrl}`);

    await page.goto(animUrl, { waitUntil: 'domcontentloaded' });

    // Wait until the DC runtime has actually mounted AND evaluated its bindings — not just
    // until a [data-screen-label] exists (that attribute is present in the raw template too,
    // before React renders). Require: #dc-root exists, it contains the stage, and the stage's
    // label binding has resolved (no literal "{{").
    //
    // We poll from Node, NOT via page.waitForFunction: the virtual clock injected above
    // overrides the page's setTimeout/requestAnimationFrame, and Playwright's in-page polling
    // relies on exactly those — so an in-page wait for a not-yet-true condition would freeze.
    // Each page.evaluate() below is a one-shot synchronous check; the delay is a real Node timer.
    const mounted = await waitForMount(page, 30_000);
    if (!mounted) {
      const detail = diagnostics.length
        ? `\n\n  Captured page diagnostics:\n${diagnostics.join('\n')}`
        : '';
      throw new Error(
        `Timed out after 30s waiting for the animation to render.\n` +
        `  The DC runtime never mounted #dc-root with resolved {{ }} bindings.\n` +
        `  Most common cause: React failed to load — support.js fetches it from unpkg.com,\n` +
        `  so a blocked proxy or offline machine will hang here. Re-run with --verbose for live logs.` +
        detail
      );
    }
    await page.evaluate(() => document.fonts.ready);

    await page.addStyleTag({ content: hideCss(hideSelectors) });
    if (alpha) {
      await page.addStyleTag({ content: 'html, body { background: transparent !important; }' });
    }

    // Two real rAF ticks — lets the framework finish its initial commit + paint
    await page.evaluate(() => new Promise(r => window.__realRAF(r)));
    await page.evaluate(() => new Promise(r => window.__realRAF(r)));

    const totalFrames = Math.round(fps * duration);
    const msPerFrame  = 1000 / fps;

    if (verbose) console.log(`  Capturing ${totalFrames} frames (${fps}fps × ${duration}s)`);

    const stage = page.locator(STAGE_SELECTOR).first();

    for (let i = 0; i < totalFrames; i++) {
      // Advance virtual clock — fires the animation's rAF/timers
      await page.evaluate((ms) => window.__htvSetTime(ms), i * msPerFrame);

      // One real paint cycle so the framework commits the state update to the DOM
      await page.evaluate(() => new Promise(r => window.__realRAF(r)));

      const buf = await stage.screenshot({
        type:             'png',
        omitBackground:   alpha,
      });
      await fs.writeFile(path.join(framesDir, String(i).padStart(6, '0') + '.png'), buf);
    }

    return totalFrames;

  } finally {
    await browser.close();
    await server.close();
  }
}
