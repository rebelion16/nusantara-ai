# YTShortMaker Python Backend

Backend service untuk video processing menggunakan Whisper dan FFmpeg.

## Prerequisites

1. **Python 3.10+** - [Download](https://www.python.org/downloads/)
2. **FFmpeg** - Pastikan sudah terinstall dan ada di PATH
   - Windows: Download dari [ffmpeg.org](https://ffmpeg.org/download.html) atau `choco install ffmpeg`
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

## Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Server

```bash
# From backend directory
python main.py
```

Server akan berjalan di `http://localhost:8000`

## API Documentation

Setelah server berjalan, akses Swagger UI di:
- `http://localhost:8000/docs` - Interactive API documentation
- `http://localhost:8000/redoc` - Alternative documentation

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Check backend health |
| POST | `/upload` | Upload video file |
| POST | `/transcribe/{video_id}` | Transcribe with Whisper |
| POST | `/detect-highlights` | AI highlight detection |
| POST | `/cut` | Cut video segment |
| POST | `/add-captions` | Burn captions to video |
| GET | `/music-tracks` | Get built-in music list |
| POST | `/add-music` | Add background music |
| POST | `/export` | Final export |
| GET | `/download/{video_id}` | Download video |
| GET | `/preview/{video_id}` | Stream video preview |

## Music Tracks

Untuk menggunakan built-in music, tambahkan file MP3 ke folder `assets/music/`:
- `happy_upbeat.mp3`
- `chill_lofi.mp3`
- `dramatic_cinematic.mp3`
- `energetic_rock.mp3`
- `inspiring_piano.mp3`

## Troubleshooting

### FFmpeg not found
Pastikan FFmpeg sudah terinstall dan ada di system PATH:
```bash
ffmpeg -version
```

### Whisper model download
Model Whisper akan otomatis didownload saat pertama kali digunakan. File disimpan di `~/.cache/whisper/`.

### CORS errors
Frontend harus berjalan di `http://localhost:5173` atau `http://localhost:3000`. Jika berbeda, update CORS origins di `main.py`.

## Environment Variables (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Gemini API key for highlights | None (passed from frontend) |
