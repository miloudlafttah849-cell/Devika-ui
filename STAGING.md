# Staging workflow — Devika UI

This repo deploys to a single Netlify site that uses **Netlify deploy
contexts** to render multiple environments from one codebase:

| Environment | URL | Source branch | Backend |
|---|---|---|---|
| Production | https://devika-ui-octoborg.netlify.app/ | `main` | https://octoborg-devika-core.hf.space |
| Staging | https://staging--devika-ui-octoborg.netlify.app/ | `staging` | https://octoborg-devika-core-staging.hf.space |
| PR previews | (per-PR URL Netlify generates) | any PR branch | prod backend |

The per-context `VITE_API_BASE_URL` is configured in
[`netlify.toml`](./netlify.toml). The Vite build inlines that value into
the JS bundle, so each environment ships with the right backend baked
in.

## Branches in this repo

- `main` — production. **Protected**: direct pushes are rejected.
  Updates only via PR merges.
- `staging` — what the staging URL serves. Push freely, iterate fast.

## Day-to-day workflow

### 1. Make a UI change on staging

```bash
git checkout staging
git pull origin staging

# ...edit code (Svelte / Tailwind / etc.)...

git add -A
git commit -m "wip: redesign sidebar"
git push origin staging
```

Netlify auto-builds and updates
https://staging--devika-ui-octoborg.netlify.app/ in ~1 minute.

### 2. Promote to production

When staging looks good, open a PR `staging` → `main`:

```bash
gh pr create --base main --head staging \
    --title "Promote staging" \
    --body "Includes: <list of changes>"
```

Or use the GitHub web UI. Merging the PR triggers a production rebuild.
The branch protection rule on `main` enforces this — direct
`git push origin main` is rejected.

### 3. Rollback

```bash
gh pr revert <merged-pr-number>    # GitHub web UI: "Revert" button on the merged PR
```

The revert PR can be merged immediately to roll prod back. Reconcile
`staging` afterwards (`git checkout staging && git rebase main`).

## Local development

```bash
bun install --frozen-lockfile

# point at prod backend
echo 'VITE_API_BASE_URL=https://octoborg-devika-core.hf.space' > .env

# OR point at staging backend
echo 'VITE_API_BASE_URL=https://octoborg-devika-core-staging.hf.space' > .env

bun run dev
```

## Branch protection rule (already configured)

`main` is protected via:

- ✓ Require a pull request before merging (0 required approvals — single dev)
- ✓ Disallow direct pushes
- ✓ Disallow force pushes / deletions

This mirrors the workflow recommended by the upstream Devika project and
keeps the deploy history linear.

## Backend coordination

Whenever the UI calls a new backend route, confirm the corresponding
backend change has shipped to **the same environment** before merging UI
changes. The two repos do not auto-coordinate: a UI build on staging
talking to a missing backend route will fail at runtime.

Recommended order when shipping a feature that spans both repos:

1. Backend `staging` branch first.
2. Smoke-test backend staging:
   `python tests/staging_smoke.py` (in the `Devika-core` repo).
3. UI `staging` branch points at the staging backend automatically.
4. Verify on https://staging--devika-ui-octoborg.netlify.app/.
5. Promote backend → prod (`main` push on `Devika-core`).
6. Promote UI → prod (open the staging→main PR here, merge it).
