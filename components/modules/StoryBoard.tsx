
import React, { useState, useEffect } from 'react';
import {
  Upload, Sparkles, Trash2, Plus,
  RefreshCw, Image as ImageIcon, Download,
  Loader2, Film, Video, Camera, MessageSquare, PlayCircle, Mic, MicOff
} from 'lucide-react';
import { generateCreativeImage, generateStoryboardPlan, generateVeoVideo, StoryboardSceneData } from '../../services/geminiService';

const VISUAL_TEMPLATES = [
  { label: 'Visual Nyata (Reels/TikTok 9:16)', ratio: '9:16', style: 'Cinematic Realistic' },
  { label: 'Visual Nyata (Landscape 16:9)', ratio: '16:9', style: 'Cinematic Realistic' },
  { label: 'Sketch / Storyboard Hitam Putih (16:9)', ratio: '16:9', style: 'Rough Sketch Charcoal' },
  { label: 'Anime Style (9:16)', ratio: '9:16', style: 'Anime High Quality' },
  { label: 'Digital Art / Ilustrasi (1:1)', ratio: '1:1', style: 'Digital Illustration' }
];

interface Scene extends StoryboardSceneData {
  id: number;
  image: string | null;
  video: string | null;
  loading: boolean;
  videoLoading: boolean;
  error?: string;
  includeDialogueInVideo: boolean; // New Property
}

interface StoryBoardProps {
  initialImage?: File | null;
}

