# Devika UI

Standalone SvelteKit frontend for [Devika](https://github.com/stitionai/devika). Talks to a separately deployed Devika core backend over HTTP + WebSocket (Socket.IO).

## Architecture

```
 ┌──────────────┐   HTTPS + WSS    ┌────────────────────────┐
 │  Devika UI   │ ───────────────▶ │   Devika core backend  │
 │  (Netlify)   │                  │   (HuggingFace Space)  │
 └──────────────┘                  └────────────────────────┘
```

The UI is a pure client-rendered SvelteKit app (built with `@sveltejs/adapter-static`). It reads the backend URL from `VITE_API_BASE_URL` at build time.

## Local development

### Requirements
- [Bun](https://bun.sh/) (latest)
- A running Devika core backend (local on `:1337`, or a deployed HuggingFace Space)

### Setup

```bash
bun install
cp .env.example .env
# edit .env and point VITE_API_BASE_URL at your backend
bun run dev
```

The dev server runs on `http://localhost:3000`.

## Deployment

### Netlify via GitHub Actions (recommended)

The workflow in `.github/workflows/deploy-ui.yml` builds the UI and deploys the `build/` directory to Netlify on every push to `main` (and posts a preview-URL comment on PRs).

Required GitHub secrets on this repo:

| Secret | Value |
|---|---|
| `VITE_API_BASE_URL` | URL of your Devika core backend, e.g. `https://octoborg-devika-core.hf.space` |
| `NETLIFY_AUTH_TOKEN` | Personal access token from https://app.netlify.com/user/applications |
| `NETLIFY_SITE_ID` | Site API ID (Netlify site → Site settings → General → Site details) |

Netlify auto-provisions `GITHUB_TOKEN`.

### Netlify direct git integration (alternative)

If you'd rather let Netlify build the site itself, connect this repo from the Netlify dashboard and it will pick up `netlify.toml`:

- Build command: `bun install --frozen-lockfile && bun run build`
- Publish directory: `build`
- Set `VITE_API_BASE_URL` in Site settings → Environment variables.

## Troubleshooting

- **UI loads but nothing happens / "Server disconnected"**: the built-in fallback when `VITE_API_BASE_URL` is missing is `http://<netlify-host>:1337`, which the browser can't reach. Make sure the env var was set at *build* time.
- **CORS errors** in the browser console: the backend already sets `Access-Control-Allow-Origin: *`, so any CORS error is usually a mixed-content issue (HTTPS UI calling HTTP backend) — both sides must be HTTPS.
- **WebSocket disconnects**: HuggingFace Spaces supports WebSocket on `wss://<space>.hf.space` but not on plain `ws://`. Make sure the backend URL uses `https://`.
