#!/usr/bin/env node
/** Refresh docs/disavow-2026-10.txt from a Search Console links export.
 * Search Console: Links > Top linking sites (or Latest links) > Export (CSV).
 * The first column holds the linking domain or the linking page URL. The
 * automated link blast that started in September 2026 keeps adding 100+
 * domains a day, so the list goes stale fast.
 *
 *   node scripts/build-disavow.mjs ~/Downloads/Top_linking_sites.csv
 *
 * Only domains that look like the blast (link-seller names or the cheap
 * gTLDs it uses) are added. Everything else is printed for a human decision:
 * a real client, partner or press link must never be disavowed by a script.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "docs", "disavow-2026-10.txt");
const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-disavow.mjs <search-console-export.csv>");
  process.exit(1);
}

// Linking sites that are Norbi's own or plainly legitimate; never disavowed.
// kineticare.hu links its credits here (Search Console, 2026-10-21).
const KEEP = new Set(["barnanorbert.com", "kineticare.hu", "linkedin.com", "github.com", "google.com", "bing.com"]);
const BLAST_TLD = /\.(?:shop|website|store|space|site|online|link|cloud|fyi)$/;
const BLAST_NAME = /seo|backlink|pbn|dofollow|da-?checker|dapa|pachecker|rank|traffic|linkgenerator|shorten|url-?short/;

const existing = readFileSync(target, "utf8");
const listed = new Set([...existing.matchAll(/^domain:(\S+)$/gm)].map(([, domain]) => domain));
const rows = readFileSync(source, "utf8").split(/\r?\n/).slice(1);
const added = [], review = [];
for (const row of rows) {
  let domain = row.split(",")[0]?.replace(/^"|"$/g, "").trim().toLowerCase();
  if (/^https?:\/\//.test(domain)) { try { domain = new URL(domain).hostname; } catch { continue; } }
  domain = domain.replace(/^www\./, "");
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || listed.has(domain) || KEEP.has(domain)) continue;
  if (BLAST_TLD.test(domain) || BLAST_NAME.test(domain)) { added.push(domain); listed.add(domain); }
  else review.push(domain);
}
if (added.length) writeFileSync(target, existing.trimEnd() + "\n" + added.sort().map(domain => `domain:${domain}`).join("\n") + "\n");
console.log(`Added ${added.length} domain(s); ${listed.size} listed in total.`);
if (review.length) console.log(`Check these by hand and add the spam ones as domain:<name> lines:\n  ${review.sort().join("\n  ")}`);
