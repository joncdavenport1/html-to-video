import { test }    from 'node:test';
import assert       from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs           from 'node:fs';
import path         from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const PROJECT   = path.join(ROOT, 'example');
const OUT_DIR   = path.join(ROOT, 'tmp', 'test-renders');

test('renders the bundled example at 15fps to the hero preset', { timeout: 180_000 }, () => {
  const presetDir = path.join(OUT_DIR, 'Hero (1920x1080)');
  const mp4Path   = path.join(presetDir, 'Hello Motion.mp4');

  fs.rmSync(mp4Path, { force: true });

  execSync(
    `node "${path.join(ROOT, 'bin', 'html-to-video.js')}" render "Hello Motion" ` +
    `--preset hero --fps 15 --out "${OUT_DIR}" --no-cache`,
    { cwd: PROJECT, stdio: 'inherit' }
  );

  assert.ok(fs.existsSync(mp4Path), 'Output MP4 should exist at "Hero (1920x1080)/Hello Motion.mp4"');

  let probe;
  try {
    probe = execSync(`ffprobe -v quiet -print_format json -show_streams "${mp4Path}"`, { encoding: 'utf8' });
  } catch {
    assert.fail('ffprobe failed — is ffmpeg installed?');
  }

  const info        = JSON.parse(probe);
  const videoStream = info.streams.find(s => s.codec_type === 'video');
  assert.ok(videoStream, 'MP4 should contain a video stream');

  const duration = parseFloat(videoStream.duration);
  assert.ok(Math.abs(duration - 5.0) < 0.5, `Duration should be ~5.0s, got ${duration.toFixed(2)}s`);

  assert.equal(videoStream.width,  1920, 'Width should be 1920');
  assert.equal(videoStream.height, 1080, 'Height should be 1080');
});
