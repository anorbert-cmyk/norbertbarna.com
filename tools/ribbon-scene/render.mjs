// Renders the AI service pages' ribbon from tools/ribbon-scene/ribbon3d.html
// (three.js r128 from cdnjs) at 3x into assets/images/ai/ribbon.webp (PNG via Pillow).
// Run from the repo root: node tools/ribbon-scene/render.mjs
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
const here = dirname(fileURLToPath(import.meta.url));
const png = join(here, "ribbon.png");
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 976, height: 122 }, deviceScaleFactor: 3 });
page.on("pageerror", (error) => { console.error(error.message); process.exitCode = 1; });
await page.goto("file://" + join(here, "ribbon3d.html"));
await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
await page.locator("canvas").screenshot({ path: png, omitBackground: true });
await browser.close();
const out = join(here, "..", "..", "assets", "images", "ai", "ribbon.webp");
execFileSync("python3", ["-c", "import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], quality=92, method=6)", png, out]);
console.log("rendered assets/images/ai/ribbon.webp");
