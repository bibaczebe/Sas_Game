@echo off
:: ─────────────────────────────────────────────────────────────────
:: export-to-godot.bat
:: Run this after saving the map in RPG Maker MZ.
:: 1. Converts Map001.json → Godot plains_biome.json
:: 2. Deletes stale atlas cache so Godot recomposites on next launch
:: ─────────────────────────────────────────────────────────────────

echo [1/2] Converting RPG Maker map to Godot format...
node "C:\Users\bibac\OneDrive\Desktop\SaS game\convert-rpgmz-map.js"
if %errorlevel% neq 0 (
    echo ERROR: Conversion failed. Make sure Node.js is installed.
    pause
    exit /b 1
)

echo.
echo [2/2] Clearing Godot tile atlas cache...
set CACHE_DIR=C:\Users\bibac\AppData\Roaming\Godot\app_userdata\Sword and Sandals Online
del /f /q "%CACHE_DIR%\plains_atlas_cache.png" 2>nul
del /f /q "%CACHE_DIR%\plains_atlas_cache_meta.json" 2>nul
echo Cache cleared.

echo.
echo Done! Launch Godot and the updated map will load automatically.
pause
