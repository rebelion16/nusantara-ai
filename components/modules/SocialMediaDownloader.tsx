/**
 * Social Media Downloader Module
 * Download video/gambar dari Instagram, TikTok, YouTube, Twitter, dll.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Download,
    Link,
    AlertCircle,
    CheckCircle,
    Loader2,
    Trash2,
    RefreshCw,
    Music,
    Video,
    FileVideo,
    Eye,
    Heart,
    Calendar,
    User,
    Clock,
    XCircle,
    Play,
    Server,
    Settings,
    Save,
    ExternalLink,
} from 'lucide-react';
import {
    checkBackendHealth,
    getMediaInfo,
    startDownload,
    getDownloadProgress,
    getFileUrl,
    detectPlatform,
    getPlatformColor,
    getPlatformIcon,
    formatDuration,
    formatFileSize,
    formatNumber,
    formatDate,
    listFiles,
    deleteFile,
    clearFiles,
    getBackendUrl,
    setBackendUrl,
    clearBackendUrl,
    isUsingCustomBackendUrl,
    MediaInfo,
    DownloadProgress,
    DownloadedFile,
    Platform,
} from '../../services/socialDownloaderService';

// ===== Types =====

type DownloadFormat = 'best' | 'audio' | 'video_only';
type QualityOption = '360' | '480' | '720' | '1080' | '4k';
type TabId = 'download' | 'history' | 'settings';

interface DownloadHistoryItem {
    id: string;
    title: string;
    platform: Platform;
    thumbnail?: string;
    filename: string;
    size: number;
    createdAt: Date;
}

// ===== Components =====

const PlatformBadge: React.FC<{ platform: Platform }> = ({ platform }) => (
    <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium bg-gradient-to-r ${getPlatformColor(platform)}`}
    >
        <span>{getPlatformIcon(platform)}</span>
        <span className="capitalize">{platform}</span>
    </div>
);

interface BackendOfflineOverlayProps {
    onRetry: () => void;
    backendUrl: string;
    onBackendUrlChange: (url: string) => void;
    onSaveUrl: () => void;
}

const BackendOfflineOverlay: React.FC<BackendOfflineOverlayProps> = ({
    onRetry,
    backendUrl,
    onBackendUrlChange,
    onSaveUrl,
}) => (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
        <div className="text-center p-8 max-w-lg">
            <Server className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Backend Offline</h3>
            <p className="text-gray-300 mb-4">
                Server backend tidak terhubung. Masukkan URL tunnel atau jalankan backend lokal:
            </p>

            {/* Backend URL Input */}
            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2 text-left">
                    URL Backend (Cloudflare Tunnel)
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={backendUrl}
                        onChange={(e) => onBackendUrlChange(e.target.value)}
                        placeholder="https://xxxx.trycloudflare.com"
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <button
                        onClick={onSaveUrl}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Simpan
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-left">
                    Salin URL dari output run_with_tunnel.bat
                </p>
            </div>

            <div className="flex gap-3 justify-center">
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Coba Lagi
                </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
                Atau jalankan backend lokal: <code className="text-green-400">cd social_backend && run_with_tunnel.bat</code>
            </div>
        </div>
    </div>
);

