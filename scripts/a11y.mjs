// Accessibility smoke test: axe-core on every page, at desktop and phone width.
// Fails (exit 1) on any axe violation, uncaught page error or failed local request.
//
//   npm i --no-save playwright@1.64.1 axe-core@4.14.0
//   npx playwright install chromium
//   node scripts/a11y.mjs              # serves the repo itself on a free port
//   BASE_URL=http://localhost:8000/ node scripts/a11y.mjs   # or test a running server
//
// Modules are resolved from the current directory, so run it where they are installed.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  ...readdirSync(root).filter(f => f.endsWith('.html')).sort(),
  ...readdirSync(join(root, 'projects')).filter(f => f.endsWith('.html')).sort().map(f => 'projects/' + f),
];
const viewports = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const freePort = () => new Promise((ok, fail) => {
  const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); }).on('error', fail);
});

async function serve() {
  const port = await freePort();
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base)).ok) return { base, stop: () => proc.kill() }; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error('static server did not start');
}

const server = process.env.BASE_URL ? { base: process.env.BASE_URL.replace(/\/?$/, '/'), stop() {} } : await serve();
const origin = new URL(server.base).origin;
const browser = await chromium.launch();
let failures = 0;

try {
  for (const vp of viewports) {
    const { name, ...opts } = vp;
    const context = await browser.newContext({ viewport: { width: opts.width, height: opts.height }, ...opts });
    // External hosts (fonts, analytics) are not under test: block them so runs are offline and fast.
    await context.route(url => new URL(url).origin !== origin, r => r.abort());
    for (const path of pages) {
      const page = await context.newPage();
      const problems = [];
      page.on('pageerror', e => problems.push(`page error: ${e.message}`));
      page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(origin) && !path.startsWith('404')) problems.push(`HTTP ${r.status()} ${r.url()}`); });
      page.on('requestfailed', r => { if (r.url().startsWith(origin)) problems.push(`request failed: ${r.url()}`); });

      await page.goto(server.base + path, { waitUntil: 'networkidle' });
      // Scroll through so scroll-triggered reveals, lazy images and JS-built exhibits are in their final state.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
        scrollTo(0, 0);
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);

      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => ({
        id: v.id, impact: v.impact, help: v.help,
        nodes: v.nodes.map(n => `${n.target.join(' ')}${n.failureSummary ? ' — ' + n.failureSummary.split('\n').slice(1).join(' ').trim() : ''}`),
      })));

      const bad = violations.length + problems.length;
      failures += bad;
      console.log(`${bad ? 'FAIL' : 'ok  '} ${name.padEnd(7)} ${path}`);
      for (const v of violations) {
        console.log(`       [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
        v.nodes.slice(0, 5).forEach(n => console.log(`         - ${n}`));
      }
      [...new Set(problems)].forEach(p => console.log(`       ${p}`));
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.stop();
}

console.log(failures ? `\n${failures} problem(s) found.` : '\nNo accessibility violations found.');
process.exit(failures ? 1 : 0);
