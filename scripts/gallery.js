#!/usr/bin/env node
'use strict';
// Builds the GitHub Pages gallery in docs/ from local clones of public repos.
//   node scripts/gallery.js path/to/express path/to/fzf ...
const fs = require('fs');
const path = require('path');
const { perform, MAQAMAT } = require('../src/index.js');

const DOCS = path.join(__dirname, '..', 'docs');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const dirs = process.argv.slice(2);
  fs.mkdirSync(path.join(DOCS, 'demos'), { recursive: true });
  fs.mkdirSync(path.join(DOCS, 'posters'), { recursive: true });
  const items = [];
  for (const dir of dirs) {
    const r = await perform(dir);
    const s = slug(r.repo);
    fs.writeFileSync(path.join(DOCS, 'demos', `${s}.html`), r.html());
    fs.writeFileSync(path.join(DOCS, 'posters', `${s}.svg`), r.svg());
    items.push({ s, repo: r.repo, maqam: MAQAMAT[r.maqam], because: r.because, secs: r.score.duration, commits: r.stats.commits });
    process.stdout.write(`${r.repo.padEnd(28)} ${r.maqam.padEnd(9)} ${r.because}\n`);
  }
  fs.writeFileSync(path.join(DOCS, 'index.html'), page(items));
  fs.writeFileSync(path.join(DOCS, 'gallery.json'), JSON.stringify(items.map(({ s, repo, maqam, because }) => ({ slug: s, repo, maqam: maqam.id, because })), null, 2));
}

function page(items) {
  const cards = items.map((it) => `
      <li>
        <a href="demos/${it.s}.html">
          <img src="posters/${it.s}.svg" alt="The rosette of ${esc(it.repo)}" loading="lazy" width="1000" height="1240">
          <span class="repo">${esc(it.repo)}</span>
          <span class="maqam">${esc(it.maqam.name)} <span lang="ar">${esc(it.maqam.ar)}</span></span>
          <span class="why">because ${esc(it.because)}</span>
        </a>
      </li>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>git-tarab</title>
<meta name="description" content="Hear your git history as Arabic maqam music. Every commit is a note, every author an instrument.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Readex+Pro:wght@300;400&display=swap" rel="stylesheet">
<style>
  :root { --night:#121a3f; --deep:#0b1030; --lapis:#1d2a63; --ink:#efe7d2; --dim:#9aa2c4; --gold:#e2b54a; --line:rgba(226,181,74,.22); }
  * { box-sizing: border-box; }
  body { margin:0; background: radial-gradient(120% 80% at 50% 0%, var(--lapis), var(--night) 55%, var(--deep)) fixed; background-color: var(--deep); color: var(--ink); font: 300 17px/1.6 'Readex Pro', system-ui, sans-serif; }
  :focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
  header { max-width: 860px; margin: 0 auto; padding: clamp(48px, 9vw, 120px) 16px 40px; text-align: center; }
  .ar-title { font: 700 clamp(64px, 12vw, 132px)/1 Amiri, serif; color: var(--gold); margin: 0; }
  h1 { font: 400 clamp(30px, 4.4vw, 50px)/1.15 Amiri, serif; margin: 18px 0 10px; }
  header p { color: var(--dim); max-width: 60ch; margin: 0 auto; }
  .cmd { display: inline-block; margin-top: 28px; padding: 12px 22px; border: 1px solid var(--gold); border-radius: 8px; font: 400 18px/1 ui-monospace, 'SF Mono', Menlo, monospace; color: var(--gold); user-select: all; }
  ul { list-style: none; padding: 0 16px 80px; margin: 0 auto; max-width: 1200px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 28px; }
  li a { display: grid; gap: 2px; color: inherit; text-decoration: none; }
  li img { width: 100%; height: auto; border-radius: 10px; border: 1px solid var(--line); transition: border-color .15s; }
  li a:hover img { border-color: var(--gold); }
  .repo { font: 400 22px/1.2 Amiri, serif; margin-top: 10px; }
  .maqam { color: var(--gold); }
  .maqam [lang=ar] { font-family: Amiri, serif; margin-left: 4px; }
  .why { color: var(--dim); font-size: 14px; }
  footer { text-align: center; color: var(--dim); font-size: 14px; padding: 0 16px 48px; }
  footer a { color: var(--ink); }
</style>
</head>
<body>
<header>
  <p class="ar-title" lang="ar">طَرَب</p>
  <h1>Your git history, played as Arabic music</h1>
  <p>Every commit becomes a note on the oud, qanun, ney or kamanja. Lines added lift the melody, fixes strike the darbuka, and the character of your repo picks its maqam. Click a rosette to listen.</p>
  <div class="cmd">npx github:mo7ammd88/git-tarab</div>
</header>
<ul>${cards}
</ul>
<footer>Run it on your own repo with <code>npx github:mo7ammd88/git-tarab --open</code>. Source on <a href="https://github.com/mo7ammd88/git-tarab">GitHub</a>.</footer>
</body>
</html>
`;
}

main().catch((e) => { console.error(e); process.exit(1); });
