@echo off
echo Starting Automo Caption Generator...
echo.

echo [1/2] Starting Backend (port 5000)...
start "Automo Backend" cmd /k "cd backend && npm install && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (port 3000)...
start "Automo Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Both servers starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause
