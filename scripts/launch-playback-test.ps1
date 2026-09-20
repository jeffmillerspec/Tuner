$Root = Split-Path $PSScriptRoot -Parent
$Binary = Join-Path $Root 'src-tauri\target\debug\tuner.exe'
$Config = Join-Path $Root 'docs\playback-test-config.json'

if (-not (Test-Path $Binary)) {
  Write-Output (@{ launched = $false; error = 'binary missing'; binaryPath = $Binary } | ConvertTo-Json -Compress)
  exit 1
}

Get-Process tuner -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$ensureOut = & node (Join-Path $Root 'scripts\ensure-vite-preview.mjs') 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
  Write-Output (@{
    launched = $false
    error = 'vite preview not ready on port 1420'
    ensureOutput = $ensureOut.Trim()
    port1420Open = $false
  } | ConvertTo-Json -Compress)
  exit 1
}

$env:TUNER_PLAYBACK_TEST = '1'
$env:TUNER_PLAYBACK_TEST_CONFIG = $Config
Start-Process -FilePath $Binary -ArgumentList @('--playback-test', '--playback-test-config', $Config) -WorkingDirectory $Root -WindowStyle Minimized | Out-Null
Write-Output (@{
  launched = $true
  binaryPath = $Binary.Replace('\', '/')
  configPath = $Config.Replace('\', '/')
  viteDevServer = $true
  port1420Open = $true
  ensureOutput = ($ensureOut.Trim() | ConvertFrom-Json)
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress)
exit 0
