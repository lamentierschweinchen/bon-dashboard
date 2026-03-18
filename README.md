# BoN Dashboard

This repo now has two surfaces:

- `/` is the general chain monitor.
- `/control-room` is the Battle of Nodes competition dashboard.

The control room is challenge-aware and reads local Battle of Nodes artifacts for:

- Challenge 1 validator setup
- Challenge 2 on-chain operations
- Challenge 3 backup, restart, and log proofing
- Challenge 4 official stress windows
- Challenge 5 million-transaction sprint

## Local Setup

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the chain monitor or [http://localhost:3000/control-room](http://localhost:3000/control-room) for the competition dashboard.

## Workspace Configuration

The control room reads artifacts from a local MultiversX workspace. By default it assumes this repo lives inside a larger workspace and resolves Battle of Nodes folders from the parent directory.

If your artifact workspace lives somewhere else, set:

```bash
BON_WORKSPACE_ROOT=/path/to/your/MultiversX-workspace
```

You can copy the shape from [`.env.example`](./.env.example).

## Review And Deploy Safety

The repo is set up so it can be handed to a private review/publish flow without bundling live competition artifacts:

- Control-room paths shown in the UI are workspace-relative, not personal absolute filesystem paths.
- The app reads explicit proof files, logs, manifests, and run artifacts only.
- Wallet keystores, PEM files, and local tool state are ignored and not committed.
- If the Battle of Nodes workspace is absent in a review or Vercel environment, the control room degrades into missing-artifact states instead of crashing.

## Verification

Use:

```bash
npm run lint
npm run build
```

## Deploying To Vercel

The app can be deployed as-is. For the public chain monitor, no extra setup is needed beyond the usual project env vars you already use.

For `/control-room`:

- local artifact-backed pages work best when `BON_WORKSPACE_ROOT` points at a mounted workspace with the Battle of Nodes directories present
- if that workspace is not mounted in Vercel, the routes still render and show missing local evidence rather than failing the deployment
