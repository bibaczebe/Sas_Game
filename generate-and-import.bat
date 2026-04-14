@echo off
cd /d "%~dp0"
echo =============================================
echo  SaS Game -- Pelny pipeline (generuj + importuj)
echo =============================================
echo.
echo [1/2] Generowanie mapy Plains w RPG Makerze...
node generate-plains-biome.js
if %errorlevel% neq 0 (
    echo BLAD podczas generowania!
    pause
    exit /b 1
)
echo.
echo [2/2] Konwertowanie do Godota...
node convert-rpgmz-map.js
if %errorlevel% neq 0 (
    echo BLAD podczas konwersji!
    pause
    exit /b 1
)
echo.
echo =============================================
echo  Gotowe! Odswierz scene w Godocie.
echo =============================================
pause
