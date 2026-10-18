'use strict';
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const { classify } = require('./compose.js');

const RS = '\x1e', US = '\x1f';

/** Parse the local hour and weekday out of an ISO-8601 date with offset. */
function localParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})/.exec(iso || '');
  if (!m) return { hour: -1, dow: -1 };
  const dow = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return { hour: +m[4], dow };
}

/** Parse the output of `git log --pretty=<ours> --numstat`. */
function parseLog(text) {
  const commits = [];
  for (const chunk of text.split(RS)) {
    if (!chunk.trim()) continue;
    const nl = chunk.indexOf('\n');
    const header = nl === -1 ? chunk : chunk.slice(0, nl);
    const body = nl === -1 ? '' : chunk.slice(nl + 1);
    const [sha, parents, author, email, iso, subject] = header.split(US);
    if (!sha) continue;
    let add = 0, del = 0, files = 0;
    for (const line of body.split('\n')) {
      const m = /^(\d+|-)\t(\d+|-)\t/.exec(line);
      if (!m) continue;
      files++;
      if (m[1] !== '-') add += +m[1];
      if (m[2] !== '-') del += +m[2];
    }
    const parentCount = parents ? parents.trim().split(/\s+/).filter(Boolean).length : 0;
    const { hour, dow } = localParts(iso);
    commits.push({
      sha,
      author: (author || 'unknown').trim(),
      email: (email || '').trim().toLowerCase(),
      time: Math.floor(Date.parse(iso) / 1000) || 0,
      hour, dow,
      add, del, files,
      subject: (subject || '').trim(),
      kind: classify(subject, parentCount),
    });
  }
  return unifyAuthors(commits);
}

/**
 * People commit under several names and emails ("TJ", "Tj", an old username).
 * Join identities that share an email or a case-insensitive name, then show each
 * person by the name they used most. Emails are dropped afterwards.
 */
function unifyAuthors(commits) {
  const parent = [];
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const byKey = new Map();
  const idOf = (key) => {
    if (!byKey.has(key)) { byKey.set(key, parent.length); parent.push(parent.length); }
    return byKey.get(key);
  };
  for (const c of commits) {
    const a = idOf('n:' + c.author.toLowerCase().replace(/\s+/g, ' '));
    if (c.email && !/^(no-?reply|none|unknown)@/.test(c.email)) {
      const b = idOf('e:' + c.email);
      parent[find(a)] = find(b);
    }
    c._id = a;
  }
  // A bare handle like "junegunn" usually belongs to whoever commits as junegunn.c@...
  const emailsByHandle = new Map();
  for (const c of commits) {
    if (!c.email) continue;
    const local = c.email.split('@')[0].replace(/^\d+\+/, '');
    const head = local.split(/[._+-]/)[0];
    if (head.length >= 5 && !emailsByHandle.has(head)) emailsByHandle.set(head, idOf('e:' + c.email));
  }
  for (const c of commits) {
    const handle = c.author.toLowerCase();
    if (/^[a-z0-9_-]{5,}$/.test(handle) && emailsByHandle.has(handle)) parent[find(c._id)] = find(emailsByHandle.get(handle));
  }
  const names = new Map();
  for (const c of commits) {
    const root = find(c._id);
    if (!names.has(root)) names.set(root, new Map());
    const m = names.get(root);
    m.set(c.author, (m.get(c.author) || 0) + 1);
  }
  const display = new Map();
  for (const [root, m] of names) display.set(root, [...m.entries()].sort((x, y) => y[1] - x[1])[0][0]);
  for (const c of commits) {
    c.author = display.get(find(c._id));
    delete c._id;
    delete c.email;
  }
  return commits;
}

/** Read every commit reachable from HEAD, oldest first. */
function readCommits(dir, opts = {}) {
  const repo = path.resolve(dir || '.');
  try {
    execFileSync('git', ['-C', repo, 'rev-parse', '--git-dir'], { stdio: 'ignore' });
  } catch {
    const err = new Error(`${repo} is not inside a git repository`);
    err.code = 'NOT_A_REPO';
    throw err;
  }
  const args = [
    '-C', repo, 'log', '--reverse', '--no-renames', '--numstat', '--no-color',
    '--date-order', `--pretty=format:${RS}%H${US}%P${US}%aN${US}%aE${US}%aI${US}%s`,
  ];
  if (opts.since) args.push(`--since=${opts.since}`);
  if (opts.rev) args.push(opts.rev);
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let errText = '';
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => { errText += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        if (/does not have any commits/.test(errText)) return resolve([]);
        return reject(new Error(errText.trim() || `git log exited with ${code}`));
      }
      resolve(parseLog(Buffer.concat(chunks).toString('utf8')));
    });
  });
}

function repoName(dir) {
  const repo = path.resolve(dir || '.');
  try {
    const url = execFileSync('git', ['-C', repo, 'config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim();
    const m = /([^/:]+\/[^/]+?)(?:\.git)?$/.exec(url);
    if (m) return m[1];
  } catch { /* no remote */ }
  try {
    const top = execFileSync('git', ['-C', repo, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    return path.basename(top);
  } catch {
    return path.basename(repo);
  }
}

module.exports = { readCommits, parseLog, repoName, localParts, unifyAuthors };
