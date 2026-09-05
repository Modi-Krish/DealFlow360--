# DealFlow360

Intelligent B2B Sales Operations Platform.

## Development Setup

1. **Start Database**
   ```bash
   docker-compose up -d
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/Scripts/activate # On Windows
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
