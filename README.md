# Swaccho Purulia ♻️

A crowdsourced civic / garbage issue tracker for **Purulia**, inspired by
[NammaKasa](https://nammakasa.com). Citizens anonymously photograph a civic
issue; the app captures live GPS, maps the coordinates to the responsible
municipal **ward / MLA / MP**, and publishes it to a public accountability map
and ward leaderboard.

## Architecture

Mirrors the NammaKasa lightweight, serverless approach:

| Layer        | Tech                                          |
| ------------ | --------------------------------------------- |
| Frontend     | React + Vite                                  |
| Map          | MapLibre GL + OpenStreetMap raster tiles      |
| Database/Auth| Supabase (PostgreSQL + RLS)                   |
| Storage      | Supabase Storage (`complaint-photos` bucket)  |
| Spatial      | Client-side point-in-polygon vs ward GeoJSON  |

### Workflow

1. **Anonymous submission** — user snaps a photo; the browser grabs live GPS
   coordinates and uploads the image to the Supabase Storage bucket.
2. **Spatial mapping** — coordinates are tested against the ward boundary
   GeoJSON (`src/data/purulia-wards.json`) to resolve the ward, MLA and MP.
   See `src/lib/wards.js`.
3. **Data integrity** — the mapped complaint (image URL, ward id, official
   details) is inserted into the `complaints` table, powering the public map
   (`src/components/MapView.jsx`) and ward leaderboard.
4. **Live updates** — Supabase Realtime streams new/updated complaints to every
   open browser, so the map and leaderboard refresh instantly without a reload
   (`subscribeToComplaints` in `src/lib/complaints.js`).

## Getting started

```bash
npm install

# configure Supabase
cp .env.example .env.local
#   → fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev
```

Then open http://localhost:5173.

> The app still renders without Supabase configured (for UI preview), but
> submissions are disabled until the env vars are set.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates the `complaints` table, Row Level Security policies (public
   read, anonymous insert), and the public `complaint-photos` storage bucket.
3. Copy your project **URL** and **anon public key** (Settings → API) into
   `.env.local`.

## Deployment (auto-deploy to Vercel)

The repo is connected to the `swaccho-purulia` Vercel project via Vercel's
**native Git integration**, so deploys are fully automatic — no GitHub Actions
workflow or `VERCEL_TOKEN` needed:

- **push to `main`** → production deploy (the live website)
- **pull request to `main`** → preview deploy (review the change before merge)

`vercel.json` pins the Vite framework and the SPA rewrite.

One-time setup — **Vercel project env vars**: in the Vercel project settings
(Settings → Environment Variables) add `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_BUCKET` so the built site talks to
Supabase. (Vite inlines `VITE_*` vars into the bundle, so use the anon key.)

## Ward boundary data ⚠️

`src/data/purulia-wards.json` currently contains **placeholder** ward polygons
(a 23-cell grid over Purulia town) with placeholder MLA/MP names. Before going
live, replace it with real Purulia Municipality ward boundaries (e.g. digitised
from the municipality or OpenStreetMap relations) and verify the elected
officials against ECI / municipality records. The GeoJSON shape and properties
(`ward_id`, `ward_name`, `mla`, `mp`) just need to be preserved.

## Project structure

```
src/
  App.jsx                 # tab shell (Report / Map / Wards)
  components/
    Header.jsx
    ReportForm.jsx        # photo + GPS + category → submitComplaint()
    MapView.jsx           # MapLibre map, ward layers, complaint markers
    Leaderboard.jsx       # per-ward report ranking
  lib/
    supabase.js           # Supabase client (env-driven)
    complaints.js         # upload + insert + fetch + leaderboard aggregation
    wards.js              # point-in-polygon ward resolution
  data/
    purulia-wards.json    # ward boundary GeoJSON (placeholder)
supabase/
  schema.sql              # table + RLS + storage policies
```

## License

MIT
