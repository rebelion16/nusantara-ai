"""
Social Media Downloader Backend
Download video/gambar dari Instagram, TikTok, YouTube, Twitter, dll.
Berjalan di port 8001 dengan Cloudflare Tunnel
"""

import os
import uuid
import asyncio
import hashlib
import json
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import yt_dlp


# ===================== CONFIG =====================

DOWNLOAD_DIR = Path(__file__).parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

PLATFORM_PATTERNS = {
    "youtube": ["youtube.com", "youtu.be"],
    "instagram": ["instagram.com", "instagr.am"],
    "tiktok": ["tiktok.com", "vm.tiktok.com"],
    "twitter": ["twitter.com", "x.com", "t.co"],
    "facebook": ["facebook.com", "fb.watch", "fb.com"],
    "pinterest": ["pinterest.com", "pin.it"],
}

# ===================== APP =====================

app = FastAPI(
    title="Social Media Downloader API",
    description="Download video/gambar dari berbagai platform sosial media",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== MODELS =====================

class MediaInfoRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    format: Optional[str] = "best"
    quality: Optional[str] = "1080"

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
    status: str
    progress: float
    filename: Optional[str] = None
    error: Optional[str] = None
    speed: Optional[str] = None
    eta: Optional[str] = None

# ===================== STATE =====================

download_tasks: Dict[str, DownloadProgress] = {}

# ===================== CACHE =====================

CACHE_FILE = Path(__file__).parent / "download_cache.json"

def load_cache() -> Dict[str, dict]:
    """Load URL -> file mapping from cache"""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r") as f:
                cache = json.load(f)
                # Validate cached files still exist
                valid_cache = {}
                for key, info in cache.items():
                    if Path(DOWNLOAD_DIR / info.get("filename", "")).exists():
                        valid_cache[key] = info
                return valid_cache
        except:
            pass
    return {}

def save_cache(cache: Dict):
    """Save cache to file"""
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"[WARNING] Failed to save cache: {e}")

def get_url_hash(url: str) -> str:
    """Generate hash key from URL"""
    # Normalize URL (remove trailing slashes, etc)
    normalized = url.strip().rstrip("/")
    return hashlib.md5(normalized.encode()).hexdigest()[:12]

download_cache: Dict[str, dict] = load_cache()

# ===================== HELPERS =====================


def detect_platform(url: str) -> str:
    url_lower = url.lower()
    for platform, patterns in PLATFORM_PATTERNS.items():
        for pattern in patterns:
            if pattern in url_lower:
                return platform
    return "unknown"