const ProgressBar: React.FC<{ progress: DownloadProgress }> = ({ progress }) => {
    const getStatusColor = () => {
        switch (progress.status) {
            case 'completed':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            case 'downloading':
            case 'processing':
                return 'bg-primary-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        switch (progress.status) {
            case 'pending':
                return 'Memulai...';
            case 'downloading':
                return `Mengunduh... ${progress.speed || ''} ${progress.eta ? `(ETA: ${progress.eta})` : ''}`;
            case 'processing':
                return 'Memproses video...';
            case 'completed':
                return 'Selesai!';
            case 'error':
                return `Error: ${progress.error}`;
            default:
                return progress.status;
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{getStatusText()}</span>
                <span className="font-medium text-gray-900 dark:text-white">{progress.progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getStatusColor()} transition-all duration-300 rounded-full`}
                    style={{ width: `${progress.progress}%` }}
                />
            </div>
        </div>
    );
};

// ===== Main Module =====

export const SocialMediaDownloaderModule: React.FC = () => {
    // State
    const [url, setUrl] = useState('');
    const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [infoError, setInfoError] = useState<string | null>(null);

    const [format, setFormat] = useState<DownloadFormat>('best');
    const [quality, setQuality] = useState<QualityOption>('1080');

    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

    const [activeTab, setActiveTab] = useState<TabId>('download');
    const [downloadHistory, setDownloadHistory] = useState<DownloadedFile[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Backend URL state
    const [backendUrlInput, setBackendUrlInput] = useState(getBackendUrl());

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Detect platform from URL
    const detectedPlatform = url ? detectPlatform(url) : 'unknown';

    // ===== Effects =====

    // Check backend on mount
    useEffect(() => {
        setBackendUrlInput(getBackendUrl());
        checkBackend();
    }, []);

    // Load history when tab changes
    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    // ===== Functions =====

    const checkBackend = async () => {
        const online = await checkBackendHealth();
        setIsBackendOnline(online);
    };

    const handleSaveBackendUrl = () => {
        setBackendUrl(backendUrlInput);
        checkBackend();
    };

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const files = await listFiles();
            setDownloadHistory(files);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleGetInfo = async () => {
        if (!url.trim()) return;

        setIsLoadingInfo(true);
        setInfoError(null);
        setMediaInfo(null);
        setDownloadProgress(null);

        try {
            const info = await getMediaInfo(url);
            setMediaInfo(info);
        } catch (err) {
            setInfoError(err instanceof Error ? err.message : 'Gagal mengambil info');
        } finally {
            setIsLoadingInfo(false);
        }
    };

    const handleStartDownload = async () => {
        if (!url.trim()) return;

        setDownloadProgress(null);

        try {
            const result = await startDownload(url, format, quality);
            setIsPolling(true);

            // Start polling for progress
            pollingRef.current = setInterval(async () => {
                try {
                    const progress = await getDownloadProgress(result.task_id);
                    setDownloadProgress(progress);

                    if (progress.status === 'completed' || progress.status === 'error') {
                        if (pollingRef.current) {
                            clearInterval(pollingRef.current);
                            pollingRef.current = null;
                        }
                        setIsPolling(false);
                    }
                } catch {
                    // Ignore polling errors
                }
            }, 500);
        } catch (err) {
            setDownloadProgress({
                task_id: '',
                status: 'error',
                progress: 0,
                error: err instanceof Error ? err.message : 'Gagal memulai download',
            });
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Hapus semua file download?')) return;
        try {
            await clearFiles();
            setDownloadHistory([]);
        } catch (err) {
            alert('Gagal menghapus file');
        }
    };

    const handleDeleteFile = async (filename: string) => {
        try {
            await deleteFile(filename);
            setDownloadHistory((prev) => prev.filter((f) => f.filename !== filename));
        } catch (err) {
            alert('Gagal menghapus file');
        }
    };

    const handleReset = () => {
        setUrl('');
        setMediaInfo(null);
        setInfoError(null);
        setDownloadProgress(null);
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setIsPolling(false);
    };

    // ===== Render =====

    return (
        <div className="relative min-h-[600px]">
            {/* Backend Offline Overlay */}
            {isBackendOnline === false && (
                <BackendOfflineOverlay
                    onRetry={checkBackend}
                    backendUrl={backendUrlInput}
                    onBackendUrlChange={setBackendUrlInput}
                    onSaveUrl={handleSaveBackendUrl}
                />
            )}

            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
                    Social Media Downloader
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Download video & gambar dari Instagram, TikTok, YouTube, Twitter, dan lainnya
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('download')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${activeTab === 'download'
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <Download className="w-5 h-5 inline-block mr-2" />
                    Download
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${activeTab === 'history'
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <FileVideo className="w-5 h-5 inline-block mr-2" />
                    Riwayat ({downloadHistory.length})
                </button>
            </div>

            {/* Download Tab */}
            {activeTab === 'download' && (
                <div className="space-y-6">
                    {/* URL Input */}
                    <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            URL Media
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
                                    {getPlatformIcon(detectedPlatform)}
                                </div>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste URL dari Instagram, TikTok, YouTube, dll..."
                                    className="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleGetInfo}
                                disabled={!url.trim() || isLoadingInfo}
                                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {isLoadingInfo ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Link className="w-5 h-5" />
                                )}
                                Ambil Info
                            </button>
                        </div>

                        {/* Platform detected badge */}
                        {url && detectedPlatform !== 'unknown' && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Terdeteksi:</span>
                                <PlatformBadge platform={detectedPlatform} />
                            </div>
                        )}

                        {/* Error */}
                        {infoError && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-red-600 dark:text-red-400">{infoError}</p>
                            </div>
                        )}
                    </div>

                    {/* Media Info Preview */}
                    {mediaInfo && (
                        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Thumbnail */}
                                {mediaInfo.thumbnail && (
                                    <div className="w-full md:w-72 flex-shrink-0">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            <img
                                                src={mediaInfo.thumbnail}
                                                alt={mediaInfo.title}
                                                className="w-full h-full object-cover"
                                            />
                                            {mediaInfo.duration && (
                                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-sm rounded">
                                                    {formatDuration(mediaInfo.duration)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <PlatformBadge platform={mediaInfo.platform as Platform} />
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                                            {mediaInfo.title}
                                        </h3>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        {mediaInfo.uploader && (
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-4 h-4" />
                                                <span>{mediaInfo.uploader}</span>
                                            </div>
                                        )}
                                        {mediaInfo.view_count && (
                                            <div className="flex items-center gap-1.5">
                                                <Eye className="w-4 h-4" />
                                                <span>{formatNumber(mediaInfo.view_count)} views</span>
                                            </div>
                                        )}
                                        {mediaInfo.like_count && (
                                            <div className="flex items-center gap-1.5">
                                                <Heart className="w-4 h-4" />
                                                <span>{formatNumber(mediaInfo.like_count)} likes</span>
                                            </div>
                                        )}
                                        {mediaInfo.upload_date && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(mediaInfo.upload_date)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Format Options */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Format
                                            </label>
                                            <select
                                                value={format}
                                                onChange={(e) => setFormat(e.target.value as DownloadFormat)}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white"
                                            >
                                                <option value="best">Video + Audio (Best)</option>
                                                <option value="audio">Audio Only (MP3)</option>
                                                <option value="video_only">Video Only</option>
                                            </select>
                                        </div>
                                        {format !== 'audio' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Kualitas
                                                </label>
                                                <select
                                                    value={quality}
                                                    onChange={(e) => setQuality(e.target.value as QualityOption)}
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white"
                                                >
                                                    <option value="360">360p</option>
                                                    <option value="480">480p</option>
                                                    <option value="720">720p HD</option>
                                                    <option value="1080">1080p Full HD</option>
                                                    <option value="4k">4K Ultra HD</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Available Formats */}
                                    {mediaInfo.formats && mediaInfo.formats.length > 0 && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            <span className="font-medium">Format tersedia: </span>
                                            {mediaInfo.formats.map((f, i) => (
                                                <span key={i}>
                                                    {f.quality}
                                                    {f.filesize && ` (${formatFileSize(f.filesize)})`}
                                                    {i < mediaInfo.formats.length - 1 && ', '}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Download Progress */}
                            {downloadProgress && (
                                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <ProgressBar progress={downloadProgress} />

                                    {/* Download button when completed */}
                                    {downloadProgress.status === 'completed' && downloadProgress.filename && (
                                        <div className="mt-4 flex gap-3">
                                            <a
                                                href={getFileUrl(downloadProgress.filename)}
                                                download
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                            >
                                                <Download className="w-5 h-5" />
                                                Download File
                                            </a>
                                            <button
                                                onClick={handleReset}
                                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                Download Lagi
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Download Button */}
                            {(!downloadProgress || downloadProgress.status === 'error') && (
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={handleStartDownload}
                                        disabled={isPolling}
                                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isPolling ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Download className="w-5 h-5" />
                                        )}
                                        Mulai Download
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Supported Platforms */}
                    <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Platform yang Didukung
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {(['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'pinterest', 'threads'] as Platform[]).map(
                                (p) => (
                                    <PlatformBadge key={p} platform={p} />
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Riwayat Download
                        </h3>
                        {downloadHistory.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                                <Trash2 className="w-4 h-4" />
                                Hapus Semua
                            </button>
                        )}
                    </div>

                    {isLoadingHistory ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                        </div>
                    ) : downloadHistory.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Belum ada file yang didownload</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {downloadHistory.map((file) => (
                                <div
                                    key={file.filename}
                                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                >
                                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                                        <FileVideo className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {file.filename}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatFileSize(file.size)} • {new Date(file.created).toLocaleDateString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={getFileUrl(file.filename)}
                                            download
                                            className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                                        >
                                            <Download className="w-5 h-5" />
                                        </a>
                                        <button
                                            onClick={() => handleDeleteFile(file.filename)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SocialMediaDownloaderModule;
