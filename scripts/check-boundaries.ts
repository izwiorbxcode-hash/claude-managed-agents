#!/usr/bin/env bun
// Quick boundary check: domain must not import infra
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const forbidden = [
  "cloudflare",
  "hono",
  "drizzle",
  "better-auth",
  "paystack",
  "react",
  "expo",
];
const domainFiles = readdirSync("packages/domain/src", {
  recursive: true,
}) as string[];

let violated = false;
for (const file of domainFiles) {
  const path = join("packages/domain/src", file);
  if (!path.endsWith(".ts")) {
    continue;
  }
  const content = readFileSync(path, "utf8");
  for (const imp of forbidden) {
    if (
      content.includes(`from "${imp}`) ||
      content.includes(`from '${imp}`) ||
      content.includes(`import "${imp}`)
    ) {
      console.error(`BOUNDARY VIOLATION: ${path} imports ${imp}`);
      violated = true;
    }
  }
}
if (violated) {
  process.exit(1);
}
console.log("✓ domain boundaries ok");
