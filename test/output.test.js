'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const C = require('../src/compose.js');
const { toMidi } = require('../src/midi.js');
const { posterSVG } = require('../src/poster.js');
const { readCommits, parseLog } = require('../src/git.js');
const { buildHTML } = require('../src/build.js');

function tmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarab-'));
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', HOME: dir } });
  git('init', '-q');
  const commit = (name, email, msg, file, body, date) => {
    fs.writeFileSync(path.join(dir, file), body);
    git('add', '.');
    execFileSync('git', ['-C', dir, 'commit', '-q', '-m', msg], {
      env: { ...process.env, HOME: dir, GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    });
  };
  commit('Ada', 'ada@x.io', 'initial commit', 'a.txt', 'one\ntwo\nthree\n', '2024-01-06T02:30:00+03:00');
  commit('ADA', 'ada@x.io', 'fix: off by one', 'a.txt', 'one\n2\nthree\n', '2024-01-07T14:00:00+03:00');
  commit('Linus', 'linus@x.io', 'Add </script><script>alert(1)</script> parser', 'b.txt', 'x\ny\n', '2024-01-08T09:00:00-05:00');
  return dir;
}

test('reads a real repository, merging one person\'s spellings', async () => {
  const dir = tmpRepo();
  const cs = await readCommits(dir);
  assert.equal(cs.length, 3);
  assert.equal(new Set(cs.map((c) => c.author)).size, 2);
  assert.equal(cs[0].author, cs[1].author, 'Ada and ADA are one person');
  assert.equal(cs[0].hour, 2, 'local hour is kept from the author\'s timezone');
  assert.equal(cs[0].dow, 6, '2024-01-06 is a Saturday');
  assert.equal(cs[1].kind, 'fix');
  assert.equal(cs[1].add, 1);
  assert.equal(cs[1].del, 1);
  assert.ok(!('email' in cs[0]), 'emails are not kept');
});

test('parseLog tolerates binary files and empty bodies', () => {
  const RS = '\x1e', US = '\x1f';
  const text = `${RS}abc${US}${US}A${US}a@a${US}2024-01-01T00:00:00Z${US}first\n-\t-\timg.png\n3\t1\tx.js\n${RS}def${US}abc${US}B${US}b@b${US}2024-01-02T00:00:00Z${US}second`;
  const cs = parseLog(text);
  assert.equal(cs.length, 2);
  assert.equal(cs[0].add, 3);
  assert.equal(cs[0].files, 2);
  assert.equal(cs[1].add, 0);
});

test('MIDI file has a valid header, tracks and pitch bends for quarter tones', () => {
  const cs = Array.from({ length: 50 }, (_, i) => ({ sha: 'f' + i, author: 'a' + (i % 3), time: 1e9 + i * 999, add: i, del: i % 4, kind: 'other', subject: '' }));
  const sc = C.compose(cs, { maqam: 'bayati' });
  const bytes = toMidi(sc, 'test');
  const s = Buffer.from(bytes);
  assert.equal(s.toString('latin1', 0, 4), 'MThd');
  const ntrks = s.readUInt16BE(10);
  assert.equal(ntrks, 1 + 3 + 1, 'tempo track, three voices, drums');
  let off = 14, found = 0, bends = 0;
  while (off < s.length) {
    assert.equal(s.toString('latin1', off, off + 4), 'MTrk');
    const len = s.readUInt32BE(off + 4);
    const body = s.subarray(off + 8, off + 8 + len);
    assert.deepEqual([...body.subarray(-3)], [0xff, 0x2f, 0x00], 'track ends with end-of-track');
    for (let i = 0; i < body.length - 2; i++) if ((body[i] & 0xf0) === 0xe0 && body[i + 2] !== 0x40) bends++;
    off += 8 + len;
    found++;
  }
  assert.equal(found, ntrks);
  assert.ok(bends > 0, 'some notes are bent off the 12-tone grid');
});

test('poster SVG is well formed enough to render', () => {
  const cs = Array.from({ length: 80 }, (_, i) => ({ sha: 's' + i, author: 'a' + (i % 5), time: 1e9 + i * 5000, add: i, del: 2, kind: 'other', subject: '' }));
  const sc = C.compose(cs, { maqam: 'saba' });
  const svg = posterSVG(sc, { repo: 'me/<repo>&', because: 'reasons', stats: { commits: 80 } });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.ok(svg.includes('me/&lt;repo&gt;&amp;'), 'repo name is escaped');
  assert.equal((svg.match(/<use /g) || []).length, 16, 'sixteen-fold symmetry');
});

test('player HTML is self-contained, escapes data, and its scripts compile', async () => {
  const dir = tmpRepo();
  const cs = await readCommits(dir);
  const st = C.analyze(cs);
  const pick = C.chooseMaqam(st);
  const html = buildHTML({ repo: 'me/test', stats: st, because: pick.because, maqam: pick.id, iqa: 'maqsum', bpm: 100, auto: pick, commits: cs, version: '0' });
  assert.ok(!html.includes('__TARAB_'), 'all placeholders filled');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 2, 'the injected </script> in a commit message did not break out');
  for (const src of scripts) new vm.Script(src); // throws on syntax errors
  assert.ok(!/@x\.io/.test(html), 'no emails in the page');
});

test('CLI writes a player, prints JSON, and fails helpfully outside a repo', () => {
  const dir = tmpRepo();
  const bin = path.join(__dirname, '..', 'bin', 'git-tarab.js');
  const out = path.join(dir, 'out.html');
  execFileSync(process.execPath, [bin, dir, '--out', out, '--midi', path.join(dir, 'x.mid'), '--svg', path.join(dir, 'x.svg')], { stdio: 'pipe' });
  assert.ok(fs.statSync(out).size > 10000);
  assert.ok(fs.statSync(path.join(dir, 'x.mid')).size > 50);
  const json = JSON.parse(execFileSync(process.execPath, [bin, dir, '--json', '--maqam', 'hijaz']).toString());
  assert.equal(json.maqam, 'hijaz');
  assert.equal(json.because, 'you chose it');
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'tarab-none-'));
  assert.throws(() => execFileSync(process.execPath, [bin, empty], { stdio: 'pipe' }), (e) => /not inside a git repository/.test(e.stderr.toString()));
  assert.throws(() => execFileSync(process.execPath, [bin, dir, '--maqam', 'blues'], { stdio: 'pipe' }), (e) => /unknown maqam "blues"/.test(e.stderr.toString()));
});
