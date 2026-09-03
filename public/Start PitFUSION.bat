@echo off
echo Starting PitFUSION web server...
echo.
echo Open your browser to: http://localhost:8080/
echo.
echo Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:8080/"
python -m http.server 8080
pause
