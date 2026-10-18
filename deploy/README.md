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

1. Make the GHCR package `budgetmaster` public, or run `docker login ghcr.io` on the server.
2. Create the folder and copy the files from this directory:
   ```bash
   mkdir -p ~/deploy/budgetmaster/tailscale
   cp deploy/compose.yaml deploy/compose.tailscale.yaml ~/deploy/budgetmaster/
   cp deploy/tailscale/serve.json ~/deploy/budgetmaster/tailscale/
   cp deploy/.env.example ~/deploy/budgetmaster/.env
   ```
3. Fill in `.env` (new secrets, `IMAGE_TAG` from the latest green CI run on `main`) and put the
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

## Backups

The database lives in the `budgetmaster-prod_dbdata` volume. Nightly `pg_dump` is backlog
item H-02; until then:
`docker compose exec db pg_dump -U budgetmaster budgetmaster > budgetmaster-$(date +%F).sql`
