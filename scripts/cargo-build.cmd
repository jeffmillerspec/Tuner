@echo off
echo === BUILD_STARTED %DATE% %TIME% ===>> F:\Dev\Tuner\docs\build-log.txt
cd /d F:\Dev\Tuner\src-tauri
cargo build >> F:\Dev\Tuner\docs\build-log.txt 2>&1
echo CARGO_BUILD_EXIT:%ERRORLEVEL%>> F:\Dev\Tuner\docs\build-log.txt
