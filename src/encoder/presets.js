import { z }          from 'zod';
import { readFileSync } from 'node:fs';
import path             from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const SPECS_DIR  = path.resolve(__dirname, '../../specs');

const PresetSchema = z.object({
  label:       z.string(),
  width:       z.number(),
  height:      z.number(),
  fps:         z.number(),
  codec:       z.string(),
  bitrate:     z.string().optional(),
  pixelFormat: z.string(),
  container:   z.string(),
  defaultFit:  z.string(),
  transparent: z.boolean().optional(),
  platforms:   z.array(z.string()).optional(),
  safeArea:    z.object({ top: z.number(), bottom: z.number(), note: z.string() }).optional(),
  note:        z.string().optional(),
});

let _presets = null;

export function loadPresets() {
  if (_presets) return _presets;
  const raw = JSON.parse(readFileSync(path.join(SPECS_DIR, 'presets.json'), 'utf8'));
  _presets = {};
  for (const [key, val] of Object.entries(raw.presets)) {
    _presets[key] = { name: key, ...PresetSchema.parse(val) };
  }
  return _presets;
}

export function getPreset(name) {
  const presets = loadPresets();
  if (!presets[name]) {
    const available = Object.keys(presets).join(', ');
    throw new Error(`Unknown preset "${name}". Available: ${available}`);
  }
  return presets[name];
}
