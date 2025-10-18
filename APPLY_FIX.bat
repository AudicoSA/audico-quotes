@echo off
REM ============================================================================
REM AUDICO SEARCH FIX - WINDOWS DEPLOYMENT
REM ============================================================================

echo ================================================================================
echo AUDICO CHAT SEARCH FIX - QUICK DEPLOYMENT
echo ================================================================================
echo.

echo This script will guide you through applying the fix to your Supabase database.
echo.
echo Prerequisites:
echo   - Supabase project access
echo   - SQL Editor access in Supabase dashboard
echo.

echo STEP 1: Open Supabase Dashboard
echo ================================================================================
echo.
echo 1. Go to: https://supabase.com/dashboard
echo 2. Select your project: ajdehycoypilsegmxbto
echo 3. Click "SQL Editor" in the left sidebar
echo.
pause

echo.
echo STEP 2: Copy SQL Fix to Clipboard
echo ================================================================================
echo.
echo The fix SQL file will now open in Notepad.
echo.
echo Instructions:
echo   1. Press Ctrl+A to select all
echo   2. Press Ctrl+C to copy
echo   3. Close Notepad
echo.
notepad FIX_SEARCH_BRAND_ISSUE.sql
pause

echo.
echo STEP 3: Execute SQL in Supabase
echo ================================================================================
echo.
echo 1. In Supabase SQL Editor, click "New query"
echo 2. Press Ctrl+V to paste the SQL
echo 3. Click "Run" button at the bottom right
echo 4. Wait for execution (should take 10-30 seconds)
echo 5. Check for success messages in the output
echo.
pause

echo.
echo STEP 4: Verify Fix
echo ================================================================================
echo.
echo Running diagnostic tests...
echo.
node test-search-diagnosis.js

echo.
echo ================================================================================
echo FIX APPLICATION COMPLETE!
echo ================================================================================
echo.
echo VERIFICATION CHECKLIST:
echo   [ ] SQL executed successfully in Supabase
echo   [ ] No errors in SQL output
echo   [ ] Diagnostic tests show Marantz products with correct brand
echo   [ ] Test search in UI for "marantz" - should show products
echo   [ ] Test search for "monitor audio" - should show products
echo.
echo If all checks pass, the fix is successful!
echo.
echo Next: Test the live chat search for various brands.
echo.
pause
