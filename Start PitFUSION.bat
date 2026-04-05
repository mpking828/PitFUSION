@echo off
echo Starting PitFUSION web server...
echo.
echo Open your browser to: http://localhost:8080/PitFUSION.html
echo.
echo Press Ctrl+C to stop the server.
echo.
python -m http.server 8080
start "" "http://localhost:8080/PitFUSION.html"
pause
