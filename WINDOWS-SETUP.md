# Windows setup

The tool itself is identical on Windows and Mac — only the one-time install differs.
These commands assume **Windows 10 or 11** and either **PowerShell** or **Windows Terminal**.

**Low-bandwidth note:** this build is designed to work on limited or unreliable internet.
It uses the **Microsoft Edge that already ships with Windows** (no 150 MB browser download),
and it bundles everything it needs to render — so once installed, **rendering works fully
offline**. The only downloads are Node.js, ffmpeg, and a few small JavaScript packages.

## 1. Install Node.js (v20+)

```powershell
winget install OpenJS.NodeJS.LTS
```

Then **close and reopen** your terminal so `node` is on your PATH. Verify:

```powershell
node --version
```

(If `winget` isn't available, download the installer from https://nodejs.org and run it.)

## 2. Install ffmpeg

```powershell
winget install Gyan.FFmpeg
```

**Close and reopen your terminal**, then verify:

```powershell
ffmpeg -version
```

If `ffmpeg` isn't recognized after reopening, its folder isn't on your PATH — see
"ffmpeg not found" below.

## 3. Install the tool

Unzip `html-to-video` somewhere permanent (e.g. `C:\Tools\html-to-video`), then:

```powershell
cd C:\Tools\html-to-video
npm install
npm link
```

`npm install` here is small and fast — it does **not** download a browser (the tool uses the
Edge already on your PC). Verify the command is available:

```powershell
html-to-video --list
```

If you ever see a "Could not launch a browser" error, it means Edge and Chrome weren't found —
install one, or run `npx playwright install chromium` once as a fallback.

## 4. Render

Point the terminal at the folder that holds your `animations.json`, then render:

```powershell
cd "C:\path\to\your animations"
html-to-video --list
html-to-video "Your Animation Name" --preset reels,hero
```

Videos are written to the `output` folder set in `animations.json` (or `renders\` next
to it by default), sorted by aspect ratio.

## Paths on Windows

- Wrap any path containing spaces in **double quotes**: `--out "C:\Users\Me\Desktop\Videos"`.
- In `animations.json`, you can use forward slashes (`brand/logo.png`) — they work on
  Windows too, and avoid the need to escape backslashes.
- `~` in the `output` setting expands to your user folder (`C:\Users\<you>`).

## Troubleshooting

**`html-to-video` is not recognized**
`npm link` didn't finish, or the terminal predates it. Reopen the terminal. If it still
fails, run the tool directly: `node C:\Tools\html-to-video\bin\html-to-video.js --list`.

**`ffmpeg` not found (during render)**
ffmpeg installed but isn't on PATH. Reopen the terminal first. If still missing, find
`ffmpeg.exe` (winget puts it under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg...`)
and add that `bin` folder to your PATH via *Settings → Edit environment variables*.

**"Could not launch a browser"**
The tool looks for Microsoft Edge, then Google Chrome. If neither is found (unusual on
Windows, which ships Edge), install one, or run `npx playwright install chromium` once.

**A render succeeds but the video is blank or wrong length**
The animation's declared `duration` in `animations.json` must match its real length, and
the animation must render an element carrying `data-screen-label`. See the main README,
"Writing an animation."
