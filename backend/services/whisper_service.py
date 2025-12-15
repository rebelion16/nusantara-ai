"""
Whisper Transcription Service
Menggunakan OpenAI Whisper untuk transcribe audio/video ke teks dengan timestamps.
"""

import whisper
import os
import tempfile
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TranscriptSegment:
    """Segment dari transcript dengan timing info"""
    id: int
    start: float
    end: float
    text: str
    words: Optional[List[Dict[str, Any]]] = None

@dataclass
class TranscriptResult:
    """Hasil transcription lengkap"""
    text: str
    language: str
    duration: float
    segments: List[TranscriptSegment]


class WhisperService:
    """Service untuk transcription menggunakan Whisper"""
    
    def __init__(self, model_size: str = "small"):
        """
        Initialize Whisper service.
        
        Args:
            model_size: Ukuran model Whisper (tiny, base, small, medium, large)
        """
        self.model_size = model_size
        self.model = None
        logger.info(f"WhisperService initialized with model size: {model_size}")
    
    def load_model(self):
        """Load Whisper model (lazy loading)"""
        if self.model is None:
            logger.info(f"Loading Whisper model: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
            logger.info("Whisper model loaded successfully")
        return self.model
    
    def transcribe(
        self, 
        audio_path: str,
        language: Optional[str] = None,
        word_timestamps: bool = True
    ) -> TranscriptResult:
        """
        Transcribe audio/video file.
        
        Args:
            audio_path: Path ke file audio/video
            language: Language code (e.g., 'id', 'en'). Auto-detect if None.
            word_timestamps: Apakah include word-level timestamps
            
        Returns:
            TranscriptResult dengan full transcript dan segments
        """
        model = self.load_model()
        
        logger.info(f"Transcribing: {audio_path}")
        
        # Whisper options
        options = {
            "word_timestamps": word_timestamps,
            "verbose": False
        }
        if language:
            options["language"] = language
        
        # Transcribe
        result = model.transcribe(audio_path, **options)
        
        # Parse segments
        segments = []
        for i, seg in enumerate(result.get("segments", [])):
            segment = TranscriptSegment(
                id=i,
                start=seg["start"],
                end=seg["end"],
                text=seg["text"].strip(),
                words=seg.get("words", [])
            )
            segments.append(segment)
        
        # Calculate duration from last segment
        duration = segments[-1].end if segments else 0.0
        
        transcript_result = TranscriptResult(
            text=result["text"].strip(),
            language=result.get("language", "unknown"),
            duration=duration,
            segments=segments
        )
        
        logger.info(f"Transcription complete. Language: {transcript_result.language}, Duration: {duration:.2f}s, Segments: {len(segments)}")
        
        return transcript_result
    
    def transcribe_bytes(
        self,
        audio_bytes: bytes,
        filename: str = "audio.mp4",
        language: Optional[str] = None
    ) -> TranscriptResult:
        """
        Transcribe dari bytes (untuk upload file).
        
        Args:
            audio_bytes: Raw bytes dari file audio/video
            filename: Original filename untuk menentukan extension
            language: Language code
            
        Returns:
            TranscriptResult
        """
        # Get file extension
        ext = os.path.splitext(filename)[1] or ".mp4"
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        try:
            result = self.transcribe(tmp_path, language=language)
            return result
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Global instance dengan model small (sesuai user request)
whisper_service = WhisperService(model_size="small")
