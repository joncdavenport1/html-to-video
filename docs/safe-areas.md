# Platform safe areas

Each social platform overlays UI on portions of the frame. The renderer should respect these zones when authoring native-vertical content and document them so creative decisions don't get hidden behind chrome.

All dimensions are in pixels for a 1080×1920 (9:16) canvas.

## Instagram Reels (1080×1920)

```
┌─────────────┐  ← 0
│ ▒▒▒ status  │
│ ▒▒▒         │  220px  Status bar + back button
├─────────────┤
│             │
│             │
│   SAFE      │  1260px tall — designed content lives here
│             │
│             │
├─────────────┤
│ ▒▒▒ caption │  440px  Caption, music, profile, comment / like / share rail
│ ▒▒▒         │         (the right-side action rail also overlays ~96px from the right edge,
│ ▒▒▒         │          but bottom is the main concern)
└─────────────┘  ← 1920
```

- **Top inset:** 220 px (status bar + back chevron)
- **Bottom inset:** 440 px (caption + music attribution + profile + action rail)
- **Right inset:** ~96 px (vertical action rail of icons)
- **Usable area:** 984 × 1260

## TikTok (1080×1920)

```
┌─────────────┐  ← 0
│ ▒▒▒         │  180px
├─────────────┤
│             │
│   SAFE      │  1290px tall
│             │
├─────────────┤
│ ▒▒▒         │  450px
└─────────────┘  ← 1920
```

- **Top inset:** 180 px
- **Bottom inset:** 450 px
- **Right inset:** ~150 px (TikTok's right rail is slightly wider than Instagram's)
- **Usable area:** 930 × 1290

## YouTube Shorts (1080×1920)

```
┌─────────────┐  ← 0
│             │
│             │
│   SAFE      │  1500px tall — YouTube's UI is more dismissable
│             │
│             │
├─────────────┤
│ ▒▒▒         │  420px
└─────────────┘  ← 1920
```

- **Top inset:** None (transient overlay)
- **Bottom inset:** ~420 px (channel + title + actions)
- **Usable area:** 1080 × 1500

---

## What this means for MDP animations

### Today (16:9 source, `contain` fit into 9:16)

The letterboxed 16:9 video sits in the vertical center of the 1080×1920 canvas. It naturally lands in the safe area for all three platforms — by accident, not design. ✅ Safe.

### Future (native 9:16 source)

When MDP commissions native vertical animations:
- Place the brand mark / lockup / monogram in the vertical center (between ~y=220 and ~y=1480) so it's always visible.
- Critical text (taglines, "One decision.") should sit in roughly the upper third (y=300 → y=800) — well above the bottom UI overlay across all three platforms.
- Avoid putting any branding in the bottom 440 px or top 220 px.

### Safe-fill mode

When implemented, `--fit safe-fill` should place the static MDP lockup in the *top* zone (above the letterboxed video), not the bottom — the bottom is occupied by platform UI. This guarantees the brand is visible even when the platform's chrome covers the lower brand fill.

---

## Source

These insets are eyeballed from current iOS Reels/TikTok/Shorts (mid-2026). They drift over time as platforms redesign. Treat as guidelines; spot-check with a real post before locking in a large campaign.
