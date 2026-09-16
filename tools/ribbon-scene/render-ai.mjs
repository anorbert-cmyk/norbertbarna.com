// Offline decorative artwork compiler, reusing the existing r128 studio pipeline.
// Does not add a runtime dependency. Output PNG intermediates live in a temp dir.
// Run from the repo root: node tools/ribbon-scene/render-ai.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const temp=mkdtempSync(join(tmpdir(),'ai-geometry-'));
const output=join(here,'../../assets/images/ai');
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try {
  for (const kind of ['bars','ribbon']) {
    const page=await browser.newPage({viewport:{width:kind==='bars'?900:1400,height:kind==='bars'?550:240},deviceScaleFactor:2});
    page.on('pageerror',error=>{throw error;});
    await page.goto(pathToFileURL(join(here,'ai-geometry.html')).href+'?kind='+kind);
    await page.waitForFunction(()=>window.__done===true,null,{timeout:60000});
    console.log(kind+' live-label surface anchors: '+JSON.stringify(await page.evaluate(()=>window.__anchors)));
    for (const layer of kind==='bars'?['forest','glass','olive','all']:['all']) {
      await page.evaluate(name=>window.renderLayer(name),layer);
      const name=kind==='bars'?`bars-${layer}`:'ribbon-refined';
      const png=join(temp,name+'.png');
      await page.locator('canvas').screenshot({path:png,omitBackground:true});
      // The compiler's only raster operation is lossless transparent format conversion.
      execFileSync('python3',['-c','import sys; from PIL import Image; source=Image.open(sys.argv[1]).convert("RGBA"); source.save(sys.argv[2], lossless=True, exact=True, method=6); decoded=Image.open(sys.argv[2]).convert("RGBA"); assert source.size == decoded.size and source.tobytes() == decoded.tobytes(), "Transparent artwork RGBA round-trip mismatch"',png,join(output,name+'.webp')]);
      console.log(name+'.webp');
    }
    await page.evaluate(()=>window.previewOnLilac());
    await page.locator('canvas').screenshot({path:join(temp,kind+'-lilac-preview.png')});
    await page.close();
  }
} finally {await browser.close();}
console.log('PNG intermediates: '+temp);
