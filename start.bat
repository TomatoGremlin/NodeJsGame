@echo off  
cd /d "%~dp0"  # Преминава в директорията на .bat файла  

echo Starting HTTP Server...  
start node server.js  

echo Starting WebSocket Server...  
start node game\multiplayerServer.js  

echo Both servers are now running.  
pause