@echo off
:: Opens SaS_Plains in RPG Maker MZ
:: After editing: save in RPG Maker (Ctrl+S), then run export-to-godot.bat
powershell -NoProfile -Command "Set-ItemProperty 'HKCU:\Software\KADOKAWA\RPGMZ' -Name projectFileUrl -Value 'file:///C:/Users/bibac/Documents/RPGMaker%%20Projects/SaS_Plains/Game.rmmzproject'; Set-ItemProperty 'HKCU:\Software\KADOKAWA\RPGMZ' -Name location -Value 'C:\Users\bibac\Documents\RPGMaker Projects\SaS_Plains'"
start "" "%~dp0Game.rmmzproject"
