# Architecture

MVP skeleton for the San Mateo intro-offer tracker. This document describes the system. The capture adapters in this pull request throw "not implemented". There is no scraper, and there is no Instagram or Facebook scraper.

## Stack

- **No website.** Dashboard, search, budget, history, and submit pages are out of scope. The consumer is a Grok Bot. This repository is a plain TypeScript (Node) project: schema, domain functions, and capture adapters.
- **Database:** Postgres on Supabase. The schema is Drizzle (`db/schema`) plus the SQL migration `db/migrations/0001_init.sql`. Drizzle is the map of the tables. The migration keeps the nightly views, the append-only trigger, and the check that only `official_site` and `checkout` can be `verified` as SQL we can read. Prisma would hide those behind a generated client. There is no default budget of $350 in the schema or in the domain functions. An employee budget is an argument to `parseBudget`, `fitsBudget`, `rankOffers`, and `shouldAlert`.
- **Capture worker:** Playwright, once a day, from GitHub Actions cron (`.github/workflows/capture-daily.yml`, added with the capture pipeline). Not Vercel cron. Playwright needs Chromium and a run long enough to save HTML and a full-page screenshot for four studios. A Vercel serverless function is a poor fit for that browser and that duration. GitHub Actions gives the job a full runner, a schedule, and repository secrets by name.
- **Evidence:** HTML and screenshots go to object storage (a Supabase Storage bucket). They never go in git. `snapshots/`, `captures/`, and `*.png` outside `tests/fixtures` are gitignored.
- **Secrets:** environment variables only. `.env.example` lists names and has no values.
- **Email alerts:** a transactional provider. Resend is the placeholder (`RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`). No mail is sent in this skeleton.

## Tracking design

Each studio has an adapter with two methods:

- `capture()` returns raw evidence: source URL, timestamp, HTML, and screenshot.
- `parse()` returns candidate offers. It does not fetch.

Pipeline:

1. Capture.
2. Parse.
3. Validate. A failed parse, a missing price, or a $0 price that is not a free-week offer is a `scraper_error`. It is not stored as a price and it does not alert.
4. Fingerprint the terms (class count, length, restrictions). Price is not part of the fingerprint.
5. Compare with the last observation of that offer.
6. A change greater than 30% goes to `pending_recheck` and is re-captured within 6 hours. `pending_rechecks.due_at` is at or before `detected_at` plus 6 hours. The new price is recorded only if the re-check confirms it. Otherwise it is discarded and logged.
7. Record the observation.
8. Nightly rollup.
9. Alert evaluation.

Source types: `official_site`, `checkout`, `studio_social`, `influencer_social`, `archive_backfill`. Each observation has a verification status. Only `official_site` and `checkout` can be `verified`. The database check `verified_requires_official_source` enforces that.

`studio_social` is a studio's own Instagram or Facebook post. It is labeled studio-posted (`origin_label = 'studio_posted'`, verification status `pending_site_check`). It never alerts on its own. `studioPostAlertEligible` in `src/domain/studio-social.ts` returns true only when a verified official-site or checkout observation matches the same terms fingerprint and the same effective price at the San Mateo location, and the post passed the location check. AC-6 then runs on that site observation, not on the social row. A national or brand page has to pass an explicit San Mateo location check first. San Mateo pages take priority.

A studio-posted deal inserts a `recapture_requests` row with reason `studio_social` and `due_at` equal to the request time, so the website capture runs immediately.

Past studio posts can seed the backfill baseline. They are stored with confidence label `archived`. They can lower `lowest_price_including_backfill_cents`. They are not a verified current price, and `shouldAlert` rejects `archive_backfill` and `studio_social` candidates.

There is no scraper for Instagram or Facebook. The automated route is Meta's Graph API Business Discovery endpoint, and only after the owner creates a Meta developer app and that app passes app review. Until then, a person checks each page once a day and writes a row in `social_checks`:

| Column | Meaning |
| --- | --- |
| `page` | Official page URL |
| `checked_at` | When it was checked |
| `checker` | Who checked it |
| `found_deal` | Whether a new intro deal was posted |
| `post_url` | Post URL, required when a deal was found |
| `post_date` | Post date, required when a deal was found |
| `screenshot_key` | Screenshot object key, required when a deal was found |

