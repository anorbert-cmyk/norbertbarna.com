#!/usr/bin/env node
/** Wait until the live site serves the given commit (X-Release header, set
 * from Railway's RAILWAY_GIT_COMMIT_SHA). Railway builds a push a few
 * minutes after it lands, and during an incident much later, so a workflow
 * that checks the site right after a push would check the previous release.
 *   node scripts/wait-live.mjs <sha> [minutes]     default 20 minutes
 *   LIVE_BASE=https://host node scripts/wait-live.mjs <sha>
 * Exits 1 when the deadline passes; prints the release it last saw.
 */
const BASE = (process.env.LIVE_BASE || "https://www.barnanorbert.com").replace(/\/$/, "");
const [sha, minutes = "20"] = process.argv.slice(2);
if (!sha) { console.error("usage: wait-live.mjs <sha> [minutes]"); process.exit(2); }
const deadline = Date.now() + Number(minutes) * 60_000;
let seen = "";
for (;;) {
  seen = await fetch(`${BASE}/`, { cache: "no-store", headers: { "user-agent": "barnanorbert-wait-live/1.0" } })
    .then((r) => r.headers.get("x-release") || "").catch(() => "");
  if (seen === sha) { console.log(`live release is ${sha.slice(0, 7)}`); process.exit(0); }
  if (Date.now() > deadline) {
    console.error(`::error::live release is ${seen ? seen.slice(0, 7) : "unknown (no X-Release header)"}, not ${sha.slice(0, 7)}, after ${minutes} minutes`);
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 30_000));
}
