"""
Social Media Downloader Backend
FastAPI server untuk download video/gambar dari berbagai platform sosial media.
Menggunakan yt-dlp untuk mendukung: YouTube, Instagram, TikTok, Twitter/X, Facebook, Pinterest, Threads
"""

import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import yt_dlp

# ===================== CONFIG =====================

DOWNLOAD_DIR = Path(__file__).parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Platform icons untuk deteksi
PLATFORM_PATTERNS = {
    "youtube": ["youtube.com", "youtu.be"],
    "instagram": ["instagram.com", "instagr.am"],
    "tiktok": ["tiktok.com", "vm.tiktok.com"],
    "twitter": ["twitter.com", "x.com", "t.co"],
    "facebook": ["facebook.com", "fb.watch", "fb.com"],
    "pinterest": ["pinterest.com", "pin.it"],
    "threads": ["threads.net"],
}

# ===================== APP =====================

app = FastAPI(
    title="Social Media Downloader API",
    description="Download video/gambar dari berbagai platform sosial media",
    version="1.0.0"
)

# CORS untuk frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dalam produksi, batasi ke domain spesifik
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== MODELS =====================

class MediaInfoRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    format: Optional[str] = "best"  # best, audio, video_only
    quality: Optional[str] = "1080"  # 360, 480, 720, 1080, 4k

class MediaInfo(BaseModel):
    id: str
    url: str
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    platform: str
    uploader: Optional[str] = None
    upload_date: Optional[str] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    formats: list = []
    is_video: bool = True

class DownloadProgress(BaseModel):
    task_id: str
    status: str  # pending, downloading, processing, completed, error
    progress: float  # 0-100
    filename: Optional[str] = None
    error: Optional[str] = None
    speed: Optional[str] = None
    eta: Optional[str] = None

# ===================== STATE =====================

# Track download progress
download_tasks: Dict[str, DownloadProgress] = {}

# ===================== HELPERS =====================

def detect_platform(url: str) -> str:
    """Deteksi platform dari URL"""
    url_lower = url.lower()
    for platform, patterns in PLATFORM_PATTERNS.items():
        for pattern in patterns:
            if pattern in url_lower:
                return platform
    return "unknown"

def format_duration(seconds: Optional[float]) -> str:
    """Format durasi ke MM:SS atau HH:MM:SS"""
    if not seconds:
        return "N/A"
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"

def get_yt_dlp_opts(format_type: str = "best", quality: str = "1080") -> dict:
    """Build yt-dlp options berdasarkan format dan kualitas"""
    
    base_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "geo_bypass": True,
        "nocheckcertificate": True,
    }
    
    if format_type == "audio":
        base_opts.update({
            "format": "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
        })
    elif format_type == "video_only":
        height = {"360": 360, "480": 480, "720": 720, "1080": 1080, "4k": 2160}.get(quality, 1080)
        base_opts["format"] = f"bestvideo[height<={height}]"
    else:  # best (video + audio)
        height = {"360": 360, "480": 480, "720": 720, "1080": 1080, "4k": 2160}.get(quality, 1080)
        base_opts["format"] = f"bestvideo[height<={height}]+bestaudio/best[height<={height}]/best"
        base_opts["merge_output_format"] = "mp4"
    
    return base_opts

def progress_hook(task_id: str):
    """Create progress hook untuk tracking download"""
    def hook(d):
        if task_id not in download_tasks:
            return
            
        if d["status"] == "downloading":
            # Parse progress
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            
            if total > 0:
                progress = (downloaded / total) * 100
            else:
                progress = 0
            
            download_tasks[task_id].status = "downloading"
            download_tasks[task_id].progress = round(progress, 1)
            download_tasks[task_id].speed = d.get("_speed_str", "N/A")
            download_tasks[task_id].eta = d.get("_eta_str", "N/A")
            
        elif d["status"] == "finished":
            download_tasks[task_id].status = "processing"
            download_tasks[task_id].progress = 95
            download_tasks[task_id].filename = d.get("filename", "")
            
    return hook

