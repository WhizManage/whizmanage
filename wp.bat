@echo off
setlocal
set SCRIPT_DIR=%~dp0
"C:\xampp\php\php.exe" "%SCRIPT_DIR%wp-cli.phar" %*
endlocal
