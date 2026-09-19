import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, 'Bundled themes json');

export function loadBundledJsonRecords() {
  try {
    return readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .map((f) => {
        const raw = readFileSync(join(dir, f), 'utf8');
        const data = JSON.parse(raw);
        const id = data.id ?? f.replace(/\.json$/i, '');
        return { ...data, id, name: data.name || data.label || id };
      });
  } catch {
    return [];
  }
}
