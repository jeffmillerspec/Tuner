@echo off
setlocal
cd /d %~dp0..
echo === RELEASE_BUILD_SPAWNED %DATE% %TIME% ===> docs\release-build-0.4.0.log
start "" /B cmd /c "npm run build && npm run tauri:build >> docs\tauri-build-0.4.0.log 2>&1 && echo TAURI_BUILD_EXIT:0>> docs\tauri-build-0.4.0.log && npm run release:stage >> docs\release-build-0.4.0.log 2>&1 && echo RELEASE_BUILD_EXIT:0>> docs\release-build-0.4.0.log || (echo TAURI_BUILD_EXIT:1>> docs\tauri-build-0.4.0.log & echo RELEASE_BUILD_EXIT:1>> docs\release-build-0.4.0.log)"
echo RELEASE_BUILD_SPAWNED
exit /b 0
