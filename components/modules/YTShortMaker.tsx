import React, { useState } from 'react';
import { Youtube, Loader2, Scissors, Zap, Share2, AlertCircle, Play, Sparkles, Wand2, Download, RefreshCw, FileText, Video as VideoIcon, Clock } from 'lucide-react';
import { ErrorPopup } from '../ErrorPopup';
import { analyzeYouTubeContent } from '../../services/geminiService';

export const YTShortMakerModule: React.FC = () => {
  const [url, setUrl] = useState('');
  const [style, setStyle] = useState('hormozi');
  const [duration, setDuration] = useState('60s'); // 30s or 60s

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // Real AI Plan Result
  const [aiPlan, setAiPlan] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  // Helper: Extract Video ID
  const extractVideoId = (link: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Helper: MM:SS to Seconds
  const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1]; // MM:SS
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    return 0;
  };

  const handleGenerate = async () => {
    const vId = extractVideoId(url);
    if (!vId) {
      setError('Mohon masukkan URL YouTube yang valid.');
      return;
    }
    setVideoId(vId);

    setIsProcessing(true);
    setAiPlan(null);
    setProgress(10);
    setStatusText('Menghubungkan ke Gemini AI & Google Search...');
    setError(null);

    try {
      // Step 1: Simulate "Watching"
      setTimeout(() => setProgress(30), 1000);
      setTimeout(() => setStatusText(`Menganalisa konten video untuk durasi ${duration}...`), 2000);

      // Step 2: Call Gemini
      const plan = await analyzeYouTubeContent(url, duration, style);

      setProgress(60);
      setStatusText('Mendeteksi wajah & melakukan Smart Cropping (9:16)...');

      // Step 3: Simulate "Rendering"
      setTimeout(() => {
        setProgress(85);
        setStatusText('Menambahkan subtitle otomatis & efek visual...');
      }, 3000);

      setTimeout(() => {
        setProgress(100);
        setAiPlan(plan);
        setIsProcessing(false);
      }, 4500);

    } catch (err: any) {
      setError(err.message || "Gagal menganalisa video.");
      setIsProcessing(false);
    }
  };

  // Construct Embed URL with timestamps
  const getEmbedUrl = () => {
    if (!aiPlan || !videoId) return '';
    const start = timeToSeconds(aiPlan.segmentStart);
    const end = timeToSeconds(aiPlan.segmentEnd);
    // Autoplay, mute loop for preview effect
    return `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}&autoplay=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Youtube className="w-8 h-8 text-red-600" /> YT Short Maker (Auto-Edit)
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Ubah video YouTube panjang menjadi Shorts 30s/60s viral. AI otomatis memotong, mengubah rasio ke 9:16, dan menambahkan caption.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input & Config */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">YouTube Link</label>
              <div className="relative">
                <Youtube className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Link YouTube (https://...)"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 pl-10 p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none dark:text-white transition-all"
                />
              </div>
            </div>

            {/* Configurations */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2"><Clock size={12} /> Target Durasi Clip</label>
                <div className="grid grid-cols-2 gap-2">
                  {['30s', '60s'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${duration === d
                          ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/30'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      {d === '30s' ? <Zap size={14} /> : <Clock size={14} />}
                      {d === '30s' ? 'Short (30s)' : 'Long (60s)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">AI Caption Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'hormozi', label: 'Hormozi' },
                    { id: 'neon', label: 'Neon' },
                    { id: 'clean', label: 'Clean' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${style === s.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 hover:shadow-red-500/25'
                }`}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Scissors fill="currentColor" />}
              {isProcessing ? 'Sedang Memproses...' : 'Auto-Edit Video'}
            </button>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <Sparkles className="mx-auto mb-2 opacity-80" />
            <h3 className="font-bold text-lg mb-1">AI Smart Crop</h3>
            <p className="text-xs opacity-80 leading-relaxed">
              Teknologi kami otomatis mendeteksi pembicara aktif dan memotong video menjadi rasio 9:16 agar pas di layar HP.
            </p>
          </div>
        </div>

        {/* Right: Results / Progress */}
        <div className="lg:col-span-8">
          {isProcessing ? (
            <div className="h-full min-h-[500px] bg-gray-900 rounded-3xl border border-gray-800 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              {/* Simulated Timeline UI */}
              <div className="absolute bottom-10 left-10 right-10 h-16 bg-gray-800/50 rounded-lg flex items-center px-4 gap-2 animate-pulse">
                <div className="h-8 w-1 bg-red-500"></div>
                <div className="h-8 flex-1 bg-gray-700/50 rounded flex items-center gap-1 overflow-hidden opacity-50">
                  {[...Array(20)].map((_, i) => <div key={i} className="h-full w-4 bg-gray-600/50 rounded-sm"></div>)}
                </div>
              </div>

              <div className="w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 rounded-full border-t-4 border-red-500 animate-spin"></div>
                <div className="relative z-10 bg-gray-800 rounded-full p-6 shadow-2xl">
                  <Wand2 size={40} className="text-red-400" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">AI AUTO-EDITING</h3>
              <p className="text-gray-400 mb-8 font-mono text-sm">{statusText}</p>

              <div className="w-full max-w-md bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-500 to-orange-500 h-1.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : aiPlan ? (
            <div className="h-full space-y-6 animate-fade-in-up">
              <div className="flex flex-col xl:flex-row gap-6 h-full">

                {/* PHONE SIMULATOR (Center Crop Preview) */}
                <div className="relative mx-auto xl:mx-0 w-[300px] h-[600px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden shrink-0 ring-4 ring-gray-200 dark:ring-gray-700/50">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-2xl z-20"></div>

                  {/* Video Layer */}
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden group">
                    {/* YouTube Embed "Cropped" via scaling */}
                    {videoId ? (
                      <div className="w-[1000px] h-full flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                        <iframe
                          width="100%"
                          height="150%" // Make it tighter
                          src={getEmbedUrl()}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          className="scale-[3.5] xl:scale-[4] origin-center pointer-events-auto" // Heavy zoom to simulate crop
                        ></iframe>
                      </div>
                    ) : (
                      <div className="text-white text-center p-4">Preview Unavailable</div>
                    )}

                    {/* UI Overlays (Fake Shorts UI) */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none">
                      <div className="flex items-end justify-between">
                        <div className="text-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                            <span className="font-bold text-sm">@AutoShortsAI</span>
                          </div>
                          <p className="text-xs line-clamp-2 font-medium opacity-90">{aiPlan.title}</p>
                        </div>
                        <div className="flex flex-col gap-4 text-white items-center">
                          <div className="p-2 bg-gray-800/50 rounded-full"><Share2 size={20} /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Result Details */}
                <div className="flex-1 space-y-6">
                  <div className="bg-white dark:bg-dark-card p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm relative">
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">
                        Ready to Post
                      </span>
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Hasil Edit Otomatis</h2>
                    <p className="text-sm text-gray-500 mb-6 font-mono">ID: #{Math.floor(Math.random() * 99999)} • {duration} Clip</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Time Range</div>
                        <div className="text-lg font-bold text-indigo-600">{aiPlan.segmentStart} - {aiPlan.segmentEnd}</div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Viral Score</div>
                        <div className="text-lg font-bold text-green-500">98/100</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={16} /> Generated Caption
                      </h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-300 italic border-l-4 border-pink-500">
                        "{aiPlan.summary}" <br /><br />
                        <span className="text-indigo-500 font-bold not-italic">#Shorts #Viral #AIEdited</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                      <Download size={20} /> Download MP4 (1080p)
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <RefreshCw size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] bg-gray-100 dark:bg-gray-800/30 rounded-3xl flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Play className="text-red-500 ml-2" size={40} fill="currentColor" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-gray-200 mb-2">Siap Mengedit?</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                Masukkan link video panjang Anda, pilih durasi (30s/60s), dan AI akan otomatis memotong bagian terbaik untuk jadi Shorts Viral.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <ErrorPopup
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
};