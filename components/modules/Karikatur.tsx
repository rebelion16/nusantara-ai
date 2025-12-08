
import React, { useState } from 'react';
import { Upload, Download, Trash2, CheckCircle, Loader2, Sparkles, Image as ImageIcon, Archive, X } from 'lucide-react';
import { generateCreativeImage } from '../../services/geminiService';
import JSZip from 'jszip';

const CARICATURE_STYLES = [
  { 
    id: 1, 
    label: 'Karikatur Klasik', 
    emoji: '🎨', 
    prompt: 'karikatur digital klasik dengan kepala sedikit dibesarkan, pewarnaan cerah, dan goresan yang bersih.' 
  },
  { 
    id: 2, 
    label: 'Sketsa Pensil', 
    emoji: '✏️', 
    prompt: 'karikatur sketsa pensil hitam putih, fokus pada arsiran dan bayangan, meniru goresan tangan di kertas bertekstur.' 
  },
  { 
    id: 3, 
    label: 'Gaya Komik', 
    emoji: '💥', 
    prompt: 'gaya buku komik amerika tahun 90-an, dengan tinta tebal, warna-warna primer yang kuat, dan efek bayangan dot-style.' 
  },
  { 
    id: 4, 
    label: 'Digital Painting', 
    emoji: '🖌️', 
    prompt: 'lukisan karikatur digital (digital painting) yang artistik, dengan sapuan kuas yang terlihat jelas dan pencahayaan dramatis.' 
  },
  { 
    id: 5, 
    label: 'Kepala Besar', 
    emoji: '😂', 
    prompt: 'karikatur kepala besar (big head) yang lucu dan komikal, badan kecil, dengan proporsi yang sangat berlebihan untuk efek komedi.' 
  },
  { 
    id: 6, 
    label: 'Vector Flat', 
    emoji: '🔶', 
    prompt: 'gaya vector flat, ilustrasi minimalis, menggunakan warna-warna solid, bentuk geometris sederhana, dan tanpa gradien.' 
  }
];

interface ResultItem {
  styleId: number;
  styleName: string;
  image: string | null;
  status: 'pending' | 'loading' | 'success' | 'error';
  errorMsg?: string;
}

