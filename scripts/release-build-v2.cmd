@echo off
setlocal
cd /d %~dp0..
echo === RELEASE_BUILD_V2_STARTED %DATE% %TIME% ===> docs\release-build-v2.log
npm test >> docs\release-build-v2.log 2>&1
if errorlevel 1 (echo RELEASE_BUILD_EXIT:1>> docs\release-build-v2.log & exit /b 1)
npm run tauri:build >> docs\release-build-v2.log 2>&1
if errorlevel 1 (echo RELEASE_BUILD_EXIT:1>> docs\release-build-v2.log & exit /b 1)
npm run release:stage >> docs\release-build-v2.log 2>&1
if errorlevel 1 (echo RELEASE_BUILD_EXIT:1>> docs\release-build-v2.log & exit /b 1)
echo RELEASE_BUILD_EXIT:0>> docs\release-build-v2.log
exit /b 0
