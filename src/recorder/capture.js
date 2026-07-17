import { chromium }   from 'playwright';
import fs              from 'node:fs/promises';
import path            from 'node:path';
import { virtualTimeScript } from './virtualTime.js';
import { startServer }       from './server.js';

const STAGE_SELECTOR = '[data-screen-label]';

/** Anything an author marks with this attribute is hidden before capture. */
const DEFAULT_HIDE = ['[data-htv-hide]'];

function hideCss(extraSelectors = []) {
  const selectors = [...DEFAULT_HIDE, ...extraSelectors];
  return `${selectors.join(',\n')} { display: none !important; }\n* { cursor: none !important; }`;
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

    // Virtual clock must be injected before any page JS runs
    await page.addInitScript({ content: virtualTimeScript });

    const animUrl = `${server.url}/${animationFile.split(path.sep).map(encodeURIComponent).join('/')}`;
    if (verbose) console.log(`  Loading ${animUrl}`);

    await page.goto(animUrl, { waitUntil: 'domcontentloaded' });

    // Wait for the stage to mount and fonts to be ready
    await page.waitForFunction(
      (sel) => !!document.querySelector(sel),
      STAGE_SELECTOR,
      { timeout: 30_000 }
    ).catch(() => {
      throw new Error(
        `Animation never rendered a ${STAGE_SELECTOR} element within 30s.\n` +
        `  Every animation needs one element carrying data-screen-label — that element is what gets filmed.`
      );
    });
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

    for (let i = 0; i < totalFrames; i++) {
      // Advance virtual clock — fires the animation's rAF/timers
      await page.evaluate((ms) => window.__htvSetTime(ms), i * msPerFrame);

      // One real paint cycle so the framework commits the state update to the DOM
      await page.evaluate(() => new Promise(r => window.__realRAF(r)));

      const buf = await page.locator(STAGE_SELECTOR).screenshot({
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
