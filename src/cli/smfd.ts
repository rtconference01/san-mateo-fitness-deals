import { readFileSync } from "node:fs";
import { execute } from "./execute";
import { liveProbes } from "../capture/probes";
import type { SchedulableOffer } from "../plan/year-plan";

const fixture = JSON.parse(
  readFileSync(new URL("../../tests/fixtures/offers.fixture.json", import.meta.url), "utf8"),
) as { generated_at: string; offers: SchedulableOffer[] };

const argv = process.argv.slice(2);
const result = await execute(argv, {
  offers: fixture.offers,
  generatedAt: new Date().toISOString(),
  now: new Date(),
  probes: argv.includes("--live") || argv[0] === "check" ? liveProbes() : [],
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
