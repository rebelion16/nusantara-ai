# highlight_service.py
# Versi GRATIS & OFFLINE (tanpa Google AI)
# Menggunakan keyword-based scoring untuk mendeteksi momen menarik

from typing import List, Dict, Any
from dataclasses import dataclass

# Keywords yang menandakan momen menarik
KEYWORDS = {
    "excited": ["gila", "parah", "serius", "sumpah", "anjir", "wow", "amazing", "incredible"],
    "funny": ["wkwk", "haha", "lucu", "ngakak", "kocak", "lol"],
    "important": ["penting", "ingat", "perhatikan", "catat", "tips", "trik", "rahasia"],
    "emotional": ["sedih", "terharu", "menangis", "bahagia", "senang"],
    "action": ["ayo", "gas", "mulai", "action", "sekarang", "langsung"]
}

@dataclass
class HighlightSegment:
    """Detected highlight segment"""
    start: float
    end: float
    score: float
    title: str
    reason: str
    category: str

@dataclass
class HighlightResult:
    """Result dari highlight detection"""
    highlights: List[HighlightSegment]
    summary: str
    total_duration: float


class HighlightService:
    """
    Service untuk highlight detection OFFLINE tanpa API.
    Menggunakan keyword scoring dan durasi analysis.
    """
    
    def __init__(self):
        self.keywords = KEYWORDS
    
    def set_api_key(self, api_key: str):
        """Dummy method untuk kompatibilitas - tidak digunakan di versi offline"""
        pass
    
    def detect_highlights(
        self,
        transcript_segments: List[Dict[str, Any]],
        target_duration: int = 60,
        num_highlights: int = 5,
        content_type: str = "general"
    ) -> HighlightResult:
        """
        Detect highlights dari transcript menggunakan keyword scoring.
        
        Args:
            transcript_segments: List of {start, end, text} segments
            target_duration: Target duration for each highlight (seconds)
            num_highlights: Number of highlights to return
            content_type: Type of content (tidak digunakan di versi offline)
            
        Returns:
            HighlightResult dengan detected highlights
        """
        scored_segments = []
        
        for seg in transcript_segments:
            score = 0
            text = seg.get("text", "").lower()
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            duration = end - start
            detected_category = "general"
            reasons = []
            
            # Keyword scoring
            for category, keywords in self.keywords.items():
                for keyword in keywords:
                    if keyword in text:
                        score += 2
                        detected_category = category
                        reasons.append(f"Mengandung kata '{keyword}'")
                        break  # Hanya hitung sekali per kategori
            
            # Durasi ideal untuk shorts (15-60 detik lebih baik)
            if 15 <= duration <= 60:
                score += 2
                reasons.append("Durasi ideal untuk shorts")
            elif 5 <= duration <= 15:
                score += 1
                reasons.append("Durasi pendek")
            
            # Panjang teks (lebih banyak kata = lebih menarik)
            word_count = len(text.split())
            if word_count > 20:
                score += 1
                reasons.append("Konten padat")
            
            # Simpan dengan score
            if score >= 2:
                scored_segments.append({
                    "segment": seg,
                    "score": score,
                    "category": detected_category,
                    "reasons": reasons
                })
        
        # Sort by score (descending) dan ambil top N
        scored_segments.sort(key=lambda x: x["score"], reverse=True)
        top_segments = scored_segments[:num_highlights]
        
        # Convert ke HighlightSegment
        highlights = []
        for idx, item in enumerate(top_segments):
            seg = item["segment"]
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "")
            
            # Generate simple title
            title = f"Highlight #{idx + 1}"
            if len(text) > 30:
                title = text[:30] + "..."
            
            highlight = HighlightSegment(
                start=start,
                end=end,
                score=min(item["score"] * 10, 100),  # Convert ke 0-100 scale
                title=title,
                reason=", ".join(item["reasons"]) if item["reasons"] else "Momen menarik",
                category=item["category"]
            )
            highlights.append(highlight)
        
        # Calculate total duration
        total_duration = transcript_segments[-1]["end"] if transcript_segments else 0
        
        # Generate simple summary
        summary = f"Ditemukan {len(highlights)} momen menarik dari {len(transcript_segments)} segment."
        
        return HighlightResult(
            highlights=highlights,
            summary=summary,
            total_duration=total_duration
        )


# Global instance
highlight_service = HighlightService()
