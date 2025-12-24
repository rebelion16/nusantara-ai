"""
YT Short Maker Backend
Video processing untuk membuat YouTube Shorts
Berjalan di port 8000 (lokal)
"""

import os
import uuid
import subprocess
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp

# ===================== CONFIG =====================

BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "output"

for d in [UPLOAD_DIR, OUTPUT_DIR]:
    d.mkdir(exist_ok=True)

FFMPEG_PATH = r"C:\ffmpeg\bin\ffmpeg.exe"
FFPROBE_PATH = r"C:\ffmpeg\bin\ffprobe.exe"

# ===================== APP =====================

app = FastAPI(
    title="YT Short Maker API",
    description="Backend untuk membuat YouTube Shorts dari video panjang",
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

class YouTubeDownloadRequest(BaseModel):
    url: str
    max_height: Optional[int] = 1080

class CutRequest(BaseModel):
    video_id: str
    start_time: float
    end_time: float
    convert_vertical: Optional[bool] = True

class CaptionSegment(BaseModel):
    start: float
    end: float
    text: str

class CaptionStyle(BaseModel):
    font_name: str = "Arial"
    font_size: int = 48
    font_color: str = "white"
    outline_color: str = "black"
    outline_width: int = 3
    position: str = "bottom"
    margin_v: int = 80
    bold: bool = True

class AddCaptionsRequest(BaseModel):
    video_id: str
    captions: List[CaptionSegment]
    style: CaptionStyle

class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str

class DetectHighlightsRequest(BaseModel):
    segments: List[TranscriptSegment]
    target_duration: Optional[int] = 60
    num_highlights: Optional[int] = 5

class ExportRequest(BaseModel):
    video_id: str
    resolution: Optional[str] = "1080p"
    quality: Optional[str] = "high"

# ===================== STATE =====================

video_store: Dict[str, Dict[str, Any]] = {}
yt_progress: Dict[str, Any] = {
    "percent": 0,
    "downloaded": "0 B",
    "total": "0 B",
    "speed": "-- KB/s",
    "eta": "--:--",
    "status": "idle",
    "filename": ""
}

# ===================== HELPERS =====================

def get_video_info(filepath: Path) -> Dict[str, Any]:
    try:
        cmd = [FFPROBE_PATH, "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", str(filepath)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(result.stdout)
        
        video_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "video"), {})
        audio_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "audio"), {})
        fmt = data.get("format", {})
        
        fps_str = video_stream.get("r_frame_rate", "30/1")
        try:
            fps = eval(fps_str) if "/" in fps_str else float(fps_str)
        except:
            fps = 30
        
        return {
            "duration": float(fmt.get("duration", 0)),
            "width": int(video_stream.get("width", 0)),
            "height": int(video_stream.get("height", 0)),
            "fps": fps,
            "format": fmt.get("format_name", ""),
            "size": int(fmt.get("size", 0)),
            "video_codec": video_stream.get("codec_name"),
            "audio_codec": audio_stream.get("codec_name"),
        }
    except Exception as e:
        return {"error": str(e)}

def yt_progress_hook(d):
    global yt_progress
    if d["status"] == "downloading":
        yt_progress["status"] = "downloading"
        yt_progress["percent"] = d.get("_percent_str", "0%").strip().replace("%", "")
        yt_progress["downloaded"] = d.get("_downloaded_bytes_str", "0 B")
        yt_progress["total"] = d.get("_total_bytes_str", "0 B")
        yt_progress["speed"] = d.get("_speed_str", "-- KB/s")
        yt_progress["eta"] = d.get("_eta_str", "--:--")
    elif d["status"] == "finished":
        yt_progress["status"] = "finished"
        yt_progress["percent"] = 100
        yt_progress["filename"] = d.get("filename", "")

# ===================== ENDPOINTS =====================

@app.get("/status")
async def get_status():
    ffmpeg_ok = subprocess.run([FFMPEG_PATH, "-version"], capture_output=True).returncode == 0
    return {
        "status": "online",
        "service": "YT Short Maker",
        "version": "1.0.0",
        "ffmpeg_available": ffmpeg_ok,
        "whisper_loaded": False,
        "yt_dlp_version": yt_dlp.version.__version__,
    }

