$ErrorActionPreference = 'Stop'
if (-not (Test-Path node_modules/vitest)) { npm install --no-fund --no-audit }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/smoke-preview.mjs
exit $LASTEXITCODE
