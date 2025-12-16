"""
YouTube Download Service
Menggunakan yt-dlp untuk download video dari YouTube.
"""

import yt_dlp
import os
import tempfile
import uuid
from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    
    def __init__(self, download_dir: Optional[str] = None):
        """
        Initialize YouTube service.
        
        Args:
            download_dir: Directory untuk menyimpan video yang didownload
        """
        self.download_dir = download_dir or os.path.join(tempfile.gettempdir(), "ytshortmaker")
        os.makedirs(self.download_dir, exist_ok=True)
        logger.info(f"YouTubeService initialized. Download dir: {self.download_dir}")
    
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
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                
                return YouTubeVideoInfo(
                    id=info.get('id', video_id),
                    title=info.get('title', 'Unknown'),
                    duration=float(info.get('duration', 0)),
                    thumbnail=info.get('thumbnail', ''),
                    channel=info.get('channel', info.get('uploader', 'Unknown')),
                    view_count=int(info.get('view_count', 0)),
                    upload_date=info.get('upload_date', ''),
                    description=info.get('description', '')[:500]  # Truncate description
                )
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            raise ValueError(f"Failed to get video info: {str(e)}")
    
    def download_video(
        self,
        url: str,
        max_height: int = 1080,
        progress_callback: Optional[callable] = None
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
        
        def progress_hook(d):
            if d['status'] == 'downloading' and progress_callback:
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                downloaded = d.get('downloaded_bytes', 0)
                if total > 0:
                    percent = (downloaded / total) * 100
                    progress_callback(percent, f"Downloading: {percent:.1f}%")
            elif d['status'] == 'finished' and progress_callback:
                progress_callback(100, "Download complete, processing...")
        
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
            'progress_hooks': [progress_hook] if progress_callback else [],
        }
        
        try:
            logger.info(f"Downloading YouTube video: {video_id}")
            
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
                
                logger.info(f"Video downloaded: {downloaded_file}")
                
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
            logger.error(f"Download error: {e}")
            # Cleanup partial download
            for ext in ['mp4', 'webm', 'mkv', 'part']:
                potential_path = os.path.join(self.download_dir, f"{output_id}.{ext}")
                if os.path.exists(potential_path):
                    os.remove(potential_path)
            raise ValueError(f"Failed to download video: {str(e)}")
    
    def is_valid_youtube_url(self, url: str) -> bool:
        """Check apakah URL valid YouTube URL"""
        return self.extract_video_id(url) is not None


# Global instance
youtube_service = YouTubeService()
