# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:22-slim AS frontend

WORKDIR /build/client

# Install dependencies first for better layer caching
# Copy only package.json — NOT package-lock.json — so npm resolves dependencies
# fresh for Linux, ignoring the Windows-pinned @rolldown/binding-win32-x64-msvc
# entry that gets written when npm install is run on Windows.
COPY client/package.json ./
RUN npm install

# Copy source and build
COPY client/ ./
RUN npm run build

# ── Stage 2: Python API server ────────────────────────────────────────────────
FROM python:3.12-slim AS app

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY main.py config.py models.py calculations.py dependencies.py ./
COPY routers/ ./routers/
COPY services/ ./services/

# Copy built React app from stage 1
COPY --from=frontend /build/client/dist ./client/dist

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
