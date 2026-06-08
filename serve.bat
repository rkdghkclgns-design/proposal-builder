@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   ============================================
echo    기획서 빌더  ^>  http://localhost:8000
echo   ============================================
echo    브라우저가 자동으로 열립니다.
echo    페이지가 비어 보이면 한 번 새로고침하세요.
echo    종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo.
start "" http://localhost:8000
python -m http.server 8000
