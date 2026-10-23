// Design review round 1 (2026-10-23), editorial package: the writing pages,
// the About story and the case opening keep their phone and desktop geometry.
import { expect, test } from "@playwright/test";
import { readdirSync } from "node:fs";

const writingPages = [
  "/writing", "/hu/irasok", "/de/wissen",
  ...["writing", "hu/irasok", "de/wissen"].flatMap((dir) => readdirSync(new URL(`../${dir}/`, import.meta.url))
    .filter((name) => name.endsWith(".html") && name !== "index.html")
    .map((name) => `/${dir}/${name.replace(/\.html$/, "")}`)),
];
const aboutPages = ["/about", "/hu/rolam", "/de/ueber-mich"];

async function returning(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() - 1000 }));
  });
}

// A word of a heading that continues on the next line without a soft hyphen
// was broken mid-word by `overflow-wrap: anywhere` (no de/hu dictionary). A
// hard hyphen is a break opportunity, so each hyphenated part counts on its own.
const splitWords = (selector) => Array.from(document.querySelectorAll(selector)).flatMap((heading) => {
  const failures = [];
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent;
    for (const match of text.matchAll(/[^\s\-\u2010\u2011/]+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const tops = new Set(Array.from(range.getClientRects()).filter((r) => r.width > 1).map((r) => Math.round(r.top)));
      if (tops.size > 1 && !match[0].includes("­")) failures.push(match[0]);
    }
  }
  return failures;
});

for (const width of [320, 390]) {
  test(`writing headings never break mid-word at ${width}px and nothing scrolls sideways`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    await returning(page);
    for (const path of writingPages) {
      await page.goto(path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(splitWords, ".writing-title, .writing-feature-copy h2, .writing-row-copy :is(h2, h3)"), `${path} at ${width}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path}: no horizontal overflow`).toBeLessThanOrEqual(1);
      const tables = await page.locator(".writing-table").evaluateAll((wraps) => wraps.map((wrap) => wrap.scrollWidth - wrap.clientWidth));
      for (const overflow of tables) expect(overflow, `${path}: tables fit the reading column`).toBeLessThanOrEqual(1);
    }
  });
}

test("the article outline is a closed disclosure on phones and an open rail on desktop", async ({ page }) => {
  await returning(page);
  for (const path of ["/writing/human-in-the-loop-ai", "/hu/irasok/ceges-weboldal-ara", "/de/wissen/was-kostet-eine-website"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path, { waitUntil: "load" });
    const details = page.locator(".writing-toc details");
    await expect(details).toHaveCount(1);
    await expect(details).not.toHaveAttribute("open", "");
    const summary = page.locator(".writing-toc summary");
    await expect(summary).toBeVisible();
    expect(await summary.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await summary.click();
    await expect(details).toHaveAttribute("open", "");
    const links = await page.locator(".writing-toc a").evaluateAll((anchors) => anchors.map((a) => { const r = a.getBoundingClientRect(); return { h: r.height, right: r.right, left: r.left }; }));
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const link of links) {
      expect(link.h, `${path}: 44px rows`).toBeGreaterThanOrEqual(44);
      expect(link.right, `${path}: every entry inside the viewport`).toBeLessThanOrEqual(390);
      expect(link.left).toBeGreaterThanOrEqual(0);
    }
    expect(await page.locator(".writing-toc ol").evaluate((ol) => ol.scrollWidth - ol.clientWidth)).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path, { waitUntil: "load" });
    await expect(page.locator(".writing-toc a").first()).toBeVisible();
    await expect(page.locator(".writing-toc summary")).toBeHidden();
    expect(await page.locator(".writing-toc details").evaluate((el) => getComputedStyle(el, "::before").content)).toMatch(/Contents|Tartalom|Inhalt/);
  }
});

test("every external article link says it opens a new tab, in the page language", async ({ page }) => {
  await returning(page);
  const expected = { "/writing/human-in-the-loop-ai": "(opens in a new tab)", "/de/wissen/human-in-the-loop-ki": "(öffnet in neuem Tab)", "/hu/irasok/ceges-weboldal-ara": "(új lapon nyílik meg)" };
  for (const [path, phrase] of Object.entries(expected)) {
    await page.goto(path, { waitUntil: "load" });
    const links = await page.locator('.writing-prose a[target="_blank"]').evaluateAll((anchors) => anchors.map((a) => a.textContent));
    for (const text of links) expect(text, path).toContain(phrase);
  }
});

