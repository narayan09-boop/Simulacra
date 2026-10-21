@echo off
echo Running SIMULACRA Backend Test Suite ...
cd backend
python -m pytest tests/ -v
pause
