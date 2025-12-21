
import React, { useState, useCallback } from 'react';
import {
  generateVeoVideo,
  generateRandomPrompt,
  generateStoryScript,
  generateScenePrompts,
  type StoryScript,
  type ScenePrompt,
  type VideoTheme,
  type CameraMotion,
  THEME_LABELS,
  CAMERA_LABELS
} from '../../services/geminiService';
import {
  Loader2, Plus, Trash2, Sparkles, Video, Film, MessageSquare,
  Image as ImageIcon, X, BookOpen, Clapperboard, Play, Download,
  CheckCircle2, Clock, AlertCircle, Settings2, Megaphone, Eye,
  ChevronDown, ChevronUp, RefreshCw, Pause
} from 'lucide-react';
import { ErrorPopup } from '../ErrorPopup';

// ===== CONSTANTS =====

const CATEGORIES = [
  'Cinematic', 'Animation', 'Drone Shot', 'Cyberpunk',
  'Nature', 'Commercial', 'Fantasy', 'Horror', 'Documentary'
];

const RATIOS = [
  { id: '16:9', label: 'Landscape (16:9)' },
  { id: '9:16', label: 'Portrait (9:16)' }
];

const VIDEO_THEMES: VideoTheme[] = [
  'education', 'advertisement', 'short_story', 'tutorial', 'documentary', 'motivational'
];

const CAMERA_MOTIONS: CameraMotion[] = [
  'static', 'pan_left', 'pan_right', 'zoom_in', 'zoom_out',
  'dolly_in', 'dolly_out', 'crane_up', 'crane_down', 'tracking_shot', 'handheld'
];

const DURATION_OPTIONS = [
  { value: 40, label: '40 detik (4 scene)' },
  { value: 60, label: '1 menit (6 scene)' },
  { value: 90, label: '1.5 menit (9 scene)' },
  { value: 120, label: '2 menit (12 scene)' },
];

const CTA_STYLES: Array<{ id: 'bold' | 'subtle' | 'animated'; label: string }> = [
  { id: 'bold', label: 'Bold (Tegas)' },
  { id: 'subtle', label: 'Subtle (Halus)' },
  { id: 'animated', label: 'Animated (Dinamis)' },
];

// ===== TYPES =====

interface DialogueLine {
  id: number;
  speaker: 'Orang 1' | 'Orang 2';
  text: string;
}

type TabMode = 'single' | 'story';
type SceneStatus = 'pending' | 'generating' | 'completed' | 'error';

interface GeneratedScene {
  sceneId: number;
  status: SceneStatus;
  videoUrl?: string;
  error?: string;
}

// ===== COMPONENT =====

