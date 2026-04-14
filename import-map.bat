@echo off
cd /d "%~dp0"
echo =============================================
echo  SaS Game -- Import mapy RPG Maker -^> Godot
echo =============================================
echo.
echo [1/1] Konwertowanie Map001.json -^> plains_biome.json ...
node convert-rpgmz-map.js
if %errorlevel% neq 0 (
    echo.
    echo BLAD: Konwersja nie powiodla sie!
    echo Upewnij sie ze plik istnieje:
    echo   C:\Users\bibac\Documents\RPGMaker Projects\SaS_Plains\data\Map001.json
    pause
    exit /b 1
)
echo.
echo Gotowe! Odswierz scene w Godocie.
pause
