@echo off
setlocal
echo === TAURI_BUILD_STARTED %DATE% %TIME% ===>> F:\Dev\Tuner\docs\tauri-build-latest.txt
cd /d F:\Dev\Tuner
start "tuner-tauri-build" /MIN cmd /c "npm run tauri:build 1>> F:\Dev\Tuner\docs\tauri-build-latest.txt 2>&1 & echo TAURI_BUILD_EXIT:%%ERRORLEVEL%%>> F:\Dev\Tuner\docs\tauri-build-latest.txt"
echo TAURI_BUILD_BACKGROUND_STARTED
