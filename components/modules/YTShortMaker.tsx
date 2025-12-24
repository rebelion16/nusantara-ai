
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Video, Mic, FileText, Scissors, Type, Music, Download,
  Play, Pause, Loader2, AlertCircle, Check, ChevronRight, Sparkles,
  Clock, Trash2, Volume2, VolumeX, RefreshCw, Server, Settings,
  Zap, X, Edit3, SkipForward, SkipBack
} from 'lucide-react';

import {
  checkBackendHealth,
  uploadVideo,
  transcribeVideo,
  detectHighlights,
  cutVideo,
  addCaptions,
  getMusicTracks,
  addMusicTrack,
  addCustomMusic,
  exportShort,
  getPreviewUrl,
  getDownloadUrl,
  formatTime,
  formatTimeLong,
  formatFileSize,
  getCategoryColor,
  getCategoryEmoji,
  DEFAULT_CAPTION_STYLE,
  getYouTubeInfo,
  downloadYouTubeVideo,
  isYouTubeUrl,
  getYouTubeProgress,
  type TranscriptSegment,
  type HighlightSegment,
  type CaptionStyle,
  type MusicTrack,
  type VideoInfo,
  type YouTubeVideoInfo,
  type DownloadProgress
} from '../../services/ytShortService';

import { GPUStatusComponent } from '../GPUStatus';

// ===== Types =====

type Step = 'upload' | 'transcribe' | 'highlights' | 'edit' | 'captions' | 'music' | 'export';

interface StepInfo {
  id: Step;
  label: string;
  icon: React.ReactNode;
}

// ===== Constants =====

const STEPS: StepInfo[] = [
  { id: 'upload', label: 'Upload Video', icon: <Upload size={18} /> },
  { id: 'transcribe', label: 'Transcribe', icon: <Mic size={18} /> },
  { id: 'highlights', label: 'AI Highlights', icon: <Sparkles size={18} /> },
  { id: 'edit', label: 'Cut & Crop', icon: <Scissors size={18} /> },
  { id: 'captions', label: 'Captions', icon: <Type size={18} /> },
  { id: 'music', label: 'Music', icon: <Music size={18} /> },
  { id: 'export', label: 'Export', icon: <Download size={18} /> },
];

const CONTENT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'vlog', label: 'Vlog' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'review', label: 'Review' },
];

const FONT_OPTIONS = ['Arial', 'Helvetica', 'Impact', 'Comic Sans MS', 'Verdana', 'Georgia'];
const FONT_SIZES = [24, 32, 40, 48, 56, 64];
const POSITION_OPTIONS = [
  { value: 'top', label: 'Atas' },
  { value: 'center', label: 'Tengah' },
  { value: 'bottom', label: 'Bawah' },
];

// ===== Component =====

