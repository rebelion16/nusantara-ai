import React, { useState } from 'react';
import { analyzeImagePrompt, generateCreativeImage, generateSocialCaption, fileToBase64 } from '../../services/geminiService';
import { ModuleId } from '../../types';
import { Layers, Sparkles, Loader2, Wand2 } from 'lucide-react';

interface ContentCreatorProps {
  onNavigate?: (id: ModuleId) => void;
  onTransfer?: (file: File) => void;
}

export const ContentCreatorModule: React.FC<ContentCreatorProps> = ({ onNavigate, onTransfer }) => {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Flat Lay State
  const [flatLayResult, setFlatLayResult] = useState<string | null>(null);
  const [isFlatLaying, setIsFlatLaying] = useState(false);

  // Social Media State
  const [socialPlatform, setSocialPlatform] = useState('Instagram');
  const [captionResult, setCaptionResult] = useState('');
  const [isCaptioning, setIsCaptioning] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Reset outputs when new image is uploaded
      setAnalysisResult('');
      setFlatLayResult(null);
      setCaptionResult('');
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const base64 = await fileToBase64(image);
      const result = await analyzeImagePrompt(base64);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      setAnalysisResult("Gagal menganalisis gambar.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFlatLay = async () => {
    if (!image) return;
    setIsFlatLaying(true);
    try {
      // Prompt specifically optimized for clothing extraction without human body
      const prompt = "Buat gambar Flat Lay Photography (gaya Knolling) profesional dari outfit/pakaian yang ada di gambar referensi. DEKONSTRUKSI tampilan menjadi item terpisah: baju, celana/rok, sepatu, dan aksesoris yang disusun sangat rapi di atas latar belakang putih bersih. PENTING: HANYA PAKAIAN DAN BENDA MATI. SANGAT DILARANG ADA WAJAH, TANGAN, KAKI, ATAU BAGIAN TUBUH MANUSIA. Tiru persis tekstur, warna, dan motif pakaian dari referensi.";
      
      // Pass 'false' as the last argument to disable preserveFace logic
      const result = await generateCreativeImage(prompt, image, "4:3", "1K", null, null, false);
      setFlatLayResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFlatLaying(false);
    }
  };

  const handleTransferToVirtualPhotoshoot = async () => {
    if (!flatLayResult || !onTransfer || !onNavigate) return;
    
    try {
      // Convert base64 result to File object
      const res = await fetch(flatLayResult);
      const blob = await res.blob();
      const file = new File([blob], "flat-lay-reference.png", { type: "image/png" });
      
      onTransfer(file);
      onNavigate('virtual-photoshoot');
    } catch (e) {
      console.error("Failed to transfer image", e);
    }
  };

  const handleCaption = async () => {
    if (!image) return;
    setIsCaptioning(true);
    try {
      const base64 = await fileToBase64(image);
      const result = await generateSocialCaption(base64, socialPlatform);
      setCaptionResult(result);
    } catch (e) {
      console.error(e);
      setCaptionResult("Gagal membuat caption.");
    } finally {
      setIsCaptioning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-10">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Analisa Foto & Generator Prompt</h2>
        <p className="text-gray-500 dark:text-gray-400">Unggah foto untuk mendapatkan analisis detail, prompt, dan ide konten sosial media.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Upload */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">1. Unggah Foto</h3>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Wajib</span>
          </div>
          
          <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 flex flex-col justify-center items-center relative bg-gray-50 dark:bg-gray-800/50 min-h-[300px]">
             <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
                id="content-upload" 
             />
             <label htmlFor="content-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                {previewUrl ? (
                   <img src={previewUrl} alt="Preview" className="max-h-[280px] w-auto object-contain rounded-lg shadow-sm" />
                ) : (
                   <div className="flex flex-col items-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <span className="text-sm">Klik untuk Upload</span>
                   </div>
                )}
             </label>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!image || isAnalyzing}
            className="mt-4 w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
               <span className="animate-pulse">Menganalisis...</span>
            ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                 </svg>
                 Mulai Analisa AI
               </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: Analysis Result */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">2. Hasil Analisa</h3>
          <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 relative overflow-hidden group">
            {analysisResult ? (
               <div className="h-[300px] overflow-y-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {analysisResult}
                  <button 
                    onClick={() => navigator.clipboard.writeText(analysisResult)}
                    className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-700 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Salin Teks"
                  >
                    📋
                  </button>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2 opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <span className="text-xs">Hasil analisa akan muncul di sini</span>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION 1: Flat Lay */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
         <div className="flex items-center gap-2 mb-4">
            <span className="text-emerald-500">
               <Layers className="w-6 h-6" />
            </span>
            <h3 className="font-bold text-emerald-600 dark:text-emerald-400">Ekstrak Outfit (Flat Lay)</h3>
         </div>

         <div className="flex flex-col md:flex-row gap-6">
            <button
               onClick={handleFlatLay}
               disabled={!image || isFlatLaying}
               className={`relative md:w-1/3 py-4 rounded-xl font-bold text-white shadow-lg transition-all transform duration-300 flex items-center justify-center gap-2 overflow-hidden group
                 ${!image || isFlatLaying 
                   ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-80' 
                   : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98]'
                 }
               `}
            >
               {(!image || isFlatLaying) ? null : (
                 <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
               )}

               {isFlatLaying ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="animate-pulse">Meracik Flat Lay...</span>
                  </>
               ) : (
                  <>
                     <Layers size={20} />
                     <span>Generate Flat Lay (AI Studio)</span>
                     <Sparkles size={16} className="text-yellow-300" />
                  </>
               )}
            </button>
            
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl min-h-[150px] flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden relative">
               {flatLayResult ? (
                  <>
                     <img src={flatLayResult} alt="Flat Lay" className="h-full w-full object-cover max-h-[400px]" />
                     <div className="absolute bottom-4 right-4 flex gap-2">
                       <button
                          onClick={handleTransferToVirtualPhotoshoot}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm flex items-center gap-1 transition-colors"
                          title="Gunakan sebagai referensi gaya"
                       >
                          <span>✨</span> Transfer ke Virtual Photoshoot
                       </button>
                       <a 
                         href={flatLayResult} 
                         download={`flatlay-${Date.now()}.png`}
                         className="bg-white text-gray-900 px-4 py-2 rounded-full shadow-lg font-medium text-sm hover:scale-105 transition-transform"
                       >
                         Unduh Gambar
                       </a>
                     </div>
                  </>
               ) : (
                  <span className="text-gray-400 text-sm italic">Gambar Flat Lay akan muncul di sini</span>
               )}
            </div>
         </div>
      </div>

      {/* BOTTOM SECTION 2: Social Media */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
         <div className="flex items-center gap-2 mb-4">
            <span className="text-pink-500">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
               </svg>
            </span>
            <h3 className="font-bold text-pink-600 dark:text-pink-400">Optimasi Sosmed</h3>
         </div>

         <div className="flex flex-col gap-4">
            <div className="flex gap-4">
               <select 
                  value={socialPlatform}
                  onChange={(e) => setSocialPlatform(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none"
               >
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Threads">Threads</option>
               </select>
               
               <button
                  onClick={handleCaption}
                  disabled={!image || isCaptioning}
                  className="flex-1 px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors disabled:opacity-50"
               >
                  {isCaptioning ? 'Membuat Caption...' : 'Buat Caption'}
               </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 min-h-[100px] relative group">
               {captionResult ? (
                  <>
                     <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{captionResult}</p>
                     <button 
                       onClick={() => navigator.clipboard.writeText(captionResult)}
                       className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-700 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                       title="Salin Caption"
                     >
                       📋
                     </button>
                  </>
               ) : (
                  <span className="text-gray-400 text-sm italic">Caption sosmed akan muncul di sini</span>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};