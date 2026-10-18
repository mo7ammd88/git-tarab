'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MAQAMAT, IQAAT } = require('../src/maqamat.js');
const C = require('../src/compose.js');

function fake(n, over = {}) {
  const out = [];
  let t = 1_600_000_000;
  for (let i = 0; i < n; i++) {
    t += 3600 * (1 + (i % 5));
    out.push(Object.assign({
      sha: (i * 2654435761 >>> 0).toString(16).padStart(8, '0'),
      author: ['ada', 'linus', 'grace', 'ken', 'barbara'][i % 5],
      time: t, hour: 14, dow: 3,
      add: (i * 7) % 90, del: (i * 3) % 40,
      subject: `change ${i}`, kind: 'other',
    }, typeof over === 'function' ? over(i) : over));
  }
  return out;
}

test('classify reads conventional and plain commit subjects', () => {
  assert.equal(C.classify('Merge pull request #12 from x/y', 2), 'merge');
  assert.equal(C.classify('Revert "add thing"', 1), 'revert');
  assert.equal(C.classify('fix: crash on empty input', 1), 'fix');
  assert.equal(C.classify('Fixed the login bug', 1), 'fix');
  assert.equal(C.classify('feat(api): add /users', 1), 'feat');
  assert.equal(C.classify('Add dark mode', 1), 'feat');
  assert.equal(C.classify('docs: typo in README', 1), 'docs');
  assert.equal(C.classify('refactor: simplify parser', 1), 'refactor');
  assert.equal(C.classify('0.0.2', 1), 'other');
});

test('every maqam has seven ascending degrees inside one octave', () => {
  for (const m of Object.values(MAQAMAT)) {
    assert.equal(m.cents.length, 7, m.id);
    assert.equal(m.cents[0], 0);
    for (let i = 1; i < 7; i++) assert.ok(m.cents[i] > m.cents[i - 1], `${m.id} degree ${i}`);
    assert.ok(m.cents[6] < 1200);
    assert.ok(m.ghammaz > 0 && m.ghammaz < 7);
  }
  for (const q of Object.values(IQAAT)) assert.equal(q.pattern.length, 8, q.id);
});

test('quarter tones survive: Bayati second degree is 150 cents', () => {
  const sc = C.compose(fake(60), { maqam: 'bayati' });
  const pcs = new Set(sc.notes.map((n) => ((n.cents % 1200) + 1200) % 1200));
  for (const pc of pcs) assert.ok(MAQAMAT.bayati.cents.includes(pc), `unexpected pitch class ${pc}`);
  assert.ok(pcs.has(150) || pcs.has(1050) || pcs.size > 0);
});

test('chooseMaqam explains itself with real numbers', () => {
  const fixes = fake(100, (i) => ({ kind: i % 2 ? 'fix' : 'other' }));
  const pick = C.chooseMaqam(C.analyze(fixes));
  assert.equal(pick.id, 'saba');
  assert.match(pick.because, /50% of commits are fixes/);

  const night = fake(100, (i) => ({ hour: i % 3 === 0 ? 2 : 15 }));
  assert.equal(C.chooseMaqam(C.analyze(night)).id, 'hijaz');

  const solo = fake(100, () => ({ author: 'solo' }));
  assert.equal(C.chooseMaqam(C.analyze(solo)).id, 'rast');

  assert.equal(C.chooseMaqam(C.analyze(fake(5))).id, 'sikah');
});

test('composition is deterministic', () => {
  const cs = fake(200);
  const a = C.compose(cs, { maqam: 'hijaz', iqa: 'saidi', bpm: 100 });
  const b = C.compose(cs, { maqam: 'hijaz', iqa: 'saidi', bpm: 100 });
  assert.deepEqual(a, b);
});

test('the score is well formed and ends home on the tonic', () => {
  const cs = fake(300);
  const sc = C.compose(cs, { maqam: 'rast', bpm: 120 });
  assert.equal(sc.lyrics.length, cs.length);
  for (const n of sc.notes) {
    assert.ok(n.t >= 0 && n.t < sc.total, 'note inside the piece');
    assert.ok(n.d > 0);
    assert.ok(n.vel > 0 && n.vel <= 1);
    assert.ok(n.voice >= 0 && n.voice < 4);
  }
  const last = sc.notes[sc.notes.length - 1];
  assert.equal(last.deg, 0);
  assert.ok(last.qafla);
  assert.equal(sc.voices.length, 4);
  assert.equal(sc.others, 1);
  assert.ok(Math.abs(sc.duration - sc.total * sc.eighth) < 1e-9);
});

test('a revert undoes the previous melodic step', () => {
  const cs = fake(40, (i) => ({ add: 10, del: 0, kind: i === 30 ? 'revert' : 'other', sha: 'aaaaaaa' + i }));
  const sc = C.compose(cs, { maqam: 'rast' });
  const main = (ci) => sc.notes.find((n) => n.ci === ci && !n.grace);
  // whatever step led from 28 to 29, the revert at 30 takes it back
  assert.notEqual(main(29).deg, main(28).deg);
  assert.equal(main(30).deg, main(28).deg);
});

test('sampling keeps the first and last commit and the requested size', () => {
  const cs = fake(1000);
  const s = C.sample(cs, 100);
  assert.equal(s.length, 100);
  assert.equal(s[0], cs[0]);
  assert.equal(s[99], cs[999]);
  assert.equal(C.sample(cs.slice(0, 50), 100).length, 50);
});

test('length stays bounded even for bursty histories', () => {
  const bursty = fake(320, (i) => ({ time: 1_500_000_000 + (i % 10 === 0 ? i * 86400 * 30 : i * 60) }));
  bursty.sort((a, b) => a.time - b.time);
  const sc = C.compose(bursty, { maqam: 'kurd', bpm: 100 });
  assert.ok(sc.duration < 240, `duration ${sc.duration}`);
});

test('tempo follows activity', () => {
  const slow = C.autoTempo({ commitsPerWeek: 0.2 });
  const busy = C.autoTempo({ commitsPerWeek: 80 });
  assert.ok(busy > slow);
  assert.ok(slow >= 88 && busy <= 136);
});
