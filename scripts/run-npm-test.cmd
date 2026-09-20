@echo off
set CI=1
set npm_config_audit=false
set npm_config_fund=false
set npm_config_update_notifier=false
set npm_config_progress=false
set npm_config_loglevel=warn
node tests\smoke.mjs
exit /b %ERRORLEVEL%
