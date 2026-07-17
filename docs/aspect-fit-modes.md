# Aspect-fit modes

How the renderer adapts a source animation to a target preset whose aspect ratio differs from the source's.

All source animations in this kit are native 16:9 (1920×1080). The renderer needs to produce 9:16 (Reels), 1:1 (square), and 4:5 (portrait) outputs from those sources. Here's how, ranked from "works today, less polished" to "production grade":

---

## 1. `contain` — letterbox on the brand background *(default)*

Place the full 16:9 source into the target canvas, scaled down to fit. Fill the empty space with the animation's `background` color from `animations.json`.

**Result for 9:16:**

```
┌─────────┐
│ ▒▒▒▒▒▒▒ │  ← Onyx fill (animation.background)
│         │
│┌───────┐│
││ video ││  ← 16:9 source, scaled to width
│└───────┘│
│         │
│ ▒▒▒▒▒▒▒ │  ← Onyx fill
└─────────┘
```

- ✅ Works for every animation, no source edits.
- ✅ Brand-correct fill color (Onyx for dark animations, Onahau for the blue variant).
- ❌ Uses ~30% of the vertical frame; the rest is brand-colored bars.

This is the safe default and what `--preset reels,square,portrait` will produce with no extra flags.

---

## 2. `cover` — crop to fill

Scale the source to cover the target canvas, cropping equally from both edges (left+right for vertical targets, top+bottom for landscape).

**Result for 9:16:**

```
┌─────────┐
│┌─cut───┐│
││   v   ││
││   i   ││
││   d   ││  ← 16:9 source upscaled
││   e   ││     to fill 9:16, sides cropped
││   o   ││
│└──cut──┘│
└─────────┘
```

- ✅ Full-frame; no bars.
- ❌ Crops out content (in MDP's case, the disciplines list scroll would lose its left and right margins).
- ❌ For text-centric animations, the typography can blow out at the edges.

Use case: the lockup/monogram animations where action is center-weighted. Less useful for "MDP One Choice" because the list is text-centric.

---

## 3. `safe-fill` — letterbox with branded chrome *(recommended for vertical social)*

`contain` the source, then composite the MDP lockup (or monogram, configurable) into the empty top/bottom zones above and below the video. This makes the empty space *do work* — the post is unmistakably MDP whether the viewer watches the animation or just sees the static frame.

**Result for 9:16:**

```
┌─────────┐
│         │
│ [MDP    │  ← brand-assets/logos/lockup-offwhite.svg
│  logo]  │     rasterized, centered, sized to ~60% of empty-zone height
│         │
│┌───────┐│
││ video ││  ← 16:9 source, full-width
│└───────┘│
│         │
│   ⌐⌐    │  ← optional: tagline or social handle
│         │
└─────────┘
```

- ✅ Brand-correct, premium-feeling.
- ✅ Works on every aspect target.
- ✅ Static branding is readable even on muted autoplay.
- ❌ Implementation cost: rasterize SVG → PNG once, then composite via ffmpeg overlay filter per preset.

Implementation notes:
- Pre-rasterize `brand-assets/logos/lockup-offwhite.svg` to a transparent PNG at e.g. 1440px wide using `sharp` or `resvg`. Cache.
- The ffmpeg filter graph combines `scale` + `pad` + `overlay`. Build it once per preset.
- Use `lockup-onyx.svg` if the source's `background` is light (the blue variant), else `lockup-offwhite.svg`.

Recommended for `reels` and `portrait` presets once implemented.

---

## 4. `pass` — assume native fit *(future state)*

The source is already at the target preset's exact dimensions. No transform, just scale and encode.

- ✅ Maximum quality. No bars, no crops, no composites.
- ❌ Requires a per-aspect source HTML.

This is what `hero` and `hero-4k` use today (16:9 → 16:9). For social verticals to use `pass`, MDP would commission native 9:16, 1:1, and 4:5 source HTMLs.

**See `examples/responsive-animation-recipe.md` for how to author future animations responsively** — one source that the renderer can serve at any aspect via a viewport query param. Recommended for any new sting that will live on social.

---

## Per-preset defaults (in `presets.json`)

| Preset | Default fit | Why |
|---|---|---|
| `reels` | `contain` | Safest; use `safe-fill` once implemented; `pass` for native-vertical sources |
| `square` | `contain` | Safest; `safe-fill` is overkill for 1:1 with 16:9 source (bars are slim) |
| `portrait` | `contain` | Same as reels |
| `hero` | `pass` | Source is already 16:9 |
| `hero-4k` | `pass` | Same |
| `alpha` | `pass` | Alpha master is always at source dims |

Override per-render with `--fit cover` (etc).

---

## Cheat sheet

- Need a Reel today, ship-it default → `--preset reels` (`contain`).
- Want it to look more like a finished post → `--preset reels --fit safe-fill` (once you've implemented `safe-fill`).
- Want the absolute best result → ask MDP for a native 9:16 source; use `--fit pass`.
- Center-weighted action (lockup builds) and willing to crop edges → `--fit cover`.
