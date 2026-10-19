# Production deployment

The live app runs from its own folder, not from this repository, so the development
checkout can change branches, rebuild and reset its database without touching it.

| | Development | Production |
| --- | --- | --- |
| Folder | `~/projects/BudgetMaster` | `~/deploy/budgetmaster` |
| Compose project | `budgetmaster` | `budgetmaster-prod` |
| App | `pnpm dev` on port 3000 | image from GHCR behind nginx on `127.0.0.1:8085`, public via Tailscale Funnel |
| Database | `budgetmaster-db` on `127.0.0.1:5436` | `budgetmaster-prod-db`, no host port |

## First setup

1. Nothing to do for the image: `ghcr.io/akoskappel/budgetmaster` is public (checked
   2026-10-18 with an anonymous pull token), so the server pulls it without logging in. See
   [Registry access](#registry-access) if it is ever made private.
2. Create the folder and copy the files from this directory:
   ```bash
   mkdir -p ~/deploy/budgetmaster/tailscale ~/deploy/budgetmaster/maintenance ~/deploy/budgetmaster/nginx ~/logs/budgetmaster
   cp deploy/compose.yaml deploy/compose.tailscale.yaml ~/deploy/budgetmaster/
   cp deploy/tailscale/serve.json ~/deploy/budgetmaster/tailscale/
   cp deploy/maintenance/index.html ~/deploy/budgetmaster/maintenance/
   cp deploy/nginx/default.conf ~/deploy/budgetmaster/nginx/
   cp deploy/restore-test.sh deploy/deploy.sh scripts/smoke.ts ~/deploy/budgetmaster/
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

After CI on `main` is green, in `~/deploy/budgetmaster`:

```bash
./deploy.sh
```

It finds the commit of the latest green CI run (`gh`), checks that the image exists, dumps
the database next to the nightly backups, sets `IMAGE_TAG`, pulls, starts (migrations run
first), waits for the health check and runs the smoke test (`smoke.ts`: health, sign-in
page with its CSP, a demo sign-in, which counts against the 5 per hour limit). Each deploy
is appended to `deploys.log`. `./deploy.sh sha-1234567` deploys a given tag, which is also
how to go back; migrations only move forward, so go back only to a version with the same
schema, or restore the dump the script made.

After the first deploy, check `docker compose logs app` for Better Auth's warning that it
"could not determine a client IP": without the visitor's address from the Tailscale proxy,
rate limits fall back to one bucket shared by everyone.

When a file in this `deploy/` folder changed, copy it to the deploy folder before running
the script; after a change to `nginx/default.conf`, `docker compose exec nginx nginx -s reload`.

## Maintenance mode

nginx sits in front of the app (access log in `ACCESS_LOG_DIR` for the traffic dashboard
and CrowdSec). For work that needs the app stopped (a restore, a long migration), switch on
its maintenance page; every path, `/api/health` included, then answers 503 with a "Back in
a few minutes" page, and requests from open tabs get a short 503:

```bash
touch maintenance/on   # on, no reload needed
rm maintenance/on      # off
```

The same page shows by itself while the app restarts (a deploy). Monitors report the app as
down while the flag is on, which is correct; `infra/scripts/maintenance.sh` also pauses them.

## Backups

The `backup` service writes `budgetmaster-YYYY-MM-DD.dump` to `BACKUP_DIR` once at start and
then every 24 hours, keeping 14 days. They protect against mistakes and bad migrations, not
against losing this machine: copy the folder elsewhere (backlog H-02).

Restore a dump (stops nothing, replaces the data):

```bash
docker compose exec -T db pg_restore -U budgetmaster -d budgetmaster --clean --if-exists < ~/backups/budgetmaster/budgetmaster-2026-10-18.dump
```

Test a restore now and then, before you need it: `./restore-test.sh` restores the newest
dump into a throwaway Postgres container (no network, no port, removed afterwards) and checks
that users, spaces, transactions and the migration history are there. Production is not
touched. A month is a sensible rhythm; it takes seconds for a small database.

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
