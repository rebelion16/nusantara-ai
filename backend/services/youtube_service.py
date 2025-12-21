"""
YouTube Download Service
Menggunakan yt-dlp untuk download video dari YouTube.
Includes file logging and download progress tracking.
"""

import yt_dlp
import os
import tempfile
import uuid
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass
from datetime import datetime
import logging
import re

# Setup file logging
LOG_DIR = os.path.join(tempfile.gettempdir(), "ytshortmaker", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, f"youtube_download_{datetime.now().strftime('%Y%m%d')}.log")

# Configure logging with both console and file handlers
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# File handler - detailed logs
file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
file_handler.setFormatter(file_formatter)

# Console handler - info level
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter('[%(levelname)s] %(message)s')
console_handler.setFormatter(console_formatter)

# Add handlers if not already added
if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)


@dataclass
class DownloadProgress:
    """Download progress information"""
    percent: float
    downloaded_bytes: int
    total_bytes: int
    speed: str
    eta: str
    status: str
    filename: str


@dataclass
class YouTubeVideoInfo:
    """Info video YouTube"""
    id: str
    title: str
    duration: float
    thumbnail: str
    channel: str
    view_count: int
    upload_date: str
    description: str


class YouTubeService:
    """Service untuk download video dari YouTube menggunakan yt-dlp"""
    
    # Store current download progress for API access
    current_progress: Optional[DownloadProgress] = None
    
    def __init__(self, download_dir: Optional[str] = None):
        """
        Initialize YouTube service.
        
        Args:
            download_dir: Directory untuk menyimpan video yang didownload
        """
        self.download_dir = download_dir or os.path.join(tempfile.gettempdir(), "ytshortmaker")
        os.makedirs(self.download_dir, exist_ok=True)
        logger.info(f"YouTubeService initialized. Download dir: {self.download_dir}")
        logger.info(f"Log file: {LOG_FILE}")
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extract video ID dari berbagai format YouTube URL.
        
        Supports:
        - https://www.youtube.com/watch?v=VIDEO_ID
        - https://youtu.be/VIDEO_ID
        - https://www.youtube.com/embed/VIDEO_ID
        - https://www.youtube.com/v/VIDEO_ID
        - https://www.youtube.com/shorts/VIDEO_ID
        """
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'  # Direct video ID
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def get_video_info(self, url: str) -> YouTubeVideoInfo:
        """
        Get info video tanpa download.
        
        Args:
            url: YouTube URL atau video ID
            
        Returns:
            YouTubeVideoInfo
        """
        video_id = self.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL")
        
        logger.debug(f"Getting video info for: {video_id}")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                
                video_info = YouTubeVideoInfo(
                    id=info.get('id', video_id),
                    title=info.get('title', 'Unknown'),
                    duration=float(info.get('duration', 0)),
                    thumbnail=info.get('thumbnail', ''),
                    channel=info.get('channel', info.get('uploader', 'Unknown')),
                    view_count=int(info.get('view_count', 0)),
                    upload_date=info.get('upload_date', ''),
                    description=info.get('description', '')[:500]  # Truncate description
                )
                
                logger.info(f"Video info: {video_info.title} ({video_info.duration:.0f}s)")
                logger.debug(f"Channel: {video_info.channel}, Views: {video_info.view_count}")
                
                return video_info
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            raise ValueError(f"Failed to get video info: {str(e)}")
    
    def _format_bytes(self, bytes_num: int) -> str:
        """Format bytes to human readable string"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_num < 1024:
                return f"{bytes_num:.1f} {unit}"
            bytes_num /= 1024
        return f"{bytes_num:.1f} TB"
    
    def download_video(
        self,
        url: str,
        max_height: int = 1080,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Dict[str, Any]:
        """
        Download video dari YouTube.
        
        Args:
            url: YouTube URL atau video ID
            max_height: Maximum video height (default 1080p)
            progress_callback: Optional callback untuk progress update
            
        Returns:
            Dict dengan file_path dan video info
        """
        video_id = self.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL")
        
        # Generate unique filename
        output_id = str(uuid.uuid4())
        output_template = os.path.join(self.download_dir, f"{output_id}.%(ext)s")
        
        logger.info("=" * 60)
        logger.info(f"[DOWNLOAD START] Video ID: {video_id}")
        logger.info(f"Output ID: {output_id}")
        logger.info(f"Max Height: {max_height}p")
        logger.info("=" * 60)
        
        start_time = datetime.now()
        
        def progress_hook(d):
            if d['status'] == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                downloaded = d.get('downloaded_bytes', 0)
                speed = d.get('speed', 0)
                eta = d.get('eta', 0)
                filename = d.get('filename', '')
                
                # Calculate percentage
                percent = (downloaded / total * 100) if total > 0 else 0
                
                # Format speed
                if speed:
                    speed_str = f"{self._format_bytes(int(speed))}/s"
                else:
                    speed_str = "-- KB/s"
                
                # Format ETA
                if eta:
                    eta_mins = int(eta // 60)
                    eta_secs = int(eta % 60)
                    eta_str = f"{eta_mins}m {eta_secs}s" if eta_mins > 0 else f"{eta_secs}s"
                else:
                    eta_str = "--:--"
                
                # Store progress
                self.current_progress = DownloadProgress(
                    percent=percent,
                    downloaded_bytes=downloaded,
                    total_bytes=total,
                    speed=speed_str,
                    eta=eta_str,
                    status='downloading',
                    filename=os.path.basename(filename)
                )
                
                # Log progress to file (every 10%)
                if int(percent) % 10 == 0:
                    logger.debug(
                        f"Progress: {percent:.1f}% | "
                        f"Downloaded: {self._format_bytes(downloaded)} / {self._format_bytes(total)} | "
                        f"Speed: {speed_str} | ETA: {eta_str}"
                    )
                
                # Console progress
                progress_bar = "=" * int(percent // 5) + ">" + " " * (20 - int(percent // 5))
                print(f"\r[{progress_bar}] {percent:.1f}% | {speed_str} | ETA: {eta_str}", end="", flush=True)
                
                # Callback
                if progress_callback:
                    progress_callback(percent, f"Downloading: {percent:.1f}% ({speed_str})")
                    
            elif d['status'] == 'finished':
                print()  # New line after progress bar
                logger.info(f"[DOWNLOAD COMPLETE] File: {d.get('filename', 'unknown')}")
                
                self.current_progress = DownloadProgress(
                    percent=100,
                    downloaded_bytes=d.get('total_bytes', 0),
                    total_bytes=d.get('total_bytes', 0),
                    speed="0 KB/s",
                    eta="0s",
                    status='finished',
                    filename=os.path.basename(d.get('filename', ''))
                )
                
                if progress_callback:
                    progress_callback(100, "Download complete, processing...")
                    
            elif d['status'] == 'error':
                logger.error(f"[DOWNLOAD ERROR] {d.get('error', 'Unknown error')}")
        
        ydl_opts = {
            'format': f'bestvideo[height<={max_height}]+bestaudio/best[height<={max_height}]',
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'merge_output_format': 'mp4',
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }],
            'progress_hooks': [progress_hook],
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
                
                # Find the downloaded file
                downloaded_file = None
                for ext in ['mp4', 'webm', 'mkv']:
                    potential_path = os.path.join(self.download_dir, f"{output_id}.{ext}")
                    if os.path.exists(potential_path):
                        downloaded_file = potential_path
                        break
                
                if not downloaded_file:
                    # Try to find any file with the output_id prefix
                    for f in os.listdir(self.download_dir):
                        if f.startswith(output_id):
                            downloaded_file = os.path.join(self.download_dir, f)
                            break
                
                if not downloaded_file or not os.path.exists(downloaded_file):
                    raise RuntimeError("Downloaded file not found")
                
                # Calculate download duration
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                file_size = os.path.getsize(downloaded_file)
                
                logger.info("=" * 60)
                logger.info(f"[DOWNLOAD SUMMARY]")
                logger.info(f"Title: {info.get('title', 'Unknown')}")
                logger.info(f"File: {downloaded_file}")
                logger.info(f"Size: {self._format_bytes(file_size)}")
                logger.info(f"Duration: {duration:.1f} seconds")
                logger.info(f"Avg Speed: {self._format_bytes(int(file_size / duration))}/s")
                logger.info("=" * 60)
                
                return {
                    "video_id": output_id,
                    "file_path": downloaded_file,
                    "youtube_id": info.get('id', video_id),
                    "title": info.get('title', 'Unknown'),
                    "duration": float(info.get('duration', 0)),
                    "channel": info.get('channel', info.get('uploader', 'Unknown')),
                    "thumbnail": info.get('thumbnail', ''),
                }
                
        except Exception as e:
            logger.error(f"[DOWNLOAD FAILED] Error: {e}")
            # Cleanup partial download
            for ext in ['mp4', 'webm', 'mkv', 'part']:
                potential_path = os.path.join(self.download_dir, f"{output_id}.{ext}")
                if os.path.exists(potential_path):
                    os.remove(potential_path)
                    logger.debug(f"Cleaned up partial file: {potential_path}")
            raise ValueError(f"Failed to download video: {str(e)}")
    
    def get_current_progress(self) -> Optional[Dict[str, Any]]:
        """Get current download progress for API access"""
        if self.current_progress:
            return {
                "percent": self.current_progress.percent,
                "downloaded": self._format_bytes(self.current_progress.downloaded_bytes),
                "total": self._format_bytes(self.current_progress.total_bytes),
                "speed": self.current_progress.speed,
                "eta": self.current_progress.eta,
                "status": self.current_progress.status,
                "filename": self.current_progress.filename
            }
        return None
    
    def is_valid_youtube_url(self, url: str) -> bool:
        """Check apakah URL valid YouTube URL"""
        return self.extract_video_id(url) is not None
    
    def get_log_file_path(self) -> str:
        """Get path to log file"""
        return LOG_FILE


# Global instance
youtube_service = YouTubeService()

