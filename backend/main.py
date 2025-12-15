"""
YTShortMaker Backend - FastAPI Server
Main entry point untuk local video processing service.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import tempfile
import os
import uuid
import shutil
import logging
from dataclasses import asdict

from services.whisper_service import whisper_service, TranscriptSegment
from services.ffmpeg_service import ffmpeg_service, CaptionStyle, CaptionSegment
from services.highlight_service import highlight_service, HighlightSegment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="YTShortMaker Backend",
    description="Local video processing service for YouTube Shorts creation",
    version="1.0.0"
)

# CORS middleware untuk komunikasi dengan frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary storage for uploaded files and processed videos
TEMP_DIR = os.path.join(tempfile.gettempdir(), "ytshortmaker")
os.makedirs(TEMP_DIR, exist_ok=True)

# Store for job status
jobs: Dict[str, Dict[str, Any]] = {}

# Built-in royalty-free music tracks (paths will be relative to backend/assets/music)
MUSIC_TRACKS = [
    {"id": "upbeat1", "name": "Happy Upbeat", "file": "happy_upbeat.mp3", "duration": 120, "mood": "happy"},
    {"id": "chill1", "name": "Chill Lofi", "file": "chill_lofi.mp3", "duration": 180, "mood": "chill"},
    {"id": "dramatic1", "name": "Dramatic Cinematic", "file": "dramatic_cinematic.mp3", "duration": 90, "mood": "dramatic"},
    {"id": "energetic1", "name": "Energetic Rock", "file": "energetic_rock.mp3", "duration": 100, "mood": "energetic"},
    {"id": "inspiring1", "name": "Inspiring Piano", "file": "inspiring_piano.mp3", "duration": 150, "mood": "inspiring"},
]


# ----- Pydantic Models -----

class TranscribeRequest(BaseModel):
    language: Optional[str] = None

class TranscriptSegmentModel(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: Optional[List[Dict[str, Any]]] = None

class TranscriptResponse(BaseModel):
    text: str
    language: str
    duration: float
    segments: List[TranscriptSegmentModel]

class HighlightRequest(BaseModel):
    segments: List[Dict[str, Any]]
    target_duration: int = 60
    num_highlights: int = 5
    content_type: str = "general"
    api_key: Optional[str] = None  # Optional untuk versi offline

class HighlightSegmentModel(BaseModel):
    start: float
    end: float
    score: float
    title: str
    reason: str
    category: str

class HighlightResponse(BaseModel):
    highlights: List[HighlightSegmentModel]
    summary: str
    total_duration: float

class CutRequest(BaseModel):
    video_id: str
    start_time: float
    end_time: float
    convert_vertical: bool = True

class CaptionStyleModel(BaseModel):
    font_name: str = "Arial"
    font_size: int = 24
    font_color: str = "white"
    outline_color: str = "black"
    outline_width: int = 2
    background_color: Optional[str] = None
    position: str = "bottom"
    margin_v: int = 50
    bold: bool = True

class CaptionSegmentModel(BaseModel):
    start: float
    end: float
    text: str

class CaptionRequest(BaseModel):
    video_id: str
    captions: List[CaptionSegmentModel]
    style: CaptionStyleModel

class MusicRequest(BaseModel):
    video_id: str
    music_id: Optional[str] = None  # Built-in track ID
    music_volume: float = 0.3
    original_volume: float = 1.0
    fade_in: float = 1.0
    fade_out: float = 2.0

class ExportRequest(BaseModel):
    video_id: str
    resolution: str = "1080p"
    quality: str = "high"


# ----- Helper Functions -----

def save_upload_file(upload_file: UploadFile, video_id: str) -> str:
    """Save uploaded file to temp storage"""
    ext = os.path.splitext(upload_file.filename or "video.mp4")[1]
    file_path = os.path.join(TEMP_DIR, f"{video_id}{ext}")
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    
    return file_path

def get_video_path(video_id: str) -> str:
    """Get video file path by ID"""
    for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
        path = os.path.join(TEMP_DIR, f"{video_id}{ext}")
        if os.path.exists(path):
            return path
    raise HTTPException(status_code=404, detail=f"Video not found: {video_id}")


# ----- API Endpoints -----

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "YTShortMaker Backend",
        "version": "1.0.0"
    }

@app.get("/status")
async def status():
    """Get backend status and capabilities"""
    return {
        "status": "running",
        "whisper_model": whisper_service.model_size,
        "whisper_loaded": whisper_service.model is not None,
        "ffmpeg_available": True,
        "temp_dir": TEMP_DIR
    }


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload video file untuk processing.
    Returns video_id untuk reference di endpoint lain.
    """
    video_id = str(uuid.uuid4())
    
    try:
        file_path = save_upload_file(file, video_id)
        video_info = ffmpeg_service.get_video_info(file_path)
        
        jobs[video_id] = {
            "status": "uploaded",
            "file_path": file_path,
            "original_name": file.filename,
            "info": video_info
        }
        
        return {
            "video_id": video_id,
            "filename": file.filename,
            "info": video_info
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe/{video_id}", response_model=TranscriptResponse)
async def transcribe_video(video_id: str, language: Optional[str] = None):
    """
    Transcribe video menggunakan Whisper.
    """
    try:
        file_path = get_video_path(video_id)
        result = whisper_service.transcribe(file_path, language=language)
        
        # Update job status
        if video_id in jobs:
            jobs[video_id]["transcript"] = result
            jobs[video_id]["status"] = "transcribed"
        
        # Convert to response model
        segments = [
            TranscriptSegmentModel(
                id=seg.id,
                start=seg.start,
                end=seg.end,
                text=seg.text,
                words=seg.words
            )
            for seg in result.segments
        ]
        
        return TranscriptResponse(
            text=result.text,
            language=result.language,
            duration=result.duration,
            segments=segments
        )
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect-highlights", response_model=HighlightResponse)
async def detect_highlights(request: HighlightRequest):
    """
    Detect highlights dari transcript (versi offline dengan keyword scoring).
    """
    try:
        # Set API key jika ada (untuk kompatibilitas)
        if request.api_key:
            highlight_service.set_api_key(request.api_key)
        
        result = highlight_service.detect_highlights(
            transcript_segments=request.segments,
            target_duration=request.target_duration,
            num_highlights=request.num_highlights,
            content_type=request.content_type
        )
        
        highlights = [
            HighlightSegmentModel(
                start=h.start,
                end=h.end,
                score=h.score,
                title=h.title,
                reason=h.reason,
                category=h.category
            )
            for h in result.highlights
        ]
        
        return HighlightResponse(
            highlights=highlights,
            summary=result.summary,
            total_duration=result.total_duration
        )
    except Exception as e:
        logger.error(f"Highlight detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cut")
async def cut_video(request: CutRequest):
    """
    Cut video segment dan optionally convert ke vertical (9:16).
    """
    try:
        input_path = get_video_path(request.video_id)
        output_id = str(uuid.uuid4())
        output_path = os.path.join(TEMP_DIR, f"{output_id}.mp4")
        
        # Cut video
        ffmpeg_service.cut_video(
            input_path=input_path,
            output_path=output_path,
            start_time=request.start_time,
            end_time=request.end_time
        )
        
        # Convert to vertical if requested
        if request.convert_vertical:
            vertical_path = os.path.join(TEMP_DIR, f"{output_id}_vertical.mp4")
            ffmpeg_service.convert_to_vertical(output_path, vertical_path)
            os.remove(output_path)
            output_path = vertical_path
            output_id = f"{output_id}_vertical"
        
        video_info = ffmpeg_service.get_video_info(output_path)
        
        jobs[output_id] = {
            "status": "cut",
            "file_path": output_path,
            "source_id": request.video_id,
            "info": video_info
        }
        
        return {
            "video_id": output_id,
            "info": video_info
        }
    except Exception as e:
        logger.error(f"Cut error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/add-captions")
async def add_captions(request: CaptionRequest):
    """
    Burn captions ke video.
    """
    try:
        input_path = get_video_path(request.video_id)
        output_id = str(uuid.uuid4())
        output_path = os.path.join(TEMP_DIR, f"{output_id}.mp4")
        
        # Convert caption models
        captions = [
            CaptionSegment(start=c.start, end=c.end, text=c.text)
            for c in request.captions
        ]
        
        style = CaptionStyle(
            font_name=request.style.font_name,
            font_size=request.style.font_size,
            font_color=request.style.font_color,
            outline_color=request.style.outline_color,
            outline_width=request.style.outline_width,
            background_color=request.style.background_color,
            position=request.style.position,
            margin_v=request.style.margin_v,
            bold=request.style.bold
        )
        
        ffmpeg_service.burn_captions(input_path, output_path, captions, style)
        
        video_info = ffmpeg_service.get_video_info(output_path)
        
        jobs[output_id] = {
            "status": "captioned",
            "file_path": output_path,
            "info": video_info
        }
        
        return {
            "video_id": output_id,
            "info": video_info
        }
    except Exception as e:
        logger.error(f"Caption error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/music-tracks")
async def get_music_tracks():
    """Get available built-in music tracks."""
    return {"tracks": MUSIC_TRACKS}


@app.post("/add-music")
async def add_music(
    request: Optional[MusicRequest] = None,
    video_id: str = Form(None),
    music_id: str = Form(None),
    music_file: UploadFile = File(None),
    music_volume: float = Form(0.3),
    original_volume: float = Form(1.0),
    fade_in: float = Form(1.0),
    fade_out: float = Form(2.0)
):
    """
    Add background music ke video.
    Bisa menggunakan built-in track atau custom upload.
    """
    try:
        # Handle both JSON and form data
        if request:
            video_id = request.video_id
            music_id = request.music_id
            music_volume = request.music_volume
            original_volume = request.original_volume
            fade_in = request.fade_in
            fade_out = request.fade_out
        
        input_path = get_video_path(video_id)
        output_id = str(uuid.uuid4())
        output_path = os.path.join(TEMP_DIR, f"{output_id}.mp4")
        
        # Get music file path
        music_path = None
        
        if music_file:
            # Custom uploaded music
            music_temp = os.path.join(TEMP_DIR, f"music_{uuid.uuid4()}{os.path.splitext(music_file.filename or '.mp3')[1]}")
            with open(music_temp, "wb") as f:
                shutil.copyfileobj(music_file.file, f)
            music_path = music_temp
        elif music_id:
            # Built-in track
            track = next((t for t in MUSIC_TRACKS if t["id"] == music_id), None)
            if not track:
                raise HTTPException(status_code=404, detail=f"Music track not found: {music_id}")
            music_path = os.path.join(os.path.dirname(__file__), "assets", "music", track["file"])
            
            # Check if file exists, if not create placeholder message
            if not os.path.exists(music_path):
                raise HTTPException(
                    status_code=404, 
                    detail=f"Music file not found. Please add {track['file']} to backend/assets/music/"
                )
        else:
            raise HTTPException(status_code=400, detail="Either music_id or music_file is required")
        
        ffmpeg_service.add_background_music(
            video_path=input_path,
            music_path=music_path,
            output_path=output_path,
            music_volume=music_volume,
            original_volume=original_volume,
            fade_in=fade_in,
            fade_out=fade_out
        )
        
        video_info = ffmpeg_service.get_video_info(output_path)
        
        jobs[output_id] = {
            "status": "music_added",
            "file_path": output_path,
            "info": video_info
        }
        
        return {
            "video_id": output_id,
            "info": video_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Music error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export")
async def export_short(request: ExportRequest):
    """
    Final export dengan optimized settings.
    """
    try:
        input_path = get_video_path(request.video_id)
        output_id = str(uuid.uuid4())
        output_path = os.path.join(TEMP_DIR, f"short_{output_id}.mp4")
        
        ffmpeg_service.export_short(
            input_path=input_path,
            output_path=output_path,
            resolution=request.resolution,
            quality=request.quality
        )
        
        video_info = ffmpeg_service.get_video_info(output_path)
        
        jobs[output_id] = {
            "status": "exported",
            "file_path": output_path,
            "info": video_info
        }
        
        return {
            "video_id": output_id,
            "info": video_info
        }
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{video_id}")
async def download_video(video_id: str):
    """Download processed video."""
    try:
        file_path = get_video_path(video_id)
        filename = f"short_{video_id[:8]}.mp4"
        return FileResponse(
            file_path,
            media_type="video/mp4",
            filename=filename
        )
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/preview/{video_id}")
async def preview_video(video_id: str):
    """Stream video for preview."""
    try:
        file_path = get_video_path(video_id)
        return FileResponse(file_path, media_type="video/mp4")
    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/video/{video_id}")
async def delete_video(video_id: str):
    """Delete video file."""
    try:
        file_path = get_video_path(video_id)
        os.remove(file_path)
        if video_id in jobs:
            del jobs[video_id]
        return {"status": "deleted", "video_id": video_id}
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("shutdown")
async def cleanup():
    """Cleanup temp files on shutdown"""
    try:
        shutil.rmtree(TEMP_DIR)
        logger.info("Temp directory cleaned up")
    except Exception as e:
        logger.error(f"Cleanup error: {e}")


# ----- Run Server -----

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🎬 YTShortMaker Backend Starting...")
    print("="*60)
    print(f"📁 Temp directory: {TEMP_DIR}")
    print(f"🎤 Whisper model: {whisper_service.model_size}")
    print("="*60)
    print("🌐 Server running at: http://localhost:8000")
    print("📖 API Docs: http://localhost:8000/docs")
    print("="*60 + "\n")
    
    # Gunakan string import untuk enable reload, atau disable reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

