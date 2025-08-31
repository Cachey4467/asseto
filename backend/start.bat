@echo off
echo Copying database and config files from X:\opt\asseto\data...

REM Copy database file if it exists
if exist "X:\opt\asseto\data\*.db" (
    copy /Y "X:\opt\asseto\data\*.db" "instance\"
    echo Database files copied successfully
) else (
    echo No database files found in X:\opt\asseto\data
)

REM Copy JSON config files if they exist
if exist "X:\opt\asseto\data\*.json" (
    copy /Y "X:\opt\asseto\data\*.json" "instance\"
    echo JSON config files copied successfully
) else (
    echo No JSON config files found in X:\opt\asseto\data
)

echo File copy operations completed
echo.

set DATABASE_PATH=instance\finance.db
set TINYDB_CONFIG_PATH=instance\config.json
uv run run_with_scheduler.py