Stories are not read. Nothing in this app logs into Meta with a personal account.

## Sources registry

`config/sources.ts` is the stub. The `sources` table is the runtime copy, loaded from that file later. URLs below were either published on the studio's own site on 2026-11-14 or are the owner's social list. Where a social URL was marked unconfirmed, the studio site was checked. Both of those Facebook pages were found, so they are marked confirmed. Notes in the config file say where.

| Studio | San Mateo location | Pricing / intro page | Scope | Instagram | Facebook |
| --- | --- | --- | --- | --- | --- |
| CorePower Yoga | 333 South B Street, Suite 100, San Mateo, CA 94401. Studio page `https://www.corepoweryoga.com/yoga-studios/ca/peninsula/san-mateo` | `https://www.corepoweryoga.com/content/new-student-offers` | National brand page, linked from the San Mateo studio page. Class packs: `https://www.corepoweryoga.com/content/buy` (also national). Needs a location check. | `https://www.instagram.com/corepoweryoga/` National, needs a location check. Confirmed in the site footer and the studio record. | `https://www.facebook.com/CorePowerYogaSanMateo` San Mateo. Confirmed in the studio page structured data. |
| BODYROK | 2 East 3rd Avenue, San Mateo, CA 94401 | `https://bodyrok.com/studio/sanmateo/` | San Mateo studio page (memberships and packages). No separate intro URL was linked. | `https://www.instagram.com/bodyrokstudio/` Brand-wide (SF/NYC/Chicago), needs a location check. Confirmed in the studio page header. | `https://www.facebook.com/bodyrokstudios` Confirmed. The San Mateo page header links `https://www.facebook.com/BODYROKSTUDIOS/`, the same page. Brand page, so posts need a location check. |
| Club Pilates | 15 North B Street, Suite F, San Mateo, CA 94401 | `https://www.clubpilates.com/location/sanmateo` | San Mateo location page, including the free intro class. | `https://www.instagram.com/clubpilates_sanmateo/` San Mateo. | `https://www.facebook.com/clubpilatessanmateo/` San Mateo. |
| RockSalt Pilates | 306 E. 5th Ave, San Mateo, CA 94401 | `https://rocksaltpilates.com/locations/usa/ca/san-mateo/pricing/` | San Mateo pricing page. | `https://www.instagram.com/rocksaltpilates/` Brand (San Mateo + Redwood City), needs a location check. Confirmed on the San Mateo location page. | `https://www.facebook.com/rocksaltpilates` Confirmed. The homepage and the San Mateo location page link `https://www.facebook.com/RockSaltPilates`. Brand page, so posts need a location check. |

Eight pages. San Mateo pages take priority over a national account when both exist.

## Price-history model

Tables:

- `studios`
- `locations`
- `sources` — pricing page, Instagram, and Facebook, with scope and confirmation
- `offers` — studio, location, class type, offer type, classes included, duration, restrictions, `auto_renew_price`, fees, and `terms_fingerprint`. Unique on studio + location + offer type + fingerprint.
- `price_observations` — append-only. Offer, list price, effective price, promo code, expiry, source type, verification status, confidence label, evidence object keys, `captured_at`. Updates and deletes are rejected by a trigger.
- `capture_runs`
- `scraper_errors`
- `pending_rechecks`
- `social_checks`
- `recapture_requests`
- `alerts` — unique on offer + baseline key, so the same baseline does not alert twice
- `saved_studios`
- `budget_settings` — optional saved cap with no default amount. Unlimited class assumption defaults to 12 classes per month only for the AC-3 label when a caller does not pass `--classes-per-week`. The query budget always comes from the employee.

`offer_nightly_rollup` exposes, per offer:

- lowest verified price (official site or checkout only)
- lowest price including backfill, labeled when the low is an archive or an archived studio post
- cost per class (unlimited divides by 12 and is flagged as an assumption)
- annual cost, including auto-renew for the other 11 months and one-time fees

`offer_monthly_minimums` ranks months by the lowest price in that month and flags months that include an archived point.