test("the articles index feature title sets in at most three lines without an orphan", async ({ page }) => {
  await returning(page);
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/writing", "/hu/irasok", "/de/wissen"]) {
      await page.goto(path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const lines = await page.locator(".writing-feature-copy h2").evaluate((h2) => {
        const range = document.createRange(); range.selectNodeContents(h2);
        const rects = Array.from(range.getClientRects()).filter((r) => r.width > 2);
        const tops = [...new Set(rects.map((r) => Math.round(r.top)))];
        return tops.map((top) => { const own = rects.filter((r) => Math.round(r.top) === top); return Math.max(...own.map((r) => r.right)) - Math.min(...own.map((r) => r.left)); });
      });
      expect(lines.length, `${path} at ${width}`).toBeLessThanOrEqual(3);
      if (lines.length > 1) expect(lines.at(-1), `${path} at ${width}: no one-word last line`).toBeGreaterThan(lines[0] * .4);
    }
  }
});

test("About: labels keep the 12px floor, the title holds two lines on phones, the dek and the finale keep a measure", async ({ page }) => {
  await returning(page);
  for (const path of aboutPages) {
    for (const width of [320, 390, 599]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const h1Lines = await page.locator(".story-opening h1").evaluate((h1) => { const range = document.createRange(); range.selectNodeContents(h1); return new Set(Array.from(range.getClientRects()).filter((r) => r.width > 2).map((r) => Math.round(r.top))).size; });
      expect(h1Lines, `${path} at ${width}: the two authored title lines`).toBe(2);
      expect(await page.evaluate(splitWords, ".story-opening h1"), `${path} at ${width}`).toEqual([]);
      const sizes = await page.locator(".story-eyebrow, .story-opening-cue, .story-footer-bottom, .story-footer-top p, .story-rail a").evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
      for (const size of sizes) expect(size, `${path} at ${width}: utility labels`).toBeGreaterThanOrEqual(12);
      const dek = await page.locator(".story-opening-dek").evaluate((el) => { const r = el.getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - innerWidth / 2); });
      expect(dek, `${path} at ${width}: the dek stays centred`).toBeLessThanOrEqual(2);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path, { waitUntil: "load" });
    const finale = await page.locator(".story-next > p:not(.story-eyebrow)").evaluateAll((ps) => ps.map((p) => ({ width: p.getBoundingClientRect().width, centred: Math.abs((p.getBoundingClientRect().left + p.getBoundingClientRect().right) / 2 - innerWidth / 2), br: p.querySelector("br") !== null })));
    for (const p of finale) {
      expect(p.width, `${path}: finale measure`).toBeLessThanOrEqual(760);
      expect(p.centred).toBeLessThanOrEqual(2);
      expect(p.br, `${path}: no forced line break in the finale`).toBe(false);
    }
    const dekWidth = await page.locator(".story-opening-dek").evaluate((el) => el.getBoundingClientRect().width);
    expect(dekWidth, `${path}: the dek box stays on the dark centre`).toBeLessThanOrEqual(480);
  }
});

test("other projects: the whole card is the link and pointer hover shows the frame even under reduced motion", async ({ page }) => {
  await returning(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work/raiffeisen", { waitUntil: "load" });
  const card = page.locator(".related-work-card").first();
  await card.scrollIntoViewIfNeeded();
  const wrap = card.locator(".related-work-image-wrap");
  const box = await wrap.boundingBox();
  const hit = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return { href: el.closest("a")?.getAttribute("href"), cursor: getComputedStyle(el).cursor }; }, [box.x + box.width / 2, box.y + box.height / 2]);
  expect(hit.href).toMatch(/^\/work\//);
  expect(hit.cursor).toBe("pointer");
  expect(await wrap.evaluate((el) => getComputedStyle(el, "::after").opacity)).toBe("0");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => wrap.evaluate((el) => getComputedStyle(el, "::after").opacity)).toBe("1");
  await page.mouse.move(2, 2);
  await expect.poll(() => wrap.evaluate((el) => getComputedStyle(el, "::after").opacity)).toBe("0");
  await card.locator("a").focus();
  await expect.poll(() => wrap.evaluate((el) => getComputedStyle(el, "::after").opacity)).toBe("1");
});
