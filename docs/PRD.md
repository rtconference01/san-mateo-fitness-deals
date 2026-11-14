The product is moving to an agent interface, and the dashboard and saved-studios stories are being revised.

# PRD: San Mateo intro-offer tracker

Requirements cut, revision 2 (Nov 13, 2026), plus US-11 and AC-14 (studio social pages).

## Problem

Intro offers change often (for example, first month $99 one week, $49 the next). People overpay.

Outcome: the owner buys each intro offer at or near its lowest observed price and stays within $350 total for the year.

## Owner decisions still open

1. Social: MVP checks official websites daily. Social codes come in through a manual submit form that requires a link and a screenshot. Automated public-post reading is P1. Automated stories are P2. Stories need a Meta login, break terms, and vanish in 24 hours. Unverified codes are the main false-drop source.
2. Past-year history: backfill from Internet Archive Wayback Machine snapshots of each pricing page, labeled archived and partial. "Lowest-ever" means lowest observed.
3. Budget: each intro offer is usually usable once per person per studio. The budget view builds a 12-month plan stacking offers across the four studios, total versus $350.

US-11 and AC-14, below, are the accepted P0 handling for each studio's own Instagram and Facebook pages. Influencer codes stay on US-8. Stories stay on US-10.

## Scope

### In

- The four studios in San Mateo: CorePower Yoga, BODYROK, Club Pilates, and RockSalt Pilates.
- Reformer Pilates and yoga.
- Offer types: free week, intro month, class pack, first-month membership, promo code.
- Daily official-site checks, a price history store, a budget view, gated alerts (in-app and email to the owner), search, and a saved-studios dashboard.
- Single user (the owner).
- US-11: a daily check of each studio's own official Instagram and Facebook pages.

### Out

- Other cities and other class types.
- Booking or buying in the app.
- Automated story scraping.
- Anything behind a login wall.
- Native mobile.
- Multiple accounts.
- Payments.

### Ground rules

- Official sites and checkout pages are the only source of truth for price.
- Social and influencer deals are manual only. Nothing logs into Meta.
- Respect robots.txt and site terms.
- Every price links to evidence of where and when it was captured.

## Stories

- **US-1 (P0).** Daily capture with evidence.
- **US-11 (P0).** As the owner, I want each studio's own Instagram and Facebook pages checked daily for intro deals, not just influencer codes, so that I catch promos the studios announce on social media first.
- **US-2 (P0).** Normalized offers: studio, class type, offer type, price, classes included, duration, terms, promo code, source, and capture time.
- **US-3 (P0).** Price history with the lowest point and the cheapest months.
- **US-4 (P0).** Budget view: current price, lowest-ever, best month, cost per class, and total annual cost versus $350.
- **US-5 (P0).** Alerts only when a verified deal fits the remaining budget and is at or near the historical low.
- **US-6 (P1).** Search by studio, class type, and location.
- **US-7 (P1).** Saved-studios dashboard.
- **US-8 (P1).** Submit a social promo code with a link and a screenshot.
- **US-9 (P1).** Wayback backfill.
- **US-10 (P2).** Public Instagram posts and stories via a compliant source, once that source is confirmed.

## Acceptance criteria

### AC-1 (US-1)

All four studios' intro-offer pages are captured once a day for 7 consecutive days. Each capture stores the source URL, timestamp, HTML, and screenshot.

Proof: job log plus 28 capture IDs.

### AC-2 (US-2)

Every offer record has all required fields, including list price, effective price, auto-renew price, restrictions, expiry, and location ID.

A failed parse, or a $0 or missing price, is a scraper error and is never stored as a price.

Any change greater than 30% is re-checked automatically within 6 hours before it is recorded.

### AC-3 (US-4)

Cost per class = price / classes included.

Unlimited uses a labeled configurable assumption. The default is 12 classes per month.

### AC-4 (US-3)

The history chart plots every observed price per offer, marks the lowest, and ranks months by lowest intro price. Archived points look different.

### AC-5 (US-4)

The budget view shows all five fields per offer and a 12-month plan totaling less than or equal to $350.

The five fields are current price, lowest-ever, best month, cost per class, and total annual cost.

### AC-6 (US-5)

An alert fires only when all of these hold:

- The price is verified on the official site or checkout.
- The plan's total annual cost stays less than or equal to $350 with this offer included.
- The price is within 10% of the verified low, inclusive.
- The offer has a baseline via Path A or Path B.
  - Path A: at least 8 weeks of verified history.
  - Path B: a labeled backfill baseline, plus at least 4 verified observations spread over at least 2 weeks.

Each alert fires once and links its evidence snapshot.

No-fire fixtures: first observation, 7 weeks with no backfill, backfill plus 3 observations, backfill plus 4 observations within 1 week, parse error, members-only price, wrong location, expired promo, and duplicate. Plus a valid Path B fire case.

### AC-7 (US-1)

Every displayed price links to the source URL, the capture time, and the screenshot.

### AC-8 (US-6)

Each search filter alone, and the filters combined, returns exactly the matching offers.

### AC-9 (US-7)

Saved studios persist across sessions.

### AC-10 (US-8)

A submitted social or influencer code requires a link and a screenshot. It is labeled unverified. It never alerts, even if a second social source agrees. It becomes verified only when the studio site or checkout shows it.

### AC-11 (US-2)

Each offer has a terms fingerprint: class count, length, and restrictions. A change in terms creates a new offer row. It is never recorded as a price change on the old offer.

### AC-12 (US-4)

Total annual cost includes auto-renew charges and fees. Budget checks pass at $349 and $350, and fail at $351. A renewal that pushes the plan over $350 is flagged.

### AC-13 (US-3)

Backfilled archive prices carry a confidence label, are visually distinct, can serve as a baseline, and never count as a verified current price.

### AC-14 (US-11)

All eight official studio pages are checked once a day. Public posts are read through Meta's official Instagram API for business accounts (Business Discovery) where it's approved. Otherwise a person checks the page daily and logs it with a screenshot. Each deal found is stored with the post URL, post date, and a screenshot, and labeled studio-posted. That triggers an immediate re-check of the studio's website, and the deal becomes alert-eligible only once the site or checkout page confirms it. Nothing logs into Meta with a personal account. Past studio posts can also seed the backfill baseline. National-account posts need a San Mateo location check before they count; San Mateo pages take priority.

Proof: daily check log for 7 days covering all 8 pages, plus API JSON for one studio-posted deal.

## Unlock order

US-1, US-11, and US-2 first. Then US-9 and US-3. Then US-4 and US-5. Then US-6, US-7, and US-8. US-10 last.

## Definition of done

Every P0 acceptance criterion has its proof attached.
