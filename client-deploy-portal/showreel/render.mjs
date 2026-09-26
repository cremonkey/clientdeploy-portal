// Renders scene.html to video with headless Chromium.
//   node render.mjs                 -> full render (parallel workers) into out/
//   node render.mjs --stills 1,6.2  -> PNG stills at the given seconds (for review)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
mkdirSync(outDir, { recursive: true });
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 60, DUR = 30, TOTAL = FPS * DUR;
const WORKERS = Number(process.env.WORKERS || 4);
const SUB = Number(process.env.SUB || 4);
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(here, 'scene.html'));
  await page.evaluate(() => window.ready);
  return page;
}
const grab = page => page.locator('#c').screenshot({ type: 'png' });

async function stills(times) {
  const browser = await chromium.launch({ executablePath: exe });
  const page = await openPage(browser);
  for (const s of times) {
    await page.evaluate(([f, sub]) => window.renderFrame(f, sub), [Math.round(s * FPS), 1]);
    writeFileSync(path.join(outDir, `still_${s.toFixed(2)}.png`), await grab(page));
  }
  await browser.close();
}

async function worker(browser, idx, from, to) {
  const page = await openPage(browser);
  const file = path.join(outDir, `seg_${idx}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    await page.evaluate(([fr, sub]) => window.renderFrame(fr, sub), [f, SUB]);
    const png = await grab(page);
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % 60 === 0) console.log(`worker ${idx}: frame ${f}/${to}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  return file;
}

async function full() {
  const browser = await chromium.launch({ executablePath: exe });
  const per = Math.ceil(TOTAL / WORKERS);
  const files = await Promise.all([...Array(WORKERS)].map((_, i) => worker(browser, i, i * per, Math.min(TOTAL, (i + 1) * per))));
  await browser.close();
  writeFileSync(path.join(outDir, 'segments.txt'), files.map(f => `file '${f}'`).join('\n'));
  console.log('segments done');
}

const arg = process.argv.indexOf('--stills');
if (arg > -1) await stills(process.argv[arg + 1].split(',').map(Number));
else await full();
