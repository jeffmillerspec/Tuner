import fs from 'fs';
const p = 'src-tauri/icons/icon.ico';
if (fs.existsSync(p)) {
  fs.unlinkSync(p);
  console.log('REMOVED_BAD_ICO');
} else {
  console.log('NO_ICO');
}