### AC-6 gating

```
shouldAlert(candidate, history, backfillBaseline, planAnnualCost, alreadyAlerted, sanMateoLocationId):
  if candidate is a parse error: no
  if candidate is members-only: no
  if candidate.location is not San Mateo: no
  if candidate is expired: no
  if candidate.source is studio_social or influencer_social: no
  if candidate.source is archive_backfill: no
  if candidate.source is not official_site or checkout: no
  if candidate is not verified: no
  if candidate has no evidence snapshot: no
  if this offer and baseline already alerted: no
  if planAnnualCost > budgetCents: no
  # budgetCents is required. There is no default.
  # One cent under and the exact budget pass. One cent over fails.

  verified = history + candidate
    where source is official_site or checkout
      and status is verified
      and location is San Mateo
      and not expired, not members-only, not a parse error

  span = latest verified capture time - earliest
  verifiedLow = minimum verified effective price

  pathA = span >= 8 weeks
  pathB = backfillBaseline is labeled
          and count(verified) >= 4
          and span >= 2 weeks

  if not pathA and not pathB: no

  comparisonLow = verifiedLow
  if backfillBaseline exists:
    comparisonLow = min(comparisonLow, backfillBaseline.price)

  # Inclusive 10% boundary, in integer cents:
  # price * 10 <= comparisonLow * 11
  # exactly 10% above the low passes; 11% above fails
  if candidate.price * 10 > comparisonLow * 11: no

  alert once, path = A if pathA else B, link candidate.evidence
```

A studio post is a separate gate, before AC-6:

```
studioPostAlertEligible(post, siteObservation, sanMateoLocationId):
  if post is expired: no
  if the page is national or brand-wide and the San Mateo location check has not passed: no
  if there is no site observation: no
  if the site observation is not verified official_site or checkout at San Mateo: no
  if the terms fingerprint differs: no
  if the effective price differs: no
  return yes
```

"Yes" means the confirming site observation may be evaluated with the AC-6 function. The social row itself still does not alert.

## Acceptance criteria map

| AC | What satisfies it |
| --- | --- |
| AC-1 | Daily Playwright capture, `capture_runs` (URL, timestamps, HTML key, screenshot key), evidence in the storage bucket. Proof is the job log and capture ids. |
| AC-2 | `offers` columns (list price, effective price, auto-renew price, restrictions, expiry, location id), the validate step, `scraper_errors`, and `pending_rechecks` due within 6 hours. |
| AC-3 | `costPerClass` in `src/domain/money.ts`, and `cost_per_class_cents` plus `cost_per_class_is_assumption` on `offer_nightly_rollup`. Default unlimited assumption is 12, from `budget_settings`. |
| AC-4 | `offer_monthly_minimums` ranks months. Archived rows carry `confidence_label` so a later answer can mark them as distinct. The chart UI is out of scope. |
| AC-5 | `offer_nightly_rollup` exposes current price, lowest-ever (including labeled backfill), best month, cost per class, and annual cost. `rankOffers` keeps a plan only when that annual cost is within the budget argument. |
| AC-6 | `shouldAlert` in `src/domain/should-alert.ts`. `alerts` is unique on `(offer_id, baseline_key)` and stores the evidence key. The budget argument is required. |
| AC-7 | Every price observation stores `source_url`, `captured_at`, and `evidence_screenshot_key`. The published offers file repeats those three. There is no HTTP API. |
| AC-8 | `rankOffers` and the later `smfd query` command filter by studio, class type, and location. A website search page is out of scope. |
| AC-9 | `saved_studios` remains in the schema. The dashboard story is being revised with the move to an agent. |
| AC-10 | Influencer codes stay unverified. `shouldAlert` returns no for `influencer_social`. Verification flips only from a matching official-site or checkout observation. The submit page is out of scope. The manual path for studio pages is the `social-check` command in the capture pull request. |
| AC-11 | `termsFingerprint` in `src/domain/terms.ts`. `offers_identity_uidx` is unique on studio, location, offer type, and fingerprint, so a terms change inserts a new row. |
| AC-12 | `annualCost` adds renewals and fees. `fitsBudget(cost, budget)` passes when cost is the budget or one dollar under, and fails at one dollar over. Tests cover employee budgets of $100, $350, and $1,000, plus a $149 plan against a $149 budget and a $150 plan against that same budget. A renewal that makes the period cost exceed the budget is not a fit. |
| AC-13 | `archive_backfill` rows carry `confidence_label` (`archived` or `partial`). The history view styles them differently. They can be `backfillBaseline`. The verified-source check and `shouldAlert` keep them from counting as a verified current price. |
| AC-14 | `officialSocialPages()` is the eight pages in `config/sources.ts`. Daily rows go in `social_checks`. A found deal enqueues `recapture_requests` (`reason = studio_social`). `studioPostAlertEligible` blocks an alert until the site or checkout confirms the same offer. National pages set `needs_location_check`. The Meta section below is the only automated reading path, and it stays off until app review. |

