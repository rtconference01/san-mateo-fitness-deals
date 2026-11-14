import { recordSocialCheck } from "./check";

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

const argv = process.argv.slice(2);
const page = option(argv, "--page");
const found = option(argv, "--found-deal");
if (!page || (found !== "true" && found !== "false")) {
  process.stderr.write("usage: npm run social-check -- --page <id> --found-deal true|false\n");
  process.exitCode = 1;
} else {
  const result = recordSocialCheck({
    pageId: page,
    foundDeal: found === "true",
    postUrl: option(argv, "--post-url"),
    postDate: option(argv, "--post-date"),
    screenshotPath: option(argv, "--screenshot"),
    checker: option(argv, "--checker") ?? "owner",
    checkedAt: new Date(),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
