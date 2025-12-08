import React, { useState, useRef, useEffect } from 'react';
import { 
  Palette, Upload, Sparkles, Wand2, 
  RotateCcw, RotateCw, Download, Image as ImageIcon,
  Edit3, BookOpen, Loader2, X
} from 'lucide-react';
import { generateCreativeImage, generateRandomPrompt, generateStoryFromImage, refineUserPrompt } from '../../services/geminiService';
import { ErrorPopup } from '../ErrorPopup';

// --- CONSTANTS ---

const PAINTING_STYLES = [
  { id: 'landscape', name: 'Landscape', prompt: 'lukisan cat minyak pemandangan alam, goresan kuas tebal, teknik impasto' },
  { id: 'portrait', name: 'Portrait', prompt: 'lukisan cat minyak potret klasik, pencahayaan rembrandt, detail wajah realistis namun artistik' },
  { id: 'surealisme', name: 'Surealisme', prompt: 'lukisan cat minyak surealis, mimpi, objek melayang, kombinasi aneh tapi indah, gaya Salvador Dali' },
  { id: 'abstrak', name: 'Abstrak', prompt: 'lukisan cat minyak abstrak, bentuk geometris dan organik, warna-warni ekspresif, tanpa bentuk pasti' },
  { id: 'impresionisme', name: 'Impresionisme', prompt: 'lukisan cat minyak impresionis, goresan kecil dan cepat, menangkap cahaya, gaya Claude Monet' },
  { id: 'realisme', name: 'Realisme', prompt: 'lukisan cat minyak realisme tinggi, sangat detail seperti foto namun dengan tekstur kanvas, gaya klasik eropa' },
  { id: 'still-life', name: 'Still Life', prompt: 'lukisan cat minyak still life, buah-buahan, bunga dalam vas, benda mati, pencahayaan dramatis' },
  { id: 'kubisme', name: 'Kubisme', prompt: 'lukisan cat minyak kubisme, bentuk terpecah-pecah, perspektif ganda, gaya Pablo Picasso' },
  { id: 'pop-art', name: 'Pop Art', prompt: 'lukisan cat minyak gaya pop art, warna cerah kontras, garis tebal, gaya Andy Warhol' },
  { id: 'romanticism', name: 'Romantisme', prompt: 'lukisan cat minyak era romantisme, emosional, dramatis, alam liar, badai, keagungan alam' }
];

const ASPECT_RATIOS = [
  "1:1", "3:4", "4:3", "9:16", "16:9"
];

const RESOLUTIONS = [
  "1K", "2K", "4K"
];

const QUOTES = [
  "Setiap seniman pernah menjadi seorang amatir. - Ralph Waldo Emerson",
  "Saya memimpikan lukisan saya dan saya melukis impian saya. - Vincent van Gogh",
  "Seni membersihkan jiwa dari debu kehidupan sehari-hari. - Pablo Picasso",
  "Melukis adalah puisi yang terlihat. - Leonardo da Vinci",
  "Tujuan seni bukanlah untuk merepresentasikan penampakan luar, tapi makna batin. - Aristotle"
];

interface HistoryState {
  image: string;
  prompt: string;
  timestamp: number;
}

