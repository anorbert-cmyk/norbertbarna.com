// Display titles hold their designed lines in every language (design review
// round 1, 2026-10-23: LAY-01, I18N-02, I18N-03, VIS-01). A Funnel Display
// title may break only between words: no word of the works H1 or the contact
// title is ever split across lines, and the works H1 keeps its authored two
// lines from 320 to 1920 in EN, HU and DE.
import { expect, test } from "@playwright/test";

const WIDTHS = [320, 360, 390, 480, 600, 768, 992, 1024, 1180, 1280, 1440, 1600, 1920];
const WORKS = [["en", "/works"], ["hu", "/hu/munkak"], ["de", "/de/arbeiten"]];
const CONTACT = [["en", "/contact"], ["hu", "/hu/kapcsolat"], ["de", "/de/kontakt"]];

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

// Every word of the element, with the number of lines its glyph boxes touch.
async function words(page, selector) {
  return page.evaluate((selector) => {
    const node = document.querySelector(selector);
    const out = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      const re = /[^\s­]+/g;
      let match;
      while ((match = re.exec(text.data))) {
        const range = document.createRange();
        range.setStart(text, match.index);
        range.setEnd(text, match.index + match[0].length);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        out.push({ word: match[0], lines: new Set(rects.map((r) => Math.round(r.top))).size });
      }
    }
    const box = node.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(node).lineHeight);
    return { words: out, lines: Math.round(box.height / lineHeight), overflow: node.scrollWidth > node.clientWidth + 1 };
  }, selector);
}

for (const [lang, path] of WORKS) {
  test(`works H1 keeps two whole-word lines in ${lang}`, async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const title = await words(page, ".project-index-intro h1");
      for (const { word, lines } of title.words) expect(lines, `${path} at ${width}: "${word}" is not split`).toBe(1);
      expect(title.lines, `${path} at ${width}: the H1 has its two authored lines`).toBe(2);
      expect(title.overflow, `${path} at ${width}: the H1 does not overflow its column`).toBe(false);
    }
  });
}

for (const [lang, path] of CONTACT) {
  test(`contact title never breaks inside a word in ${lang}`, async ({ page }) => {
    for (const width of [320, 390, 768, 992, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const title = await words(page, ".contact-title");
      for (const { word, lines } of title.words) expect(lines, `${path} at ${width}: "${word}" is not split`).toBe(1);
      // From 992px the title is the designed two lines, the full stop on the second.
      if (width >= 992) expect(title.lines, `${path} at ${width}: two lines`).toBe(2);
    }
  });
}
