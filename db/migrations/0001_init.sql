-- Initial model for the San Mateo intro-offer tracker.
-- Evidence objects live in object storage. This database stores keys, not HTML or screenshots.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE studios (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE locations (
  id text PRIMARY KEY,
  studio_id text NOT NULL REFERENCES studios (id),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  region text NOT NULL,
  is_san_mateo boolean NOT NULL
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id text NOT NULL REFERENCES studios (id),
  location_id text REFERENCES locations (id),
  kind text NOT NULL CHECK (kind IN ('pricing_page', 'instagram', 'facebook')),
  url text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('san_mateo', 'national_brand')),
  needs_location_check boolean NOT NULL DEFAULT false,
  confirmation text NOT NULL CHECK (confirmation IN ('confirmed', 'unconfirmed')),
  notes text NOT NULL DEFAULT ''
);

CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id text NOT NULL REFERENCES studios (id),
  location_id text NOT NULL REFERENCES locations (id),
  class_type text NOT NULL CHECK (class_type IN ('yoga', 'reformer_pilates')),
  offer_type text NOT NULL CHECK (
    offer_type IN ('free_week', 'intro_month', 'class_pack', 'first_month_membership', 'promo_code')
  ),
  classes_included integer,
  duration text,
  restrictions text NOT NULL DEFAULT '',
  auto_renew_price_cents integer,
  fees_cents integer NOT NULL DEFAULT 0,
  terms_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offers_classes_nonnegative CHECK (classes_included IS NULL OR classes_included >= 0),
  CONSTRAINT offers_fees_nonnegative CHECK (fees_cents >= 0)
);

-- A terms change is a new offer row. Price changes are observations, not new fingerprints.
CREATE UNIQUE INDEX offers_identity_uidx
  ON offers (studio_id, location_id, offer_type, terms_fingerprint);

CREATE TABLE capture_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id text NOT NULL REFERENCES studios (id),
  location_id text REFERENCES locations (id),
  source_url text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('succeeded', 'failed', 'blocked', 'skipped')),
  html_object_key text,
  screenshot_object_key text,
  error text
);

CREATE TABLE price_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers (id),
  capture_run_id uuid REFERENCES capture_runs (id),
  list_price_cents integer,
  effective_price_cents integer NOT NULL,
  promo_code text,
  expiry date,
  source_type text NOT NULL CHECK (
    source_type IN ('official_site', 'checkout', 'studio_social', 'influencer_social', 'archive_backfill')
  ),
  verification_status text NOT NULL CHECK (
    verification_status IN ('verified', 'unverified', 'pending_site_check', 'pending_recheck')
  ),
  confidence_label text CHECK (confidence_label IS NULL OR confidence_label IN ('archived', 'partial')),
  origin_label text,
  evidence_html_key text,
  evidence_screenshot_key text,
  source_url text NOT NULL,
  price_scope text NOT NULL CHECK (price_scope IN ('location', 'national')),
  post_url text,
  post_date date,
  captured_at timestamptz NOT NULL,
  -- Only the official site or checkout can be verified. Social and archive never are.
  CONSTRAINT verified_requires_official_source CHECK (
    verification_status <> 'verified'
    OR source_type IN ('official_site', 'checkout')
  ),
  CONSTRAINT prices_nonnegative CHECK (
    effective_price_cents >= 0
    AND (list_price_cents IS NULL OR list_price_cents >= 0)
  )
);

CREATE INDEX price_observations_offer_captured_idx
  ON price_observations (offer_id, captured_at);

CREATE FUNCTION reject_price_observation_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'price_observations is append-only';
END;
$$;

CREATE TRIGGER price_observations_no_update
  BEFORE UPDATE OR DELETE ON price_observations
  FOR EACH ROW
  EXECUTE FUNCTION reject_price_observation_mutation();

CREATE TABLE scraper_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_run_id uuid REFERENCES capture_runs (id),
  studio_id text NOT NULL REFERENCES studios (id),
  reason text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pending_rechecks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers (id),
  studio_id text NOT NULL REFERENCES studios (id),
  candidate_effective_price_cents integer,
  detected_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'discarded')),
  CONSTRAINT recheck_within_six_hours CHECK (due_at <= detected_at + interval '6 hours')
);

CREATE TABLE social_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id text NOT NULL REFERENCES studios (id),
  page text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  checked_at timestamptz NOT NULL,
  checker text NOT NULL,
  found_deal boolean NOT NULL,
  post_url text,
  post_date date,
  screenshot_key text,
  location_check text NOT NULL DEFAULT 'not_required' CHECK (
    location_check IN ('not_required', 'pending', 'passed', 'failed')
  ),
  CONSTRAINT social_deal_has_evidence CHECK (
    found_deal = false
    OR (post_url IS NOT NULL AND post_date IS NOT NULL AND screenshot_key IS NOT NULL)
  )
);

