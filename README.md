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
| Frontend     | React + Vite + Tailwind CSS                   |
| Map          | MapLibre GL + OpenStreetMap raster tiles      |
| Database/Auth| Supabase (PostgreSQL + RLS)                   |
| Storage      | Supabase Storage (`complaint-photos` bucket)  |
| Spatial      | Client-side point-in-polygon vs ward GeoJSON  |

The UI is a mobile-first dashboard with a **bilingual English / বাংলা** toggle,
severity & status filters, a ward leaderboard, stat cards, and a Map tab that
toggles between a stylized **Overview** (bubble heat-cluster) and the real
interactive **Live map**.

### Workflow

1. **Anonymous submission** — user snaps a photo; the browser grabs live GPS.
   The photo is **compressed/resized client-side** (`src/lib/image.js`) before
   being uploaded to the Supabase Storage bucket, to save storage and speed up
   submissions on slow connections.
2. **Spatial mapping** — coordinates are tested against the ward boundary
   GeoJSON (`src/data/purulia-wards.json`) to resolve the ward, MLA and MP.
   See `src/lib/wards.js`. If the location falls outside all mapped wards, the
   report sheet shows an "outside Purulia limits" notice.
3. **Data integrity** — the mapped complaint (image URL, ward id, official
   details) is inserted into the `complaints` table, powering the public map
   and ward leaderboard (`src/lib/wardStats.js` aggregates per-ward stats).
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

### Preview without a backend

Append `?demo=1` to the URL (e.g. http://localhost:5173/?demo=1) to populate
the UI with sample complaints across the wards — handy for previewing the
List, Map and leaderboard without configuring Supabase. Demo mode is read-only
and never used in normal operation.

> The app still renders without Supabase configured (for UI preview), but
> submissions are disabled until the env vars are set.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates the `complaints` table, Row Level Security policies (public
   read, anonymous insert), and the public `complaint-photos` storage bucket.
3. Copy your project **URL** and **anon public key** (Settings → API) into
   `.env.local`.

## Admin — resolving reports

Officials mark reports `in_progress` / `resolved` (making the resolved count and
resolution rate real) via a built-in admin panel at **`/?admin=1`**.

Access is allowlist-gated:

1. Visit `/?admin=1` and sign in with the official's email (Supabase Auth sends
   a magic link). Enable the Email provider in Supabase → Authentication.
2. Add that email to the allowlist in the SQL editor:
   ```sql
   insert into public.admins (email) values ('official@example.com');
   ```
3. Reload `/?admin=1` — the official can now Start / Resolve / Reopen reports.

A Postgres RLS policy (`admin update complaints`) enforces that only allowlisted
users can change status; everyone else is read-only. Status changes broadcast
over Realtime, so the public map and leaderboard update instantly.

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

### Enabling true PR auto-merge