## Meta developer app setup

No code calls Meta in this repository. When the owner wants the automated path, the owner does this. The app does not log in as the owner, and it does not scrape.

1. Use an Instagram Business or Creator account. A personal account cannot call Business Discovery.
2. Link that Instagram account to a Facebook Page the owner manages.
3. Create a Meta developer app and add the Instagram product (Graph API).
4. Request `instagram_basic` and Business Discovery access. Business Discovery reads another business account's public posts (`business_discovery` on the Graph API). It does not read stories.
5. For Facebook Page posts, request the Page public-content access Meta currently allows for those pages. If a page is not available that way, it stays on the manual check.
6. Submit the app for App Review. Advanced access is required to read business accounts the owner does not admin.
7. After approval, put the credentials in the environment. Names only, in `.env.example`:
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `META_ACCESS_TOKEN`
   - `META_GRAPH_API_VERSION`
   - `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - `FACEBOOK_PAGE_ID`
8. Until those exist and review has passed, studio posts come in through the manual `social_checks` log. The capture pipeline does not call Meta.

Proof for the API half of AC-14 (API JSON for one studio-posted deal) waits on that approval. The manual half (the 7-day, 8-page check log) does not.

## Compliance

- No Meta login. No personal-account session. No Instagram or Facebook scraper. No story capture.
- The website worker respects robots.txt. A disallowed pricing path is skipped and logged, not fetched by another route.
- Rate limit: one capture per studio per daily run, plus at most one re-check inside 6 hours when a price moves more than 30%, plus an immediate website re-check when a studio post is logged. The worker pauses between studios.
- The worker sends an identifiable user agent, `SanMateoFitnessDeals/0.1 (+https://github.com/rtconference01/san-mateo-fitness-deals)`, and a contact in that string.
- Official sites and checkout pages remain the only source of truth for a price that can alert.
- A missing price is `not_published`. It is never estimated. Club Pilates does not publish dollar prices on its marketing pages. Adapters target a public checkout or booking pricing page when one is reachable without a login. If it is not reachable, the row is `not_published`.
- BODYROK publishes prices only after a location is chosen. The capture adapter selects San Mateo through the public location picker, or through the location-specific pricing URL that picker leads to, before it captures. No login. The parser fixture is the post-selection page, not the pre-selection marketing page. A capture with no location selected is a `scraper_error`, not `not_published`.
- `classifySource` marks a blog post, a news post, or an archived page as verification `archived` and keeps its post date. That stays true when the page is on the studio's own domain. Those rows are never `verified`.
- `price_scope` is `location` or `national`. CorePower's first-month and new-student prices stay `national` until a San Mateo price is confirmed. National rows need a San Mateo location check before they count.

## Agent layer (design pending, see follow-up PR)

The website is out of scope. The consumer is a Grok Bot chat agent that reads a published offers file and, for anything that depends on the employee's own inputs, runs a read-only CLI. Class timetables are out of v1. The CLI takes `--classes-per-week` and uses it for cost per class and period cost on unlimited offers. It does not filter by day or time.

Two binding principles:

1. All budget math, lowest-ever lookups, ranking, and AC-6 eligibility live in deterministic, tested code that the agent calls as tools. The agent only repeats numbers and links those tools return. The functions are `parseBudget`, `annualCost`, `costPerClass`, `fitsBudget`, `rankOffers`, and `shouldAlert`.
2. Scraped page text and social post text are untrusted data and never go into the agent's instructions. Tools return structured fields. Raw text is passed only as quoted, delimited data if needed.

The bot must invoke the CLI with an argv array and no shell string interpolation. For example: `execFile('npx', ['smfd', 'plan', '--budget', value])`.

### Published offers file

A daily GitHub Actions job, after capture and rollup, publishes `public/offers.json` and `public/offers.schema.json`.

**GitHub Pages is the publish target.** The workflow uploads the `public/` directory and deploys it with GitHub Actions Pages. The owner enables Pages and sets the source to GitHub Actions. The public URL is `https://rtconference01.github.io/san-mateo-fitness-deals/offers.json`. If Pages is not available, the same two files are uploaded as a workflow artifact and, when `OFFERS_PUBLISH=release`, attached to a GitHub Release. The release asset is the fallback, not the primary path.

Each row is precomputed by the tested domain functions. One row per offer: studio, location, class type, offer type, terms, current price, verification label (`verified`, `studio_posted_unconfirmed`, `influencer_unconfirmed`, `archived`, or `not_published`), `price_scope` (`location` or `national`), lowest verified price and date, best month or null with reason `insufficient history`, cost per class with the unlimited assumption labeled, annual cost including renewals and fees, alert eligibility and reason (AC-6), expiry, source URL, capture time, evidence screenshot URL, and file-level plus row-level `generated_at`. No secrets and no personal data. The file is public.

Rows whose `generated_at` is older than 24 hours are flagged `stale` by the CLI. An expired offer is not described as current.

### Read-only CLI

`npx smfd query` and `npx smfd plan` return JSON. `--budget` is required for `smfd plan` and for any budget-dependent query. A missing budget returns `{ "error": "budget_required" }`. The bot never does arithmetic.

`parseBudget` accepts a plain number and the forms `$400`, `400/yr`, `400 per year`, and `$1,200`. It rejects zero, negatives, non-numeric text, NaN, Infinity, values over 100000 dollars, and extra characters such as `350; rm -rf ~`, with `{ "error": "invalid_budget", "reason" }`. `/mo` and `per month` are rejected as `ambiguous_period`. Monthly is not converted to annual.

Ranking, in `rankOffers`: among verified offers whose period cost (renewals and fees included) fits the employee's budget, sort by lowest period cost, then lower cost per class, then a smaller percentage above the verified low. Unverified offers are never ranked as best. They come back in a separate labeled list. `not_published` is not a price.

`smfd plan` returns every field the bot is allowed to repeat, already computed. That includes the fields in the published file that depend on the employee's budget and `--classes-per-week`.

The manual studio-page check, in the capture pull request, is a CLI command rather than a web form: `npm run social-check -- --page <id> --found-deal ... --screenshot <path>`. It writes `social_checks` and, when a deal is found, enqueues an immediate website recapture. There is still no Instagram or Facebook scraper.

### Follow-up pull requests

Capture (`feat/capture-pipeline`, stacked on this branch) records live public pricing and checkout pages. The BODYROK adapter selects San Mateo first, then saves a scrubbed fixture of that post-selection page.

Backfill is the next pull request after capture (`feat/wayback-backfill`, stacked on the capture branch). A command uses the Internet Archive CDX API to list snapshots of each studio's intro-offer and pricing pages for all four studios, at least all of 2026 and as far back as the archive has them. It fetches snapshots politely, rate-limited and cached, parses them with the same studio parsers, and stores observations as source type `archive_backfill`, verification `archived`, with a confidence label. The snapshot URL and timestamp are the evidence. Snapshots of national pages or other locations are not stored as San Mateo baselines. Same-day conflicting snapshots are both kept and flagged `conflict`. Rollups surface multi-week price plateaus and changes, including a CorePower first month that was $99 during Yoga Month and then stayed at $99, as monthly minimums and a `price held since <date>` field in `offers.json`. Tests use saved snapshot fixtures. A 2026 snapshot file from the Chief of Staff can be added as extra fixtures when it arrives.