@app.post("/youtube/info")
async def youtube_info(request: YouTubeDownloadRequest):
    try:
        opts = {"quiet": True, "skip_download": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
        return {
            "id": info.get("id"),
            "title": info.get("title"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "channel": info.get("channel") or info.get("uploader"),
            "view_count": info.get("view_count"),
            "upload_date": info.get("upload_date"),
            "description": info.get("description", "")[:500],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/youtube/download")
async def youtube_download(request: YouTubeDownloadRequest):
    global yt_progress
    yt_progress = {"percent": 0, "status": "downloading", "filename": ""}
    
    video_id = str(uuid.uuid4())[:8]
    opts = {
        "format": f"bestvideo[height<={request.max_height}]+bestaudio/best",
        "outtmpl": str(UPLOAD_DIR / f"{video_id}_%(title).50s.%(ext)s"),
        "merge_output_format": "mp4",
        "progress_hooks": [yt_progress_hook],
        "extractor_args": {"youtube": {"player_client": ["ios", "android"]}},
    }
    
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(request.url, download=True)
        
        for f in UPLOAD_DIR.glob(f"{video_id}_*"):
            video_store[video_id] = {"path": str(f), "info": get_video_info(f)}
            return {
                "video_id": video_id,
                "youtube_id": info.get("id"),
                "title": info.get("title"),
                "channel": info.get("channel"),
                "thumbnail": info.get("thumbnail"),
                "info": video_store[video_id]["info"],
            }
        raise HTTPException(status_code=500, detail="Download gagal")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/youtube/progress")
async def youtube_progress():
    return yt_progress

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    video_id = str(uuid.uuid4())[:8]
    ext = Path(file.filename).suffix or ".mp4"
    filepath = UPLOAD_DIR / f"{video_id}{ext}"
    
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    info = get_video_info(filepath)
    video_store[video_id] = {"path": str(filepath), "info": info}
    
    return {"video_id": video_id, "filename": file.filename, "info": info}

@app.post("/transcribe/{video_id}")
async def transcribe_video(video_id: str, language: Optional[str] = None):
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    return {
        "text": "Transcription requires Whisper. Install: pip install openai-whisper",
        "language": language or "id",
        "duration": video_store[video_id]["info"].get("duration", 0),
        "segments": []
    }

@app.post("/detect-highlights")
async def detect_highlights(request: DetectHighlightsRequest):
    keywords = {
        "funny": ["haha", "lucu", "wkwk", "lol"],
        "important": ["penting", "harus", "wajib"],
        "excited": ["wow", "gila", "keren", "amazing"],
    }
    
    highlights = []
    for seg in request.segments:
        text_lower = seg.text.lower()
        score = sum(1 for words in keywords.values() for w in words if w in text_lower)
        if score > 0:
            highlights.append({
                "start": seg.start, "end": seg.end, "score": min(score * 20 + 50, 100),
                "title": seg.text[:50], "reason": "Keyword match", "category": "general"
            })
    
    return {
        "highlights": highlights[:request.num_highlights],
        "summary": "Highlights from keyword analysis",
        "total_duration": sum(h["end"] - h["start"] for h in highlights[:request.num_highlights]),
    }

@app.post("/cut")
async def cut_video(request: CutRequest):
    if request.video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    
    input_path = video_store[request.video_id]["path"]
    output_id = str(uuid.uuid4())[:8]
    output_path = OUTPUT_DIR / f"{output_id}_cut.mp4"
    
    cmd = [FFMPEG_PATH, "-y", "-ss", str(request.start_time), "-i", input_path,
           "-t", str(request.end_time - request.start_time), "-c:v", "libx264", "-c:a", "aac"]
    
    if request.convert_vertical:
        cmd.extend(["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"])
    
    cmd.append(str(output_path))
    subprocess.run(cmd, capture_output=True)
    
    info = get_video_info(output_path)
    video_store[output_id] = {"path": str(output_path), "info": info}
    return {"video_id": output_id, "info": info}

@app.post("/add-captions")
async def add_captions(request: AddCaptionsRequest):
    if request.video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    
    input_path = video_store[request.video_id]["path"]
    output_id = str(uuid.uuid4())[:8]
    output_path = OUTPUT_DIR / f"{output_id}_captioned.mp4"
    ass_path = OUTPUT_DIR / f"{output_id}.ass"
    
    style = request.style
    ass = f"""[Script Info]
ScriptType: v4.00+
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, Bold, Alignment, MarginV
Style: Default,{style.font_name},{style.font_size},&H00FFFFFF,{1 if style.bold else 0},2,{style.margin_v}
[Events]
Format: Layer, Start, End, Style, Text
"""
    for c in request.captions:
        ass += f"Dialogue: 0,0:{int(c.start//60):02d}:{c.start%60:05.2f},0:{int(c.end//60):02d}:{c.end%60:05.2f},Default,{c.text}\n"
    
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass)
    
    subprocess.run([FFMPEG_PATH, "-y", "-i", input_path, "-vf", f"ass={ass_path}", "-c:a", "copy", str(output_path)], capture_output=True)
    
    info = get_video_info(output_path)
    video_store[output_id] = {"path": str(output_path), "info": info}
    return {"video_id": output_id, "info": info}

@app.get("/music-tracks")
async def get_music_tracks():
    return {"tracks": []}

@app.post("/add-music")
async def add_music():
    return {"message": "Music feature coming soon"}

@app.post("/export")
async def export_video(request: ExportRequest):
    if request.video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    
    input_path = video_store[request.video_id]["path"]
    output_id = str(uuid.uuid4())[:8]
    output_path = OUTPUT_DIR / f"{output_id}_final.mp4"
    
    res = {"720p": "1280:720", "1080p": "1920:1080"}.get(request.resolution, "1920:1080")
    crf = {"low": "28", "medium": "23", "high": "18"}.get(request.quality, "18")
    
    subprocess.run([FFMPEG_PATH, "-y", "-i", input_path, "-vf", f"scale={res}:force_original_aspect_ratio=decrease",
                    "-c:v", "libx264", "-crf", crf, "-c:a", "aac", str(output_path)], capture_output=True)
    
    info = get_video_info(output_path)
    video_store[output_id] = {"path": str(output_path), "info": info}
    return {"video_id": output_id, "info": info}

@app.get("/preview/{video_id}")
async def preview_video(video_id: str):
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    return FileResponse(video_store[video_id]["path"], media_type="video/mp4")

@app.get("/download/{video_id}")
async def download_video(video_id: str):
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video tidak ditemukan")
    path = video_store[video_id]["path"]
    return FileResponse(path, filename=Path(path).name, media_type="application/octet-stream")

@app.delete("/video/{video_id}")
async def delete_video(video_id: str):
    if video_id in video_store:
        Path(video_store[video_id]["path"]).unlink(missing_ok=True)
        del video_store[video_id]
        return {"message": "Video dihapus"}
    raise HTTPException(status_code=404, detail="Video tidak ditemukan")

# ===================== MAIN =====================

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  YT Short Maker Backend")
    print("=" * 50)
    print(f"  FFmpeg: {FFMPEG_PATH}")
    print(f"  yt-dlp: {yt_dlp.version.__version__}")
    print(f"  Port: 8000")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
