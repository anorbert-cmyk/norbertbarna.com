#!/usr/bin/env node
/** Tell IndexNow engines (Bing, Yandex, Seznam, Naver) which pages changed.
 * Protocol: https://www.indexnow.org/documentation
 * The key is public by design: the engines fetch /<key>.txt from the live
 * site and accept the submission only when its content matches. Google does
 * not take part in IndexNow; it reads sitemap.xml.
 *
 * Run after a deploy, never from CI on a branch:
 *   npm run indexnow                    every URL in sitemap.xml
 *   npm run indexnow -- /hu /about      only these paths
 *   npm run indexnow -- --dry-run       print the payload, send nothing
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "www.barnanorbert.com";
const KEY = "4cf59849855778fd47f78e60a9143478";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const paths = args.filter(arg => !arg.startsWith("--"));
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const known = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, loc]) => loc);
const urlList = paths.length ? paths.map(path => `https://${HOST}${path.startsWith("/") ? path : `/${path}`}`) : known;
const unknown = urlList.filter(url => !known.includes(url));
if (unknown.length) {
  console.error(`Not in sitemap.xml, refusing to submit: ${unknown.join(", ")}`);
  process.exit(1);
}
if (readFileSync(join(root, `${KEY}.txt`), "utf8").trim() !== KEY) {
  console.error(`${KEY}.txt must contain exactly the key`);
  process.exit(1);
}
const payload = { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList };
if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}
const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});
// 200 and 202 both mean accepted; 403 means the key file is not live yet.
console.log(`IndexNow ${response.status} for ${urlList.length} URL(s)`);
if (![200, 202].includes(response.status)) {
  console.error(await response.text());
  process.exit(1);
}
