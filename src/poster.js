/* git-tarab — the rosette: every note drawn with 16-fold symmetry, like a khatam star. */
(function (root, factory) {
  const deps = (typeof module === 'object' && module.exports) ? require('./maqamat.js') : root.Tarab;
  const api = factory(deps);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tarab = Object.assign(root.Tarab || {}, api);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';

  const PALETTE = {
    night: '#121a3f', deep: '#0b1030', ink: '#efe7d2', dim: '#9aa2c4',
    gold: '#e2b54a', voices: ['#e2b54a', '#4fb3a9', '#d9585f', '#ab8fe0'],
  };
  const SLICE = Math.PI / 8; // 22.5°: one petal; mirrored and rotated 8 times = 16 copies

  /**
   * Base-slice coordinates for each note, centred on (0,0), with outer radius R.
   * Time sweeps the angle across one 22.5° slice; pitch sets the radius.
   */
  function layout(score, R) {
    let lo = Infinity, hi = -Infinity;
    for (const n of score.notes) { lo = Math.min(lo, n.cents); hi = Math.max(hi, n.cents); }
    if (!isFinite(lo)) { lo = 0; hi = 1200; }
    if (hi - lo < 600) hi = lo + 600;
    const r0 = R * 0.24;
    const radius = (c) => r0 + (R - r0) * ((c - lo) / (hi - lo));
    const pts = score.notes.map((n) => {
      const a = -Math.PI / 2 + (n.t / score.total) * SLICE;
      const r = radius(n.cents);
      return { x: r * Math.cos(a), y: r * Math.sin(a), r: Math.max(0.6, (1.2 + 3.2 * n.vel * Math.min(2, Math.sqrt(n.d))) * (R / 400)), voice: n.voice, t: n.t, grace: !!n.grace };
    });
    // Rings where the tonic sits in each octave.
    const rings = [];
    for (let c = Math.ceil(lo / 1200) * 1200; c <= hi; c += 1200) rings.push(radius(c));
    return { pts, rings, r0, lo, hi, radius };
  }

  // All 16 transforms of the dihedral group D8, as SVG transform strings.
  function symmetry() {
    const out = [];
    for (let k = 0; k < 8; k++) {
      out.push(`rotate(${k * 45})`);
      out.push(`rotate(${k * 45}) scale(-1,1)`);
    }
    return out;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const f1 = (x) => Math.round(x * 10) / 10;

  /** The rosette alone, as SVG markup centred at (cx, cy). */
  function rosetteSVG(score, cx, cy, R) {
    const L = layout(score, R);
    const line = L.pts.filter((p) => !p.grace).map((p, i) => `${i ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`).join('');
    const dots = PALETTE.voices.map((color, v) => {
      const d = L.pts.filter((p) => p.voice === v)
        .map((p) => `M${f1(p.x - p.r)} ${f1(p.y)}a${f1(p.r)} ${f1(p.r)} 0 1 0 ${f1(2 * p.r)} 0a${f1(p.r)} ${f1(p.r)} 0 1 0 ${f1(-2 * p.r)} 0`).join('');
      return d ? `<path d="${d}" fill="${color}" fill-opacity="0.85"/>` : '';
    }).join('');
    const sym = symmetry();
    // The khatam: two squares at 45°, the eight-pointed star of Islamic tiling.
    const s = R * 1.02;
    const star = `<g fill="none" stroke="${PALETTE.gold}" stroke-opacity="0.18" stroke-width="1.2">
      <rect x="${-s / Math.SQRT2}" y="${-s / Math.SQRT2}" width="${s * Math.SQRT2}" height="${s * Math.SQRT2}"/>
      <rect x="${-s / Math.SQRT2}" y="${-s / Math.SQRT2}" width="${s * Math.SQRT2}" height="${s * Math.SQRT2}" transform="rotate(45)"/>
    </g>`;
    const rings = L.rings.map((r) => `<circle r="${f1(r)}" fill="none" stroke="${PALETTE.gold}" stroke-opacity="0.22" stroke-dasharray="2 6"/>`).join('');
    return `<g transform="translate(${cx} ${cy})">
    ${star}${rings}
    <defs><g id="petal"><path d="${line}" fill="none" stroke="${PALETTE.ink}" stroke-opacity="0.28" stroke-width="0.8" stroke-linejoin="round"/>${dots}</g></defs>
    ${sym.map((t) => `<use href="#petal" xlink:href="#petal" transform="${t}"/>`).join('')}
    <circle r="${f1(L.r0 * 0.85)}" fill="${PALETTE.deep}" stroke="${PALETTE.gold}" stroke-opacity="0.5"/>
  </g>`;
  }

  /** A shareable poster: rosette + title + the reason for the maqam. */
  function posterSVG(score, info) {
    const W = 1000, H = 1240;
    const maqam = M.MAQAMAT[score.maqam];
    const iqa = M.IQAAT[score.iqa];
    const mins = Math.floor(score.duration / 60), secs = Math.round(score.duration % 60);
    const st = info.stats || {};
    const voices = score.voices.map((v, i) => `<tspan fill="${PALETTE.voices[i]}">●</tspan> ${esc(v.author)} <tspan fill="${PALETTE.dim}">(${M.INSTRUMENTS[i].name.toLowerCase()})</tspan>`).join('   ');
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#1d2a63"/><stop offset="0.6" stop-color="${PALETTE.night}"/><stop offset="1" stop-color="${PALETTE.deep}"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${rosetteSVG(score, W / 2, 470, 400)}
  <g font-family="Amiri, 'Noto Naskh Arabic', Georgia, 'Times New Roman', serif" text-anchor="middle">
    <text x="${W / 2}" y="470" dy="0.35em" font-size="48" fill="${PALETTE.gold}">${esc(maqam.ar)}</text>
    <text x="${W / 2}" y="958" font-size="46" fill="${PALETTE.ink}">${esc(info.repo || 'repository')}</text>
    <text x="${W / 2}" y="1010" font-size="30" fill="${PALETTE.gold}" font-style="italic">in maqam ${esc(maqam.name)}, the maqam of ${esc(maqam.mood)}</text>
    <text x="${W / 2}" y="1056" font-size="22" fill="${PALETTE.dim}">because ${esc(info.because || '')}</text>
  </g>
  <g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle" font-size="17" fill="${PALETTE.ink}">
    <text x="${W / 2}" y="1118">${voices}</text>
    <text x="${W / 2}" y="1160" fill="${PALETTE.dim}">${(st.commits || 0).toLocaleString('en-US')} commits, ${iqa.name} rhythm at ${score.bpm} bpm, ${mins}:${String(secs).padStart(2, '0')} long. Made with git-tarab</text>
  </g>
</svg>`;
  }

  return { PALETTE, SLICE, layout, posterSVG, rosetteSVG };
});
