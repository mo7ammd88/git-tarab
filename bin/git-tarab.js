#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { MAQAMAT, IQAAT, INSTRUMENTS } = require('../src/maqamat.js');
const { perform } = require('../src/index.js');
const pkg = require('../package.json');

const HELP = `
  git-tarab — hear your git history as Arabic maqam music

  Usage
    npx git-tarab [repo-path] [options]

  Options
    -o, --out <file>      where to write the player   (default: tarab.html)
    -m, --maqam <name>    force a maqam: ${Object.keys(MAQAMAT).join(', ')}
    -i, --iqa <name>      rhythm: ${Object.keys(IQAAT).join(', ')}   (default: maqsum)
    -t, --tempo <bpm>     tempo (default: faster for busier repos)
    -n, --limit <n>       max commits to perform, sampled evenly (default: 320)
        --since <date>    only commits after this date, e.g. "1 year ago"
        --midi <file>     also write a .mid file (quarter tones kept as pitch bend)
        --svg <file>      also write the rosette poster as .svg
        --anonymous       replace author names with "Voice 1", "Voice 2", ...
        --json            print the analysis as JSON and exit
        --open            open the player in your browser
    -h, --help            show this help
    -v, --version         show the version
`;

function parseArgs(argv) {
  const o = { repo: '.', out: 'tarab.html', limit: 320 };
  const take = (i) => {
    if (i + 1 >= argv.length) fail(`${argv[i]} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-o': case '--out': o.out = take(i); i++; break;
      case '-m': case '--maqam': o.maqam = take(i).toLowerCase(); i++; break;
      case '-i': case '--iqa': o.iqa = take(i).toLowerCase(); i++; break;
      case '-t': case '--tempo': o.bpm = +take(i); i++; break;
      case '-n': case '--limit': o.limit = +take(i); i++; break;
      case '--since': o.since = take(i); i++; break;
      case '--midi': o.midi = take(i); i++; break;
      case '--svg': o.svg = take(i); i++; break;
      case '--anonymous': o.anonymous = true; break;
      case '--json': o.json = true; break;
      case '--open': o.open = true; break;
      case '-h': case '--help': o.help = true; break;
      case '-v': case '--version': o.version = true; break;
      default:
        if (a.startsWith('-')) fail(`unknown option ${a}. Run git-tarab --help to see the options.`);
        o.repo = a;
    }
  }
  if (o.maqam && !MAQAMAT[o.maqam]) fail(`unknown maqam "${o.maqam}". Choose one of: ${Object.keys(MAQAMAT).join(', ')}`);
  if (o.iqa && !IQAAT[o.iqa]) fail(`unknown rhythm "${o.iqa}". Choose one of: ${Object.keys(IQAAT).join(', ')}`);
  if (o.bpm !== undefined && !(o.bpm >= 40 && o.bpm <= 220)) fail('--tempo must be between 40 and 220');
  if (!(o.limit >= 16)) fail('--limit must be at least 16');
  return o;
}

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const gold = paint('38;5;179'), dim = paint('2'), bold = paint('1'), teal = paint('38;5;73');

function fail(msg) {
  process.stderr.write(`git-tarab: ${msg}\n`);
  process.exit(1);
}

function sparkline(score, width) {
  const bars = '▁▂▃▄▅▆▇█';
  const ns = score.notes.filter((n) => !n.grace && !n.qafla);
  if (!ns.length) return '';
  const step = Math.max(1, Math.floor(ns.length / width));
  const pick = [];
  for (let i = 0; i < ns.length && pick.length < width; i += step) pick.push(ns[i].deg);
  const lo = Math.min(...pick), hi = Math.max(...pick);
  return pick.map((d) => bars[Math.round(((d - lo) / Math.max(1, hi - lo)) * 7)]).join('');
}

function openFile(file) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', file] : [file];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
  } catch { /* the path is printed anyway */ }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) return process.stdout.write(HELP);
  if (o.version) return process.stdout.write(pkg.version + '\n');

  let r;
  try {
    r = await perform(o.repo, o);
  } catch (e) {
    if (e.code === 'NOT_A_REPO') fail(`${e.message}. Run it inside a repo, or pass the path: npx git-tarab path/to/repo`);
    if (e.code === 'ENOENT') fail('git is not installed or not on your PATH');
    fail(e.message);
  }
  const { repo, stats, maqam, because, bpm, iqa, score } = r;

  if (o.json) {
    process.stdout.write(JSON.stringify({ repo, maqam, because, iqa, bpm, stats, durationSeconds: +score.duration.toFixed(1), voices: score.voices }, null, 2) + '\n');
    return;
  }

  const out = path.resolve(o.out);
  fs.writeFileSync(out, r.html());
  if (o.midi) fs.writeFileSync(path.resolve(o.midi), r.midi());
  if (o.svg) fs.writeFileSync(path.resolve(o.svg), r.svg());

  const M = MAQAMAT[maqam];
  const mins = Math.floor(score.duration / 60), secs = String(Math.round(score.duration % 60)).padStart(2, '0');
  const lines = [
    '',
    `  ${dim('git-tarab')}  ${bold(repo)}`,
    '',
    `  ${gold(`Maqam ${M.name}  ${M.ar}`)}  ${dim(`the maqam of ${M.mood}`)}`,
    `  ${dim('because')} ${because}`,
    '',
    `  ${teal(sparkline(score, 56))}`,
    '',
    ...score.voices.map((v, i) => `  ${INSTRUMENTS[i].name.padEnd(8)} ${v.author} ${dim(`(${v.commits} commits)`)}`),
    score.others ? `  ${dim(`+ ${score.others} more ${score.others === 1 ? 'author joins' : 'authors join'} the oud`)}` : null,
    '',
    `  ${dim(`${stats.commits.toLocaleString('en-US')} commits${r.total > r.commits.length ? `, ${r.commits.length} performed` : ''}, ${IQAAT[iqa].name} rhythm, ${bpm} bpm, ${mins}:${secs}`)}`,
    `  ${dim('wrote')} ${path.relative(process.cwd(), out) || out}${o.midi ? dim(', ') + o.midi : ''}${o.svg ? dim(', ') + o.svg : ''}`,
    o.open ? '' : `  ${dim('open it in a browser and press play, or run again with --open')}`,
    '',
  ].filter((l) => l !== null);
  process.stdout.write(lines.join('\n') + '\n');
  if (o.open) openFile(out);
}

main().catch((e) => fail(e.stack || e.message));
