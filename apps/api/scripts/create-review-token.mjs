import { createHmac } from "node:crypto";

const [reviewerId, role, tenant = "default", lifetimeHours = "8"] =
  process.argv.slice(2);
const allowedRoles = new Set(["speaker", "fluent_reviewer", "adjudicator"]);
const lifetimeMs = Number(lifetimeHours) * 60 * 60 * 1000;

if (!(reviewerId && role && allowedRoles.has(role))) {
  process.stderr.write(
    "Usage: REVIEW_AUTH_SECRET=... bun run review:token <reviewer-id> <speaker|fluent_reviewer|adjudicator> [tenant] [hours]\n"
  );
  process.exit(1);
}
if (!process.env.REVIEW_AUTH_SECRET) {
  process.stderr.write("REVIEW_AUTH_SECRET is required\n");
  process.exit(1);
}
if (!(Number.isFinite(lifetimeMs) && lifetimeMs > 0)) {
  process.stderr.write("hours must be a positive number\n");
  process.exit(1);
}

const payload = Buffer.from(
  JSON.stringify({
    expiresAt: Date.now() + lifetimeMs,
    reviewerId,
    roles: [role],
    tenant,
  })
).toString("base64url");
const signature = createHmac("sha256", process.env.REVIEW_AUTH_SECRET)
  .update(payload)
  .digest("base64url");

process.stdout.write(`${payload}.${signature}\n`);