GitHub only lets you turn on a PR's "auto-merge" when there's a **required
status check** pending — which means `main` needs a branch-protection rule.
Set this up once (GitHub UI; it can't be done from the CLI here):

1. **Settings → Branches → Add branch ruleset** (or "Add classic branch
   protection rule"), targeting `main`.
2. Enable **Require status checks to pass before merging**, and select the
   Vercel check (e.g. **Vercel** / **Vercel Preview Comments**) as required.
   This guarantees the preview build is green before any merge.
3. (Optional) Enable **Require a pull request before merging** and
   **Require approvals** if you want review gating.
4. **Settings → General → Pull Requests → Allow auto-merge**.

After that, on each PR click **Enable auto-merge** (or it can be enabled
programmatically) and GitHub will squash-merge it automatically once the
required Vercel check passes — which then triggers the production deploy.
Without a required check, a green PR is simply "mergeable" and is merged
directly rather than via auto-merge.

## Ward boundary data ⚠️

`src/data/purulia-wards.json` contains **approximate** ward polygons — a
23-cell Voronoi tessellation whose ward positions were estimated by eye from the
official **SUDA "Land Use Map of Purulia Municipality" (1:16,000)**, anchored on
the town centre / Saheb Bandh lake and clipped to an approximate municipal
outline. Every feature is flagged `"approximate": true`.

> ⚠️ **Not survey-accurate.** The SUDA map is a low-resolution raster with no
> coordinate graticule, so it can't be georeferenced precisely. These polygons
> have the right ward *count* and roughly the right *relative* layout — fine for
> demoing ward attribution, but **replace them with the official shapefile**
> before any real use. Regenerate with `npm run gen-wards`
> (`scripts/gen-approx-wards.mjs`).

**Why still placeholder:** OpenStreetMap does *not* have ward-level boundaries
for Purulia. Overpass queries (including `admin_level=10` within the Purulia
area) return **zero** ward features — OSM only has the Purulia **district**
(`admin_level=5`) and the **Purulia‑I / Purulia‑II** blocks (`admin_level=6`).
So authentic per-ward boundaries cannot be auto-sourced from open data.

Real boundaries must come from an official source:

- **SUDA West Bengal** / **WBSDI (WBSAC)** — municipal ward layers, usually
  inside AMRUT/PMAY DPRs (sometimes a 1:16,000 PDF to georeference & trace), or
- a **shapefile / KML** from the municipality, or
- manual digitisation in QGIS / [geojson.io](https://geojson.io) over a
  satellite base layer.

### Importing real boundaries

Once you have the wards as **GeoJSON** (QGIS, `ogr2ogr` or
[mapshaper](https://mapshaper.org) convert SHP/KML → GeoJSON), normalise them
into the app's format with the built-in importer:

```bash
npm run import-wards -- path/to/wards.geojson \
  --id-prop=WARD_NO --name-prop=WARD_NAME --zone-prop=ZONE \
  --councillors=councillors.csv     # optional CSV: "ward,councillor[,mla,mp]"
```

This writes `src/data/purulia-wards.json` with the required properties
(`ward_id`, `ward_name`, `zone`, `mla`, `mp`), sorted by ward number. Then run
`npm run dev`, file a test report, and confirm it maps to the right ward.
Verify councillor/MLA/MP names against ECI / municipality records.

## Project structure

```
src/
  App.jsx                 # mobile dashboard shell, wired to live data
  components/
    Dropdown.jsx          # severity / status filter dropdown
    SocialMenu.jsx        # header Telegram / X / Instagram dropdown
    StatCard.jsx          # unresolved / resolved / rate cards
    WardCard.jsx          # expandable ward row (List tab)
    WardBar.jsx           # one row of the Map leaderboard (progress bar)
    DecorativeMap.jsx     # stylized bubble "Overview" map
    MapView.jsx           # real MapLibre "Live map" (markers + ward layers)
    MapTab.jsx            # Map tab: base map + stats/leaderboard overlay sheet
    ReportSheet.jsx       # photo + GPS + category bottom sheet (+ out-of-bounds)
    DigestSheet.jsx       # weekly-digest subscribe bottom sheet
  lib/
    supabase.js           # Supabase client (env-driven)
    complaints.js         # compress + upload + insert + fetch + realtime
    subscribers.js        # weekly-digest subscribe + count
    image.js              # client-side photo compression
    wards.js              # point-in-polygon ward resolution
    wardStats.js          # per-ward aggregation + severity buckets
    i18n.js               # English / বাংলা strings, categories, social links
    demo.js               # sample data for ?demo=1 preview
  data/
    purulia-wards.json    # ward boundary GeoJSON (placeholder)
supabase/
  schema.sql              # complaints + subscribers + admins + RLS + storage
scripts/
  import-wards.mjs        # normalise a real ward GeoJSON into the app format
  gen-approx-wards.mjs    # regenerate the approximate wards (npm run gen-wards)
```

### Customising

- **Social links** — edit `SOCIAL_LINKS` in `src/lib/i18n.js` with the real
  Swaccho Purulia handles (currently placeholders).
- **Severity thresholds** — tune `severityOf()` in `src/lib/wardStats.js`.

## License

MIT
