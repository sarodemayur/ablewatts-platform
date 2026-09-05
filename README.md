# AbleWatts Platform (React + Node/Express + PostgreSQL + TypeScript)

A from-scratch port of the AbleWatts "Venus" rate engine and admin app (originally PHP CodeIgniter 3
+ MySQL + MongoDB) to a modern stack:

- **Frontend**: React + TypeScript, built with Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (via Prisma ORM), replacing both the original MySQL (auth/keys) and
  MongoDB (URDB rate documents) databases
- **Docker is infra-only** (Postgres + Adminer). The backend and frontend run natively via pnpm —
  no app containers/images to rebuild on every code change.

## Quick start

```bash
make deploy        # starts Postgres + Adminer (services/docker-compose.yml)
pnpm install        # installs both workspace packages
pnpm run db:migrate # applies Prisma migrations
pnpm run db:seed    # seeds an admin, a sample rate, sample green-data files (idempotent)
pnpm run dev        # runs backend (:4000) + frontend (:5173) in parallel
```

Then open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api (health check at `/health`)
- Adminer (DB browser): http://localhost:8090 — server `postgres`, credentials from `services/.env`

Log in with the seeded admin account:

- **Email**: `admin@ablewatts.local`
- **Password**: `admin123`

A sample URDB rate ("Test Residential Rate", $0.15/kWh flat) and two sample green-data CSV files
are seeded automatically so you can run the Rate Calculator immediately.

To tear down and wipe the database: `make delete`. `make recreate` does delete + deploy +
migrate + seed in one shot.

## Project layout

```
services/
  docker-compose.yml           # infra only: postgres + adminer
  .env                          # POSTGRES_USER/PASSWORD/DB/PORT, ADMINER_PORT
backend/
  prisma/schema.prisma          # Postgres schema (Prisma)
  prisma/seed.ts                 # seeds an admin, a sample rate, sample green-data files
  sample-data/                   # bundled sample green-data CSVs (from the original app's fixtures)
  src/
    modules/
      auth/                      # JWT login (bcrypt-hashed passwords)
      urdb/                      # URDB rate CRUD (JSONB-backed rate documents)
      rate-engine/                # the ported calculation engine (see below)
      green-data/                 # green-data file upload/listing
      lookups/                    # sectors/units/service-types/voltage-categories/phase-wires
      admin-users/                 # admin account management (who can log into this panel)
      app-users/                   # end-user accounts (registered/demo/beta/guest/invite)
      surveys/                     # survey authoring + response viewing
      feedback/                    # end-user feedback viewing
      homepage-content/            # About Us/Contact/Terms/Privacy text
      csv/                         # CSV export (app-users, feedback) + import (app-users)
frontend/
  src/
    api/                         # typed fetch client
    context/AuthContext.tsx      # JWT auth state
    pages/                       # Dashboard, URDB Rates, Green Data, Rate Calculator, Login,
                                   # Lookups, Admin Users, End Users, Surveys, Feedback, Homepage Content
Makefile                         # deploy/delete/recreate wrappers around services/docker-compose.yml
```

## Local development (native, no Docker for the apps)

The steps in "Quick start" above already cover this — `pnpm run dev` runs both apps natively via
`pnpm --parallel -r run dev`. Useful individual commands:

```bash
pnpm run backend:serve    # backend only (:4000)
pnpm run frontend:serve   # frontend only (:5173)
pnpm run db:generate      # regenerate Prisma client after a schema change
pnpm run db:studio        # Prisma Studio, an alternative to Adminer
```

Backend config lives in `backend/.env` (copied from `backend/.env.example`); it points
`DATABASE_URL` at `localhost:5432`, matching the port Postgres exposes via `services/docker-compose.yml`.

## The rate-engine port

The original PHP engine (`GreenData_Calculator_Versiontwo`, `Urdb_Calculator_Versiontwo`,
`Math_Logic_Calculator_Versiontwo`, `Sector_Based_Calculation_Versiontwo`) was reverse-engineered
and ported field-for-field into `backend/src/modules/rate-engine/`:

- `intervalTable.ts` — the exact interval-normalization lookup table (how 5/10/15/20/30/60-minute
  interval readings get normalized into clock-aligned hourly buckets), ported verbatim from
  `decide_time_difference_metadata()`.
- `greenDataParser.ts` — CSV parsing + the normalization/grouping algorithm.
- `scheduleLookup.ts` — 12×24 weekday/weekend schedule matrix lookups (URDB format).
- `tieredRateCalculator.ts` — the tiered-rate walking formula (shared by flat-demand, demand, and
  energy charges), including the unit-based tier-max scaling (kW, kVA, hp, kWh, kWh/kW, etc.).
- `rateEngine.service.ts` — orchestration: 3-tier rate-matching fallback (overlap → containment →
  open-ended), monthly aggregation, and the fixed/minimum-monthly-charge rule.

This was validated against the running original PHP app (see below) for a full calendar year of
hourly sample data, producing sensible, correctly-scaled monthly bills.

### Known deviations from the original (by design, or flagged for follow-up)

- **v1 legacy pipeline dropped.** Only the current/active `get_urdb_result_v2` pipeline was ported,
  per the original code's own comments marking v1 "not in use."
- **Coincident-demand charges are not applied**, matching the original v2 pipeline, which computes
  coincident-demand data but never actually wires its contribution into the final bill (the call is
  commented out in `Sector_Based_Calculation_Versiontwo`).
- **Single best-fit rate per calculation**, not multi-bill stitching. The original could stitch
  together multiple URDB "bills" when a rate changed mid-period; this port matches one rate for the
  whole date range. Covers the common case; mid-period rate changes are a follow-up.
