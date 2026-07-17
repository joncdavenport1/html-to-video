# Encoding rationale

Why each codec / pixel format / bitrate choice is what it is.

## H.264 / MP4 (default for all social and web)

```
-c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.2 -crf 18 -preset slow -movflags +faststart -an
```

### `libx264`

Universally supported. Hardware-decoded on every phone and laptop made in the last decade. Don't use H.265/HEVC — Instagram, TikTok, and LinkedIn web players still have spotty support, and Twitter outright re-encodes. Save H.265 for masters where storage matters and the consuming editor will re-encode anyway.

### `-pix_fmt yuv420p`

**Non-negotiable for social compatibility.** Even though `yuv444p` would preserve more color detail (especially in sky-blue gradients), Safari and several Android browsers refuse to play it. Source PNG frames are full-color; the ffmpeg subsampling step happens here.

### `-profile:v high -level 4.2`

`high` profile + level 4.2 covers 4K@30 and 1080p@60. Works on every modern device.

### `-crf 18`

CRF (Constant Rate Factor) 18 is visually lossless for graphics content like brand animations — large flat color fields and sharp typography. Use `crf 16` for the `hero-4k` preset (4K compresses better; we want headroom). Higher CRF = smaller file but visible banding in gradient regions (which MDP's sky-blue gradients are full of).

### `-preset slow`

Slower encoder preset = better compression efficiency. Worth the extra seconds; the renderer isn't real-time.

### `-movflags +faststart`

Moves the MP4 moov atom (the index) to the front of the file. Without this, video players have to download the entire file before they can start playing. Mandatory for web-embedded video.

### `-an`

No audio track. The animations are silent. Don't include a silent audio track — some platforms downgrade silent videos in their feed algorithms.

### Bitrate guidance

CRF is the primary quality knob; the `bitrate` field in `presets.json` is for `-maxrate` and `-bufsize` to cap streaming bandwidth on web players:

```
-crf 18 -maxrate 10M -bufsize 20M
```

| Resolution | -crf | -maxrate | Notes |
|---|---|---|---|
| 1080×1920, 1080×1080, 1080×1350 | 18 | 10M | Social platforms re-encode anyway; don't waste bits |
| 1920×1080 | 18 | 16M | YouTube / web hero |
| 3840×2160 | 16 | 40M | Master quality |

---

## ProRes 4444 / MOV (alpha master)

```
-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le
```

### Why ProRes?

ProRes is the industry-standard intermediate codec — Premiere, After Effects, Final Cut all handle it natively without transcoding on import. ProRes 4444 is the alpha-capable variant.

### Why not H.264 with alpha?

H.264 doesn't natively support an alpha channel. There are workarounds (HEVC with alpha, or VP9 in WebM) but none of them are an editor-friendly intermediate. ProRes 4444 is the right call for "drop into Premiere as an overlay clip."

### File sizes

ProRes 4444 at 1080p60 is ~330 Mbps — a 12-second clip is ~500 MB. This is correct for an intermediate; don't try to make it smaller. If you need a smaller alpha file for web use, use VP9 WebM as a secondary output.

---

## Platform-specific notes

### Instagram Reels

- Max 90 seconds. (MDP stings are all under 13 seconds — no problem.)
- Specs: H.264 MP4, max 1080×1920, 30 or 60 fps, max 4 GB. Our 60 fps + 10M bitrate is well under.
- Instagram heavily re-encodes on upload. Source quality matters: garbage in, more-garbage out. Our master is high enough that the re-encode still looks clean.
- **Safe area:** captions/profile/sound link overlay the bottom ~440px. The `safeArea` field in presets.json documents this; future native-vertical animations should respect it.

### TikTok

- Same dimensions as Reels.
- TikTok's re-encoder is more aggressive than Instagram's. Brand animations with sky-blue gradients can band noticeably. Higher source bitrate (or rendering native 9:16 instead of letterboxing) helps.

### YouTube Shorts

- Same dimensions. YouTube re-encodes least aggressively of the three — Shorts look the closest to source.

### YouTube (long-form / hero)

- 1920×1080 H.264 is the safe baseline. 3840×2160 (4K) if available — YouTube serves a higher-quality VP9 to 4K viewers when source is 4K, so the user benefit is real.

### LinkedIn

- Plays MP4 H.264 fine at 1920×1080 or 1080×1080. Caps videos at 10 min / 5 GB for native uploads. Auto-plays muted in feed (so silent is fine).

### Website hero (embedded `<video>`)

- 1920×1080 H.264 MP4 with `+faststart`. Also export a poster PNG (a single frame at the end-state) for the `<video poster>` attribute. The renderer could add `--poster-frame <time>` to extract a still — nice-to-have for v1.5.

### Email

- Don't embed video in email — it doesn't work on most clients. Use a GIF (animated, but limited palette / quality) or a still with a "play" overlay linking to a hosted MP4. Out of scope for v1.

---

## What we're NOT doing

- **GIF.** Massive file size, terrible color quality on brand gradients, limited palette. Bad fit for MDP's blue spectrum.
- **WebM (VP9).** Better than H.264 in theory, but social platforms don't accept it as upload, and we're not building for self-hosting at scale. If we add a web-hero preset for sites that auto-serve based on browser capability, then yes — but not v1.
- **HDR.** MDP brand palette is sRGB and dark-but-not-cinematic; HDR adds complexity without payoff.