export const StoryBoardModule: React.FC<StoryBoardProps> = ({ initialImage }) => {
  const [refImage, setRefImage] = useState<File | null>(null);
  const [previewRef, setPreviewRef] = useState<string | null>(null);

  const [theme, setTheme] = useState('');
  const [template, setTemplate] = useState(VISUAL_TEMPLATES[0]);

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (initialImage) {
      setRefImage(initialImage);
      setPreviewRef(URL.createObjectURL(initialImage));
    }
  }, [initialImage]);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRefImage(file);
      setPreviewRef(URL.createObjectURL(file));
    }
  };

  const generatePlan = async () => {
    if (!theme.trim()) return;
    setIsPlanning(true);
    setScenes([]);

    try {
      const sceneDataList = await generateStoryboardPlan(theme, 5);
      const newScenes: Scene[] = sceneDataList.map((data, idx) => ({
        id: Date.now() + idx,
        ...data,
        image: null,
        video: null,
        loading: false,
        videoLoading: false,
        includeDialogueInVideo: false // Default Off
      }));
      setScenes(newScenes);

      // Auto trigger image generation for all scenes
      generateImagesForScenes(newScenes);
    } catch (e) {
      console.error(e);
      alert("Gagal membuat alur cerita. Coba lagi.");
    } finally {
      setIsPlanning(false);
    }
  };

  const constructPrompt = (scene: Scene) => {
    return `
    [FORCE MAJEURE: ABSOLUTE CHARACTER CONSISTENCY]
    - The character in this scene MUST BE 100% IDENTICAL to the Reference Image provided.
    - **FACE:** Do NOT change facial structure. It must look exactly like the reference person.
    - **OUTFIT:** MUST wear exactly the same clothes as the reference (Color, Style, Fabric).
    - **ACCESSORIES:** Keep all accessories (Glasses, Hats, Weapons, Jewelry) exactly as in the reference.
    - **IDENTITY PRESERVATION:** This is the same person. Do not morph into a generic character.
    
    [SCENE DETAILS]
    Action: ${scene.action} (Contextualize this action for the character)
    Camera Angle/Movement: ${scene.camera}
    Visual Style: ${template.style}
    
    Make it a high-quality, cinematic shot. Consistent lighting.
    `;
  };

  const generateImagesForScenes = async (currentScenes: Scene[]) => {
    setIsGenerating(true);

    // Process one by one to avoid rate limits and better UX flow
    for (let i = 0; i < currentScenes.length; i++) {
      const sceneId = currentScenes[i].id;

      // Update loading state for this scene
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, loading: true } : s));

      try {
        const prompt = constructPrompt(currentScenes[i]);

        const imgUrl = await generateCreativeImage(
          prompt,
          refImage,
          template.ratio,
          '1K',
          null,
          null
        );

        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, image: imgUrl, loading: false } : s));
      } catch (e: any) {
        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, loading: false, error: "Gagal" } : s));
      }
    }

    setIsGenerating(false);
  };

  const handleManualScene = () => {
    const newScene: Scene = {
      id: Date.now(),
      action: "Deskripsi aksi...",
      camera: "Wide Shot",
      dialogue: "...",
      image: null,
      video: null,
      loading: false,
      videoLoading: false,
      includeDialogueInVideo: false
    };
    setScenes([...scenes, newScene]);
  };

  const handleRegenerateScene = async (id: number) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    setScenes(prev => prev.map(s => s.id === id ? { ...s, loading: true, error: undefined } : s));

    try {
      const prompt = constructPrompt(scene);
      const imgUrl = await generateCreativeImage(prompt, refImage, template.ratio, '1K');
      setScenes(prev => prev.map(s => s.id === id ? { ...s, image: imgUrl, loading: false } : s));
    } catch (e) {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, loading: false, error: "Gagal" } : s));
    }
  };

  const toggleDialogueOption = (id: number) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, includeDialogueInVideo: !s.includeDialogueInVideo } : s));
  };

  const handleGenerateVideo = async (id: number) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    setScenes(prev => prev.map(s => s.id === id ? { ...s, videoLoading: true } : s));

    try {
      // Use existing image as base if available, or just use the prompt
      let file: File | null = null;
      if (scene.image) {
        const res = await fetch(scene.image);
        const blob = await res.blob();
        file = new File([blob], "scene-base.png", { type: "image/png" });
      }

      // --- IMPROVED VIDEO PROMPT CONSTRUCTION ---
      let prompt = `Cinematic Video. 
      ACTION: ${scene.action}. 
      CAMERA MOVEMENT: ${scene.camera}.`;

      if (scene.includeDialogueInVideo && scene.dialogue) {
        prompt += `\nCHARACTER SPEAKING/DIALOGUE: "${scene.dialogue}".`;
      } else {
        prompt += `\n(No Dialogue, Focus on Action and Atmosphere).`;
      }

      prompt += `\nCHARACTER IDENTITY & OUTFIT MUST BE KEPT 100% CONSISTENT with the starting image. Do not change clothes or face. High quality motion, 8k resolution.`;

      const videoUrl = await generateVeoVideo(prompt, template.ratio, file);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, video: videoUrl, videoLoading: false } : s));

    } catch (e: any) {
      alert(`Gagal membuat video: ${e.message}`);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, videoLoading: false } : s));
    }
  };

  const handleReset = () => {
    setScenes([]);
    setTheme('');
    setRefImage(null);
    setPreviewRef(null);
  };

  const updateSceneField = (id: number, field: keyof StoryboardSceneData, value: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-6 text-center md:text-left">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shrink-0">
          <Film className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Story Board</h2>
          <p className="text-gray-500 dark:text-gray-400">Buat visualisasi cerita otomatis dengan konsistensi karakter (Face/Outfit).</p>
        </div>
      </div>

      {/* GENERATOR BOX */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-700">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <h3 className="text-xl font-bold text-blue-200 mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-yellow-400" /> Magic Storyboard Generator
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">

            {/* UPLOAD REF */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="h-full border-2 border-dashed border-slate-600 bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center relative hover:bg-slate-800 transition-colors group min-h-[180px]">
                <input type="file" accept="image/*" onChange={handleRefUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {previewRef ? (
                  <>
                    <img src={previewRef} alt="Ref" className="w-full h-full object-cover rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-white">Ganti Referensi</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon size={32} className="mx-auto text-slate-500 mb-2" />
                    <p className="text-sm font-bold text-slate-300">Upload Ref Utama</p>
                    <p className="text-[10px] text-slate-500">Wajah/Kostum akan dipertahankan</p>
                  </div>
                )}
              </div>
            </div>

            {/* INPUTS */}
            <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-4">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Tema Cerita (Misal: Pertarungan di Hutan, Drama Sekolah, Iklan Produk Kopi...)"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              <button
                onClick={generatePlan}
                disabled={!theme || isPlanning || isGenerating}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlanning ? <Loader2 className="animate-spin" /> : <Sparkles />}
                <span>{isPlanning ? 'Sedang Menulis Skenario...' : 'Buat Alur Cerita Otomatis (5 Panel)'}</span>
              </button>
            </div>
          </div>

          {/* CONTROL BAR */}
          <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-slate-700">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="flex flex-col gap-1 w-full md:w-64">
                <label className="text-[10px] uppercase font-bold text-slate-400">Template Visual</label>
                <select
                  value={template.label}
                  onChange={(e) => setTemplate(VISUAL_TEMPLATES.find(t => t.label === e.target.value) || VISUAL_TEMPLATES[0])}
                  className="bg-slate-900 text-white text-sm border border-slate-600 rounded-lg p-2.5 outline-none"
                >
                  {VISUAL_TEMPLATES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> Reset
              </button>
              <button
                onClick={handleManualScene}
                className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Plus size={16} /> Scene Manual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SCENES OUTPUT */}
      {scenes.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">Storyboard Panels ({scenes.length})</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {scenes.map((scene, index) => (
              <div key={scene.id} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col md:flex-row animate-fade-in-up">

                {/* Script Section */}
                <div className="p-6 md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Scene {index + 1}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegenerateScene(scene.id)}
                        disabled={scene.loading}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Regenerate Image"
                      >
                        <RefreshCw size={16} className={scene.loading ? "animate-spin" : ""} />
                      </button>
                      <button
                        onClick={() => setScenes(scenes.filter(s => s.id !== scene.id))}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Scene"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Structured Inputs */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Film size={10} /> Aksi / Adegan (Untuk Video)</label>
                    <textarea
                      value={scene.action}
                      onChange={(e) => updateSceneField(scene.id, 'action', e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-sm text-gray-800 dark:text-gray-200 resize-none h-20 outline-none border border-transparent focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Camera size={10} /> Kamera (Untuk Video)</label>
                    <input
                      type="text"
                      value={scene.camera}
                      onChange={(e) => updateSceneField(scene.id, 'camera', e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-sm text-gray-800 dark:text-gray-200 outline-none border border-transparent focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><MessageSquare size={10} /> Dialog</label>
                      <button
                        onClick={() => toggleDialogueOption(scene.id)}
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border transition-colors ${scene.includeDialogueInVideo
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                          : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                          }`}
                      >
                        {scene.includeDialogueInVideo ? <><Mic size={8} /> Masuk ke Video</> : <><MicOff size={8} /> Teks Saja (Skip)</>}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={scene.dialogue}
                      onChange={(e) => updateSceneField(scene.id, 'dialogue', e.target.value)}
                      className={`w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-sm text-gray-800 dark:text-gray-200 outline-none border border-transparent focus:border-blue-500 italic ${!scene.includeDialogueInVideo && 'opacity-60'}`}
                    />
                  </div>

                </div>

                {/* Visual Section */}
                <div className="md:w-2/3 bg-gray-100 dark:bg-black/20 relative min-h-[400px] flex items-center justify-center">
                  {scene.loading ? (
                    <div className="flex flex-col items-center gap-3 text-blue-500">
                      <Loader2 size={32} className="animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-wider animate-pulse">Rendering Scene...</span>
                    </div>
                  ) : scene.image ? (
                    <div className="relative group w-full h-full flex items-center justify-center p-4">
                      <div className="relative max-w-full max-h-full">
                        <img src={scene.image} alt={`Scene ${index + 1}`} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg" />

                        {/* Video Overlay if Exists */}
                        {scene.video && (
                          <div className="absolute inset-0 bg-black rounded-lg overflow-hidden z-10">
                            <video src={scene.video} controls autoPlay loop className="w-full h-full object-contain" />
                            <button
                              onClick={() => setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, video: null } : s))}
                              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Overlay */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <a
                          href={scene.image}
                          download={`storyboard-scene-${index + 1}.png`}
                          className="bg-white/90 text-gray-900 px-4 py-2 rounded-full shadow-lg hover:scale-105 font-bold text-xs flex items-center gap-2"
                        >
                          <Download size={14} /> Unduh Gambar
                        </a>
                        {!scene.video && (
                          <button
                            onClick={() => handleGenerateVideo(scene.id)}
                            disabled={scene.videoLoading}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 font-bold text-xs flex items-center gap-2"
                          >
                            {scene.videoLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                            Generate Video (VEO)
                          </button>
                        )}
                      </div>
                    </div>
                  ) : scene.error ? (
                    <div className="text-center p-4">
                      <p className="text-red-500 text-sm font-bold mb-2">Gagal membuat gambar</p>
                      <button onClick={() => handleRegenerateScene(scene.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">Coba Lagi</button>
                    </div>
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <ImageIcon size={48} className="opacity-20 mb-2" />
                      <span className="text-xs">Menunggu Generasi...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
