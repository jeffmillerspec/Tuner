$env:CI = 'true'
$env:npm_config_audit = 'false'
$env:npm_config_fund = 'false'
$env:npm_config_update_notifier = 'false'
$root = Split-Path $PSScriptRoot -Parent
$outFile = Join-Path $root 'docs\smoke-node-output.txt'
New-Item -ItemType Directory -Force -Path (Join-Path $root 'docs') | Out-Null
& node (Join-Path $root 'tests\smoke.mjs') *> $outFile
$ec = $LASTEXITCODE
Get-Content $outFile
exit $ec
