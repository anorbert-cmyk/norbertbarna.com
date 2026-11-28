#!/usr/bin/env node
/**
 * Answer engine citation score.
 *
 * The question set in docs/aeo/questions.json is fixed. A measurement asks
 * every question to each answer engine and stores what each answer cited.
 * This script turns one measurement into numbers that can be compared with
 * the next one, so a change in AI visibility is a fact and not an impression.
 *
 *   node scripts/aeo-score.mjs --collect <raw-dir> docs/aeo/results/<date>.json
 *       Merge the per-call record files of a probe run into one result file.
 *   node scripts/aeo-score.mjs docs/aeo/results/<date>.json [previous.json]
 *       Print the score as Markdown; with a previous file, also the change.
 *
 * How a measurement is taken (the calls need the Monid connector, so they
 * run from a Claude session, not from CI) is described in docs/aeo/README.md.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWN = /(^|\.)barnanorbert\.com$/i;
const OWN_NAME = /norbert\s+barna|barna\s+norbert|barnanorbert\.com/i;
const ENGINES = ["google_ai_mode", "chatgpt", "perplexity"];
const ENGINE_NAMES = { google_ai_mode: "Google AI Mode", chatgpt: "ChatGPT", perplexity: "Perplexity" };

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
};
const pathOf = (url) => {
  try { return new URL(url).pathname.replace(/\/$/, "") || "/"; } catch { return ""; }
};
const pct = (part, whole) => (whole ? `${((100 * part) / whole).toFixed(1)}%` : "n/a");

const questions = JSON.parse(readFileSync(join(ROOT, "docs/aeo/questions.json"), "utf8")).questions;
const byId = new Map(questions.map((question) => [question.id, question]));

function collect(rawDir, outFile) {
  const records = [];
  for (const name of readdirSync(rawDir).filter((file) => file.endsWith(".json")).sort()) {
    const raw = JSON.parse(readFileSync(join(rawDir, name), "utf8"));
    if (!byId.has(raw.id) || !ENGINES.includes(raw.engine)) throw new Error(`${name}: unknown id or engine`);
    const cited = [...new Set((raw.cited || []).filter((url) => /^https?:\/\//.test(url)))];
    const answer = String(raw.answer || "");
    records.push({
      id: raw.id,
      engine: raw.engine,
      ok: raw.ok !== false,
      cited,
      // Recomputed here; the collector's own flags are not trusted.
      ownCited: cited.some((url) => OWN.test(hostOf(url))),
      ownMentioned: OWN_NAME.test(answer),
      ...(raw.searchQueries?.length ? { searchQueries: raw.searchQueries } : {}),
      answer: answer.slice(0, 600),
    });
  }
  const missing = [];
  for (const { id } of questions) for (const engine of ENGINES) {
    if (!records.some((record) => record.id === id && record.engine === engine)) missing.push(`${id}.${engine}`);
  }
  writeFileSync(outFile, `${JSON.stringify({ measured: outFile.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "", engines: ENGINES, missing, records }, null, 1)}\n`);
  console.log(`${records.length} records written to ${outFile}; ${missing.length} missing`);
}

function score(file) {
  const { measured, records } = JSON.parse(readFileSync(file, "utf8"));
  const ok = records.filter((record) => record.ok);
  const slice = (filter) => {
    const rows = ok.filter(filter);
    return { answers: rows.length, cited: rows.filter((row) => row.ownCited).length, mentioned: rows.filter((row) => row.ownMentioned).length };
  };
  const questionIds = [...new Set(ok.map((record) => record.id))];
  const present = questionIds.filter((id) => ok.some((record) => record.id === id && (record.ownCited || record.ownMentioned)));
  const domains = new Map();
  for (const record of ok) {
    const lang = byId.get(record.id).lang;
    for (const host of new Set(record.cited.map(hostOf).filter(Boolean))) {
      const key = `${lang} ${host}`;
      domains.set(key, (domains.get(key) || 0) + 1);
    }
  }
  return { measured, records, ok, slice, questionIds, present, domains };
}

function report(file, previousFile) {
  const now = score(file);
  const before = previousFile ? score(previousFile) : null;
  const lines = [];
  const delta = (current, previous) => (previous == null ? "" : ` (${current - previous >= 0 ? "+" : ""}${current - previous})`);
  const total = now.slice(() => true);
  const totalBefore = before?.slice(() => true);
  lines.push(`# Answer engine citation score, ${now.measured}`, "");
  lines.push(`${questions.length} fixed questions, ${ENGINES.length} engines, ${now.ok.length} usable answers of ${now.records.length}.`, "");
  lines.push(`- **Answers that cite barnanorbert.com: ${total.cited} of ${total.answers} (${pct(total.cited, total.answers)})**${delta(total.cited, totalBefore?.cited)}`);
  lines.push(`- Answers that name Norbert Barna or the site: ${total.mentioned} of ${total.answers} (${pct(total.mentioned, total.answers)})${delta(total.mentioned, totalBefore?.mentioned)}`);
  lines.push(`- Questions where at least one engine cites or names the site: ${now.present.length} of ${now.questionIds.length}${delta(now.present.length, before?.present.length)}`, "");
  const table = (title, groups) => {
    lines.push(`## ${title}`, "", "| | Answers | Cite the site | Name the site |", "| --- | --- | --- | --- |");
    for (const [label, filter] of groups) {
      const row = now.slice(filter);
      const old = before?.slice(filter);
      lines.push(`| ${label} | ${row.answers} | ${row.cited} (${pct(row.cited, row.answers)})${delta(row.cited, old?.cited)} | ${row.mentioned} (${pct(row.mentioned, row.answers)})${delta(row.mentioned, old?.mentioned)} |`);
    }
    lines.push("");
  };
  table("By engine", ENGINES.map((engine) => [ENGINE_NAMES[engine], (record) => record.engine === engine]));
  table("By language", ["hu", "en", "de"].map((lang) => [lang.toUpperCase(), (record) => byId.get(record.id).lang === lang]));
  table("By question type", ["info", "commercial", "brand"].map((type) => [type, (record) => byId.get(record.id).type === type]));
  lines.push("## Questions where the site appears", "");
  if (!now.present.length) lines.push("None.", "");
  for (const id of now.present) {
    const hits = now.ok.filter((record) => record.id === id && (record.ownCited || record.ownMentioned));
    const pages = [...new Set(hits.flatMap((record) => record.cited.filter((url) => OWN.test(hostOf(url))).map(pathOf)))];
    lines.push(`- ${id} "${byId.get(id).question}": ${hits.map((record) => `${ENGINE_NAMES[record.engine]}${record.ownCited ? " cites" : " names"}`).join(", ")}${pages.length ? ` (${pages.join(", ")})` : ""}`);
  }
  lines.push("", "## Most cited domains by language", "");
  for (const lang of ["hu", "en", "de"]) {
    const top = [...now.domains].filter(([key]) => key.startsWith(`${lang} `)).sort((a, b) => b[1] - a[1]).slice(0, 15);
    lines.push(`**${lang.toUpperCase()}**: ${top.map(([key, count]) => `${key.slice(3)} (${count})`).join(", ")}`, "");
  }
  console.log(lines.join("\n"));
}

const args = process.argv.slice(2);
if (args[0] === "--collect" && args.length === 3) collect(args[1], args[2]);
else if (args.length >= 1 && args[0] !== "--collect") report(args[0], args[1]);
else {
  console.error("usage: aeo-score.mjs --collect <raw-dir> <out.json> | aeo-score.mjs <result.json> [previous.json]");
  process.exit(2);
}
