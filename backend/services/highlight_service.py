"""
Highlight Detection Service
Menggunakan Gemini API untuk menganalisis transcript dan mendeteksi momen-momen menarik.
"""

import google.generativeai as genai
import os
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class HighlightSegment:
    """Detected highlight segment"""
    start: float
    end: float
    score: float  # 0-100 engagement score
    title: str
    reason: str
    category: str  # e.g., "funny", "informative", "emotional", "action"

@dataclass
class HighlightResult:
    """Result dari highlight detection"""
    highlights: List[HighlightSegment]
    summary: str
    total_duration: float


class HighlightService:
    """Service untuk AI-powered highlight detection menggunakan Gemini"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize highlight service.
        
        Args:
            api_key: Gemini API key. If None, will try to get from env.
        """
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            logger.info("HighlightService initialized with Gemini API")
        else:
            logger.warning("No Gemini API key provided. Highlight detection will not work.")
        
        self.model = None
    
    def set_api_key(self, api_key: str):
        """Set or update API key"""
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.model = None  # Reset model
        logger.info("Gemini API key updated")
    
    def get_model(self):
        """Get or create Gemini model (lazy loading)"""
        if self.model is None:
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        return self.model
    
    def detect_highlights(
        self,
        transcript_segments: List[Dict[str, Any]],
        target_duration: int = 60,
        num_highlights: int = 5,
        content_type: str = "general"
    ) -> HighlightResult:
        """
        Analyze transcript and detect highlight moments.
        
        Args:
            transcript_segments: List of {start, end, text} segments
            target_duration: Target duration for each highlight (seconds)
            num_highlights: Number of highlights to detect
            content_type: Type of content (general, tutorial, vlog, podcast, gaming)
            
        Returns:
            HighlightResult with detected highlights
        """
        if not self.api_key:
            raise ValueError("Gemini API key not set. Call set_api_key() first.")
        
        model = self.get_model()
        
        # Format transcript for analysis
        transcript_text = self._format_transcript_for_analysis(transcript_segments)
        total_duration = transcript_segments[-1]["end"] if transcript_segments else 0
        
        prompt = f"""Kamu adalah AI expert untuk mendeteksi momen viral dari video YouTube.

Analisis transcript berikut dan temukan {num_highlights} momen paling menarik yang cocok untuk YouTube Shorts (durasi target: {target_duration} detik per clip).

TRANSCRIPT (dengan timestamps dalam detik):
{transcript_text}

JENIS KONTEN: {content_type}

KRITERIA HIGHLIGHT:
1. Momen lucu atau mengejutkan
2. Statement powerful atau quotable
3. Momen emosional atau dramatis
4. Informasi paling penting/berguna
5. Hook yang menarik perhatian
6. Twist atau reveal yang unexpected

PENTING:
- Setiap highlight harus memiliki konteks yang lengkap (jangan potong di tengah kalimat)
- Durasi ideal 30-60 detik
- Prioritaskan momen dengan engagement tinggi
- Mulai dari momen paling viral

RESPOND DALAM FORMAT JSON BERIKUT (tanpa markdown code block):
{{
    "summary": "Ringkasan singkat isi video",
    "highlights": [
        {{
            "start": <start_time_seconds>,
            "end": <end_time_seconds>,
            "score": <engagement_score_0_to_100>,
            "title": "Judul short yang catchy",
            "reason": "Alasan kenapa momen ini menarik",
            "category": "funny|informative|emotional|action|dramatic"
        }}
    ]
}}
"""
        
        logger.info(f"Analyzing transcript ({len(transcript_segments)} segments) for highlights")
        
        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to extract JSON from response
            result_data = self._parse_json_response(response_text)
            
            # Parse highlights
            highlights = []
            for h in result_data.get("highlights", []):
                highlight = HighlightSegment(
                    start=float(h.get("start", 0)),
                    end=float(h.get("end", 0)),
                    score=float(h.get("score", 50)),
                    title=h.get("title", "Untitled"),
                    reason=h.get("reason", ""),
                    category=h.get("category", "general")
                )
                highlights.append(highlight)
            
            result = HighlightResult(
                highlights=highlights,
                summary=result_data.get("summary", ""),
                total_duration=total_duration
            )
            
            logger.info(f"Detected {len(highlights)} highlights")
            return result
            
        except Exception as e:
            logger.error(f"Error detecting highlights: {e}")
            raise
    
    def _format_transcript_for_analysis(self, segments: List[Dict[str, Any]]) -> str:
        """Format transcript segments for AI analysis"""
        lines = []
        for seg in segments:
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "")
            lines.append(f"[{start:.1f}s - {end:.1f}s]: {text}")
        return "\n".join(lines)
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON from Gemini response, handling markdown code blocks"""
        # Remove markdown code block if present
        response_text = response_text.strip()
        
        # Try to find JSON in the response
        if response_text.startswith("```"):
            # Remove code block markers
            lines = response_text.split("\n")
            # Remove first and last lines if they're code block markers
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            response_text = "\n".join(lines)
        
        # Try direct JSON parse
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            # Try to find JSON object in text
            match = re.search(r'\{[\s\S]*\}', response_text)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
            
            # Return empty result if parsing fails
            logger.warning(f"Failed to parse JSON response: {response_text[:200]}...")
            return {"highlights": [], "summary": ""}
    
    def generate_short_title(self, highlight: HighlightSegment) -> str:
        """
        Generate a catchy title for a short clip.
        
        Args:
            highlight: The highlight segment
            
        Returns:
            Catchy title string
        """
        if not self.api_key:
            return highlight.title
        
        model = self.get_model()
        
        prompt = f"""Buat 3 alternatif judul YouTube Shorts yang viral untuk clip berikut:

Judul asli: {highlight.title}
Alasan menarik: {highlight.reason}
Kategori: {highlight.category}

KRITERIA:
- Maksimal 50 karakter
- Gunakan emoji yang relevan
- Buat penasaran (clickbait tapi tidak menyesatkan)
- Bahasa Indonesia atau campuran

Format respons (satu judul per baris, tanpa numbering):
[judul 1]
[judul 2]
[judul 3]
"""
        
        try:
            response = model.generate_content(prompt)
            titles = response.text.strip().split("\n")
            return titles[0] if titles else highlight.title
        except Exception as e:
            logger.error(f"Error generating title: {e}")
            return highlight.title


# Global instance
highlight_service = HighlightService()
