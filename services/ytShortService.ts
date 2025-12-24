/**
 * YTShortMaker Service
 * Frontend service untuk komunikasi dengan Python backend
 */

// Backend URL - change this if running on different port or using tunnel
const BACKEND_URL = import.meta.env.VITE_YTSHORT_BACKEND_URL || 'http://localhost:8000';

// ===== Types =====

export interface VideoInfo {
    duration: number;
    width: number;
    height: number;
    fps: number;
    format: string;
    size: number;
    video_codec?: string;
    audio_codec?: string;
    sample_rate?: number;
}

export interface TranscriptSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    words?: Array<{
        word: string;
        start: number;
        end: number;
        probability: number;
    }>;
}

export interface TranscriptResult {
    text: string;
    language: string;
    duration: number;
    segments: TranscriptSegment[];
}

export interface HighlightSegment {
    start: number;
    end: number;
    score: number;
    title: string;
    reason: string;
    category: 'funny' | 'informative' | 'emotional' | 'action' | 'dramatic' | 'general' | 'excited' | 'important';
}

export interface HighlightResult {
    highlights: HighlightSegment[];
    summary: string;
    total_duration: number;
}

export interface CaptionStyle {
    font_name: string;
    font_size: number;
    font_color: string;
    outline_color: string;
    outline_width: number;
    background_color?: string;
    position: 'top' | 'center' | 'bottom';
    margin_v: number;
    bold: boolean;
}

export interface CaptionSegment {
    start: number;
    end: number;
    text: string;
}

export interface MusicTrack {
    id: string;
    name: string;
    file: string;
    duration: number;
    mood: string;
}

export interface UploadResult {
    video_id: string;
    filename: string;
    info: VideoInfo;
}

export interface ProcessResult {
    video_id: string;
    info: VideoInfo;
}

// ===== Helper Functions =====

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
}

// ===== API Functions =====

/**
 * Check if backend is running
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${BACKEND_URL}/status`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get backend status info
 */
export async function getBackendStatus(): Promise<{
    status: string;
    whisper_model: string;
    whisper_loaded: boolean;
    ffmpeg_available: boolean;
}> {
    const response = await fetch(`${BACKEND_URL}/status`);
    return handleResponse(response);
}

// ===== YouTube Types =====

export interface YouTubeVideoInfo {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    channel: string;
    view_count: number;
    upload_date: string;
    description: string;
}

export interface YouTubeDownloadResult {
    video_id: string;
    youtube_id: string;
    title: string;
    channel: string;
    thumbnail: string;
    info: VideoInfo;
}

// ===== YouTube API Functions =====

/**
 * Get info video YouTube tanpa download
 */
export async function getYouTubeInfo(url: string): Promise<YouTubeVideoInfo> {
    const response = await fetch(`${BACKEND_URL}/youtube/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });
    return handleResponse(response);
}

/**
 * Download video dari YouTube
 */
export async function downloadYouTubeVideo(
    url: string,
    maxHeight: number = 1080
): Promise<YouTubeDownloadResult> {
    const response = await fetch(`${BACKEND_URL}/youtube/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, max_height: maxHeight }),
    });
    return handleResponse(response);
}

/**
 * Check if string is a valid YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
    const patterns = [
        /youtube\.com\/watch\?v=/,
        /youtu\.be\//,
        /youtube\.com\/embed\//,
        /youtube\.com\/shorts\//,
    ];
    return patterns.some(pattern => pattern.test(url));
}

/**
 * Download progress information
 */
export interface DownloadProgress {
    percent: number;
    downloaded: string;
    total: string;
    speed: string;
    eta: string;
    status: 'idle' | 'downloading' | 'finished' | 'error';
    filename: string;
}

/**
 * Get current YouTube download progress
 */
export async function getYouTubeProgress(): Promise<DownloadProgress> {
    try {
        const response = await fetch(`${BACKEND_URL}/youtube/progress`);
        if (response.ok) {
            return response.json();
        }
    } catch {
        // Ignore errors, return idle state
    }
    return {
        percent: 0,
        downloaded: '0 B',
        total: '0 B',
        speed: '-- KB/s',
        eta: '--:--',
        status: 'idle',
        filename: ''
    };
}

// ===== Upload Functions =====

/**
 * Upload video file untuk processing
 */
export async function uploadVideo(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
    });

    return handleResponse(response);
}

/**
 * Transcribe video using selected engine
 * @param engine - 'gemini' (cloud), 'gpu' (Whisper CUDA), or 'cpu' (Whisper CPU)
 */
export async function transcribeVideo(
    videoId: string,
    language?: string,
    apiKey?: string,
    engine: 'gemini' | 'gpu' | 'cpu' = 'gemini'
): Promise<TranscriptResult & { engine?: string }> {
    const url = new URL(`${BACKEND_URL}/transcribe/${videoId}`);
    if (language) {
        url.searchParams.set('language', language);
    }
    url.searchParams.set('engine', engine);

    const headers: HeadersInit = {};

    // API key only needed for gemini engine
    if (engine === 'gemini') {
        const key = apiKey || localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY;
        if (key) {
            headers['X-API-Key'] = key;
        }
    }

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
    });

    return handleResponse(response);
}

/**
 * Detect highlights (offline dengan keyword scoring)
 */
