/* git-tarab — Standard MIDI File writer. Quarter tones are kept with pitch bend. */
(function (root, factory) {
  const deps = (typeof module === 'object' && module.exports) ? require('./maqamat.js') : root.Tarab;
  const api = factory(deps);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tarab = Object.assign(root.Tarab || {}, api);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  const PPQ = 480;
  const EIGHTH = PPQ / 2;
  // General MIDI has no oud or qanun; these are the closest stand-ins.
  const PROGRAM = { oud: 24, qanun: 46, ney: 77, kamanja: 40 };
  const DRUM = { D: 64, T: 63, K: 62, R: 54 }; // low conga, open hi conga, mute hi conga, tambourine

  function vlq(n) {
    const bytes = [n & 0x7f];
    while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
    return bytes;
  }
  const str = (s) => Array.from(new TextEncoder().encode(s));
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

  function track(events) {
    // events: [{tick, order, bytes}] — order breaks ties (offs before bends before ons)
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const data = [];
    let last = 0;
    for (const e of events) {
      data.push(...vlq(Math.max(0, e.tick - last)), ...e.bytes);
      last = e.tick;
    }
    data.push(0, 0xff, 0x2f, 0x00);
    return [0x4d, 0x54, 0x72, 0x6b, ...u32(data.length), ...data];
  }

  function meta(type, bytes) {
    return [0xff, type, ...vlq(bytes.length), ...bytes];
  }

  /** score (from compose) -> Uint8Array holding a type-1 .mid file */
  function toMidi(score, title) {
    const tracks = [];
    const usPerQuarter = Math.round(60000000 / score.bpm);
    tracks.push(track([
      { tick: 0, order: 0, bytes: meta(0x03, str(title || 'git-tarab')) },
      { tick: 0, order: 0, bytes: meta(0x51, [(usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255]) },
      { tick: 0, order: 0, bytes: meta(0x58, [4, 2, 24, 8]) },
    ]));

    const byVoice = new Map();
    for (const n of score.notes) {
      if (!byVoice.has(n.voice)) byVoice.set(n.voice, []);
      byVoice.get(n.voice).push(n);
    }
    for (const [v, list] of [...byVoice.entries()].sort((a, b) => a[0] - b[0])) {
      const ch = v & 0x0f;
      const inst = M.INSTRUMENTS[v];
      const ev = [
        { tick: 0, order: 0, bytes: meta(0x03, str(`${inst.name}${score.voices[v] ? ' — ' + score.voices[v].author : ''}`)) },
        { tick: 0, order: 0, bytes: [0xc0 | ch, PROGRAM[inst.id]] },
      ];
      list.sort((a, b) => a.t - b.t);
      for (let i = 0; i < list.length; i++) {
        const n = list[i];
        const f = score.tonicHz * Math.pow(2, n.cents / 1200);
        const mf = 69 + 12 * Math.log2(f / 440);
        const key = Math.max(0, Math.min(127, Math.round(mf)));
        const bend = Math.max(0, Math.min(16383, 8192 + Math.round(((mf - key) / 2) * 8192)));
        const on = Math.round(n.t * EIGHTH);
        let off = Math.round((n.t + n.d) * EIGHTH);
        // One pitch-bend per channel at a time, so notes on a channel must not overlap.
        if (i + 1 < list.length) off = Math.min(off, Math.round(list[i + 1].t * EIGHTH));
        if (off <= on) off = on + 1;
        const vel = Math.max(1, Math.min(127, Math.round(n.vel * 120)));
        ev.push({ tick: on, order: 1, bytes: [0xe0 | ch, bend & 0x7f, bend >> 7] });
        ev.push({ tick: on, order: 2, bytes: [0x90 | ch, key, vel] });
        ev.push({ tick: off, order: 0, bytes: [0x80 | ch, key, 0] });
      }
      tracks.push(track(ev));
    }

    const drums = [{ tick: 0, order: 0, bytes: meta(0x03, str('Darbuka & riq')) }];
    for (const p of score.perc) {
      const on = Math.round(p.t * EIGHTH);
      const key = DRUM[p.kind] || DRUM.K;
      drums.push({ tick: on, order: 2, bytes: [0x99, key, Math.max(1, Math.min(127, Math.round(p.vel * 110)))] });
      drums.push({ tick: on + 60, order: 0, bytes: [0x89, key, 0] });
    }
    tracks.push(track(drums));

    const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255];
    const out = header.concat(...tracks);
    return Uint8Array.from(out);
  }

  return { toMidi };
});
