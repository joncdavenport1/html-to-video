# Windows setup

The tool itself is identical on Windows and Mac — only the one-time install differs.
These commands assume **Windows 10 or 11** and either **PowerShell** or **Windows Terminal**.

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

`npm install` also downloads the browser engine (~150 MB), so give it a minute.
Verify the command is available:

```powershell
html-to-video --list
```

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

**`npm install` fails downloading the browser**
Corporate networks sometimes block the Playwright CDN. Retry on a normal network, or set
`PLAYWRIGHT_DOWNLOAD_HOST` per Playwright's docs.

**A render succeeds but the video is blank or wrong length**
The animation's declared `duration` in `animations.json` must match its real length, and
the animation must render an element carrying `data-screen-label`. See the main README,
"Writing an animation."
