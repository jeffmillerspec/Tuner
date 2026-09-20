/**
 * Rebuild app icons from assets/tuner-icon-1024.png (replaces old placeholder generators).
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
execSync('node scripts/tauri-icon-only.mjs', { cwd: ROOT, stdio: 'inherit' });