export async function detectHighlights(
    segments: TranscriptSegment[],
    apiKey?: string,
    options?: {
        targetDuration?: number;
        numHighlights?: number;
        contentType?: string;
    }
): Promise<HighlightResult> {
    const response = await fetch(`${BACKEND_URL}/detect-highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            segments: segments.map(s => ({
                start: s.start,
                end: s.end,
                text: s.text,
            })),
            api_key: apiKey || null,
            target_duration: options?.targetDuration || 60,
            num_highlights: options?.numHighlights || 5,
            content_type: options?.contentType || 'general',
        }),
    });

    return handleResponse(response);
}

/**
 * Cut video segment
 */
export async function cutVideo(
    videoId: string,
    startTime: number,
    endTime: number,
    convertVertical: boolean = true
): Promise<ProcessResult> {
    const response = await fetch(`${BACKEND_URL}/cut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            video_id: videoId,
            start_time: startTime,
            end_time: endTime,
            convert_vertical: convertVertical,
        }),
    });

    return handleResponse(response);
}

/**
 * Cut multiple segments and merge into one video
 */
export async function cutAndMergeVideo(
    videoId: string,
    segments: Array<{ start: number; end: number }>,
    convertVertical: boolean = true
): Promise<ProcessResult & { segments_merged: number; total_duration: number }> {
    const response = await fetch(`${BACKEND_URL}/cut-merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            video_id: videoId,
            segments: segments,
            convert_vertical: convertVertical,
        }),
    });

    return handleResponse(response);
}

/**
 * Add captions to video

 */
export async function addCaptions(
    videoId: string,
    captions: CaptionSegment[],
    style: CaptionStyle
): Promise<ProcessResult> {
    const response = await fetch(`${BACKEND_URL}/add-captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            video_id: videoId,
            captions,
            style,
        }),
    });

    return handleResponse(response);
}

/**
 * Get available music tracks
 */
export async function getMusicTracks(): Promise<MusicTrack[]> {
    const response = await fetch(`${BACKEND_URL}/music-tracks`);
    const data = await handleResponse<{ tracks: MusicTrack[] }>(response);
    return data.tracks;
}

/**
 * Add background music (built-in track)
 */
export async function addMusicTrack(
    videoId: string,
    musicId: string,
    options?: {
        musicVolume?: number;
        originalVolume?: number;
        fadeIn?: number;
        fadeOut?: number;
    }
): Promise<ProcessResult> {
    const response = await fetch(`${BACKEND_URL}/add-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            video_id: videoId,
            music_id: musicId,
            music_volume: options?.musicVolume ?? 0.3,
            original_volume: options?.originalVolume ?? 1.0,
            fade_in: options?.fadeIn ?? 1.0,
            fade_out: options?.fadeOut ?? 2.0,
        }),
    });

    return handleResponse(response);
}

/**
 * Add custom music file
 */
export async function addCustomMusic(
    videoId: string,
    musicFile: File,
    options?: {
        musicVolume?: number;
        originalVolume?: number;
        fadeIn?: number;
        fadeOut?: number;
    }
): Promise<ProcessResult> {
    const formData = new FormData();
    formData.append('video_id', videoId);
    formData.append('music_file', musicFile);
    formData.append('music_volume', String(options?.musicVolume ?? 0.3));
    formData.append('original_volume', String(options?.originalVolume ?? 1.0));
    formData.append('fade_in', String(options?.fadeIn ?? 1.0));
    formData.append('fade_out', String(options?.fadeOut ?? 2.0));

    const response = await fetch(`${BACKEND_URL}/add-music`, {
        method: 'POST',
        body: formData,
    });

    return handleResponse(response);
}

/**
 * Export final short with optimized settings
 */
export async function exportShort(
    videoId: string,
    options?: {
        resolution?: '720p' | '1080p';
        quality?: 'low' | 'medium' | 'high';
    }
): Promise<ProcessResult> {
    const response = await fetch(`${BACKEND_URL}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            video_id: videoId,
            resolution: options?.resolution || '1080p',
            quality: options?.quality || 'high',
        }),
    });

    return handleResponse(response);
}

/**
 * Get video preview URL
 */
export function getPreviewUrl(videoId: string): string {
    return `${BACKEND_URL}/preview/${videoId}`;
}

/**
 * Get video download URL
 */
export function getDownloadUrl(videoId: string): string {
    return `${BACKEND_URL}/download/${videoId}`;
}

/**
 * Delete video from server
 */
export async function deleteVideo(videoId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/video/${videoId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Delete failed' }));
        throw new Error(error.detail);
    }
}

// ===== Utility Functions =====

/**
 * Format seconds to MM:SS string
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to HH:MM:SS string
 */
export function formatTimeLong(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Get category color for highlight
 */
export function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        funny: '#FFD700',
        informative: '#4A90D9',
        emotional: '#E74C3C',
        action: '#FF6B35',
        dramatic: '#9B59B6',
        general: '#95A5A6',
        excited: '#FF1493',
        important: '#00CED1',
    };
    return colors[category] || colors.general;
}

/**
 * Get category emoji for highlight
 */
export function getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
        funny: '😂',
        informative: '💡',
        emotional: '😢',
        action: '🔥',
        dramatic: '🎭',
        general: '✨',
        excited: '🤩',
        important: '📌',
    };
    return emojis[category] || emojis.general;
}

// Default caption style
export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
    font_name: 'Arial',
    font_size: 48,
    font_color: 'white',
    outline_color: 'black',
    outline_width: 3,
    position: 'bottom',
    margin_v: 80,
    bold: true,
};
