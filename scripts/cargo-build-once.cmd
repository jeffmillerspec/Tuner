@echo off
taskkill /IM cargo.exe /F >nul 2>&1
taskkill /IM rustc.exe /F >nul 2>&1
taskkill /IM tuner.exe /F >nul 2>&1
cd /d F:\Dev\Tuner
call npm run build >> F:\Dev\Tuner\docs\cargo-build-latest.txt 2>&1
echo === BUILD_STARTED %DATE% %TIME% ===>> F:\Dev\Tuner\docs\cargo-build-latest.txt
cd /d F:\Dev\Tuner\src-tauri
cargo build >> F:\Dev\Tuner\docs\cargo-build-latest.txt 2>&1
echo CARGO_BUILD_EXIT:%ERRORLEVEL%>> F:\Dev\Tuner\docs\cargo-build-latest.txt
type F:\Dev\Tuner\docs\cargo-build-latest.txt>> F:\Dev\Tuner\docs\build-log.txt