export const VidGenModule: React.FC = () => {
  // Tab State
  const [activeTab, setActiveTab] = useState<TabMode>('single');

  // === Single Video Mode State ===
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [dialogues, setDialogues] = useState<DialogueLine[]>([
    { id: 1, speaker: 'Orang 1', text: '' },
    { id: 2, speaker: 'Orang 2', text: '' }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Menunggu...');

  // === Story Generator Mode State ===
  const [storyIdea, setStoryIdea] = useState('');
  const [videoTheme, setVideoTheme] = useState<VideoTheme>('education');
  const [targetDuration, setTargetDuration] = useState(60);
  const [selectedMotions, setSelectedMotions] = useState<CameraMotion[]>(['zoom_in', 'pan_right', 'dolly_in']);
  const [enableCTA, setEnableCTA] = useState(false);
  const [ctaText, setCtaText] = useState('');
  const [ctaStyle, setCtaStyle] = useState<'bold' | 'subtle' | 'animated'>('animated');
  const [storyAspectRatio, setStoryAspectRatio] = useState('16:9');

  const [storyScript, setStoryScript] = useState<StoryScript | null>(null);
  const [scenePrompts, setScenePrompts] = useState<ScenePrompt[]>([]);
  const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([]);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [currentGeneratingScene, setCurrentGeneratingScene] = useState<number | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // === Single Video Handlers ===

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddDialogue = () => {
    const nextId = dialogues.length > 0 ? Math.max(...dialogues.map(d => d.id)) + 1 : 1;
    const lastSpeaker = dialogues.length > 0 ? dialogues[dialogues.length - 1].speaker : 'Orang 2';
    const nextSpeaker = lastSpeaker === 'Orang 1' ? 'Orang 2' : 'Orang 1';

    setDialogues([...dialogues, { id: nextId, speaker: nextSpeaker, text: '' }]);
  };

  const handleRemoveDialogue = (id: number) => {
    setDialogues(dialogues.filter(d => d.id !== id));
  };

  const handleDialogueChange = (id: number, val: string) => {
    setDialogues(dialogues.map(d => d.id === id ? { ...d, text: val } : d));
  };

  const handleGetIdea = async () => {
    try {
      const idea = await generateRandomPrompt();
      setPrompt(idea);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !image) {
      setError("Mohon isi prompt atau unggah gambar.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultVideo(null);
    setStatusMessage("Menghubungi Server Veo 3...");

    try {
      let fullPrompt = `Cinematic video (${category} style): ${prompt}.`;

      const dialogueText = dialogues
        .filter(d => d.text.trim() !== '')
        .map(d => `${d.speaker} says: "${d.text}"`)
        .join('. ');

      if (dialogueText) {
        fullPrompt += `\n\nCharacter Interaction/Dialogue: ${dialogueText}.`;
      }

      fullPrompt += "\nEnsure smooth motion, high resolution, and coherent visual storytelling.";

      setStatusMessage("Sedang merender video (VEO 3)... Mohon tunggu 1-2 menit.");

      const videoUrl = await generateVeoVideo(fullPrompt, aspectRatio, image);
      setResultVideo(videoUrl);
      setStatusMessage("Selesai!");

    } catch (err: any) {
      setError(err.message || "Gagal membuat video.");
    } finally {
      setIsLoading(false);
    }
  };

  // === Story Generator Handlers ===

  const handleMotionToggle = (motion: CameraMotion) => {
    setSelectedMotions(prev =>
      prev.includes(motion)
        ? prev.filter(m => m !== motion)
        : [...prev, motion]
    );
  };

  const handleGenerateScript = async () => {
    if (!storyIdea.trim()) {
      setStoryError("Mohon isi ide cerita terlebih dahulu.");
      return;
    }

    setIsGeneratingScript(true);
    setStoryError(null);
    setStoryScript(null);
    setScenePrompts([]);
    setGeneratedScenes([]);

    try {
      // Generate story script
      const script = await generateStoryScript(
        storyIdea,
        videoTheme,
        targetDuration,
        enableCTA ? ctaText : undefined
      );
      setStoryScript(script);

      // Generate scene prompts with camera motions
      const prompts = await generateScenePrompts(
        script,
        selectedMotions,
        CATEGORIES[0] // Use first category as style
      );
      setScenePrompts(prompts);

      // Initialize scene status
      setGeneratedScenes(script.scenes.map(s => ({
        sceneId: s.id,
        status: 'pending' as SceneStatus
      })));

    } catch (err: any) {
      setStoryError(err.message || "Gagal membuat script cerita.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateAllScenes = useCallback(async () => {
    if (!storyScript || scenePrompts.length === 0) return;

    setIsGeneratingVideos(true);
    setIsPaused(false);
    setStoryError(null);

    for (let i = 0; i < scenePrompts.length; i++) {
      // Check if paused
      if (isPaused) {
        setIsGeneratingVideos(false);
        return;
      }

      const scenePrompt = scenePrompts[i];
      setCurrentGeneratingScene(scenePrompt.sceneId);

      // Update status to generating
      setGeneratedScenes(prev => prev.map(s =>
        s.sceneId === scenePrompt.sceneId
          ? { ...s, status: 'generating' as SceneStatus }
          : s
      ));

      try {
        const videoUrl = await generateVeoVideo(scenePrompt.prompt, storyAspectRatio, null);

        // Update status to completed
        setGeneratedScenes(prev => prev.map(s =>
          s.sceneId === scenePrompt.sceneId
            ? { ...s, status: 'completed' as SceneStatus, videoUrl }
            : s
        ));
      } catch (err: any) {
        // Update status to error
        setGeneratedScenes(prev => prev.map(s =>
          s.sceneId === scenePrompt.sceneId
            ? { ...s, status: 'error' as SceneStatus, error: err.message }
            : s
        ));
      }
    }

    setIsGeneratingVideos(false);
    setCurrentGeneratingScene(null);
  }, [storyScript, scenePrompts, storyAspectRatio, isPaused]);

  const handleRegenerateScene = async (sceneId: number) => {
    const scenePrompt = scenePrompts.find(p => p.sceneId === sceneId);
    if (!scenePrompt) return;

    setGeneratedScenes(prev => prev.map(s =>
      s.sceneId === sceneId
        ? { ...s, status: 'generating' as SceneStatus, error: undefined }
        : s
    ));

    try {
      const videoUrl = await generateVeoVideo(scenePrompt.prompt, storyAspectRatio, null);
      setGeneratedScenes(prev => prev.map(s =>
        s.sceneId === sceneId
          ? { ...s, status: 'completed' as SceneStatus, videoUrl }
          : s
      ));
    } catch (err: any) {
      setGeneratedScenes(prev => prev.map(s =>
        s.sceneId === sceneId
          ? { ...s, status: 'error' as SceneStatus, error: err.message }
          : s
      ));
    }
  };

  const handleResetStory = () => {
    setStoryScript(null);
    setScenePrompts([]);
    setGeneratedScenes([]);
    setStoryError(null);
    setCurrentGeneratingScene(null);
    setIsGeneratingVideos(false);
    setIsPaused(false);
  };

  const completedCount = generatedScenes.filter(s => s.status === 'completed').length;
  const totalScenes = generatedScenes.length;
  const progressPercent = totalScenes > 0 ? Math.round((completedCount / totalScenes) * 100) : 0;

  // === Render Functions ===

  const renderSingleVideoMode = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Controls */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">

        {/* Settings Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Rasio Video</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm dark:text-white outline-none"
            >
              {RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm dark:text-white outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
            <ImageIcon size={14} /> Upload Foto (Opsional - Image to Video)
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="vid-img-upload"
            />
            <label htmlFor="vid-img-upload" className="cursor-pointer flex flex-col items-center justify-center w-full">
              {previewUrl ? (
                <div className="relative h-40 w-full">
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                    <span className="text-white text-xs font-bold">Ganti Foto</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-gray-400">
                  <span className="text-sm">Klik untuk upload gambar referensi</span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Prompt Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-xs font-semibold text-gray-500 uppercase">Prompt Video</label>
            <button
              onClick={handleGetIdea}
              className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
            >
              <Sparkles size={12} /> Berikan saya ide
            </button>
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white min-h-[100px] pr-8"
              placeholder="Deskripsikan video yang ingin Anda buat..."
            />
            {prompt && (
              <button
                onClick={() => setPrompt('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Dialogue Section */}
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Skenario Dialog</h3>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {dialogues.map((d) => (
              <div key={d.id} className="flex gap-2 items-center">
                <span className={`text-[10px] font-bold px-2 py-1 rounded w-20 text-center ${d.speaker === 'Orang 1' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {d.speaker}
                </span>
                <input
                  type="text"
                  value={d.text}
                  onChange={(e) => handleDialogueChange(d.id, e.target.value)}
                  placeholder={`Dialog ${d.speaker}...`}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-sm dark:text-white outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleRemoveDialogue(d.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddDialogue}
            className="w-full py-2 border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-1"
          >
            <Plus size={16} /> Tambah Baris Dialog
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isLoading
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            }`}
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Video size={20} />}
          <span>{isLoading ? 'Sedang Memproses...' : 'Generate Video (VEO3)'}</span>
        </button>

        {error && (
          <ErrorPopup
            message={error}
            onClose={() => setError(null)}
            onRetry={handleGenerate}
          />
        )}
      </div>

      {/* Right Column: Output */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 min-h-[400px] border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
        {isLoading ? (
          <div className="text-center space-y-4 z-10">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-spin"></div>
              <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-indigo-500/10 rounded-full animate-pulse backdrop-blur-sm"></div>
            </div>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">{statusMessage}</p>
            <p className="text-xs text-gray-500">Video generation takes time (1-2 mins). Please wait.</p>
          </div>
        ) : resultVideo ? (
          <div className="w-full h-full flex flex-col gap-4 animate-fade-in">
            <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-2xl">
              <video
                src={resultVideo}
                controls
                autoPlay
                loop
                className="max-h-[600px] w-full object-contain"
              />
            </div>
            <a
              href={resultVideo}
              download={`veo-video-${Date.now()}.mp4`}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              Unduh Video MP4
            </a>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <Video size={64} className="mx-auto mb-4 opacity-20" />
            <p>Hasil video akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStoryGeneratorMode = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Story Settings */}
      <div className="space-y-6">
        {/* Story Input Card */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-purple-500" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Generator Cerita</h3>
          </div>

          {/* Story Idea */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Ide Cerita / Tema</label>
            <textarea
              value={storyIdea}
              onChange={(e) => setStoryIdea(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:text-white min-h-[100px]"
              placeholder="Masukkan ide cerita video Anda... (contoh: Perjalanan seorang astronot ke Mars dan menemukan kehidupan alien)"
            />
          </div>

          {/* Video Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Tipe Video</label>
              <select
                value={videoTheme}
                onChange={(e) => setVideoTheme(e.target.value as VideoTheme)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm dark:text-white outline-none"
              >
                {VIDEO_THEMES.map(t => (
                  <option key={t} value={t}>{THEME_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Target Durasi</label>
              <select
                value={targetDuration}
                onChange={(e) => setTargetDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm dark:text-white outline-none"
              >
                {DURATION_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Rasio Video</label>
            <select
              value={storyAspectRatio}
              onChange={(e) => setStoryAspectRatio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm dark:text-white outline-none"
            >
              {RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          {/* Camera Motion Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
              <Settings2 size={14} /> Gerakan Kamera (Pilih beberapa)
            </label>
            <div className="flex flex-wrap gap-2">
              {CAMERA_MOTIONS.map(motion => (
                <button
                  key={motion}
                  onClick={() => handleMotionToggle(motion)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${selectedMotions.includes(motion)
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                    }`}
                >
                  {CAMERA_LABELS[motion]}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Option */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableCTA}
                onChange={(e) => setEnableCTA(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Megaphone size={16} className="text-orange-500" /> Tambahkan CTA (Call-to-Action)
              </span>
            </label>

            {enableCTA && (
              <div className="pl-8 space-y-3 animate-fade-in">
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Contoh: Subscribe untuk konten seru lainnya!"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-sm dark:text-white outline-none"
                />
                <div className="flex gap-2">
                  {CTA_STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setCtaStyle(s.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${ctaStyle === s.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generate Script Button */}
          <button
            onClick={handleGenerateScript}
            disabled={isGeneratingScript || !storyIdea.trim()}
            className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isGeneratingScript || !storyIdea.trim()
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
              }`}
          >
            {isGeneratingScript ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            <span>{isGeneratingScript ? 'Membuat Naskah...' : 'Generate Naskah Cerita'}</span>
          </button>

          {storyError && (
            <ErrorPopup
              message={storyError}
              onClose={() => setStoryError(null)}
              onRetry={handleGenerateScript}
            />
          )}
        </div>

        {/* Scene Manager */}
        {storyScript && (
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clapperboard size={20} className="text-indigo-500" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Scene Manager</h3>
              </div>
              <button
                onClick={handleResetStory}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X size={14} /> Reset
              </button>
            </div>

            {/* Script Info */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
              <h4 className="font-bold text-gray-800 dark:text-white">{storyScript.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{storyScript.synopsis}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>{storyScript.scenes.length} scenes</span>
                <span>~{storyScript.totalDuration} detik</span>
              </div>
            </div>

            {/* Scene List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {storyScript.scenes.map((scene, idx) => {
                const genScene = generatedScenes.find(g => g.sceneId === scene.id);
                const scenePrompt = scenePrompts.find(p => p.sceneId === scene.id);
                const isExpanded = expandedScene === scene.id;

                return (
                  <div
                    key={scene.id}
                    className={`border rounded-xl overflow-hidden transition-all ${genScene?.status === 'completed'
                        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                        : genScene?.status === 'generating'
                          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10'
                          : genScene?.status === 'error'
                            ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                            : 'border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white line-clamp-1">
                            {scene.visualDescription.substring(0, 50)}...
                          </p>
                          <p className="text-xs text-gray-500">~{scene.duration}s</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {genScene?.status === 'completed' && <CheckCircle2 size={18} className="text-green-500" />}
                        {genScene?.status === 'generating' && <Loader2 size={18} className="text-indigo-500 animate-spin" />}
                        {genScene?.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                        {genScene?.status === 'pending' && <Clock size={18} className="text-gray-400" />}
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase mb-1">Narasi:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{scene.narration}</p>
                        </div>
                        {scenePrompt && (
                          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase mb-1">Prompt VEO:</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{scenePrompt.prompt.substring(0, 200)}...</p>
                            <span className="text-xs text-purple-500 mt-1 inline-block">📹 {CAMERA_LABELS[scenePrompt.cameraMotion]}</span>
                          </div>
                        )}
                        {genScene?.status === 'completed' && genScene.videoUrl && (
                          <div className="space-y-2">
                            <video src={genScene.videoUrl} controls className="w-full rounded-lg" />
                            <a
                              href={genScene.videoUrl}
                              download={`scene-${scene.id}.mp4`}
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <Download size={12} /> Download Scene
                            </a>
                          </div>
                        )}
                        {genScene?.status === 'error' && (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-red-500">{genScene.error}</p>
                            <button
                              onClick={() => handleRegenerateScene(scene.id)}
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <RefreshCw size={12} /> Retry
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Generate All Button */}
            <button
              onClick={isGeneratingVideos ? () => setIsPaused(true) : handleGenerateAllScenes}
              disabled={isGeneratingScript}
              className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isGeneratingVideos
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                }`}
            >
              {isGeneratingVideos ? (
                <>
                  <Pause size={20} /> Pause Generation
                </>
              ) : (
                <>
                  <Play size={20} /> Generate Semua Scene (VEO3)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Preview & Progress */}
      <div className="space-y-6">
        {/* Progress Card */}
        {storyScript && (
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-2">
              <Eye size={20} className="text-green-500" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Progress & Preview</h3>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">{completedCount} / {totalScenes} scenes</span>
                <span className="font-bold text-indigo-600">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {isGeneratingVideos && currentGeneratingScene && (
                <p className="text-xs text-gray-500 animate-pulse">
                  ⏳ Sedang generate Scene {currentGeneratingScene}... (~1-2 menit per scene)
                </p>
              )}
            </div>

            {/* Video Preview Grid */}
            <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {generatedScenes.filter(s => s.status === 'completed' && s.videoUrl).map(scene => (
                <div key={scene.sceneId} className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    src={scene.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                  />
                  <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Scene {scene.sceneId}
                  </span>
                </div>
              ))}
            </div>

            {/* Download All */}
            {completedCount > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-3 text-center">
                  💡 Tip: Untuk menggabungkan video, download semua scene lalu gabungkan menggunakan video editor seperti CapCut atau Premiere.
                </p>
                <div className="flex gap-2">
                  {generatedScenes.filter(s => s.status === 'completed' && s.videoUrl).map(scene => (
                    <a
                      key={scene.sceneId}
                      href={scene.videoUrl}
                      download={`${storyScript.title.replace(/\s+/g, '-')}-scene-${scene.sceneId}.mp4`}
                      className="flex-1 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                    >
                      <Download size={12} /> S{scene.sceneId}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!storyScript && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 min-h-[400px] border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
            <Clapperboard size={64} className="text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 text-center">
              Masukkan ide cerita dan klik<br />"Generate Naskah Cerita" untuk mulai
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
          <Film className="w-8 h-8 text-indigo-500" /> VidGen by VEO3
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Generator video canggih menggunakan model Google Veo 3. Buat video dari teks, gambar, atau buat cerita lengkap.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('single')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'single'
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
          <Video size={18} /> Single Video
        </button>
        <button
          onClick={() => setActiveTab('story')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'story'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
          <Clapperboard size={18} /> 🎬 Story Generator
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'single' ? renderSingleVideoMode() : renderStoryGeneratorMode()}
    </div>
  );
};