export const AiMelukisModule: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'text' | 'photo'>('text');
  
  // Inputs
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([PAINTING_STYLES[0].id]);
  const [strength, setStrength] = useState(0.7);
  const [detailLevel, setDetailLevel] = useState(7);
  const [seed, setSeed] = useState('');
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  
  // Files
  const [uploadedCanvas, setUploadedCanvas] = useState<File | null>(null); // For Text Mode
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null); // For Photo Mode
  
  // Outputs
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Sedang Melukis...');
  const [story, setStory] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  
  // History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Quick Edit
  const [editInstruction, setEditInstruction] = useState('');

  // --- Handlers ---

  const handleStyleToggle = (id: string) => {
    setSelectedStyles(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id) 
        : [...prev, id]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleInspiration = async () => {
    setLoading(true);
    setLoadingMsg("Mencari inspirasi...");
    try {
      const idea = await generateRandomPrompt();
      setPrompt(idea);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (img: string, p: string) => {
    const newState = { image: img, prompt: p, timestamp: Date.now() };
    const newHistory = [...history.slice(0, historyIndex + 1), newState];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setResultImage(prev.image);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setResultImage(next.image);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const generate = async () => {
    // Validation
    if (activeTab === 'text' && !uploadedCanvas) {
      setError("Untuk mode Teks, mohon unggah 'Kanvas Referensi' sebagai panduan komposisi.");
      return;
    }
    if (activeTab === 'photo' && !uploadedPhoto) {
      setError("Mohon unggah foto yang akan diubah.");
      return;
    }
    if (activeTab === 'text' && !prompt.trim()) {
      setError("Mohon isi deskripsi imajinasi Anda.");
      return;
    }

    setLoading(true);
    setError(null);
    setStory('');
    setLoadingMsg("Seniman AI sedang bekerja...");

    try {
      // Construct Prompt
      const stylePrompts = selectedStyles
        .map(id => PAINTING_STYLES.find(s => s.id === id)?.prompt)
        .join(', ');
      
      const seedText = seed ? `[SEED: ${seed}]` : '';
      const detailText = `Detail Level: ${detailLevel}/10.`;
      
      let finalPrompt = "";
      let baseImage: File | null = null;

      if (activeTab === 'text') {
        baseImage = uploadedCanvas;
        // Text mode uses Canvas Ref as structural guidance but replaces content based on prompt
        finalPrompt = `
          LUKISAN CAT MINYAK MASTERPIECE.
          Panduan Komposisi: Gunakan struktur/layout dari gambar referensi ini, tapi GANTI kontennya sesuai deskripsi teks.
          
          Deskripsi Utama: "${prompt}".
          Gaya Artistik: ${stylePrompts}.
          
          ${detailText} ${seedText}
          Negative Prompt: ${negativePrompt || 'blur, low quality, watermark, text, messy'}.
          
          Teknik: Impasto tebal, tekstur kanvas terlihat, pencahayaan dramatis studio seni.
        `;
      } else {
        baseImage = uploadedPhoto;
        // Photo mode transforms the photo directly
        finalPrompt = `
          Ubah foto ini menjadi LUKISAN CAT MINYAK (Oil Painting).
          Gaya: ${stylePrompts}.
          Kekuatan Transformasi: ${Math.round(strength * 100)}%.
          
          Pertahankan subjek utama tapi ubah gaya menjadi lukisan artistik tangan.
          ${detailText} ${seedText}
        `;
      }

      const result = await generateCreativeImage(finalPrompt, baseImage, aspectRatio, resolution);
      setResultImage(result);
      addToHistory(result, finalPrompt);

    } catch (e: any) {
      setError(e.message || "Gagal membuat lukisan.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickEdit = async () => {
    if (!resultImage || !editInstruction) return;
    
    setLoading(true);
    setLoadingMsg("Menerapkan sentuhan akhir...");
    
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const file = new File([blob], "edit_source.png", { type: "image/png" });
      
      const editPrompt = `Edit lukisan ini: ${editInstruction}. Pertahankan gaya cat minyak yang sama.`;
      
      const result = await generateCreativeImage(editPrompt, file, aspectRatio, resolution);
      setResultImage(result);
      addToHistory(result, editPrompt);
      setEditInstruction('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStory = async () => {
    if (!resultImage) return;
    setStoryLoading(true);
    try {
        const res = await fetch(resultImage);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64 = (reader.result as string); // full data url
            const storyText = await generateStoryFromImage(base64, "Lukisan ini");
            setStory(storyText);
            setStoryLoading(false);
        };
    } catch (e) {
        setStory("Gagal membuat cerita.");
        setStoryLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-12">
      
      {/* HEADER */}
      <div className="text-center space-y-4 py-6 bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl border border-amber-900/30 text-amber-50 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4af37' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`}}></div>
         <h2 className="text-4xl font-serif font-bold text-amber-400 tracking-wider relative z-10">AI Melukis Imajinasi</h2>
         <p className="text-stone-300 italic max-w-2xl mx-auto relative z-10">"Atelier digital Anda. Ubah imajinasi menjadi mahakarya cat minyak klasik."</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PALETTE & TOOLS */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* Style Picker */}
           <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-lg">
              <h3 className="font-bold text-stone-800 dark:text-amber-500 mb-4 flex items-center gap-2">
                 <Palette size={18}/> Palet Gaya
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                 {PAINTING_STYLES.map(style => (
                    <button
                       key={style.id}
                       onClick={() => handleStyleToggle(style.id)}
                       className={`p-3 rounded-xl text-xs font-bold text-left transition-all ${
                          selectedStyles.includes(style.id)
                            ? 'bg-amber-600 text-white shadow-md transform scale-105'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                       }`}
                    >
                       {style.name}
                    </button>
                 ))}
              </div>
           </div>

           {/* Advanced Controls */}
           <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-lg space-y-4">
              <h3 className="font-bold text-stone-800 dark:text-amber-500 mb-2">Kuas Lanjutan</h3>
              
              <div>
                 <label className="text-xs font-bold text-stone-500 uppercase">Rasio Kanvas</label>
                 <select 
                    value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full p-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:border-amber-500 text-stone-800 dark:text-stone-200"
                 >
                    {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                 </select>
              </div>

              <div>
                 <label className="text-xs font-bold text-stone-500 uppercase">Resolusi</label>
                 <select 
                    value={resolution} onChange={(e) => setResolution(e.target.value)}
                    className="w-full p-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:border-amber-500 text-stone-800 dark:text-stone-200"
                 >
                    {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                 </select>
              </div>

              {activeTab === 'photo' && (
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase flex justify-between">
                        Kekuatan Transformasi <span>{Math.round(strength * 100)}%</span>
                    </label>
                    <input 
                        type="range" min="0.1" max="1.0" step="0.1" 
                        value={strength} onChange={(e) => setStrength(parseFloat(e.target.value))}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase flex justify-between">
                    Tingkat Detail <span>{detailLevel}</span>
                </label>
                <input 
                    type="range" min="1" max="10" step="1" 
                    value={detailLevel} onChange={(e) => setDetailLevel(parseInt(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              <div>
                 <label className="text-xs font-bold text-stone-500 uppercase">Seed (Opsional)</label>
                 <input 
                    type="text" 
                    value={seed} onChange={(e) => setSeed(e.target.value)}
                    placeholder="Angka acak..."
                    className="w-full p-2 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:border-amber-500 text-stone-800 dark:text-stone-200"
                 />
              </div>
           </div>

        </div>

        {/* CENTER/RIGHT COLUMN: CANVAS & WORKSPACE */}
        <div className="lg:col-span-8 space-y-6">
           
           {/* Mode Tabs */}
           <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
              <button 
                 onClick={() => setActiveTab('text')}
                 className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'text' ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-sm' : 'text-stone-500'}`}
              >
                 Hasilkan dari Teks (Ref. Kanvas)
              </button>
              <button 
                 onClick={() => setActiveTab('photo')}
                 className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'photo' ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-sm' : 'text-stone-500'}`}
              >
                 Ubah dari Foto
              </button>
           </div>

           {/* Workspace Area */}
           <div className="space-y-6">
              
              {/* Input Zone */}
              <div className="space-y-4">
                 {activeTab === 'text' ? (
                    <>
                       <div className="relative">
                          <textarea 
                             value={prompt}
                             onChange={(e) => setPrompt(e.target.value)}
                             placeholder="Imajinasi Anda... (Cth: Sebuah kastil di atas awan saat matahari terbenam)"
                             className="w-full p-4 h-32 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none text-stone-800 dark:text-stone-100 placeholder-stone-400 pr-10"
                          />
                          {prompt && (
                            <button
                                onClick={() => setPrompt('')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-amber-500 transition-colors p-1"
                            >
                                <X size={16} />
                            </button>
                          )}
                          <button 
                             onClick={handleInspiration}
                             className="absolute bottom-3 right-3 text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg transition-colors"
                             title="Beri Inspirasi"
                          >
                             <Sparkles size={18}/>
                          </button>
                       </div>
                       
                       {/* Canvas Reference Upload */}
                       <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 transition-colors group cursor-pointer relative flex items-center justify-center min-h-[150px]">
                          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setUploadedCanvas)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          {uploadedCanvas ? (
                             <div className="relative w-full h-40">
                                <img src={URL.createObjectURL(uploadedCanvas)} alt="Ref" className="w-full h-full object-contain rounded-lg opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                   <p className="text-white font-bold text-sm">Kanvas Referensi Terpasang</p>
                                </div>
                             </div>
                          ) : (
                             <div className="text-center text-stone-400">
                                <ImageIcon size={32} className="mx-auto mb-2 opacity-50"/>
                                <p className="text-sm font-bold">Upload Kanvas Referensi (Wajib)</p>
                                <p className="text-xs">Sketsa kasar atau komposisi dasar</p>
                             </div>
                          )}
                       </div>
                    </>
                 ) : (
                    // Photo Mode
                    <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 transition-colors group cursor-pointer relative flex items-center justify-center min-h-[250px]">
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setUploadedPhoto)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {uploadedPhoto ? (
                            <img src={URL.createObjectURL(uploadedPhoto)} alt="Upload" className="max-h-[250px] w-auto object-contain rounded-lg shadow-md" />
                        ) : (
                            <div className="text-center text-stone-400">
                                <Upload size={40} className="mx-auto mb-3 opacity-50"/>
                                <p className="text-lg font-bold">Upload Foto Anda</p>
                                <p className="text-sm">Kami akan mengubahnya menjadi lukisan</p>
                            </div>
                        )}
                    </div>
                 )}
              </div>

              {/* Generate Button */}
              <button 
                 onClick={generate}
                 disabled={loading}
                 className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-serif font-bold text-xl rounded-xl shadow-lg shadow-amber-600/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                 {loading ? <Loader2 className="animate-spin"/> : <Wand2 size={24}/>}
                 {loading ? loadingMsg : 'LUKIS SEKARANG'}
              </button>

              {error && <ErrorPopup message={error} onClose={() => setError(null)} onRetry={generate} />}

              {/* Result Area */}
              <div className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-4 min-h-[400px] border border-stone-200 dark:border-stone-700 relative flex flex-col items-center justify-center overflow-hidden">
                 {resultImage ? (
                    <div className="w-full h-full flex flex-col gap-4 animate-fade-in">
                       <div className="relative group flex-1 flex items-center justify-center bg-black/5 rounded-xl">
                          <img src={resultImage} alt="Result" className="max-h-[500px] w-auto object-contain rounded-lg shadow-2xl" />
                          
                          {/* Action Buttons Overlay */}
                          <div className="absolute bottom-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 bg-white/90 rounded-full shadow hover:bg-white disabled:opacity-50"><RotateCcw size={20}/></button>
                             <a href={resultImage} download={`lukisan-ai-${Date.now()}.png`} className="px-4 py-2 bg-amber-600 text-white rounded-full font-bold shadow hover:bg-amber-700 flex items-center gap-2"><Download size={18}/> Unduh</a>
                             <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 bg-white/90 rounded-full shadow hover:bg-white disabled:opacity-50"><RotateCw size={20}/></button>
                          </div>
                       </div>

                       {/* Post-Gen Tools */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-700">
                             <h4 className="font-bold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2"><Edit3 size={16}/> Edit Cepat</h4>
                             <div className="flex gap-2 relative">
                                <input 
                                   type="text" value={editInstruction} onChange={(e) => setEditInstruction(e.target.value)}
                                   placeholder="Contoh: Buat langit lebih merah..."
                                   className="flex-1 p-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-transparent dark:text-white pr-8"
                                />
                                {editInstruction && (
                                    <button
                                        onClick={() => setEditInstruction('')}
                                        className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                <button onClick={handleQuickEdit} disabled={loading || !editInstruction} className="px-3 bg-stone-200 dark:bg-stone-700 rounded-lg font-bold text-xs hover:bg-stone-300 dark:hover:bg-stone-600">Kirim</button>
                             </div>
                          </div>

                          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-700">
                             <h4 className="font-bold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2"><BookOpen size={16}/> Cerita Lukisan</h4>
                             {story ? (
                                <p className="text-xs text-stone-600 dark:text-stone-400 italic max-h-20 overflow-y-auto">{story}</p>
                             ) : (
                                <button onClick={handleGenerateStory} disabled={storyLoading} className="w-full py-2 bg-stone-100 dark:bg-stone-800 text-stone-500 text-xs rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 flex justify-center items-center gap-2">
                                   {storyLoading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Buat Cerita
                                </button>
                             )}
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="text-center text-stone-400">
                       <p className="font-serif italic text-lg mb-2">"Kanvas Anda Menunggu"</p>
                       <p className="text-sm">Atur palet dan mulai melukis.</p>
                    </div>
                 )}
              </div>

           </div>

        </div>

      </div>
    </div>
  );
};