@echo off
echo === TAURI_BUILD_STARTED %DATE% %TIME% ===> docs\tauri-build-0.4.0.log
cd /d %~dp0..
npm run tauri:build >> docs\tauri-build-0.3.0.log 2>&1
echo TAURI_BUILD_EXIT:%ERRORLEVEL%>> docs\tauri-build-0.3.0.log
exit /b %ERRORLEVEL%
