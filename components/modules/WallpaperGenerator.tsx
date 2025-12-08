import React, { useState } from 'react';
import { generateCreativeImage, refineUserPrompt } from '../../services/geminiService';
import { ErrorPopup } from '../ErrorPopup';
import { 
  Monitor, Smartphone, Download, Sparkles, Loader2, 
  Image as ImageIcon, Zap, Maximize2, Lightbulb, Wand2, X
} from 'lucide-react';

const CATEGORIES = [
  { id: 'landscape', label: 'Landscape / Alam', prompt: 'breathtaking landscape, majestic mountains, serene lake, golden hour, nature photography, highly detailed, national geographic style' },
  { id: 'urban', label: 'Urban / Kota', prompt: 'cyberpunk city street at night, neon lights, rain reflections, futuristic skyscrapers, cinematic atmosphere, urban photography' },
  { id: 'abstract', label: 'Abstrak', prompt: 'abstract fluid art, colorful swirls, liquid acrylic texture, vibrant gradient, 4k digital art, modern minimalist' },
  { id: 'surreal', label: 'Surealisme', prompt: 'surreal dreamscape, floating islands, giant moon, salvador dali style, magical atmosphere, fantasy art, ethereal' },
  { id: 'portrait', label: 'Portrait / Karakter', prompt: 'artistic portrait, detailed face, cinematic lighting, dramatic shadows, fashion photography, 8k resolution' },
  { id: 'anime', label: 'Anime / Ilustrasi', prompt: 'makoto shinkai style landscape, anime background, shooting stars, emotional atmosphere, vibrant colors, high quality illustration' },
  { id: 'minimal', label: 'Minimalis', prompt: 'minimalist wallpaper, simple geometric shapes, clean lines, pastel colors, soothing, zen, negative space' },
  { id: 'sci-fi', label: 'Sci-Fi / Space', prompt: 'deep space nebula, distant planets, futuristic spaceship, cosmic horror, interstellar, stars and galaxies, 8k render' }
];

const RESOLUTIONS = ['1K', '2K', '4K'];