export const KarikaturModule: React.FC = () => {
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<number[]>([1, 5]); // Default selected
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Background Settings
  const [bgMode, setBgMode] = useState<'keep' | 'remove' | 'custom'>('keep');
  const [customBgText, setCustomBgText] = useState('');

  const [results, setResults] = useState<ResultItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBaseImage(e.target.files[0]);
      // Reset results when new image is uploaded
      setResults([]);
    }
  };

  const toggleStyle = (id: number) => {
    setSelectedStyles(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const generateAll = async () => {
    if (!baseImage) return;
    if (selectedStyles.length === 0) return;

    setIsProcessing(true);
    
    // Initialize placeholders
    const initialResults: ResultItem[] = selectedStyles.map(id => ({
      styleId: id,
      styleName: CARICATURE_STYLES.find(s => s.id === id)?.label || 'Unknown',
      image: null,
      status: 'loading'
    }));
    setResults(initialResults);

    // Background Prompt Logic
    let bgInstruction = "";
    if (bgMode === 'remove') {
        bgInstruction = "White background, clean isolation.";
    } else if (bgMode === 'custom' && customBgText.trim()) {
        bgInstruction = `Background environment: ${customBgText}.`;
    }

    // Process parallel requests
    const promises = initialResults.map(async (item) => {
      const styleDef = CARICATURE_STYLES.find(s => s.id === item.styleId);
      if (!styleDef) return;

      const fullPrompt = `Tugas: Ubah foto ini menjadi karikatur.
      Gaya: ${styleDef.prompt}. 
      Detail Tambahan: ${customPrompt}
      ${bgInstruction}
      
      Aturan Paling Penting: Jaga agar fitur wajah (mata, hidung, mulut, bentuk wajah) tetap sangat mirip dan dapat dikenali seperti foto aslinya. Hanya terapkan gaya karikatur (misalnya: kepala sedikit lebih besar, goresan artistik) tanpa mengubah siapa orang itu.`;

      try {
        const imageUrl = await generateCreativeImage(fullPrompt, baseImage, "3:4", "1K");
        
        setResults(prev => prev.map(r => 
          r.styleId === item.styleId 
            ? { ...r, image: imageUrl, status: 'success' } 
            : r
        ));
      } catch (error: any) {
        setResults(prev => prev.map(r => 
          r.styleId === item.styleId 
            ? { ...r, status: 'error', errorMsg: error.message || 'Gagal' } 
            : r
        ));
      }
    });

    await Promise.allSettled(promises);
    setIsProcessing(false);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    let count = 0;

    for (const res of results) {
      if (res.status === 'success' && res.image) {
        try {
          const response = await fetch(res.image);
          const blob = await response.blob();
          const fileName = `karikatur_${res.styleName.replace(/\s/g, '_')}.png`;
          zip.file(fileName, blob);
          count++;
        } catch (e) {
          console.error("Failed to zip image", e);
        }
      }
    }

    if (count > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `koleksi_karikatur_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Tidak ada gambar untuk diunduh.");
    }
    setIsZipping(false);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <span className="text-4xl">🎨</span> AI Foto Karikatur
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Ubah foto biasa menjadi berbagai gaya karikatur unik dalam sekali klik.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: CONTROLS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Upload Section */}
          <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
             <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">1. Upload Foto Wajah</h3>
             <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors group">
                <input 
                   type="file" 
                   accept="image/*" 
                   onChange={handleImageUpload} 
                   className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                {baseImage ? (
                   <div className="relative w-full h-48">
                      <img src={URL.createObjectURL(baseImage)} alt="Upload" className="w-full h-full object-contain rounded-lg" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                         <span className="text-white font-bold text-sm">Ganti Foto</span>
                      </div>
                   </div>
                ) : (
                   <div className="text-center text-gray-400">
                      <Upload size={32} className="mx-auto mb-2" />
                      <p className="text-sm font-medium">Klik atau drop foto di sini</p>
                      <p className="text-xs">Pastikan wajah terlihat jelas</p>
                   </div>
                )}
             </div>
          </div>

          {/* Style Selection */}
          <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-200">2. Pilih Gaya ({selectedStyles.length})</h3>
                <button 
                  onClick={() => setSelectedStyles(selectedStyles.length === CARICATURE_STYLES.length ? [] : CARICATURE_STYLES.map(s => s.id))}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {selectedStyles.length === CARICATURE_STYLES.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                {CARICATURE_STYLES.map((style) => (
                   <button
                      key={style.id}
                      onClick={() => toggleStyle(style.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                         selectedStyles.includes(style.id)
                           ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500'
                           : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                      }`}
                   >
                      <span className="text-xl">{style.emoji}</span>
                      <span className="text-xs font-bold">{style.label}</span>
                      {selectedStyles.includes(style.id) && <CheckCircle size={14} className="ml-auto" />}
                   </button>
                ))}
             </div>
          </div>

          {/* Customization */}
          <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
             <h3 className="font-bold text-gray-800 dark:text-gray-200">3. Kustomisasi</h3>
             
             {/* Prompt */}
             <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-gray-500 uppercase">Detail Tambahan</label>
                <textarea 
                   value={customPrompt}
                   onChange={(e) => setCustomPrompt(e.target.value)}
                   placeholder="Contoh: pakai kacamata hitam, tersenyum lebar..."
                   className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none dark:text-white pr-8"
                />
                {customPrompt && (
                    <button
                        onClick={() => setCustomPrompt('')}
                        className="absolute right-2 top-[26px] text-gray-400 hover:text-blue-500 p-1"
                    >
                        <X size={16} />
                    </button>
                )}
             </div>

             {/* Background */}
             <div className="space-y-2 relative">
                <label className="text-xs font-semibold text-gray-500 uppercase">Background</label>
                <div className="flex gap-2">
                   <button 
                     onClick={() => setBgMode('keep')}
                     className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${bgMode === 'keep' ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900' : 'border-gray-300 dark:border-gray-600 text-gray-500'}`}
                   >
                     Original
                   </button>
                   <button 
                     onClick={() => setBgMode('remove')}
                     className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${bgMode === 'remove' ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900' : 'border-gray-300 dark:border-gray-600 text-gray-500'}`}
                   >
                     Polos/Putih
                   </button>
                   <button 
                     onClick={() => setBgMode('custom')}
                     className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${bgMode === 'custom' ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900' : 'border-gray-300 dark:border-gray-600 text-gray-500'}`}
                   >
                     Custom
                   </button>
                </div>
                {bgMode === 'custom' && (
                   <div className="relative">
                       <input 
                          type="text" 
                          value={customBgText}
                          onChange={(e) => setCustomBgText(e.target.value)}
                          placeholder="Deskripsi background... (cth: di pantai)"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white animate-fade-in pr-8"
                       />
                       {customBgText && (
                            <button
                                onClick={() => setCustomBgText('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 p-1"
                            >
                                <X size={16} />
                            </button>
                       )}
                   </div>
                )}
             </div>
          </div>

          <button
             onClick={generateAll}
             disabled={!baseImage || selectedStyles.length === 0 || isProcessing}
             className={`w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2`}
          >
             {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
             <span>{isProcessing ? 'Sedang Menggambar...' : 'GENERATE KARIKATUR'}</span>
          </button>
        </div>

        {/* RIGHT PANEL: RESULTS */}
        <div className="lg:col-span-7 space-y-6">
           <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 min-h-[600px] border border-gray-200 dark:border-gray-700 flex flex-col">
              
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <ImageIcon size={20} className="text-blue-500" /> Galeri Hasil
                 </h3>
                 {results.some(r => r.status === 'success') && (
                    <button 
                       onClick={handleDownloadZip}
                       disabled={isZipping}
                       className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                       {isZipping ? <Loader2 size={12} className="animate-spin"/> : <Archive size={14}/>} Download All (ZIP)
                    </button>
                 )}
              </div>

              {results.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-60">
                    <Sparkles size={48} className="mb-4" />
                    <p className="text-lg font-medium">Galeri Masih Kosong</p>
                    <p className="text-sm">Pilih gaya dan klik Generate untuk memulai.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-2 gap-4">
                    {results.map((item) => (
                       <div key={item.styleId} className="bg-white dark:bg-dark-card rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 relative group min-h-[200px]">
                          {/* Header */}
                          <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/60 to-transparent z-10 flex justify-between items-start">
                             <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                                {item.styleName}
                             </span>
                          </div>

                          {/* Content */}
                          {item.status === 'loading' ? (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 text-blue-500">
                                <Loader2 size={32} className="animate-spin mb-2" />
                                <span className="text-xs font-medium animate-pulse">Melukis...</span>
                             </div>
                          ) : item.status === 'error' ? (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10 text-red-500 p-4 text-center">
                                <span className="text-2xl mb-2">⚠️</span>
                                <p className="text-xs font-bold">Gagal</p>
                                <p className="text-[10px]">{item.errorMsg}</p>
                             </div>
                          ) : item.image ? (
                             <>
                                <img 
                                   src={item.image} 
                                   alt={item.styleName} 
                                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                   <a 
                                      href={item.image} 
                                      download={`karikatur-${item.styleName.toLowerCase()}-${Date.now()}.png`}
                                      className="p-3 bg-white text-gray-900 rounded-full shadow-lg hover:scale-110 transition-transform"
                                      title="Unduh"
                                   >
                                      <Download size={20} />
                                   </a>
                                   <a 
                                      href={item.image} 
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-3 bg-white/20 text-white backdrop-blur-md rounded-full shadow-lg hover:bg-white/40 transition-colors"
                                      title="Lihat Penuh"
                                   >
                                      <ImageIcon size={20} />
                                   </a>
                                </div>
                             </>
                          ) : null}
                       </div>
                    ))}
                 </div>
              )}

           </div>
        </div>

      </div>
    </div>
  );
};
