# html-to-video

Render HTML animations to broadcast-quality video — frame-perfect, at any aspect ratio, in parallel.

```bash
html-to-video "Hello Motion" --preset reels,square,portrait,hero
# → 4 MP4 files at exact platform dimensions in ~15 sec
```

Frames are captured in a headless browser driven by a **virtual clock**, not a screen recorder. The animation's `requestAnimationFrame`, `setTimeout`, `Date.now()` and `performance.now()` are all replaced with a clock this tool advances one frame at a time. Rendering is deterministic and unaffected by machine speed — a 60fps render is exactly 60 frames per second of animation, every time.

## Requirements

- macOS, Linux, or Windows 10/11
- Node.js 20+
- ffmpeg — `brew install ffmpeg` (macOS), `apt install ffmpeg` (Debian/Ubuntu), or `winget install Gyan.FFmpeg` (Windows)

**On Windows, follow [WINDOWS-SETUP.md](WINDOWS-SETUP.md)** for step-by-step install commands.

## Install

```bash
git clone <repo-url> html-to-video
cd html-to-video
npm install      # also installs the Playwright Chromium browser
npm link         # makes `html-to-video` available system-wide
```

## Quick start

```bash
mkdir my-animations && cd my-animations
html-to-video init                        # scaffolds a starter project
html-to-video "Hello Motion" --preset hero
open "renders/Hero (1920x1080)/Hello Motion.mp4"
```

## Projects

A **project** is any folder with an `animations.json` at its root. The tool walks up from
wherever you run it to find one, so you can run it from a subfolder.

```
my-animations/
├── animations.json           the registry
├── animations/
│   ├── Hello Motion.dc.html  your animation
│   └── support.js            the runtime it loads
└── renders/                  output (created for you)
```

This split is deliberate: the tool holds no content, and your content holds no code.
Your animations, brand assets, and output settings stay entirely in your folder.

### animations.json

```json
{
  "output": "~/Desktop/My Videos",
  "safeFillLogo": "brand/logo.png",
  "hideSelectors": [".my-custom-controls"],
  "animations": [
    {
      "id": "hello-motion",
      "name": "Hello Motion",
      "file": "animations/Hello Motion.dc.html",
      "duration": 5.0,
      "nativeWidth": 1920,
      "nativeHeight": 1080,
      "aspect": "16:9",
      "background": "#0E1216",
      "description": "What it does."
    }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `animations[]` | ✅ | One entry per animation |
| `animations[].name` | ✅ | What you type on the command line; also the output filename |
| `animations[].duration` | ✅ | Seconds. **Must match the animation's real length** or the video gets cut short or padded |
| `animations[].background` | ✅ | Hex color used to fill letterbox bars |
| `output` | | Where videos go. Defaults to `renders/`. `~` is expanded |
| `safeFillLogo` | | Raster image composited by `--fit safe-fill`. Required only for that mode |
| `hideSelectors` | | Extra CSS selectors to hide before capture (see below) |

Adding an animation means dropping the file into `animations/` and adding one entry here.
No code changes.

## Writing an animation

`html-to-video init` gives you a working starter. The contract is small:

1. **One element must carry `data-screen-label`.** That element is what gets filmed — everything outside it is ignored. If it never appears, the render fails with a clear error rather than a blank video.
2. **Drive motion off `requestAnimationFrame` / `performance.now()`.** Those are what the virtual clock replaces. A CSS `animation` or `transition` will *not* be captured deterministically — compute your values in JS.
3. **Mark preview-only UI with `data-htv-hide`.** Play buttons and scrub bars are useful while you're building and must not end up in the video.

If your animation already has controls using different markup, list their selectors under
`hideSelectors` in `animations.json` instead of editing the animation.

## Presets

| Preset | Dimensions | FPS | Platform |
|---|---|---|---|
| `reels` | 1080×1920 | 60 | Instagram Reels, TikTok, YouTube Shorts |
| `square` | 1080×1080 | 60 | Instagram / LinkedIn feed |
| `portrait` | 1080×1350 | 60 | Instagram / LinkedIn feed (best shape) |
| `hero` | 1920×1080 | 60 | YouTube, website hero, LinkedIn Video |
| `hero-4k` | 3840×2160 | 60 | Broadcast, projection, future master |
| `alpha` | 1920×1080 | 60 | ProRes 4444 MOV for Premiere / After Effects |

Edit `specs/presets.json` to add your own.

## Commands

```bash
html-to-video "Hello Motion" --preset reels        # render one
html-to-video all --preset reels,hero              # render everything
html-to-video --list                               # list animations and presets
html-to-video --info "Hello Motion"                # details for one
html-to-video "Hello Motion" --dry-run             # print the plan, do nothing
html-to-video init [dir]                           # scaffold a new project
```

## Options

| Flag | Default | Description |
|---|---|---|
| `--preset <a,b>` | `hero` | Comma-separated preset names |
| `--fit <mode>` | per-preset | `contain` \| `cover` \| `safe-fill` \| `pass` |
| `--fps <n>` | per-preset | Override frames per second |
| `--out <dir>` | project's `output` | Output root directory |
| `--alpha` | off | Force ProRes 4444 MOV output |
| `--no-cache` | off | Re-capture frames even if cached |
| `--parallel <n>` | CPU count | Max concurrent encodes |
| `--dry-run` | off | Print plan, do nothing |
| `--verbose` | off | Show ffmpeg args and frame details |

## Aspect-fit modes

When a 16:9 source is rendered to a different aspect ratio:

| Mode | Behavior |
|---|---|
| `contain` | Letterbox with the animation's background color (default for social) |
| `cover` | Crop to fill, centered |
| `safe-fill` | Letterbox, then composite `safeFillLogo` into the empty bars |
| `pass` | Scale only — source already matches target (default for `hero`) |

## Output

```
renders/
├── Hero (1920x1080)/
│   ├── Hello Motion.mp4
│   └── Another Animation.mp4
└── Reels (1080x1920)/
    └── Hello Motion.mp4
```

One folder per aspect ratio, one file per animation. Re-rendering overwrites in place.

## Caching

Frame capture is the slow step. The tool hashes the animation and every asset beside it — if
nothing changed, later runs skip capture and re-encode only. The cache lives in `.cache/`
inside your project.

```bash
html-to-video "Hello Motion" --no-cache --preset hero   # force fresh capture
```

## Tests

```bash
npm test
```

Renders the bundled example at 15fps and checks the output's duration and dimensions.
Requires ffmpeg.

## License

MIT