CREATE INDEX social_checks_page_checked_idx ON social_checks (page, checked_at);

CREATE TABLE recapture_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id text NOT NULL REFERENCES studios (id),
  location_id text NOT NULL REFERENCES locations (id),
  source_url text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('studio_social', 'pending_recheck')),
  social_check_id uuid REFERENCES social_checks (id),
  requested_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'done', 'skipped'))
);

CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers (id),
  observation_id uuid NOT NULL REFERENCES price_observations (id),
  baseline_key text NOT NULL,
  path text NOT NULL CHECK (path IN ('A', 'B')),
  evidence_screenshot_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One alert per offer and baseline. A repeat of the same low does not alert again.
CREATE UNIQUE INDEX alerts_offer_baseline_uidx ON alerts (offer_id, baseline_key);

CREATE TABLE saved_studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL DEFAULT 'owner',
  studio_id text NOT NULL REFERENCES studios (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, studio_id)
);

CREATE TABLE budget_settings (
  owner_id text PRIMARY KEY DEFAULT 'owner',
  annual_budget_cents integer NOT NULL,
  unlimited_classes_per_month integer NOT NULL DEFAULT 12,
  CONSTRAINT budget_nonnegative CHECK (annual_budget_cents >= 0),
  CONSTRAINT unlimited_assumption_positive CHECK (unlimited_classes_per_month > 0)
);

-- Current verified price, lowest verified price, lowest including labeled backfill,
-- cost per class, and annual cost including renewals and fees.
-- Archived and studio-social rows can lower the backfill figure. They are not the current price.
CREATE VIEW offer_nightly_rollup AS
SELECT
  o.id AS offer_id,
  o.studio_id,
  o.location_id,
  o.class_type,
  o.offer_type,
  o.terms_fingerprint,
  o.classes_included,
  o.auto_renew_price_cents,
  o.fees_cents,
  current_price.effective_price_cents AS current_verified_price_cents,
  current_price.captured_at AS current_verified_captured_at,
  current_price.source_url AS current_source_url,
  current_price.evidence_screenshot_key AS current_evidence_screenshot_key,
  (
    SELECT MIN(po.effective_price_cents)
    FROM price_observations po
    WHERE po.offer_id = o.id
      AND po.verification_status = 'verified'
      AND po.source_type IN ('official_site', 'checkout')
  ) AS lowest_verified_price_cents,
  (
    SELECT MIN(po.effective_price_cents)
    FROM price_observations po
    WHERE po.offer_id = o.id
      AND (
        (po.verification_status = 'verified' AND po.source_type IN ('official_site', 'checkout'))
        OR po.source_type = 'archive_backfill'
        OR (po.source_type = 'studio_social' AND po.confidence_label = 'archived')
      )
  ) AS lowest_price_including_backfill_cents,
  CASE
    WHEN current_price.effective_price_cents IS NULL THEN NULL
    WHEN o.classes_included IS NULL THEN round(current_price.effective_price_cents / 12.0)
    ELSE round(current_price.effective_price_cents / o.classes_included::numeric)
  END AS cost_per_class_cents,
  (o.classes_included IS NULL) AS cost_per_class_is_assumption,
  CASE
    WHEN current_price.effective_price_cents IS NULL THEN NULL
    WHEN o.auto_renew_price_cents IS NULL THEN current_price.effective_price_cents + o.fees_cents
    ELSE current_price.effective_price_cents + (o.auto_renew_price_cents * 11) + o.fees_cents
  END AS annual_cost_cents
FROM offers o
LEFT JOIN LATERAL (
  SELECT
    po.effective_price_cents,
    po.captured_at,
    po.source_url,
    po.evidence_screenshot_key
  FROM price_observations po
  WHERE po.offer_id = o.id
    AND po.verification_status = 'verified'
    AND po.source_type IN ('official_site', 'checkout')
  ORDER BY po.captured_at DESC
  LIMIT 1
) current_price ON true;

-- Month rank uses the lowest price seen that month. Archived points stay visible via includes_archived.
CREATE VIEW offer_monthly_minimums AS
SELECT
  po.offer_id,
  date_trunc('month', po.captured_at) AS month,
  MIN(po.effective_price_cents) AS minimum_price_cents,
  bool_or(po.source_type = 'archive_backfill' OR po.confidence_label = 'archived') AS includes_archived
FROM price_observations po
GROUP BY po.offer_id, date_trunc('month', po.captured_at);