export const YTShortMakerModule: React.FC = () => {
  // ----- State -----
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Video states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // YouTube URL states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeInfo, setYoutubeInfo] = useState<YouTubeVideoInfo | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'youtube'>('file');

  // Transcript states
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [fullTranscript, setFullTranscript] = useState('');
  const [transcriptLanguage, setTranscriptLanguage] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  // Highlight states
  const [highlights, setHighlights] = useState<HighlightSegment[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<HighlightSegment | null>(null);
  const [contentType, setContentType] = useState('general');
  const [numHighlights, setNumHighlights] = useState(5);

  // Clip editing states
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(60);
  const [convertVertical, setConvertVertical] = useState(true);

  // Caption states
  const [captions, setCaptions] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [showCaptionPreview, setShowCaptionPreview] = useState(true);

  // Music states
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [customMusicFile, setCustomMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [originalVolume, setOriginalVolume] = useState(1.0);

  // Export states
  const [exportResolution, setExportResolution] = useState<'720p' | '1080p'>('1080p');
  const [exportQuality, setExportQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [exportedVideoId, setExportedVideoId] = useState<string | null>(null);

  // Download progress state
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  // Transcription engine state
  type TranscriptionEngine = 'gemini' | 'gpu' | 'cpu';
  const [selectedEngine, setSelectedEngine] = useState<TranscriptionEngine>('gemini');
  const [availableEngines, setAvailableEngines] = useState<Array<{ id: string, name: string, available: boolean }>>([]);

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ----- Effects -----

  // Check backend health on mount and load available engines
  useEffect(() => {
    const check = async () => {
      const online = await checkBackendHealth();
      setBackendOnline(online);

      // Fetch available engines from status endpoint
      if (online) {
        try {
          const response = await fetch(`${import.meta.env.VITE_YTSHORT_BACKEND_URL || 'http://localhost:8000'}/status`);
          if (response.ok) {
            const data = await response.json();
            if (data.engines) {
              setAvailableEngines(data.engines);
              // Auto-select first available engine
              if (data.engines.length > 0 && !data.engines.find((e: any) => e.id === selectedEngine)) {
                setSelectedEngine(data.engines[0].id as TranscriptionEngine);
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch engines:', e);
        }
      }
    };
    check();
    const interval = setInterval(check, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Load music tracks
  useEffect(() => {
    if (backendOnline) {
      getMusicTracks().then(setMusicTracks).catch(console.error);
    }
  }, [backendOnline]);

  // Update captions from transcript when highlight is selected
  useEffect(() => {
    if (selectedHighlight && transcript.length > 0) {
      const relevantSegments = transcript.filter(
        seg => seg.start >= selectedHighlight.start && seg.end <= selectedHighlight.end
      );
      setCaptions(relevantSegments.map(seg => ({
        start: seg.start - selectedHighlight.start, // Relative to clip start
        end: seg.end - selectedHighlight.start,
        text: seg.text
      })));
      setClipStart(selectedHighlight.start);
      setClipEnd(selectedHighlight.end);
    }
  }, [selectedHighlight, transcript]);

  // ----- Handlers -----

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) return;

    setIsLoading(true);
    setLoadingMessage('Uploading video...');
    setError(null);

    try {
      const result = await uploadVideo(videoFile);
      setVideoId(result.video_id);
      setVideoInfo(result.info);
      setCurrentVideoId(result.video_id);
      setClipEnd(Math.min(60, result.info.duration));
      setCurrentStep('transcribe');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleYoutubeUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    setYoutubeInfo(null);
    setError(null);

    if (url && isYouTubeUrl(url)) {
      try {
        setLoadingMessage('Memuat info video...');
        const info = await getYouTubeInfo(url);
        setYoutubeInfo(info);
      } catch (err: any) {
        // Silently fail - user will see error when trying to download
        console.log('Could not fetch YouTube info:', err);
      }
    }
  };

  const handleYoutubeDownload = async () => {
    if (!youtubeUrl) return;

    setIsLoading(true);
    setLoadingMessage('Memulai download...');
    setError(null);
    setDownloadProgress(null);

    // Start progress polling
    let isDownloading = true;
    const pollProgress = async () => {
      while (isDownloading) {
        try {
          const progress = await getYouTubeProgress();
          setDownloadProgress(progress);

          if (progress.status === 'downloading') {
            setLoadingMessage(
              `Mengunduh: ${progress.percent.toFixed(1)}% | ${progress.speed} | ETA: ${progress.eta}`
            );
          } else if (progress.status === 'finished') {
            setLoadingMessage('Download selesai, memproses video...');
          }
        } catch (e) {
          // Ignore polling errors
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    // Start polling in background
    pollProgress();

    try {
      const result = await downloadYouTubeVideo(youtubeUrl);
      isDownloading = false; // Stop polling
      setVideoId(result.video_id);
      setVideoInfo(result.info);
      setCurrentVideoId(result.video_id);
      setClipEnd(Math.min(60, result.info.duration));
      setDownloadProgress(null);
      setCurrentStep('transcribe');
    } catch (err: any) {
      isDownloading = false; // Stop polling
      setDownloadProgress(null);
      setError(err.message || 'Download gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!videoId) return;

    // API key only needed for Gemini engine
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY;

    if (selectedEngine === 'gemini' && !apiKey) {
      setError('API Key Gemini diperlukan untuk engine Gemini. Tambahkan di halaman Settings atau pilih GPU/CPU.');
      return;
    }

    setIsLoading(true);
    const engineNames: Record<string, string> = {
      'gemini': 'Gemini AI (Cloud)',
      'gpu': 'Whisper GPU (Local)',
      'cpu': 'Whisper CPU (Local)'
    };
    setLoadingMessage(`Transcribing dengan ${engineNames[selectedEngine]}... Ini mungkin memakan waktu beberapa menit.`);
    setError(null);

    try {
      const result = await transcribeVideo(
        videoId,
        selectedLanguage || undefined,
        apiKey,
        selectedEngine
      );
      setTranscript(result.segments);
      setFullTranscript(result.text);
      setTranscriptLanguage(result.language);
      setCurrentStep('highlights');
    } catch (err: any) {
      setError(err.message || 'Transcription failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectHighlights = async () => {
    if (!transcript.length) return;

    // API key optional untuk versi offline
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || undefined;

    setIsLoading(true);
    setLoadingMessage('Menganalisis transcript untuk menemukan momen menarik...');
    setError(null);

    try {
      const result = await detectHighlights(transcript, apiKey, {
        targetDuration: 60,
        numHighlights,
        contentType,
      });
      setHighlights(result.highlights);
      if (result.highlights.length > 0) {
        const firstHighlight = result.highlights[0];
        setSelectedHighlight(firstHighlight);
        setClipStart(firstHighlight.start);
        setClipEnd(firstHighlight.end);
      }
      setCurrentStep('edit');
    } catch (err: any) {
      setError(err.message || 'Highlight detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCutVideo = async () => {
    if (!videoId) return;

    setIsLoading(true);
    setLoadingMessage('Cutting video & converting to vertical format...');
    setError(null);

    try {
      const result = await cutVideo(videoId, clipStart, clipEnd, convertVertical);
      setCurrentVideoId(result.video_id);

      // Adjust captions to be relative to new video
      setCaptions(prev => prev.map(cap => ({
        ...cap,
        start: cap.start - clipStart,
        end: cap.end - clipStart,
      })).filter(cap => cap.start >= 0 && cap.end <= (clipEnd - clipStart)));

      setCurrentStep('captions');
    } catch (err: any) {
      setError(err.message || 'Cut failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCaptions = async () => {
    if (!currentVideoId || !captions.length) {
      setCurrentStep('music');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Burning captions into video...');
    setError(null);

    try {
      const result = await addCaptions(currentVideoId, captions, captionStyle);
      setCurrentVideoId(result.video_id);
      setCurrentStep('music');
    } catch (err: any) {
      setError(err.message || 'Caption burning failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMusic = async () => {
    if (!currentVideoId) return;

    // Skip if no music selected
    if (!selectedTrackId && !customMusicFile) {
      setCurrentStep('export');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Adding background music...');
    setError(null);

    try {
      let result;
      if (customMusicFile) {
        result = await addCustomMusic(currentVideoId, customMusicFile, {
          musicVolume,
          originalVolume,
        });
      } else if (selectedTrackId) {
        result = await addMusicTrack(currentVideoId, selectedTrackId, {
          musicVolume,
          originalVolume,
        });
      }
      if (result) {
        setCurrentVideoId(result.video_id);
      }
      setCurrentStep('export');
    } catch (err: any) {
      setError(err.message || 'Music addition failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentVideoId) return;

    setIsLoading(true);
    setLoadingMessage('Exporting final short with optimized settings...');
    setError(null);

    try {
      const result = await exportShort(currentVideoId, {
        resolution: exportResolution,
        quality: exportQuality,
      });
      setExportedVideoId(result.video_id);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setVideoFile(null);
    setVideoId(null);
    setVideoInfo(null);
    setCurrentVideoId(null);
    setTranscript([]);
    setFullTranscript('');
    setHighlights([]);
    setSelectedHighlight(null);
    setCaptions([]);
    setExportedVideoId(null);
    setError(null);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // ----- Render Helpers -----

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isPast = STEPS.findIndex(s => s.id === currentStep) > idx;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => isPast && setCurrentStep(step.id)}
              disabled={!isPast}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                ? 'bg-red-500 text-white shadow-lg scale-105'
                : isPast
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-200'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
            >
              {isPast ? <Check size={14} /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderBackendStatus = () => (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${backendOnline === null
      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
      : backendOnline
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      }`}>
      <Server size={12} />
      {backendOnline === null ? 'Checking...' : backendOnline ? 'Backend Online' : 'Backend Offline'}
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Video Panjang</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Upload video atau paste link YouTube yang ingin dipotong menjadi Shorts
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button
          onClick={() => setUploadMode('file')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${uploadMode === 'file'
            ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Upload size={16} /> Upload File
        </button>
        <button
          onClick={() => setUploadMode('youtube')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${uploadMode === 'youtube'
            ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Video size={16} /> YouTube URL
        </button>
      </div>

      {uploadMode === 'file' ? (
        /* File Upload Section */
        <>
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${videoFile
              ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
              : 'border-gray-300 dark:border-gray-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
              }`}
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer block">
              {videoFile ? (
                <div className="space-y-3">
                  <Video size={48} className="mx-auto text-green-500" />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{videoFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(videoFile.size)}</p>
                  </div>
                  <p className="text-xs text-green-600">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload size={48} className="mx-auto text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-bold text-red-500">Click to upload</span> atau drag & drop
                  </p>
                  <p className="text-xs text-gray-400">MP4, MOV, AVI, MKV (max 2GB)</p>
                </div>
              )}
            </label>
          </div>

          {videoFile && (
            <button
              onClick={handleUpload}
              disabled={isLoading || !backendOnline}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              {isLoading ? loadingMessage : 'Upload Video'}
            </button>
          )}
        </>
      ) : (
        /* YouTube URL Section */
        <>
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
                className="w-full p-4 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
              {youtubeUrl && (
                <button
                  onClick={() => { setYoutubeUrl(''); setYoutubeInfo(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* YouTube Video Preview */}
            {youtubeInfo && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex gap-4 animate-fade-in">
                <img
                  src={youtubeInfo.thumbnail}
                  alt={youtubeInfo.title}
                  className="w-32 h-20 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white line-clamp-2">{youtubeInfo.title}</h4>
                  <p className="text-sm text-gray-500">{youtubeInfo.channel}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    <span>⏱️ {formatTimeLong(youtubeInfo.duration)}</span>
                    <span>👁️ {youtubeInfo.view_count.toLocaleString()} views</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {youtubeUrl && isYouTubeUrl(youtubeUrl) && (
            <div className="space-y-3">
              <button
                onClick={handleYoutubeDownload}
                disabled={isLoading || !backendOnline}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                {isLoading ? 'Mengunduh dari YouTube...' : 'Download dari YouTube'}
              </button>

              {/* Download Progress Bar */}
              {isLoading && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 space-y-3 animate-fade-in">
                  {/* Progress Bar */}
                  <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${downloadProgress?.percent || 0}%` }}
                    />
                    {downloadProgress && downloadProgress.percent > 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow">
                          {downloadProgress.percent.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-500">Memulai download...</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Stats */}
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Download size={14} className="text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {downloadProgress?.downloaded || '0 B'} / {downloadProgress?.total || '...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Zap size={14} className="text-yellow-500" />
                        {downloadProgress?.speed || '-- KB/s'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-blue-500" />
                        ETA: {downloadProgress?.eta || '--:--'}
                      </span>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="text-xs text-center text-gray-500">
                    {downloadProgress?.status === 'finished'
                      ? '✅ Download selesai, memproses video...'
                      : downloadProgress?.status === 'downloading'
                        ? `📥 Mengunduh: ${downloadProgress.filename || 'video'}`
                        : '⏳ Menunggu koneksi ke YouTube...'
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-center text-gray-400">
            ⚠️ Pastikan video tidak memiliki copyright. Download membutuhkan waktu tergantung durasi video.
          </p>
        </>
      )}
    </div>
  );

  const renderTranscribeStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Transcribe Audio</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Whisper AI akan mengubah audio menjadi teks dengan timestamps
        </p>
      </div>

      {/* Video info */}
      {videoInfo && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase">Duration</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatTimeLong(videoInfo.duration)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Resolution</p>
            <p className="font-bold text-gray-900 dark:text-white">{videoInfo.width}x{videoInfo.height}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Size</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatFileSize(videoInfo.size)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Format</p>
            <p className="font-bold text-gray-900 dark:text-white">{videoInfo.format}</p>
          </div>
        </div>
      )}

      {/* Language selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Bahasa (opsional, auto-detect jika kosong)
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Auto-detect</option>
          <option value="id">Indonesian</option>
          <option value="en">English</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="zh">Chinese</option>
        </select>
      </div>

      {/* Engine selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Transcription Engine
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableEngines.length > 0 ? (
            availableEngines.map((eng) => (
              <button
                key={eng.id}
                onClick={() => setSelectedEngine(eng.id as TranscriptionEngine)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedEngine === eng.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selectedEngine === eng.id ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {eng.id === 'gemini' && '☁️ '}
                    {eng.id === 'gpu' && '🚀 '}
                    {eng.id === 'cpu' && '💻 '}
                    {eng.name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-5">
                  {eng.id === 'gemini' && 'Memerlukan API key'}
                  {eng.id === 'gpu' && 'Tercepat, butuh NVIDIA GPU'}
                  {eng.id === 'cpu' && 'Lebih lambat, tanpa GPU'}
                </p>
              </button>
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-500 text-sm py-4">
              Loading available engines...
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleTranscribe}
        disabled={isLoading || availableEngines.length === 0}
        className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
        {isLoading ? loadingMessage : `Start Transcription (${selectedEngine.toUpperCase()})`}
      </button>

      <p className="text-xs text-center text-gray-400">
        ⚠️ Proses transcription membutuhkan waktu 1-5 menit tergantung durasi video dan engine
      </p>
    </div>
  );

  const renderHighlightsStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Highlight Detection</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Gemini AI akan menganalisis transcript dan menemukan momen paling menarik
        </p>
      </div>

      {/* Transcript preview */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 max-h-48 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-500 uppercase">
            Transcript ({transcriptLanguage})
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {fullTranscript.slice(0, 500)}...
        </p>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            {CONTENT_TYPES.map(ct => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah Highlight</label>
          <select
            value={numHighlights}
            onChange={(e) => setNumHighlights(Number(e.target.value))}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            {[3, 5, 7, 10].map(n => (
              <option key={n} value={n}>{n} highlights</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleDetectHighlights}
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        {isLoading ? loadingMessage : 'Detect Viral Moments (Gemini AI)'}
      </button>
    </div>
  );

  const renderEditStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pilih & Edit Clip</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Pilih highlight atau atur manual timestamps untuk clip
        </p>
      </div>

      {/* Highlights list */}
      {highlights.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Zap size={16} className="text-yellow-500" />
            Detected Highlights
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {highlights.map((h, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedHighlight(h);
                  setClipStart(h.start);
                  setClipEnd(h.end);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selectedHighlight === h
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryEmoji(h.category)}</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate">{h.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{h.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: getCategoryColor(h.category) + '33', color: getCategoryColor(h.category) }}>
                      {h.score.toFixed(0)}%
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(h.start)} - {formatTime(h.end)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual clip editor */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Scissors size={16} />
          Clip Range
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">Start Time</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={clipStart}
                onChange={(e) => setClipStart(Number(e.target.value))}
                min={0}
                max={videoInfo?.duration || 0}
                step={0.1}
                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
              <span className="text-sm text-gray-500">s</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">End Time</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={clipEnd}
                onChange={(e) => setClipEnd(Number(e.target.value))}
                min={clipStart}
                max={videoInfo?.duration || 0}
                step={0.1}
                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
              <span className="text-sm text-gray-500">s</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Durasi: <strong>{formatTime(clipEnd - clipStart)}</strong>
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={convertVertical}
              onChange={(e) => setConvertVertical(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Convert ke 9:16 (Vertical)</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleCutVideo}
        disabled={isLoading || clipEnd <= clipStart}
        className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Scissors size={20} />}
        {isLoading ? loadingMessage : 'Cut Video'}
      </button>
    </div>
  );

  const renderCaptionsStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Caption Styling</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Edit dan style caption untuk video Shorts
        </p>
      </div>

      {/* Caption list */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
        {captions.length > 0 ? (
          captions.map((cap, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-500 w-20 shrink-0">
                {formatTime(cap.start)} - {formatTime(cap.end)}
              </span>
              <input
                type="text"
                value={cap.text}
                onChange={(e) => {
                  const newCaptions = [...captions];
                  newCaptions[idx].text = e.target.value;
                  setCaptions(newCaptions);
                }}
                className="flex-1 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
              <button
                onClick={() => setCaptions(captions.filter((_, i) => i !== idx))}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <X size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-4">No captions available</p>
        )}
      </div>

      {/* Style controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 uppercase">Font</label>
          <select
            value={captionStyle.font_name}
            onChange={(e) => setCaptionStyle({ ...captionStyle, font_name: e.target.value })}
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 uppercase">Size</label>
          <select
            value={captionStyle.font_size}
            onChange={(e) => setCaptionStyle({ ...captionStyle, font_size: Number(e.target.value) })}
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 uppercase">Position</label>
          <select
            value={captionStyle.position}
            onChange={(e) => setCaptionStyle({ ...captionStyle, position: e.target.value as any })}
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            {POSITION_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setCurrentStep('music')}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Skip Captions
        </button>
        <button
          onClick={handleAddCaptions}
          disabled={isLoading}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Type size={20} />}
          {isLoading ? 'Processing...' : 'Burn Captions'}
        </button>
      </div>
    </div>
  );

  const renderMusicStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Background Music</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Pilih musik built-in atau upload custom
        </p>
      </div>

      {/* Built-in tracks */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Music size={16} />
          Built-in Tracks
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => { setSelectedTrackId(null); setCustomMusicFile(null); }}
            className={`p-3 rounded-lg border text-left transition-all ${!selectedTrackId && !customMusicFile
              ? 'border-gray-400 bg-gray-100 dark:bg-gray-800'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
          >
            <div className="flex items-center gap-2">
              <VolumeX size={16} className="text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">No Music</span>
            </div>
          </button>
          {musicTracks.map(track => (
            <button
              key={track.id}
              onClick={() => { setSelectedTrackId(track.id); setCustomMusicFile(null); }}
              className={`p-3 rounded-lg border text-left transition-all ${selectedTrackId === track.id
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{track.name}</span>
                  <p className="text-xs text-gray-500">{track.mood} • {formatTime(track.duration)}</p>
                </div>
                <Music size={16} className="text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom upload */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 dark:text-gray-300">Custom Music</h4>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setCustomMusicFile(e.target.files[0]);
                setSelectedTrackId(null);
              }
            }}
            className="hidden"
            id="music-upload"
          />
          <label htmlFor="music-upload" className="cursor-pointer">
            {customMusicFile ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Check size={16} />
                <span>{customMusicFile.name}</span>
              </div>
            ) : (
              <span className="text-gray-500">Click to upload custom music (MP3, WAV)</span>
            )}
          </label>
        </div>
      </div>

      {/* Volume controls */}
      {(selectedTrackId || customMusicFile) && (
        <div className="space-y-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Music Volume</span>
              <span className="text-xs text-gray-500">{Math.round(musicVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Original Audio</span>
              <span className="text-xs text-gray-500">{Math.round(originalVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={originalVolume}
              onChange={(e) => setOriginalVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => setCurrentStep('export')}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Skip Music
        </button>
        <button
          onClick={handleAddMusic}
          disabled={isLoading}
          className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Music size={20} />}
          {isLoading ? 'Processing...' : 'Add Music'}
        </button>
      </div>
    </div>
  );

  const renderExportStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Export Short</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Final export dengan pengaturan optimal untuk YouTube Shorts
        </p>
      </div>

      {/* Video preview */}
      {currentVideoId && (
        <div className="aspect-[9/16] max-h-[400px] mx-auto bg-black rounded-xl overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            src={getPreviewUrl(currentVideoId)}
            className="w-full h-full object-contain"
            controls
            loop
          />
        </div>
      )}

      {/* Export settings */}
      {!exportedVideoId && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Resolution</label>
            <select
              value={exportResolution}
              onChange={(e) => setExportResolution(e.target.value as any)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <option value="720p">720p (HD)</option>
              <option value="1080p">1080p (Full HD)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality</label>
            <select
              value={exportQuality}
              onChange={(e) => setExportQuality(e.target.value as any)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <option value="low">Low (smaller file)</option>
              <option value="medium">Medium</option>
              <option value="high">High (best quality)</option>
            </select>
          </div>
        </div>
      )}

      {/* Export/Download buttons */}
      {exportedVideoId ? (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
            <Check size={32} className="mx-auto text-green-500 mb-2" />
            <p className="font-bold text-green-700 dark:text-green-400">Export Complete!</p>
          </div>

          <a
            href={getDownloadUrl(exportedVideoId)}
            download={`short_${Date.now()}.mp4`}
            className="block w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg text-center"
          >
            <Download size={20} className="inline mr-2" />
            Download Short (MP4)
          </a>

          <button
            onClick={handleReset}
            className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Create Another Short
          </button>
        </div>
      ) : (
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          {isLoading ? loadingMessage : 'Export Final Short'}
        </button>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload': return renderUploadStep();
      case 'transcribe': return renderTranscribeStep();
      case 'highlights': return renderHighlightsStep();
      case 'edit': return renderEditStep();
      case 'captions': return renderCaptionsStep();
      case 'music': return renderMusicStep();
      case 'export': return renderExportStep();
      default: return null;
    }
  };

  // ----- Main Render -----

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Video className="w-8 h-8 text-red-500" />
            YT Short Maker
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Ubah video panjang menjadi YouTube Shorts viral dengan AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          {backendOnline && <GPUStatusComponent />}
          {renderBackendStatus()}
        </div>
      </div>

      {/* Backend offline warning */}
      {backendOnline === false && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-bold text-red-700 dark:text-red-400">Backend Offline</h4>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Python backend tidak terdeteksi. Jalankan command berikut di terminal:
              </p>
              <pre className="mt-2 bg-red-100 dark:bg-red-900/40 p-2 rounded text-xs font-mono overflow-x-auto">
                cd backend && python main.py
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Main content card */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        {renderCurrentStep()}
      </div>
    </div>
  );
};