export const WallpaperGeneratorModule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [resolution, setResolution] = useState('2K'); // Default 2K for better quality
  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fullPrompt = `
        High Quality Wallpaper Generation. 
        Category: ${selectedCategory.label}.
        Subject: ${prompt || selectedCategory.label}.
        Style Keywords: ${selectedCategory.prompt}.
        
        Requirements:
        - Resolution: 8K Ultra HD.
        - Aspect Ratio: ${aspectRatio}.
        - Detail: Masterpiece, Crystal Clear, No Blur, High Contrast.
        - Composition: Perfect for ${aspectRatio === '16:9' ? 'Desktop Monitor' : 'Mobile Phone'} background.
        
        Make it visually stunning and aesthetic.
      `;

      // Pass selected resolution
      const imageUrl = await generateCreativeImage(fullPrompt, null, aspectRatio, resolution);
      setResult(imageUrl);
    } catch (e: any) {
      setError(e.message || "Gagal membuat wallpaper.");
    } finally {
      setLoading(false);
    }
  };

  const handleGiveIdea = async () => {
    setTextLoading(true);
    try {
      const idea = await refineUserPrompt(`Buatkan deskripsi visual singkat tapi detail untuk wallpaper bertema "${selectedCategory.label}" yang epik dan estetik (resolusi 8k). Output promptnya saja dalam bahasa Indonesia.`);
      setPrompt(idea);
    } catch (e) {
      console.error(e);
    } finally {
      setTextLoading(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (!prompt.trim()) return;
    setTextLoading(true);
    try {
      const refined = await refineUserPrompt(`Sempurnakan dan perkaya prompt wallpaper berikut agar hasil gambarnya lebih detail, dramatis, dan berkualitas tinggi (8k quality). Prompt: "${prompt}". Output prompt yang disempurnakan dalam bahasa Indonesia.`);
      setPrompt(refined);
    } catch (e) {
      console.error(e);
    } finally {
      setTextLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-100px)] rounded-3xl overflow-hidden font-sans">
      {error && <ErrorPopup message={error} onClose={() => setError(null)} onRetry={handleGenerate} />}

      {/* BACKGROUND SCENE */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-10 h-full flex flex-col items-center justify-center">
        
        {/* HEADER */}
        <div className="text-center mb-8 animate-fade-in-down">
          <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg tracking-tight mb-2">
            Wallpaper Generator
          </h1>
          <p className="text-white/80 text-lg font-medium drop-shadow-md">
            Buat latar belakang layar yang memukau dalam hitungan detik.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-6xl">
          
          {/* CONTROLS CARD */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-in-up">
             
             {/* Settings Group */}
             <div className="grid grid-cols-2 gap-4 mb-6">
                 {/* Aspect Ratio Toggle */}
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Format</label>
                    <div className="flex bg-black/20 p-1 rounded-xl h-full">
                        <button 
                          onClick={() => setAspectRatio('9:16')}
                          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-bold ${aspectRatio === '9:16' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                           <Smartphone size={16} /> HP
                        </button>
                        <button 
                          onClick={() => setAspectRatio('16:9')}
                          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-bold ${aspectRatio === '16:9' ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                           <Monitor size={16} /> PC
                        </button>
                    </div>
                 </div>

                 {/* Resolution Selector */}
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Resolusi</label>
                    <div className="flex bg-black/20 p-1 rounded-xl h-full">
                       {RESOLUTIONS.map(res => (
                          <button
                             key={res}
                             onClick={() => setResolution(res)}
                             className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                resolution === res 
                                ? 'bg-fuchsia-600 text-white shadow-lg' 
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                             }`}
                          >
                             {res}
                          </button>
                       ))}
                    </div>
                 </div>
             </div>

             {/* Categories */}
             <div className="space-y-3 mb-6">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Pilih Kategori</label>
                <div className="grid grid-cols-2 gap-2">
                   {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat); setPrompt(''); }}
                        className={`p-3 rounded-xl text-left text-sm font-medium transition-all border ${
                           selectedCategory.id === cat.id 
                             ? 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-lg scale-105' 
                             : 'bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/30'
                        }`}
                      >
                         {cat.label}
                      </button>
                   ))}
                </div>
             </div>

             {/* Prompt */}
             <div className="space-y-2 mb-8">
                <div className="flex justify-between items-end">
                   <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Detail Prompt</label>
                   <div className="flex gap-2">
                      <button
                        onClick={handleGiveIdea}
                        disabled={textLoading || loading}
                        className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Buatkan ide prompt otomatis"
                      >
                         {textLoading ? <Loader2 size={10} className="animate-spin"/> : <Lightbulb size={10}/>}
                         Ide
                      </button>
                      <button
                        onClick={handleRefinePrompt}
                        disabled={textLoading || loading || !prompt}
                        className="text-[10px] px-2 py-1 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 text-fuchsia-200 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Sempurnakan prompt yang sudah ada"
                      >
                         {textLoading ? <Loader2 size={10} className="animate-spin"/> : <Wand2 size={10}/>}
                         Sempurnakan
                      </button>
                   </div>
                </div>
                <div className="relative">
                    <textarea 
                       value={prompt}
                       onChange={(e) => setPrompt(e.target.value)}
                       placeholder={`Contoh: "dengan nuansa warna ungu neon..."`}
                       rows={3}
                       className="w-full bg-black/20 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500 focus:bg-black/30 transition-all text-sm resize-none pr-8"
                    />
                    {prompt && (
                        <button
                            onClick={() => setPrompt('')}
                            className="absolute right-2 top-2 text-white/50 hover:text-white transition-colors p-1"
                        >
                            <X size={16} />
                        </button>
                    )}
                    {textLoading && (
                       <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                          <div className="flex flex-col items-center gap-1">
                             <Loader2 className="animate-spin text-white" />
                             <span className="text-[10px] text-white/80">Writing...</span>
                          </div>
                       </div>
                    )}
                </div>
             </div>

             <button
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95
                  ${loading 
                    ? 'bg-white/10 text-white/50 cursor-wait' 
                    : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white'
                  }`}
             >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles fill="currentColor" />}
                <span>{loading ? 'Sedang Merender...' : `BUAT WALLPAPER ${resolution}`}</span>
             </button>

          </div>

          {/* PREVIEW CARD */}
          <div className="lg:col-span-7 flex flex-col h-full animate-fade-in-up delay-100">
             <div className={`flex-1 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden relative flex items-center justify-center shadow-2xl transition-all duration-500 ${result ? 'p-0' : 'p-10'}`}>
                
                {result ? (
                   <div className="relative w-full h-full group">
                      <img 
                        src={result} 
                        alt="Generated Wallpaper" 
                        className={`w-full h-full object-contain ${aspectRatio === '9:16' ? 'max-h-[600px]' : 'max-h-[400px]'}`}
                      />
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                         <a 
                           href={result}
                           download={`wallpaper-${selectedCategory.id}-${Date.now()}.png`}
                           className="px-6 py-3 bg-white text-black rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                         >
                            <Download size={20}/> Unduh HD
                         </a>
                         <button 
                           onClick={() => window.open(result, '_blank')}
                           className="p-3 bg-black/50 text-white rounded-full border border-white/20 hover:bg-black/70 transition-colors"
                         >
                            <Maximize2 size={20}/>
                         </button>
                      </div>
                   </div>
                ) : (
                   <div className="text-center text-white/30 flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                         <ImageIcon size={40} />
                      </div>
                      <p className="text-lg font-medium">Preview Wallpaper</p>
                      <p className="text-sm">Hasil akan muncul di sini dengan resolusi tinggi ({resolution}).</p>
                   </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <div className="relative">
                         <div className="w-16 h-16 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <Zap size={20} className="text-fuchsia-500 animate-pulse"/>
                         </div>
                      </div>
                      <p className="mt-4 text-white font-bold tracking-widest animate-pulse">GENERATING {resolution}...</p>
                   </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};