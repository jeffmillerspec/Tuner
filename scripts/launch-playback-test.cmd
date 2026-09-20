@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."
set "TUNER_PLAYBACK_TEST=1"
set "TUNER_PLAYBACK_TEST_CONFIG=%ROOT%\docs\playback-test-config.json"
set "BINARY=%ROOT%\src-tauri\target\debug\tuner.exe"
taskkill /IM tuner.exe /F >nul 2>&1
start "" /MIN "%BINARY%" --playback-test --playback-test-config "%TUNER_PLAYBACK_TEST_CONFIG%"
endlocal
exit /b 0
