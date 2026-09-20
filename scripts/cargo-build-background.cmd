@echo off
setlocal
echo.> F:\Dev\Tuner\docs\cargo-build-latest.txt
call npm run build >> F:\Dev\Tuner\docs\cargo-build-latest.txt 2>&1
echo === BUILD_STARTED %DATE% %TIME% ===>> F:\Dev\Tuner\docs\cargo-build-latest.txt
cd /d F:\Dev\Tuner\src-tauri
start "tuner-cargo-build" /MIN cmd /c "cargo build >> F:\Dev\Tuner\docs\cargo-build-latest.txt 2>&1 & echo CARGO_BUILD_EXIT:%%ERRORLEVEL%%>> F:\Dev\Tuner\docs\cargo-build-latest.txt & type F:\Dev\Tuner\docs\cargo-build-latest.txt>> F:\Dev\Tuner\docs\build-log.txt"
echo BUILD_BACKGROUND_STARTED
