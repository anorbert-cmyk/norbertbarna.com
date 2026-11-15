#!/usr/bin/env node
// Re-hash content-addressed assets after their source changed.
//
// Every release asset lives twice in assets/css and assets/js: the editable
// source (`story.css`) and an immutable copy named after its content
// (`story.<sha256[0:12]>.css`). This script refreshes the copy for each
// source and rewrites every reference in the repository, so a CSS or JS
// edit is one command instead of a manual rename across the pages.
//
//   node scripts/rehash-assets.mjs          rewrite
//   node scripts/rehash-assets.mjs --check  fail if anything is stale

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const assetDirs = ["assets/css", "assets/js"];
const skipDirs = new Set(["node_modules", ".git", "test-results", "playwright-report"]);
const textExtensions = new Set([".html", ".mjs", ".js", ".css", ".json", ".md", ".txt", ".xml", ".yml"]);

const renames = [];
for (const dir of assetDirs) {
  const names = readdirSync(path.join(root, dir));
  for (const name of names) {
    const match = /^(.+)\.(css|js)$/.exec(name);
    if (!match || /\.[0-9a-f]{12}\.(css|js)$/.test(name)) continue;
    const [, stem, ext] = match;
    const hashed = names.filter((other) => new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[0-9a-f]{12}\\.${ext}$`).test(other));
    if (hashed.length === 0) continue;
    const source = readFileSync(path.join(root, dir, name));
    const wanted = `${stem}.${createHash("sha256").update(source).digest("hex").slice(0, 12)}.${ext}`;
    for (const old of hashed) {
      if (old !== wanted) renames.push({ dir, old, wanted });
    }
    if (!hashed.includes(wanted)) {
      if (!check) writeFileSync(path.join(root, dir, wanted), source);
    }
  }
}

if (renames.length === 0) {
  console.log("rehash-assets: all hashed copies are current");
  process.exit(0);
}
if (check) {
  for (const { dir, old, wanted } of renames) console.error(`stale: ${dir}/${old} should be ${wanted}`);
  process.exit(1);
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) yield* walk(full);
    else if (textExtensions.has(path.extname(entry))) yield full;
  }
}

let touched = 0;
for (const file of walk(root)) {
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const { old, wanted } of renames) after = after.split(old).join(wanted);
  if (after !== before) {
    writeFileSync(file, after);
    touched += 1;
  }
}
for (const { dir, old } of renames) unlinkSync(path.join(root, dir, old));
console.log(`rehash-assets: ${renames.length} asset(s) renamed, ${touched} file(s) updated`);
