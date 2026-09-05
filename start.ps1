# Setup database and seed if it doesn't exist
Write-Host "Setting up backend..."
cd backend
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH="."
alembic upgrade head
python seed.py

# Start Backend in background
Write-Host "Starting FastAPI backend..."
Start-Process -NoNewWindow -FilePath "uvicorn" -ArgumentList "app.main:app --reload --port 8000"

# Start Frontend
Write-Host "Starting Vite frontend..."
cd ..\frontend
npm run dev
