#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_COLOR_KEYS } from '../src/theme/constants.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const themesDir = path.join(root, 'Bundled themes json');
const outPath = path.join(root, 'docs', 'theme-system', 'json-parse-results.json');

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => path.join(dir, f))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

const files = listJsonFiles(themesDir);
const results = [];
const idOwners = new Map();
let ok = 0;
let fail = 0;

for (const abs of files) {
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  const st = fs.statSync(abs);
  let valid = false;
  let error = null;
  let id = null;
  try {
    const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    id = data.id ?? null;
    const missing = REQUIRED_COLOR_KEYS.filter((k) => data[k] == null || data[k] === '');
    if (!id) throw new Error('missing "id" field');
    if (missing.length) throw new Error('missing required keys: ' + missing.join(', '));
    if (idOwners.has(id)) throw new Error(`duplicate id "${id}" also used by ${idOwners.get(id)}`);
    idOwners.set(id, rel);
    valid = true;
    ok += 1;
  } catch (e) {
    error = String(e.message || e);
    fail += 1;
  }
  results.push({ path: rel, size: st.size, mtime: st.mtime.toISOString(), valid, id, error });
}

const payload = {
  validatedAt: new Date().toISOString(),
  themesDir: 'Bundled themes json',
  total: results.length,
  ok,
  fail,
  files: results,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify({ ok, fail, total: results.length, out: 'docs/theme-system/json-parse-results.json' }));
process.exit(fail > 0 ? 1 : 0);