async def download_media_async(task_id: str, url: str, format_type: str, quality: str):
    """Background task untuk download media"""
    try:
        download_tasks[task_id].status = "downloading"
        
        opts = get_yt_dlp_opts(format_type, quality)
        opts["outtmpl"] = str(DOWNLOAD_DIR / f"{task_id}_%(title).50s.%(ext)s")
        opts["progress_hooks"] = [progress_hook(task_id)]
        
        # Run yt-dlp di thread terpisah
        loop = asyncio.get_event_loop()
        
        def do_download():
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])
        
        await loop.run_in_executor(None, do_download)
        
        # Find downloaded file
        for f in DOWNLOAD_DIR.glob(f"{task_id}_*"):
            download_tasks[task_id].filename = f.name
            break
        
        download_tasks[task_id].status = "completed"
        download_tasks[task_id].progress = 100
        
    except Exception as e:
        download_tasks[task_id].status = "error"
        download_tasks[task_id].error = str(e)

# ===================== ENDPOINTS =====================

@app.get("/status")
async def get_status():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Social Media Downloader",
        "version": "1.0.0",
        "supported_platforms": list(PLATFORM_PATTERNS.keys()),
        "yt_dlp_version": yt_dlp.version.__version__,
    }

@app.post("/info", response_model=MediaInfo)
async def get_media_info(request: MediaInfoRequest):
    """Ekstrak informasi media dari URL tanpa download"""
    try:
        platform = detect_platform(request.url)
        
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "geo_bypass": True,
            "nocheckcertificate": True,
            "skip_download": True,
        }
        
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
        
        if not info:
            raise HTTPException(status_code=404, detail="Media tidak ditemukan")
        
        # Extract available formats
        formats = []
        if "formats" in info:
            seen_heights = set()
            for f in info["formats"]:
                height = f.get("height")
                if height and height not in seen_heights and f.get("vcodec") != "none":
                    seen_heights.add(height)
                    formats.append({
                        "quality": f"{height}p",
                        "ext": f.get("ext", "mp4"),
                        "filesize": f.get("filesize") or f.get("filesize_approx"),
                    })
            formats.sort(key=lambda x: int(x["quality"].replace("p", "")), reverse=True)
        
        # Check if it's video or image
        is_video = info.get("duration") is not None and info.get("duration", 0) > 0
        
        return MediaInfo(
            id=info.get("id", str(uuid.uuid4())),
            url=request.url,
            title=info.get("title", "Untitled"),
            description=info.get("description"),
            thumbnail=info.get("thumbnail"),
            duration=info.get("duration"),
            platform=platform,
            uploader=info.get("uploader") or info.get("channel"),
            upload_date=info.get("upload_date"),
            view_count=info.get("view_count"),
            like_count=info.get("like_count"),
            formats=formats[:5],  # Top 5 formats
            is_video=is_video,
        )
        
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(status_code=400, detail=f"Gagal mengambil info: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/download")
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Mulai download media (background task)"""
    task_id = str(uuid.uuid4())[:8]
    
    # Initialize progress tracker
    download_tasks[task_id] = DownloadProgress(
        task_id=task_id,
        status="pending",
        progress=0
    )
    
    # Start background download
    background_tasks.add_task(
        download_media_async,
        task_id,
        request.url,
        request.format,
        request.quality
    )
    
    return {"task_id": task_id, "message": "Download dimulai"}

@app.get("/progress/{task_id}")
async def get_progress(task_id: str):
    """Cek progress download"""
    if task_id not in download_tasks:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")
    return download_tasks[task_id]

@app.get("/file/{filename}")
async def get_file(filename: str):
    """Download file hasil"""
    file_path = DOWNLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@app.delete("/file/{filename}")
async def delete_file(filename: str):
    """Hapus file hasil download"""
    file_path = DOWNLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()
        return {"message": "File dihapus"}
    raise HTTPException(status_code=404, detail="File tidak ditemukan")

@app.get("/files")
async def list_files():
    """List semua file yang sudah didownload"""
    files = []
    for f in DOWNLOAD_DIR.glob("*"):
        if f.is_file():
            stat = f.stat()
            files.append({
                "filename": f.name,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            })
    return {"files": files}

@app.delete("/files")
async def clear_files():
    """Hapus semua file download"""
    count = 0
    for f in DOWNLOAD_DIR.glob("*"):
        if f.is_file():
            f.unlink()
            count += 1
    return {"message": f"{count} file dihapus"}

# ===================== MAIN =====================

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  Social Media Downloader Backend")
    print("=" * 50)
    print(f"  yt-dlp version: {yt_dlp.version.__version__}")
    print(f"  Download dir: {DOWNLOAD_DIR}")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
