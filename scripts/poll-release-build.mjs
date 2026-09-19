import fs from 'fs';
const log = 'docs/release-build-0.3.0.log';
if (!fs.existsSync(log)) {
  console.log('POLL:missing-log');
  process.exit(2);
}
const text = fs.readFileSync(log, 'utf8');
const m = text.match(/RELEASE_BUILD_EXIT:(\d+)/);
if (!m) {
  console.log('POLL:in-progress');
  process.exit(2);
}
console.log('POLL:exit=' + m[1]);
process.exit(Number(m[1]) === 0 ? 0 : 1);
