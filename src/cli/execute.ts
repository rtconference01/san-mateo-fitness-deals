import { writeFileSync } from "node:fs";
import { parseBudget } from "../domain/parse-budget";
import { buildYearPlan, type SchedulableOffer } from "../plan/year-plan";
import { flagStale, queryOffers, toOffersFile, type OffersFile } from "../data/offers";
import { runLiveCheck, type StudioProbe } from "../capture/live-check";

export interface CliDeps {
  offers: SchedulableOffer[];
  generatedAt: string;
  now: Date;
  probes?: StudioProbe[];
  saved?: Map<string, { capturedAt: string; sourceUrl: string; offers: [] }>;
}

function readOption(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function classType(value: string | undefined): "yoga" | "reformer_pilates" | undefined {
  if (!value) return undefined;
  if (value === "yoga") return "yoga";
  if (value === "pilates" || value === "reformer" || value === "reformer_pilates") {
    return "reformer_pilates";
  }
  return undefined;
}

export async function execute(argv: string[], deps: CliDeps): Promise<unknown> {
  const command = argv[0];
  const budgetRaw = readOption(argv, "--budget");
  const needsBudget = command === "plan" || command === "query";
  if (needsBudget && (budgetRaw === undefined || budgetRaw.startsWith("--"))) {
    return { error: "budget_required" };
  }
  const parsedBudget = needsBudget ? parseBudget(budgetRaw) : null;
  if (parsedBudget && "error" in parsedBudget) return parsedBudget;

  let offers = deps.offers;
  let liveNotes: unknown[] = [];
  if (argv.includes("--live")) {
    const report = await runLiveCheck({
      studios: deps.probes ?? [],
      saved: new Map(),
      cache: new Map(),
      now: deps.now.getTime(),
    });
    liveNotes = report.studios;
    if (report.liveCheckFailed) {
      offers = deps.offers.map((offer) => ({ ...offer, live: false as const }));
    }
  }

  if (command === "check") {
    const report = await runLiveCheck({
      studios: deps.probes ?? [],
      saved: new Map(),
      cache: new Map(),
      now: deps.now.getTime(),
      onlyStudioId: readOption(argv, "--studio"),
    });
    return report;
  }

  const file = flagStale(toOffersFile(offers, deps.generatedAt), deps.now);
  if (command === "query") {
    const filtered = queryOffers(offers, {
      studioId: readOption(argv, "--studio"),
      classType: classType(readOption(argv, "--class-type")),
    });
    return { ...flagStale(toOffersFile(filtered, deps.generatedAt), deps.now), live: liveNotes };
  }

  if (command === "publish") {
    const published = toOffersFile(offers, deps.now.toISOString());
    writeFileSync(new URL("../../public/offers.json", import.meta.url), `${JSON.stringify(published, null, 2)}\n`);
    return { wrote: "public/offers.json", generated_at: published.generated_at };
  }

  if (command === "plan") {
    const monthsRaw = readOption(argv, "--months");
    const months = monthsRaw ? Number(monthsRaw) : NaN;
    if (!Number.isInteger(months) || months < 1 || months > 12) {
      return { error: "months_required" };
    }
    const alreadyRaw = readOption(argv, "--already-client");
    const alreadyClient =
      alreadyRaw === undefined ? null : alreadyRaw === "none" ? [] : alreadyRaw.split(",").filter(Boolean);
    const classesRaw = readOption(argv, "--classes-per-week");
    const plan = buildYearPlan({
      budgetCents: parsedBudget && "annualCents" in parsedBudget ? parsedBudget.annualCents : 0,
      months,
      classType: classType(readOption(argv, "--class-type")),
      alreadyClient,
      classesPerWeek: classesRaw ? Number(classesRaw) : undefined,
      offers,
    });
    return { plan, offers: file, live: liveNotes };
  }

  return { error: "unknown_command" };
}

export type { OffersFile };
