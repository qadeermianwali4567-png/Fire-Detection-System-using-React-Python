@echo off
title Fire Detection System
echo Starting MongoDB...
start "MongoDB" mongod

timeout /t 3 /nobreak >nul

echo Starting Fire Detection System...
cd /d D:\FireDetectionSystem
call fire_env\Scripts\activate
start "Fire Detection" cmd /k "cd /d D:\FireDetectionSystem && fire_env\Scripts\activate && python run.py"

timeout /t 5 /nobreak >nul

echo Opening Browser...
start chrome http://localhost:8000

echo Done! System is starting...