def get_yt_dlp_opts(format_type: str = "best", quality: str = "1080", platform: str = "unknown") -> dict:
    base_opts = {
        "quiet": True,
        "no_warnings": True,
        "geo_bypass": True,
        "nocheckcertificate": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android"],
                "player_skip": ["webpage", "configs"],
            },
        },
        "http_headers": {
            "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
        },
    }
    
    if platform == "youtube":
        base_opts["format"] = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    elif platform == "tiktok":
        base_opts["format"] = "best"
        base_opts["extractor_args"] = {}
        base_opts["http_headers"] = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    elif platform in ["pinterest", "facebook", "instagram", "threads", "twitter"]:
        # Pinterest/FB/IG/Twitter often have HLS streams or single files
        # Using simple 'best' is safer than requiring specific codecs
        base_opts["format"] = "best[ext=mp4]/best"
    elif format_type == "audio":
        base_opts["format"] = "bestaudio/best"
        base_opts["postprocessors"] = [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3"}]
    else:
        height = {"360": 360, "480": 480, "720": 720, "1080": 1080, "4k": 2160}.get(quality, 1080)
        # Add fallback to simple 'best' at the end
        base_opts["format"] = f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/best[height<={height}]/best"
        base_opts["merge_output_format"] = "mp4"
    
    return base_opts


def progress_hook(task_id: str):
    def hook(d):
        if task_id not in download_tasks:
            return
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            progress = (downloaded / total * 100) if total > 0 else 0
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
    global download_cache
    try:
        download_tasks[task_id].status = "downloading"
        platform = detect_platform(url)
        
        # Base options
        base_opts = {
            "quiet": True,
            "no_warnings": True,
            "geo_bypass": True,
            "nocheckcertificate": True,
            "outtmpl": str(DOWNLOAD_DIR / f"{task_id}_%(title).50s.%(ext)s"),
            "progress_hooks": [progress_hook(task_id)],
            "merge_output_format": "mp4",
        }
        
        # Define strategies
        strategies = []
        
        # Default strategy
        default_opts = base_opts.copy()
        default_opts.update(get_yt_dlp_opts(format_type, quality, platform))
        strategies.append(("default", default_opts))
        
        # Cookies strategy (Edge)
        edge_opts = default_opts.copy()
        edge_opts["cookiesfrombrowser"] = ("edge",)
        strategies.append(("cookies_edge", edge_opts))
        
        # Cookies strategy (Chrome)
        chrome_opts = default_opts.copy()
        chrome_opts["cookiesfrombrowser"] = ("chrome",)
        strategies.append(("cookies_chrome", chrome_opts))
        
        # Mobile User-Agent strategy
        mobile_opts = default_opts.copy()
        mobile_opts["http_headers"] = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
        }
        strategies.append(("mobile_ua", mobile_opts))

        # FB/Threads specific: Android Client
        if platform in ["facebook", "threads", "instagram"]:
             android_opts = default_opts.copy()
             android_opts["extractor_args"] = {"instagram": {"player_client": ["android"]}}
             strategies.append(("android_client", android_opts))

        loop = asyncio.get_event_loop()
        success = False
        last_error = None
        
        for name, opts in strategies:
            try:
                print(f"[INFO] Task {task_id}: Trying strategy '{name}' for {platform}...")
                
                def do_download():
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        ydl.download([url])
                        
                await loop.run_in_executor(None, do_download)
                success = True
                print(f"[INFO] Task {task_id}: Success using strategy '{name}'")
                break
            except Exception as e:
                print(f"[WARNING] Task {task_id}: Strategy '{name}' failed: {e}")
                last_error = str(e)
                continue
        
        if not success:
            raise Exception(f"Download failed with all strategies. Last error: {last_error}")
        
        # Post-download processing (find file, cache, update status)
        found_file = False
        for f in DOWNLOAD_DIR.glob(f"{task_id}_*"):
            download_tasks[task_id].filename = f.name
            
            # Save to cache
            url_hash = get_url_hash(url)
            download_cache[url_hash] = {
                "url": url,
                "filename": f.name,
                "task_id": task_id,
                "platform": platform,
                "created_at": datetime.now().isoformat()
            }
            save_cache(download_cache)
            found_file = True
            break
            
        if not found_file:
             raise Exception("File downloaded but not found on disk")

        download_tasks[task_id].status = "completed"
        download_tasks[task_id].progress = 100
    except Exception as e:
        download_tasks[task_id].status = "error"
        download_tasks[task_id].error = str(e)



# ===================== ENDPOINTS =====================

@app.get("/status")
async def get_status():
    return {
        "status": "online",
        "service": "Social Media Downloader",
        "version": "1.0.0",
        "supported_platforms": list(PLATFORM_PATTERNS.keys()),
        "yt_dlp_version": yt_dlp.version.__version__,
    }

@app.post("/info", response_model=MediaInfo)
async def get_media_info(request: MediaInfoRequest):
    platform = detect_platform(request.url)
    base_opts = get_yt_dlp_opts("best", "1080", platform)
    base_opts["skip_download"] = True
    
    # Strategy list for extracting info
    strategies = [
        ("default", base_opts.copy()),
    ]
    
    # Add cookies strategies for problematic platforms
    if platform in ["twitter", "facebook", "instagram", "threads"]:
        edge_opts = base_opts.copy()
        edge_opts["cookiesfrombrowser"] = ("edge",)
        strategies.append(("cookies_edge", edge_opts))
        
        chrome_opts = base_opts.copy()
        chrome_opts["cookiesfrombrowser"] = ("chrome",)
        strategies.append(("cookies_chrome", chrome_opts))
    
    last_error = None
    info = None
    
    for name, opts in strategies:
        try:
            print(f"[INFO] Fetching info with strategy '{name}' for {platform}...")
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(request.url, download=False)
            if info:
                print(f"[INFO] Success with strategy '{name}'")
                break
        except Exception as e:
            last_error = str(e)
            print(f"[WARNING] Strategy '{name}' failed: {last_error[:100]}")
            continue
    
    if not info:
        raise HTTPException(status_code=400, detail=f"Gagal mengambil info: {last_error or 'Unknown error'}")
    
    formats = []
    if "formats" in info:
        seen = set()
        for f in info["formats"]:
            h = f.get("height")
            if h and h not in seen and f.get("vcodec") != "none":
                seen.add(h)
                formats.append({"quality": f"{h}p", "ext": f.get("ext", "mp4")})
        formats.sort(key=lambda x: int(x["quality"].replace("p", "")), reverse=True)
    
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
        formats=formats[:5],
        is_video=bool(info.get("duration")),
    )


