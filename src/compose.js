/* git-tarab — turns a list of commits into a score. Isomorphic: Node + browser. */
(function (root, factory) {
  const deps = (typeof module === 'object' && module.exports) ? require('./maqamat.js') : root.Tarab;
  const api = factory(deps);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tarab = Object.assign(root.Tarab || {}, api);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  const { MAQAMAT, IQAAT, INSTRUMENTS } = M;

  const KINDS = ['other', 'feat', 'fix', 'refactor', 'docs', 'merge', 'revert'];

  /** Guess what a commit was about from its subject line. */
  function classify(subject, parentCount) {
    const s = String(subject || '');
    if (parentCount > 1 || /^merge\b/i.test(s)) return 'merge';
    if (/^revert\b/i.test(s)) return 'revert';
    if (/^(fix|hotfix|bugfix)\b|^\w+(\([^)]*\))?!?:\s*fix|\b(fix(e[sd])?|bug|hotfix|crash(es)?|broken|regression|oops)\b/i.test(s)) return 'fix';
    if (/^(docs?|readme)\b|^docs?(\([^)]*\))?:|\b(typo|readme|documentation)\b/i.test(s)) return 'docs';
    if (/^(refactor|cleanup|chore|style|perf)\b|^(refactor|chore|style|perf)(\([^)]*\))?:|\b(refactor(ed|ing)?|clean ?up|simplif(y|ied)|remove[ds]?|delete[ds]?|rename[ds]?)\b/i.test(s)) return 'refactor';
    if (/^(feat|add|adds|added|implement|introduce|new|support|initial)\b|^feat(\([^)]*\))?!?:/i.test(s)) return 'feat';
    return 'other';
  }

  /** Small, stable hash so the same history always produces the same music. */
  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pct = (x) => Math.round(x * 100);

  /** Statistics over the whole history (not the sampled one). */
  function analyze(commits) {
    const n = commits.length;
    const byAuthor = new Map();
    let fixes = 0, reverts = 0, merges = 0, feats = 0, night = 0, weekend = 0, added = 0, deleted = 0;
    for (const c of commits) {
      byAuthor.set(c.author, (byAuthor.get(c.author) || 0) + 1);
      if (c.kind === 'fix') fixes++;
      if (c.kind === 'revert') reverts++;
      if (c.kind === 'merge') merges++;
      if (c.kind === 'feat') feats++;
      if (c.hour >= 0 && c.hour < 5) night++;
      if (c.dow === 0 || c.dow === 6) weekend++;
      added += c.add || 0;
      deleted += c.del || 0;
    }
    const authors = [...byAuthor.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([name, commits]) => ({ name, commits }));
    const nonMerge = Math.max(1, n - merges);
    const first = n ? commits[0].time : 0;
    const last = n ? commits[n - 1].time : 0;
    const spanDays = Math.max(1, (last - first) / 86400);
    const significant = authors.filter((a) => a.commits >= 3 && a.commits / Math.max(1, n) >= 0.03).length;
    return {
      commits: n,
      authors: authors.length,
      topAuthors: authors.slice(0, 8),
      topShare: n ? authors[0].commits / n : 0,
      significantAuthors: significant,
      fixRatio: fixes / nonMerge,
      revertRatio: reverts / nonMerge,
      featRatio: feats / nonMerge,
      mergeRatio: merges / Math.max(1, n),
      nightRatio: night / Math.max(1, n),
      weekendRatio: weekend / Math.max(1, n),
      added, deleted,
      firstTime: first, lastTime: last, spanDays,
      commitsPerWeek: n / (spanDays / 7),
    };
  }

  /** Pick the maqam that fits the repo's character, and say why in plain words. */
  function chooseMaqam(st) {
    const r = (id, because) => ({ id, because });
    if (st.commits < 12) return r('sikah', `only ${st.commits} commits so far. Sikah never quite lands either`);
    if (st.fixRatio >= 0.3) return r('saba', `${pct(st.fixRatio)}% of commits are fixes`);
    if (st.nightRatio >= 0.2) return r('hijaz', `${pct(st.nightRatio)}% of commits landed between midnight and 5 a.m.`);
    if (st.commits >= 50 && st.deleted >= 0.75 * st.added) return r('kurd', `it deletes ${pct(st.deleted / Math.max(1, st.added))}% as many lines as it adds`);
    if (st.weekendRatio >= 0.35) return r('nahawand', `${pct(st.weekendRatio)}% of commits were made on weekends`);
    if (st.topShare >= 0.75) return r('rast', `one person wrote ${pct(st.topShare)}% of it`);
    if (st.significantAuthors >= 6) return r('bayati', `${st.significantAuthors} regular voices share it`);
    if (st.added >= 3 * Math.max(1, st.deleted) && st.fixRatio < 0.15) return r('ajam', `it keeps growing: ${fmt(st.added)} lines added, only ${fmt(st.deleted)} removed`);
    return r('bayati', `it is steady: ${pct(st.fixRatio)}% fixes, ${st.authors} ${st.authors === 1 ? 'author' : 'authors'}`);
  }

  function fmt(x) {
    if (x >= 1e6) return (x / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (x >= 1e4) return Math.round(x / 1e3) + 'k';
    return String(x);
  }

  /** Tempo follows how busy the repo is. */
  function autoTempo(st) {
    return Math.round(clamp(88 + 9 * Math.log2(1 + st.commitsPerWeek), 88, 136));
  }

  /** Evenly sample the history down to `limit` commits, keeping first and last. */
  function sample(commits, limit) {
    const n = commits.length;
    if (!limit || n <= limit) return commits.slice();
    const out = [];
    for (let i = 0; i < limit; i++) out.push(commits[Math.round((i * (n - 1)) / (limit - 1))]);
    return out;
  }

  /**
   * Compose a score.
   * Time is measured in eighth notes. Pitches are cents above the maqam's tonic.
   *   - each commit is one note, played by its author's instrument
   *   - lines added push the melody up, lines removed pull it down
   *   - big commits get ornaments, long silences in history become rests
   *   - every eighth note, phrases come home to the tonic or the ghammaz
   *   - it opens with a free-rhythm taqsim and closes with a qafla (cadence)
   */
  function compose(commits, opts) {
    opts = opts || {};
    const maqam = MAQAMAT[opts.maqam] || MAQAMAT.rast;
    const iqa = IQAAT[opts.iqa] || IQAAT.maqsum;
    const bpm = clamp(opts.bpm || 108, 40, 220);
    const scale = maqam.cents;

    // Voices: the top four authors get their own instrument.
    // Bots don't get an instrument of their own; they join the oud.
    const isBot = (name) => /\[bot\]$|^(dependabot|renovate|greenkeeper|github-actions)\b/i.test(name);
    const counts = new Map();
    for (const c of commits) if (!isBot(c.author)) counts.set(c.author, (counts.get(c.author) || 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map((e) => e[0]);
    const voiceOf = new Map(ranked.slice(0, INSTRUMENTS.length).map((name, i) => [name, i]));
    const voices = ranked.slice(0, INSTRUMENTS.length).map((name, i) => ({
      author: name, commits: counts.get(name), instrument: INSTRUMENTS[i].id,
    }));
    const others = new Set(commits.map((c) => c.author)).size - voices.length;

    const degToCents = (d) => Math.floor(d / 7) * 1200 + scale[((d % 7) + 7) % 7];
    const LOW = -3, HIGH = 11;
    const reflect = (d) => {
      while (d < LOW || d > HIGH) d = d < LOW ? 2 * LOW - d : 2 * HIGH - d;
      return d;
    };
    const anchors = [0, maqam.ghammaz, 7, maqam.ghammaz + 7, -7 + maqam.ghammaz];

    const notes = [], perc = [], lyrics = [];
    const gaps = [];
    for (let i = 1; i < commits.length; i++) gaps.push(Math.max(0, commits[i].time - commits[i - 1].time));
    // Only the rarest silences in the history become rests, so length stays bounded.
    const sortedGaps = gaps.slice().sort((a, b) => a - b);
    const q = (p) => sortedGaps.length ? sortedGaps[Math.min(sortedGaps.length - 1, Math.floor(p * sortedGaps.length))] : Infinity;
    const g90 = Math.max(3600, q(0.9)), g97 = Math.max(3 * 3600, q(0.97)), g99 = Math.max(86400, q(0.99));

    const n = commits.length;
    const taqsimLen = n >= 24 ? clamp(Math.round(n * 0.06), 4, 14) : 0;
    let pos = 0;
    let deg = 0;
    let lastStep = 1;
    let phrase = 0;

    const addNote = (t, d, degree, voice, vel, ci, extra) => {
      const inst = INSTRUMENTS[voice];
      notes.push(Object.assign({
        t, d, deg: degree,
        cents: degToCents(degree) + inst.octave * 1200,
        voice, vel: +vel.toFixed(3), ci,
      }, extra || {}));
    };

    // Taqsim: the opening, in free rhythm, explores the lower jins of the maqam.
    for (let i = 0; i < taqsimLen; i++) {
      const c = commits[i];
      const h = hash32(c.sha || String(i));
      const mag = Math.log2(1 + (c.add || 0) + (c.del || 0));
      const target = [0, 1, 2, 1, 3, 2, maqam.ghammaz, 2, 1, 0][i % 10];
      deg = i === taqsimLen - 1 ? 0 : target + ((h & 3) === 0 ? 1 : 0);
      const d = 2 + (h % 3) + (mag > 8 ? 1 : 0);
      lyrics.push({ t: pos, ci: i });
      addNote(pos, d, deg, 0, 0.45 + 0.04 * Math.min(8, mag), i, { taqsim: true });
      if (mag > 7) addNote(pos + d - 0.5, 0.5, deg + 1, 0, 0.3, i, { grace: true, taqsim: true });
      pos += d;
    }
    pos += 2; // breath before the rhythm enters
    const drumsStart = pos;

    for (let i = taqsimLen; i < n; i++) {
      const c = commits[i];
      const h = hash32(c.sha || String(i));
      const add = c.add || 0, del = c.del || 0;
      const mag = Math.log2(1 + add + del);

      // Silence in the history becomes silence in the music.
      if (i > taqsimLen) {
        const gap = c.time - commits[i - 1].time;
        pos += gap >= g99 ? 4 : gap >= g97 ? 2 : gap >= g90 ? 1 : 0;
      }

      let step;
      if (c.kind === 'revert') step = -lastStep; // an undo, musically
      else if (add > del) step = mag > 7 ? 2 : 1;
      else if (del > add) step = mag > 7 ? -2 : -1;
      else step = (h & 1) ? 1 : -1;
      if (c.kind !== 'revert' && (h >>> 4) % 7 === 0) step = -step; // a little unpredictability
      // gravity: a melody that has climbed high (or sunk low) tends to come back
      if (c.kind !== 'revert' && ((deg >= 8 && step > 0) || (deg <= -1 && step < 0)) && (h & 6) !== 0) step = -step;
      if (step !== 0) lastStep = step;
      deg = reflect(deg + step);

      phrase++;
      if (phrase % 8 === 0) {
        let best = anchors[0];
        for (const a of anchors) if (Math.abs(a - deg) < Math.abs(best - deg)) best = a;
        deg = reflect(best);
      }

      const voice = voiceOf.has(c.author) ? voiceOf.get(c.author) : 0;
      const d = 1 + (mag > 6 ? 1 : 0) + (mag > 10 ? 1 : 0) + (phrase % 8 === 0 ? 1 : 0);
      const vel = 0.32 + 0.6 * Math.min(1, mag / 12);
      lyrics.push({ t: pos, ci: i });

      if (mag > 9 && d >= 2) {
        // A zakhrafa (ornament): touch the upper neighbour before the note.
        addNote(pos, 0.5, reflect(deg + 1), voice, vel * 0.7, i, { grace: true });
        addNote(pos + 0.5, d - 0.5, deg, voice, vel, i);
      } else {
        addNote(pos, d, deg, voice, vel, i);
      }

      if (c.kind === 'merge') perc.push({ t: pos, kind: 'D', vel: 1, accent: true });
      else if (c.kind === 'fix') perc.push({ t: pos, kind: 'T', vel: 0.9, accent: true });
      else if (c.kind === 'revert') perc.push({ t: pos, kind: 'R', vel: 0.9, accent: true });
      else if (c.kind === 'feat') perc.push({ t: pos + 0.5, kind: 'R', vel: 0.35, accent: true });

      pos += d;
    }

    // Qafla: walk home to the tonic and hold it.
    pos += 1;
    const path = [];
    let d0 = deg;
    while (d0 !== 0 && path.length < 5) {
      d0 += d0 > 0 ? -1 : 1;
      path.push(d0);
    }
    if (!path.length) path.push(0);
    if (path[path.length - 1] !== 0) path.push(0);
    for (let k = 0; k < path.length; k++) {
      const last = k === path.length - 1;
      addNote(pos, last ? 8 : 1, path[k], 0, last ? 0.8 : 0.55, n - 1, { qafla: true });
      if (last) perc.push({ t: pos, kind: 'D', vel: 1, accent: true });
      pos += last ? 8 : 1;
    }
    const total = pos + 2;

    // The iqa' (rhythm cycle) runs from the end of the taqsim until the final doum.
    const drumsEnd = pos - 8;
    for (let t = Math.ceil(drumsStart / 8) * 8; t < drumsEnd; t++) {
      const k = iqa.pattern[t % 8];
      if (!k) continue;
      perc.push({ t, kind: k, vel: k === 'D' ? 0.7 : k === 'T' ? 0.55 : 0.22 });
    }
    perc.sort((a, b) => a.t - b.t);
    notes.sort((a, b) => a.t - b.t);

    return {
      maqam: maqam.id, iqa: iqa.id, bpm,
      tonicHz: maqam.tonicHz,
      eighth: 30 / bpm, // seconds per eighth note
      total, notes, perc, lyrics, voices, others,
      taqsimEnd: drumsStart,
      duration: total * (30 / bpm),
    };
  }

  /** cents above tonic -> Hz */
  function freqOf(score, cents) {
    return score.tonicHz * Math.pow(2, cents / 1200);
  }

  return { KINDS, classify, hash32, analyze, chooseMaqam, autoTempo, sample, compose, freqOf, fmt };
});
