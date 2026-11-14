import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Drizzle map of db/migrations/0001_init.sql.
 * The SQL migration owns the nightly views and the append-only trigger.
 * Drizzle is used instead of Prisma so those constraints stay as SQL we can read,
 * next to a typed table map, rather than behind a generated client.
 */

export const studios = pgTable("studios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const locations = pgTable("locations", {
  id: text("id").primaryKey(),
  studioId: text("studio_id")
    .notNull()
    .references(() => studios.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  isSanMateo: boolean("is_san_mateo").notNull(),
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: text("studio_id")
    .notNull()
    .references(() => studios.id),
  locationId: text("location_id").references(() => locations.id),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  scope: text("scope").notNull(),
  needsLocationCheck: boolean("needs_location_check").notNull().default(false),
  confirmation: text("confirmation").notNull(),
  notes: text("notes").notNull().default(""),
});

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioId: text("studio_id")
      .notNull()
      .references(() => studios.id),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    classType: text("class_type").notNull(),
    offerType: text("offer_type").notNull(),
    classesIncluded: integer("classes_included"),
    duration: text("duration"),
    restrictions: text("restrictions").notNull().default(""),
    autoRenewPriceCents: integer("auto_renew_price_cents"),
    feesCents: integer("fees_cents").notNull().default(0),
    termsFingerprint: text("terms_fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("offers_identity_uidx").on(
      table.studioId,
      table.locationId,
      table.offerType,
      table.termsFingerprint,
    ),
  ],
);

export const captureRuns = pgTable("capture_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: text("studio_id")
    .notNull()
    .references(() => studios.id),
  locationId: text("location_id").references(() => locations.id),
  sourceUrl: text("source_url").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull(),
  htmlObjectKey: text("html_object_key"),
  screenshotObjectKey: text("screenshot_object_key"),
  error: text("error"),
});

export const priceObservations = pgTable(
  "price_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id),
    captureRunId: uuid("capture_run_id").references(() => captureRuns.id),
    listPriceCents: integer("list_price_cents"),
    effectivePriceCents: integer("effective_price_cents").notNull(),
    promoCode: text("promo_code"),
    expiry: date("expiry"),
    sourceType: text("source_type").notNull(),
    verificationStatus: text("verification_status").notNull(),
    confidenceLabel: text("confidence_label"),
    originLabel: text("origin_label"),
    evidenceHtmlKey: text("evidence_html_key"),
    evidenceScreenshotKey: text("evidence_screenshot_key"),
    sourceUrl: text("source_url").notNull(),
    priceScope: text("price_scope").notNull(),
    postUrl: text("post_url"),
    postDate: date("post_date"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("price_observations_offer_captured_idx").on(table.offerId, table.capturedAt),
    check(
      "verified_requires_official_source",
      sql`${table.verificationStatus} <> 'verified' OR ${table.sourceType} IN ('official_site', 'checkout')`,
    ),
  ],
);

export const scraperErrors = pgTable("scraper_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  captureRunId: uuid("capture_run_id").references(() => captureRuns.id),
  studioId: text("studio_id")
    .notNull()
    .references(() => studios.id),
  reason: text("reason").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pendingRechecks = pgTable("pending_rechecks", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").references(() => offers.id),
  studioId: text("studio_id")
    .notNull()
    .references(() => studios.id),
  candidateEffectivePriceCents: integer("candidate_effective_price_cents"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
});

export const socialChecks = pgTable(
  "social_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioId: text("studio_id")
      .notNull()
      .references(() => studios.id),
    page: text("page").notNull(),
    platform: text("platform").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    checker: text("checker").notNull(),
    foundDeal: boolean("found_deal").notNull(),
    postUrl: text("post_url"),
    postDate: date("post_date"),
    screenshotKey: text("screenshot_key"),
    locationCheck: text("location_check").notNull().default("not_required"),
  },
  (table) => [index("social_checks_page_checked_idx").on(table.page, table.checkedAt)],
);

export const recaptureRequests = pgTable("recapture_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: text("studio_id")
    .notNull()
    .references(() => studios.id),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id),
  sourceUrl: text("source_url").notNull(),
  reason: text("reason").notNull(),
  socialCheckId: uuid("social_check_id").references(() => socialChecks.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
});

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => priceObservations.id),
    baselineKey: text("baseline_key").notNull(),
    path: text("path").notNull(),
    evidenceScreenshotKey: text("evidence_screenshot_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("alerts_offer_baseline_uidx").on(table.offerId, table.baselineKey)],
);

export const savedStudios = pgTable(
  "saved_studios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().default("owner"),
    studioId: text("studio_id")
      .notNull()
      .references(() => studios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("saved_studios_owner_studio_uidx").on(table.ownerId, table.studioId)],
);

export const budgetSettings = pgTable("budget_settings", {
  ownerId: text("owner_id").primaryKey().default("owner"),
  annualBudgetCents: integer("annual_budget_cents").notNull(),
  unlimitedClassesPerMonth: integer("unlimited_classes_per_month").notNull().default(12),
});
