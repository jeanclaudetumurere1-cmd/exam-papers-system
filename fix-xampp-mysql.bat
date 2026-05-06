@echo off
echo ========================================
echo FIXING ALL EXAM PAPERS SYSTEM ERRORS
echo ========================================
echo.

:: Step 1: Stop any running Node processes
echo Step 1: Stopping Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

:: Step 2: Check if MySQL is running
echo Step 2: Checking MySQL...
tasklist | findstr "mysqld.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ MySQL is running
) else (
    echo ❌ MySQL is NOT running!
    echo Please start MySQL in XAMPP Control Panel
    pause
    start C:\xampp\xampp-control.exe
    exit /b
)

:: Step 3: Create database if not exists
echo Step 3: Creating database...
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS exam_system" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Database created/verified
) else (
    echo ❌ Failed to create database
    echo Trying with no password...
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS exam_system" 2>nul
    if %errorlevel% equ 0 (
        echo ✅ Database created with no password
        echo Update .env file: DB_PASSWORD=
    ) else (
        echo ❌ Still failing. Check MySQL manually.
    )
)

:: Step 4: Run database setup
echo Step 4: Setting up tables...
cd backend
mysql -u root -p exam_system < setup-db.sql 2>nul
if %errorlevel% equ 0 (
    echo ✅ Tables created
) else (
    mysql -u root exam_system < setup-db.sql 2>nul
    if %errorlevel% equ 0 (
        echo ✅ Tables created with no password
    )
)

:: Step 5: Install dependencies
echo Step 5: Installing dependencies...
call npm install

:: Step 6: Test database connection
echo Step 6: Testing database connection...
node test-db.js

:: Step 7: Start server
echo.
echo Step 7: Starting server...
echo Server will start in a new window...
start cmd /k "npm start"

:: Step 8: Open browser
timeout /t 3 /nobreak >nul
echo Step 8: Opening browser...
start http://localhost:5000/admin/login.html

echo.
echo ========================================
echo ✅ FIX COMPLETE!
echo ========================================
echo.
echo If you still see errors:
echo 1. Check the server window for errors
echo 2. Run: cd backend ^&^& node test-db.js
echo 3. Make sure MySQL is running in XAMPP
echo 4. Login with: Claude / Umusuder01@
echo ========================================
pause