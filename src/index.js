'use strict';
const { MAQAMAT } = require('./maqamat.js');
const C = require('./compose.js');
const { toMidi } = require('./midi.js');
const { posterSVG } = require('./poster.js');
const { readCommits, repoName } = require('./git.js');
const { buildHTML } = require('./build.js');
const pkg = require('../package.json');

/**
 * Read a repository and perform it.
 * Returns everything the CLI (or your own script) might want to save.
 */
async function perform(dir, opts = {}) {
  const all = await readCommits(dir, { since: opts.since });
  if (all.length < 2) {
    const err = new Error('this repo needs at least 2 commits to make music');
    err.code = 'TOO_FEW_COMMITS';
    throw err;
  }
  if (opts.anonymous) {
    const alias = new Map();
    for (const c of all) {
      if (!alias.has(c.author)) alias.set(c.author, `Voice ${alias.size + 1}`);
      c.author = alias.get(c.author);
    }
  }
  const stats = C.analyze(all);
  const auto = C.chooseMaqam(stats);
  const maqam = opts.maqam || auto.id;
  const because = opts.maqam && opts.maqam !== auto.id ? 'you chose it' : auto.because;
  const bpm = opts.bpm || C.autoTempo(stats);
  const iqa = opts.iqa || 'maqsum';
  const repo = opts.name || repoName(dir);
  const commits = C.sample(all, opts.limit || 320);
  const score = C.compose(commits, { maqam, iqa, bpm });
  const title = `${repo} in maqam ${MAQAMAT[maqam].name}`;
  return {
    repo, stats, auto, maqam, because, bpm, iqa, commits, score, total: all.length,
    html: () => buildHTML({ repo, stats, because, maqam, iqa, bpm, auto, commits, version: pkg.version, home: pkg.homepage }),
    svg: () => posterSVG(score, { repo, because, stats }),
    midi: () => toMidi(score, title),
  };
}

module.exports = { perform, ...C, toMidi, posterSVG, MAQAMAT };