@app.post("/download")
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    global download_cache
    
    # Check cache first
    url_hash = get_url_hash(request.url)
    if url_hash in download_cache:
        cached = download_cache[url_hash]
        cached_file = DOWNLOAD_DIR / cached["filename"]
        if cached_file.exists():
            # Return cached result immediately
            print(f"[CACHE HIT] {request.url[:50]}... -> {cached['filename']}")
            return {
                "task_id": cached.get("task_id", "cached"),
                "message": "File sudah ada di cache",
                "cached": True,
                "filename": cached["filename"],
                "status": "completed",
                "progress": 100
            }
    
    # Not in cache, start new download
    task_id = str(uuid.uuid4())[:8]
    download_tasks[task_id] = DownloadProgress(task_id=task_id, status="pending", progress=0)
    background_tasks.add_task(download_media_async, task_id, request.url, request.format, request.quality)
    return {"task_id": task_id, "message": "Download dimulai", "cached": False}


@app.get("/progress/{task_id}")
async def get_progress(task_id: str):
    if task_id not in download_tasks:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")
    return download_tasks[task_id]

@app.get("/file/{filename}")
async def get_file(filename: str):
    fp = DOWNLOAD_DIR / filename
    if not fp.exists():
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    
    file_size = fp.stat().st_size
    
    # Generate ETag for browser caching
    etag = f"\"{fp.stat().st_mtime}-{file_size}\""
    
    # Streaming for large files (>10MB)
    def iterfile():
        with open(fp, "rb") as f:
            while chunk := f.read(1024 * 1024):  # 1MB chunks
                yield chunk
    
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Length": str(file_size),
        "ETag": etag,
        "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
        "Accept-Ranges": "bytes",
    }
    
    return StreamingResponse(
        iterfile(),
        media_type="application/octet-stream",
        headers=headers
    )

@app.delete("/file/{filename}")
async def delete_file(filename: str):
    fp = DOWNLOAD_DIR / filename
    if fp.exists():
        fp.unlink()
        return {"message": "File dihapus"}
    raise HTTPException(status_code=404, detail="File tidak ditemukan")

@app.get("/files")
async def list_files():
    files = []
    for f in DOWNLOAD_DIR.glob("*"):
        if f.is_file():
            files.append({"filename": f.name, "size": f.stat().st_size, "created": datetime.fromtimestamp(f.stat().st_ctime).isoformat()})
    return {"files": files}

@app.delete("/files")
async def clear_files():
    count = 0
    for f in DOWNLOAD_DIR.glob("*"):
        if f.is_file():
            f.unlink()
            count += 1
    return {"message": f"{count} file dihapus"}

@app.get("/cache")
async def list_cache():
    """List semua URL yang ter-cache"""
    return {
        "count": len(download_cache),
        "items": [
            {
                "hash": k,
                "url": v.get("url", ""),
                "filename": v.get("filename", ""),
                "platform": v.get("platform", ""),
                "created_at": v.get("created_at", "")
            }
            for k, v in download_cache.items()
        ]
    }

@app.delete("/cache")
async def clear_cache():
    """Hapus semua cache (file tetap ada)"""
    global download_cache
    count = len(download_cache)
    download_cache = {}
    save_cache(download_cache)
    return {"message": f"{count} cache entries dihapus"}

@app.delete("/cache/{url_hash}")
async def delete_cache_entry(url_hash: str):
    """Hapus satu entry dari cache"""
    global download_cache
    if url_hash in download_cache:
        del download_cache[url_hash]
        save_cache(download_cache)
        return {"message": "Cache entry dihapus"}
    raise HTTPException(status_code=404, detail="Cache entry tidak ditemukan")

# ===================== MAIN =====================


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  Social Media Downloader Backend")
    print("=" * 50)
    print(f"  yt-dlp: {yt_dlp.version.__version__}")
    print(f"  Port: 8001")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8001)
