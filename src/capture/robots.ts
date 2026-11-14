export const USER_AGENT =
  "SanMateoFitnessDeals/0.1 (+https://github.com/rtconference01/san-mateo-fitness-deals)";

interface Rule {
  allow: boolean;
  path: string;
}

/** Longest matching Allow/Disallow for User-agent: *. An empty Disallow allows all. */
export function isAllowedByRobots(robotsTxt: string, url: string): boolean {
  const path = new URL(url).pathname;
  const rules = rulesForStarAgent(robotsTxt);
  let matched: Rule | null = null;
  for (const rule of rules) {
    if (!path.startsWith(rule.path)) continue;
    if (!matched || rule.path.length > matched.path.length) matched = rule;
  }
  if (!matched) return true;
  return matched.allow;
}

function rulesForStarAgent(robotsTxt: string): Rule[] {
  const lines = robotsTxt.split(/\r?\n/);
  const groups: string[][] = [];
  let current: string[] | null = null;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) {
      current = null;
      continue;
    }
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key.toLowerCase() === "user-agent") {
      if (!current) {
        current = [];
        groups.push(current);
      }
      current.push(`user-agent:${value}`);
      continue;
    }
    if (!current) continue;
    current.push(`${key.toLowerCase()}:${value}`);
  }
  const star = groups.find((group) =>
    group.some((entry) => entry.toLowerCase() === "user-agent:*"),
  );
  if (!star) return [];
  const rules: Rule[] = [];
  for (const entry of star) {
    if (entry.startsWith("disallow:")) {
      const path = entry.slice("disallow:".length);
      if (path) rules.push({ allow: false, path });
    } else if (entry.startsWith("allow:")) {
      const path = entry.slice("allow:".length);
      if (path) rules.push({ allow: true, path });
    }
  }
  return rules;
}
