@echo off
setlocal
cd /d %~dp0..
echo === VITE_BUILD_STARTED %DATE% %TIME% ===> docs\vite-build-0.3.0.log
npm run build >> docs\vite-build-0.3.0.log 2>&1
echo VITE_BUILD_EXIT:%ERRORLEVEL%>> docs\vite-build-0.3.0.log
exit /b %ERRORLEVEL%
