# Trip Planner Cloudflare Worker Backend

This Worker provides a custom backend for:
- activity suggestions with votes,
- per-activity threaded replies,
- visual timeline suggestions (day + time ranges),
- and an aggregated master timeline.

## 1) Create D1 DB + apply schema

```bash
cd worker
npx wrangler d1 create trip_planner
# copy database_id into wrangler.toml
npx wrangler d1 execute trip_planner --file=./schema.sql
```

## 2) Run locally

```bash
npx wrangler dev
```

## 3) Deploy

```bash
npx wrangler deploy
```

## API Endpoints

- `GET /api/health`
- `GET /api/activities`
- `POST /api/activities`
- `POST /api/activities/:id/vote`
- `GET /api/activities/:id/comments`
- `POST /api/activities/:id/comments`
- `GET /api/timeline-entries`
- `POST /api/timeline-entries`
- `POST /api/timeline-entries/:id/second`
- `GET /api/timeline/master`

## Frontend wiring

`planner.html` is preconfigured to call `https://nctripactivities.littleredatom.workers.dev`.
