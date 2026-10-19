# Production deployment

The live app runs from its own folder, not from this repository, so the development
checkout can change branches, rebuild and reset its database without touching it.

| | Development | Production |
| --- | --- | --- |
| Folder | `~/projects/BudgetMaster` | `~/deploy/budgetmaster` |
| Compose project | `budgetmaster` | `budgetmaster-prod` |
| App | `pnpm dev` on port 3000 | image from GHCR on `127.0.0.1:8085`, public via Tailscale Funnel |
| Database | `budgetmaster-db` on `127.0.0.1:5436` | `budgetmaster-prod-db`, no host port |

## First setup

1. Nothing to do for the image: `ghcr.io/akoskappel/budgetmaster` is public (checked
   2026-10-18 with an anonymous pull token), so the server pulls it without logging in. See
   [Registry access](#registry-access) if it is ever made private.
2. Create the folder and copy the files from this directory:
   ```bash
   mkdir -p ~/deploy/budgetmaster/tailscale ~/deploy/budgetmaster/maintenance
   cp deploy/compose.yaml deploy/compose.tailscale.yaml ~/deploy/budgetmaster/
   cp deploy/tailscale/serve.json ~/deploy/budgetmaster/tailscale/
   cp deploy/maintenance/* ~/deploy/budgetmaster/maintenance/
   cp deploy/.env.example ~/deploy/budgetmaster/.env
   ```
3. Fill in `.env` (new secrets, `IMAGE_TAG` from the latest green CI run on `main`, the
   `RESEND_API_KEY` from the development `.env`) and put the
   Tailscale auth key into `tailscale/ts.env` (`TS_AUTHKEY=...`, the same reusable key as the
   other apps). `chmod 600` both files.
4. Start it: `cd ~/deploy/budgetmaster && docker compose up -d`. The `migrate` container runs
   first; the app starts once it has finished.
5. Check `https://budgetmaster.tailb52c43.ts.net/api/health` and sign in with the demo.

## Deploy a new version

1. Wait for CI on `main` to pass; note the image tag `sha-xxxxxxx`.
2. In `~/deploy/budgetmaster`, set `IMAGE_TAG` in `.env`, then
   `docker compose pull && docker compose up -d`.
3. Roll back by setting the previous tag and running the same command. Migrations only move
   forward, so roll back to a version with the same schema.

## Maintenance mode

For work that needs the app stopped (a restore, a long migration), put up the maintenance
page instead of a connection error. The `maintenance` service answers as `app` on the same
network and port, so Tailscale needs no change; every path, `/api/health` included, returns
503 with a "Back in a few minutes" page.

```bash
docker compose stop app
docker compose --profile maintenance up -d maintenance
# ... restore or migrate ...
docker compose --profile maintenance rm -sf maintenance
docker compose up -d app
```

Monitors report the app as down while it is on, which is correct.

## Backups

The `backup` service writes `budgetmaster-YYYY-MM-DD.dump` to `BACKUP_DIR` once at start and
then every 24 hours, keeping 14 days. They protect against mistakes and bad migrations, not
against losing this machine: copy the folder elsewhere (backlog H-02).

Restore a dump (stops nothing, replaces the data):

```bash
docker compose exec -T db pg_restore -U budgetmaster -d budgetmaster --clean --if-exists < ~/backups/budgetmaster/budgetmaster-2026-10-18.dump
```

Test a restore now and then into a scratch database before you need it.

## Registry access

The package is public, like the ambulance images. To check from any machine:
`docker pull ghcr.io/akoskappel/budgetmaster:latest` without being logged in.

If it is made private (GitHub, your profile, Packages, `budgetmaster`, Package settings,
Change visibility), the server needs a read-only login once:

1. GitHub, Settings, Developer settings, Personal access tokens, Tokens (classic), Generate
   new token: only the `read:packages` scope, an expiry you will remember.
2. On the server: `docker login ghcr.io -u AkosKappel` and paste the token as the password.
   Docker Desktop keeps it in the Windows credential store, not in a file.
3. Note the token's expiry in `infra/open-items.md`; pulls fail after it.
