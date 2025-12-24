/**
 * Social Media Downloader Service
 * Frontend service untuk komunikasi dengan Python backend
 */

// Backend URL - change this if running on different port or using tunnel
const BACKEND_URL = import.meta.env.VITE_SOCIAL_BACKEND_URL || 'http://localhost:8001';

// ===== Types =====

export interface MediaInfo {
  id: string;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  platform: string;
  uploader?: string;
  upload_date?: string;
  view_count?: number;
  like_count?: number;
  formats: FormatInfo[];
  is_video: boolean;
}

export interface FormatInfo {
  quality: string;
  ext: string;
  filesize?: number;
}

export interface DownloadProgress {
  task_id: string;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'error';
  progress: number;
  filename?: string;
  error?: string;
  speed?: string;
  eta?: string;
}

export interface BackendStatus {
  status: string;
  service: string;
  version: string;
  supported_platforms: string[];
  yt_dlp_version: string;
}

export interface DownloadedFile {
  filename: string;
  size: number;
  created: string;
}

// ===== Platform Detection & Icons =====

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'pinterest' | 'threads' | 'unknown';

const PLATFORM_PATTERNS: Record<Platform, string[]> = {
  youtube: ['youtube.com', 'youtu.be'],
  instagram: ['instagram.com', 'instagr.am'],
  tiktok: ['tiktok.com', 'vm.tiktok.com'],
  twitter: ['twitter.com', 'x.com', 't.co'],
  facebook: ['facebook.com', 'fb.watch', 'fb.com'],
  pinterest: ['pinterest.com', 'pin.it'],
  threads: ['threads.net'],
  unknown: [],
};

const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: 'from-red-500 to-red-700',
  instagram: 'from-pink-500 via-purple-500 to-orange-400',
  tiktok: 'from-black to-gray-800',
  twitter: 'from-blue-400 to-blue-600',
  facebook: 'from-blue-600 to-blue-800',
  pinterest: 'from-red-600 to-red-800',
  threads: 'from-gray-900 to-black',
  unknown: 'from-gray-500 to-gray-700',
};

const PLATFORM_ICONS: Record<Platform, string> = {
  youtube: '▶️',
  instagram: '📸',
  tiktok: '🎵',
  twitter: '🐦',
  facebook: '👤',
  pinterest: '📌',
  threads: '🧵',
  unknown: '🔗',
};

export function detectPlatform(url: string): Platform {
  const urlLower = url.toLowerCase();
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (urlLower.includes(pattern)) {
        return platform as Platform;
      }
    }
  }
  return 'unknown';
}

export function getPlatformColor(platform: Platform): string {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS.unknown;
}

export function getPlatformIcon(platform: Platform): string {
  return PLATFORM_ICONS[platform] || PLATFORM_ICONS.unknown;
}

// ===== Helper Functions =====

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hours = Math.floor(mins / 60);

  if (hours > 0) {
    return `${hours}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  // Format: YYYYMMDD
  if (dateStr.length === 8) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function formatNumber(num?: number): string {
  if (!num) return 'N/A';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// ===== API Functions =====

/**
 * Check if backend is running
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get backend status info
 */
export async function getBackendStatus(): Promise<BackendStatus> {
  const response = await fetch(`${BACKEND_URL}/status`);
  return handleResponse(response);
}

/**
 * Get media info from URL
 */
export async function getMediaInfo(url: string): Promise<MediaInfo> {
  const response = await fetch(`${BACKEND_URL}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return handleResponse(response);
}

/**
 * Start media download
 */
export async function startDownload(
  url: string,
  format: 'best' | 'audio' | 'video_only' = 'best',
  quality: '360' | '480' | '720' | '1080' | '4k' = '1080'
): Promise<{ task_id: string; message: string }> {
  const response = await fetch(`${BACKEND_URL}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format, quality }),
  });
  return handleResponse(response);
}

/**
 * Get download progress
 */
export async function getDownloadProgress(taskId: string): Promise<DownloadProgress> {
  const response = await fetch(`${BACKEND_URL}/progress/${taskId}`);
  return handleResponse(response);
}

/**
 * Get file download URL
 */
export function getFileUrl(filename: string): string {
  return `${BACKEND_URL}/file/${encodeURIComponent(filename)}`;
}

/**
 * Delete downloaded file
 */
export async function deleteFile(filename: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/file/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(error.detail);
  }
}

/**
 * List all downloaded files
 */
export async function listFiles(): Promise<DownloadedFile[]> {
  const response = await fetch(`${BACKEND_URL}/files`);
  const data = await handleResponse<{ files: DownloadedFile[] }>(response);
  return data.files;
}

/**
 * Clear all downloaded files
 */
export async function clearFiles(): Promise<{ message: string }> {
  const response = await fetch(`${BACKEND_URL}/files`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}
