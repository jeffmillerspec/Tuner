$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root 'src-tauri/icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
$pngPath = Join-Path $root 'app-icon.png'
if (-not (Test-Path $pngPath)) { throw "Missing $pngPath" }
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($pngPath)
$iconPath = Join-Path $iconDir 'icon.ico'
$fs = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create)
try {
  $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
  $icon.Save($fs)
  $icon.Dispose()
} finally {
  $fs.Close()
  $bmp.Dispose()
}
$size = (Get-Item $iconPath).Length
Write-Output "ICON_OK size=$size path=$iconPath"
