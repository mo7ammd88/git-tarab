'use strict';
const fs = require('fs');
const path = require('path');
const { KINDS } = require('./compose.js');

const LIBS = ['maqamat.js', 'compose.js', 'midi.js', 'poster.js'];

/** JSON that is safe to drop inside a <script> tag. */
const LS = new RegExp(String.fromCharCode(0x2028), 'g'); // line separator
const PS = new RegExp(String.fromCharCode(0x2029), 'g'); // paragraph separator
function scriptJSON(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029');
}

const escHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Build the self-contained player page.
 * Only what the music needs is embedded: short hashes, author names, times,
 * line counts and commit subjects. No emails, no file paths, no code.
 */
function buildHTML({ repo, stats, because, maqam, iqa, bpm, auto, commits, version, home }) {
  const authors = [];
  const idx = new Map();
  const rows = commits.map((c) => {
    if (!idx.has(c.author)) { idx.set(c.author, authors.length); authors.push(c.author); }
    return [
      c.sha.slice(0, 7), idx.get(c.author), c.time, c.add, c.del,
      Math.max(0, KINDS.indexOf(c.kind)), c.subject.length > 100 ? c.subject.slice(0, 99) + '…' : c.subject,
    ];
  });
  const data = {
    repo, maqam, iqa, bpm, because, auto, version,
    stats: {
      commits: stats.commits, authors: stats.authors, spanDays: Math.round(stats.spanDays),
      fixRatio: +stats.fixRatio.toFixed(3), nightRatio: +stats.nightRatio.toFixed(3),
      weekendRatio: +stats.weekendRatio.toFixed(3), added: stats.added, deleted: stats.deleted,
      firstTime: stats.firstTime, lastTime: stats.lastTime,
    },
    authors, commits: rows,
  };
  const libs = LIBS.map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  const template = fs.readFileSync(path.join(__dirname, 'player.html'), 'utf8');
  return template
    .replace('__TARAB_TITLE__', () => escHTML(`${repo} in maqam ${maqam[0].toUpperCase() + maqam.slice(1)}`))
    .replace('__TARAB_HOME__', () => escHTML(home || 'https://github.com/mo7ammd88/git-tarab'))
    .replace('/*__TARAB_LIBS__*/', () => libs.replace(/<\/script/gi, '<\\/script'))
    .replace('/*__TARAB_DATA__*/', () => scriptJSON(data));
}

module.exports = { buildHTML, scriptJSON };