- **Demand tier-max day-scaling bug intentionally not reproduced.** The original indexes
  `number_of_days` without the year dimension when scaling per-tier demand maximums (a likely
  latent bug). This port scales correctly instead — see the comment in `tieredRateCalculator.ts`.
- **XML (Green Button) green-data files are not yet supported** — only CSV. The original supported
  both.
- **URDB rate create/edit UI supports full tiered, multi-period, time-of-use rate structures** —
  see "Visual theme" below for the Demand/Energy tab details. Sell rate (`tier{N}sell`), demand
  ratchet percentages, and energy fuel adjustments are captured and round-tripped through the form
  but not yet applied by the calculation engine (same "captured but not wired" pattern as
  coincident demand — see above).

## Phase 2 — Mercury admin modules

Ported the rest of the original "Venus" admin app's Mercury module:

- **URDB lookups** (`/lookups`) — sectors, units, service types, voltage categories, phase wires.
  Modeled as one `Lookup` table differentiated by `category` (they're structurally identical),
  rather than five near-identical tables/endpoints.
- **Admin user management** (`/admin-users`) — create/deactivate admin accounts, set access level,
  reset password (mints and returns a one-time temporary password, shown once).
- **End-user account management** (`/app-users`) — the original's five user-type sections
  (registered/demo/beta/guest/invite), unified into one filterable list with a "convert to
  registered" action.
- **Surveys & feedback** (`/surveys`, `/feedback`) — admin-authored surveys (free-form question
  list) with response viewing; feedback list/delete. The original's survey *builder* UI (rich
  question types, branching) is out of scope — this supports simple text-question surveys.
- **Homepage content** (`/homepage-content`) — About Us / Contact Us / Terms / Privacy Policy text.
- **CSV import/export** (`/csv`) — export end-users or feedback to CSV; bulk-import end-users from
  a CSV (`type,email,firstName,lastName` columns).

### Known simplifications in Phase 2

- Admin action logging (`AdminActionLog`, present in the schema from Phase 1) isn't wired into
  these new modules yet — actions aren't audit-logged.
- Survey questions are free-form text prompts only (one type: open text per line at creation time,
  though the schema supports `rating`/`yes_no` types for future richer authoring).
- There's no end-user-facing app to actually submit feedback/survey responses — these modules are
  admin-side viewing/management only, since the original's end-user mobile/web clients are separate
  apps not covered by this migration.

## Visual theme

The frontend intentionally re-uses the original Venus admin app's branding rather than a generic
design, pulled directly from `techathalon-ablewatts_venus`'s `public/uploads/assets/` and
`application/views/admin/header.php` / `login.php`:

- **Colors**: amber `#D69B06` (primary/brand — sidebar header, top bar, buttons) and dark navy
  `#2A3F54` (sidebar, table headers), matching the original's exact hex values.
- **Logo**: `logo2.png` (white "aw" monogram, for the amber sidebar header and login card header)
  and `newlogo.png` (full "aw ablewatts" lockup) — copied into `frontend/src/assets/` as
  `logo-mark.png` / `logo-full.png`. Favicon is the original `ic_favicon.ico`.
- **Login page**: reproduces the original's bordered white card (3px amber border, rounded
  corners, amber header bar with the logo) on a gray page background, with a green "Login" button
  and a blue info banner — the same visual pattern as `application/views/admin/login.php`.
- **Utility Rate Database page & Add/Edit Utility Rate form**: rebuilt to match the original's
  `web/Urdb.php` screens field-for-field — the filter form (State/Utility/Sector/Effective As
  Of/Approved-Unapproved/Order By/Ascending-Descending), the results table with a View/Edit/
  Approve/Unapprove/Delete icon-action column and legend, and the tabbed Add/Edit form (Basic
  Information + Applicability fields, then Demand/Energy/Fixed Charges/Other Attributes tabs).
  This required adding the "Basic Information"/"Applicability" fields to the `UrdbRate` schema
  (supersedes label, service type, source parent, net metering, demand/energy/voltage
  applicability ranges, voltage category, phase wiring) that weren't part of the original Phase 1
  port — see migration `urdb_basic_info_and_applicability`.
- **Demand and Energy tabs**: full multi-period, multi-tier rate structure editors (`Add
  Period`/`Add Tier`/`Delete Period`/`Delete Tier`), matching the original's three demand
  structures — Seasonal/Monthly (flat demand, with a month-per-period radio grid), Time of Use, and
  an optional Coincident structure — plus the Energy tab's tiered structure (with a per-tier usage
  unit and a Sell rate column). Both include the interactive 12×24 weekday/weekend schedule grids
  (click cells to select, type a period number, "Set Period" to bulk-apply — plus "Click to Select
  All"), Fuel Adjustments / Demand Ratchet Percentages (12 monthly values), and a comments field.
  Reusable components: `PeriodTierEditor` and `ScheduleGrid` (`frontend/src/components/`), with
  the flattened-JSON ↔ editor-state conversion in `frontend/src/utils/rateStructure.ts`.
- **Fixed Charges tab**: Fixed daily/monthly charge, Minimum monthly charge, Annual minimum charge.
- **Other Attributes tab**: custom Attribute/Value rows per group (Demand/Energy/Fixed Charges),
  plus a Revision History table (last 10 admin actions on that rate, from `AdminActionLog`).
- The form is a **stepper**: Back/Next move sequentially through the 5 tabs (tabs are also
  directly clickable), and the Add/Save submit button only appears on the final "Other Attributes"
  step — matching the original's wizard flow.
