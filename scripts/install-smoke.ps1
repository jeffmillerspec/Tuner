# Minimal install/uninstall smoke for Tuner 0.3.0
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$installer = Join-Path $root 'Releases/Tuner-Setup-latest.exe'
$log = Join-Path $root 'docs/install-smoke-0.3.0.log'
if (-not (Test-Path $installer)) { "MISSING_INSTALLER $installer" | Out-File $log; exit 1 }
"=== INSTALL_SMOKE_STARTED $(Get-Date -Format o) ===" | Out-File $log
$proc = Start-Process -FilePath $installer -ArgumentList '/S' -PassThru -Wait
"INSTALL_EXIT:$($proc.ExitCode)" | Add-Content $log
$exe = Join-Path $env:LOCALAPPDATA 'Programs\Tuner\Tuner.exe'
if (-not (Test-Path $exe)) { $exe = Join-Path ${env:ProgramFiles} 'Tuner\Tuner.exe' }
if (Test-Path $exe) {
  "LAUNCH:$exe" | Add-Content $log
  $app = Start-Process -FilePath $exe -PassThru
  Start-Sleep -Seconds 8
  if (-not $app.HasExited) { Stop-Process -Id $app.Id -Force; "LAUNCH:ok" | Add-Content $log } else { "LAUNCH:exited_early" | Add-Content $log }
} else { "LAUNCH:missing_exe" | Add-Content $log }
$uninstall = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Programs\Tuner') -Filter 'Uninstall*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($uninstall) {
  $u = Start-Process -FilePath $uninstall.FullName -ArgumentList '/S' -PassThru -Wait
  "UNINSTALL_EXIT:$($u.ExitCode)" | Add-Content $log
} else { "UNINSTALL:missing" | Add-Content $log }
"=== INSTALL_SMOKE_DONE ===" | Add-Content $log
