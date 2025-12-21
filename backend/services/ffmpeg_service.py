"""
FFmpeg Video Processing Service
Handles video cutting, caption burning, music overlay, and format conversion.
Supports GPU acceleration via NVIDIA NVENC, Intel QuickSync, and AMD AMF.
"""

import ffmpeg
import os
import tempfile
import subprocess
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import logging
import json

from .gpu_service import gpu_service, EncoderType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CaptionStyle:
    """Styling untuk caption/subtitle"""
    font_name: str = "Arial"
    font_size: int = 24
    font_color: str = "white"
    outline_color: str = "black"
    outline_width: int = 2
    background_color: Optional[str] = None  # e.g., "black@0.5"
    position: str = "bottom"  # top, center, bottom
    margin_v: int = 50  # Vertical margin
    bold: bool = True

@dataclass
class CaptionSegment:
    """Single caption/subtitle segment"""
    start: float
    end: float
    text: str


class FFmpegService:
    """Service untuk video processing menggunakan FFmpeg dengan GPU acceleration"""
    
    def __init__(self):
        self.check_ffmpeg()
        # Initialize GPU service
        gpu_service.initialize()
        logger.info(f"FFmpeg using encoder: {gpu_service.get_current_encoder().value}")
    
    def check_ffmpeg(self):
        """Check if FFmpeg is installed"""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info("FFmpeg is available")
            else:
                raise RuntimeError("FFmpeg returned non-zero exit code")
        except FileNotFoundError:
            raise RuntimeError("FFmpeg is not installed. Please install FFmpeg first.")
    
    def get_video_info(self, video_path: str) -> Dict[str, Any]:
        """Get video metadata using ffprobe"""
        try:
            probe = ffmpeg.probe(video_path)
            video_streams = [s for s in probe["streams"] if s["codec_type"] == "video"]
            audio_streams = [s for s in probe["streams"] if s["codec_type"] == "audio"]
            
            info = {
                "duration": float(probe["format"].get("duration", 0)),
                "size": int(probe["format"].get("size", 0)),
                "format": probe["format"].get("format_name", "unknown"),
            }
            
            if video_streams:
                vs = video_streams[0]
                info["width"] = vs.get("width", 0)
                info["height"] = vs.get("height", 0)
                info["fps"] = eval(vs.get("r_frame_rate", "30/1"))
                info["video_codec"] = vs.get("codec_name", "unknown")
            
            if audio_streams:
                aus = audio_streams[0]
                info["audio_codec"] = aus.get("codec_name", "unknown")
                info["sample_rate"] = int(aus.get("sample_rate", 44100))
            
            return info
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            raise
    
    def cut_video(
        self,
        input_path: str,
        output_path: str,
        start_time: float,
        end_time: float,
        reencode: bool = True
    ) -> str:
        """
        Cut video segment.
        
        Args:
            input_path: Source video path
            output_path: Output video path
            start_time: Start time in seconds
            end_time: End time in seconds
            reencode: If True, re-encode for precision. If False, use stream copy (faster but less precise).
            
        Returns:
            Output file path
        """
        duration = end_time - start_time
        
        logger.info(f"Cutting video: {start_time:.2f}s to {end_time:.2f}s (duration: {duration:.2f}s)")
        
        try:
            if reencode:
                # Get GPU encoder args
                encoder_args = gpu_service.get_ffmpeg_encoder_args()
                encoder_name = encoder_args[1] if len(encoder_args) >= 2 else 'libx264'
                
                logger.info(f"Using encoder: {encoder_name}")
                
                # Re-encode dengan GPU acceleration jika tersedia
                cmd = [
                    'ffmpeg', '-y',
                    '-ss', str(start_time),
                    '-i', input_path,
                    '-t', str(duration),
                ] + encoder_args + [
                    '-acodec', 'aac',
                    output_path
                ]
                
                subprocess.run(cmd, capture_output=True, check=True)
            else:
                # Stream copy untuk speed (less precise on keyframes)
                (
                    ffmpeg
                    .input(input_path, ss=start_time, t=duration)
                    .output(output_path, c='copy')
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
            
            logger.info(f"Video cut successfully: {output_path}")
            return output_path
            
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            raise
    
    def convert_to_vertical(
        self,
        input_path: str,
        output_path: str,
        target_width: int = 1080,
        target_height: int = 1920
    ) -> str:
        """
        Convert video to vertical 9:16 aspect ratio for Shorts.
        Crops from center if needed.
        
        Args:
            input_path: Source video
            output_path: Output video
            target_width: Output width (default 1080)
            target_height: Output height (default 1920)
            
        Returns:
            Output path
        """
        logger.info(f"Converting to vertical: {target_width}x{target_height}")
        
        # Get source dimensions
        info = self.get_video_info(input_path)
        src_w, src_h = info["width"], info["height"]
        
        # Calculate crop/scale
        target_ratio = target_width / target_height  # 0.5625 for 9:16
        src_ratio = src_w / src_h
        
        if src_ratio > target_ratio:
            # Source is wider, crop horizontally
            new_w = int(src_h * target_ratio)
            crop_x = (src_w - new_w) // 2
            filter_str = f"crop={new_w}:{src_h}:{crop_x}:0,scale={target_width}:{target_height}"
        else:
            # Source is taller, crop vertically
            new_h = int(src_w / target_ratio)
            crop_y = (src_h - new_h) // 2
            filter_str = f"crop={src_w}:{new_h}:0:{crop_y},scale={target_width}:{target_height}"
        
        try:
            # Get GPU encoder args
            encoder_args = gpu_service.get_ffmpeg_encoder_args()
            encoder_name = encoder_args[1] if len(encoder_args) >= 2 else 'libx264'
            
            logger.info(f"Vertical conversion using encoder: {encoder_name}")
            
            cmd = [
                'ffmpeg', '-y',
                '-i', input_path,
                '-vf', filter_str,
            ] + encoder_args + [
                '-acodec', 'aac',
                output_path
            ]
            
            subprocess.run(cmd, capture_output=True, check=True)
            
            logger.info(f"Vertical conversion complete: {output_path}")
            return output_path
            
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            raise
    
    def generate_ass_subtitle(
        self,
        captions: List[CaptionSegment],
        style: CaptionStyle,
        output_path: str
    ) -> str:
        """
        Generate ASS subtitle file with styling.
        
        Args:
            captions: List of caption segments
            style: Caption styling
            output_path: Output .ass file path
            
        Returns:
            ASS file path
        """
        # ASS header
        ass_content = f"""[Script Info]
Title: YTShortMaker Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{style.font_name},{style.font_size},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,{1 if style.bold else 0},0,0,0,100,100,0,0,1,{style.outline_width},0,{self._get_ass_alignment(style.position)},20,20,{style.margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        
        # Add caption events
        for cap in captions:
            start_ass = self._seconds_to_ass_time(cap.start)
            end_ass = self._seconds_to_ass_time(cap.end)
            # Escape special characters
            text = cap.text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
            ass_content += f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{text}\n"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(ass_content)
        
        logger.info(f"ASS subtitle generated: {output_path}")
        return output_path
    
    def _seconds_to_ass_time(self, seconds: float) -> str:
        """Convert seconds to ASS time format (H:MM:SS.cc)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centisecs = int((seconds % 1) * 100)
        return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"
    
    def _get_ass_alignment(self, position: str) -> int:
        """Get ASS alignment number from position"""
        alignments = {
            "bottom": 2,    # Bottom center
            "center": 5,    # Middle center
            "top": 8        # Top center
        }
        return alignments.get(position, 2)
    
    def burn_captions(
        self,
        input_path: str,
        output_path: str,
        captions: List[CaptionSegment],
        style: CaptionStyle
    ) -> str:
        """
        Burn captions into video (hardcode subtitles).
        
        Args:
            input_path: Source video
            output_path: Output video with captions
            captions: List of caption segments
            style: Caption styling
            
        Returns:
            Output path
        """
        logger.info(f"Burning {len(captions)} captions into video")
        
        # Generate ASS file
        with tempfile.NamedTemporaryFile(suffix='.ass', delete=False, mode='w') as tmp:
            ass_path = tmp.name
        
        self.generate_ass_subtitle(captions, style, ass_path)
        
        try:
            # Burn subtitles using ASS filter
            # Note: Need to escape path for Windows
            ass_path_escaped = ass_path.replace("\\", "/").replace(":", "\\:")
            
            (
                ffmpeg
                .input(input_path)
                .output(
                    output_path,
                    vf=f"ass='{ass_path_escaped}'",
                    vcodec='libx264',
                    acodec='aac',
                    preset='fast'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            
            logger.info(f"Captions burned successfully: {output_path}")
            return output_path
            
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            raise
        finally:
            # Cleanup ASS file
            if os.path.exists(ass_path):
                os.unlink(ass_path)
    
    def add_background_music(
        self,
        video_path: str,
        music_path: str,
        output_path: str,
        music_volume: float = 0.3,
        original_volume: float = 1.0,
        fade_in: float = 1.0,
        fade_out: float = 2.0
    ) -> str:
        """
        Add background music to video.
        
        Args:
            video_path: Source video
            music_path: Background music file
            output_path: Output video
            music_volume: Music volume (0.0-1.0)
            original_volume: Original audio volume (0.0-1.0)
            fade_in: Fade in duration for music
            fade_out: Fade out duration for music
            
        Returns:
            Output path
        """
        logger.info(f"Adding background music: {music_path}")
        
        # Get video duration
        video_info = self.get_video_info(video_path)
        duration = video_info["duration"]
        
        try:
            video = ffmpeg.input(video_path)
            music = ffmpeg.input(music_path, stream_loop=-1)  # Loop music
            
            # Process original audio
            original_audio = video.audio.filter('volume', original_volume)
            
            # Process music with fade and volume
            music_audio = (
                music.audio
                .filter('atrim', duration=duration)
                .filter('volume', music_volume)
                .filter('afade', type='in', duration=fade_in)
                .filter('afade', type='out', start_time=duration-fade_out, duration=fade_out)
            )
            
            # Mix audio streams
            mixed_audio = ffmpeg.filter([original_audio, music_audio], 'amix', inputs=2, duration='first')
            
            # Combine video with mixed audio
            output = ffmpeg.output(
                video.video,
                mixed_audio,
                output_path,
                vcodec='libx264',
                acodec='aac',
                preset='fast'
            )
            
            output.overwrite_output().run(capture_stdout=True, capture_stderr=True)
            
            logger.info(f"Background music added: {output_path}")
            return output_path
            
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            raise
    
    def export_short(
        self,
        input_path: str,
        output_path: str,
        resolution: str = "1080p",
        quality: str = "high"
    ) -> str:
        """
        Final export with optimized settings for YouTube Shorts.
        
        Args:
            input_path: Source video
            output_path: Output video
            resolution: Output resolution (720p or 1080p)
            quality: Quality preset (low, medium, high)
            
        Returns:
            Output path
        """
        logger.info(f"Exporting short: {resolution}, quality={quality}")
        
        # Resolution mapping
        res_map = {
            "720p": (720, 1280),
            "1080p": (1080, 1920)
        }
        width, height = res_map.get(resolution, (1080, 1920))
        
        # Quality/CRF mapping (lower = better quality, larger file)
        crf_map = {
            "low": 28,
            "medium": 23,
            "high": 18
        }
        crf = crf_map.get(quality, 23)
        
        try:
            (
                ffmpeg
                .input(input_path)
                .output(
                    output_path,
                    vf=f"scale={width}:{height}",
                    vcodec='libx264',
                    acodec='aac',
                    crf=crf,
                    preset='slow',  # Better compression
                    movflags='+faststart'  # Optimize for web playback
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            
            logger.info(f"Short exported: {output_path}")
            return output_path
            
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            raise


# Global instance
ffmpeg_service = FFmpegService()
