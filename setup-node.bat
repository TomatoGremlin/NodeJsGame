@echo off
setlocal enabledelayedexpansion

:: --- Step 1: Check if Node.js is installed ---
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Downloading and installing...

    set "NODE_INSTALLER=node-lts.msi"
    curl -o %NODE_INSTALLER% https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi

    if exist %NODE_INSTALLER% (
        msiexec /i %NODE_INSTALLER% /quiet /norestart
        echo Waiting for installation to finish...
        timeout /t 10 >nul
        del %NODE_INSTALLER%
    ) else (
        echo Failed to download Node.js installer.
        exit /b 1
    )
) else (
    echo Node.js is already installed. Version: 
    node -v
)

:: --- Step 2: Install dependencies if not installed ---
echo.
echo Checking for required npm packages...

set PACKAGES=express express-session body-parser bcrypt ws

for %%P in (%PACKAGES%) do (
    npm list %%P >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo Installing %%P...
        npm install %%P
    ) else (
        echo %%P is already installed.
    )
)

echo.
echo ✅ Setup complete.
pause
