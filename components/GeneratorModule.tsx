import React, { useState, useEffect, useRef } from 'react';
import { generateCreativeImage, generateInfographicPrompt, generateRandomPrompt, refineUserPrompt, analyzeImagePrompt, generateSocialCaption } from '../services/geminiService';
import { ModuleId } from '../types';
import { ErrorPopup } from './ErrorPopup';
import { X } from 'lucide-react';

interface GeneratorModuleProps {
  moduleId: ModuleId;
  title: string;
  description: string;
  promptPrefix: string;
  requireImage: boolean;
  extraControls?: React.ReactNode;
  headerControls?: React.ReactNode; // New: Controls rendered above upload box
  onExtraControlChange?: (key: string, value: any) => void;
  defaultAspectRatio?: string;
  customPromptLabel?: string;
  isInfographic?: boolean;
  allowReferenceImage?: boolean;
  referenceImageLabel?: string;
  allowAdditionalFaceImage?: boolean;
  secondFaceLabel?: string;
  mainImageLabel?: string; // New prop for custom main label
  batchModeAvailable?: boolean;
  initialRefImage?: File | null;

  // Name Inputs
  showNames?: boolean;
  name1?: string;
  onName1Change?: (val: string) => void;
  name2?: string;
  onName2Change?: (val: string) => void;

  // Custom Prompt Generator (e.g. for Cosplay character descriptions)
  customPromptGenerator?: () => Promise<string | undefined>;

  // Callback to render custom actions below the result image (e.g. "Create Story")
  renderCustomResultActions?: (imageUrl: string) => React.ReactNode;

  // NEW: Override default generation logic (for complex modules like VirtualPhotoshoot)
  customGenerateHandler?: (
    prompt: string,
    aspectRatio: string,
    imageSize: string,
    isBatch: boolean,
    batchCount: number
  ) => Promise<string | string[]>;

  // NEW: External prompt control (for modules that build prompt dynamically)
  externalPrompt?: string;
  customRefineLabel?: string;
  customRefineHandler?: (prompt: string) => Promise<string>;

  // New: Layout options
  useLargeRefineButton?: boolean;
}

interface BatchResultItem {
  url: string | null;
  error?: string;
  loading?: boolean;
}

interface HistoryState {
  image: File | null;
  refImage: File | null;
  faceImage2: File | null;
  prompt: string;
  generatedImage: string | null;
  batchResults?: BatchResultItem[] | null;
  aspectRatio: string;
  imageSize: string;
  isBatchMode?: boolean;
}

const LOADING_MESSAGES = [
  "Menginisialisasi mesin AI...",
  "Menganalisis pola visual...",
  "Memimpikan konsep...",
  "Mencampur warna digital...",
  "Membuat sketsa komposisi...",
  "Menambahkan detail rumit...",
  "Menyesuaikan pencahayaan & bayangan...",
  "Menyempurnakan mahakarya...",
  "Menerapkan keajaiban terakhir...",
  "Menyelesaikan detail halus..."
];

const QUICK_EDITS = [
  "Jadikan Sinematik",
  "Ubah ke Anime",
  "Efek Hitam Putih",
  "Suasana Malam",
  "Tingkatkan Detail",
  "Ubah Latar ke Alam"
];

export const GeneratorModule: React.FC<GeneratorModuleProps> = ({
  moduleId, title, description, promptPrefix, requireImage, extraControls, headerControls,
  defaultAspectRatio = "1:1", customPromptLabel, isInfographic,
  allowReferenceImage = false, referenceImageLabel = "Referensi Gaya",
  allowAdditionalFaceImage = false, secondFaceLabel = "Wajah Kedua",
  mainImageLabel = "Subjek 1", // Default value
  batchModeAvailable = false,
  initialRefImage = null,
  showNames = false,
  name1 = "", onName1Change,
  name2 = "", onName2Change,
  customPromptGenerator,
  renderCustomResultActions,
  customGenerateHandler,
  externalPrompt, // New prop
  customRefineLabel, // New prop
  customRefineHandler, // New prop
  useLargeRefineButton = false // New prop
}) => {
  const [image, setImage] = useState<File | null>(null);
  const [refImage, setRefImage] = useState<File | null>(initialRefImage);
  const [faceImage2, setFaceImage2] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Sync external prompt if provided
  useEffect(() => {
    if (externalPrompt !== undefined) {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt]);

  useEffect(() => {
    if (initialRefImage) {
      setRefImage(initialRefImage);
    }
  }, [initialRefImage]);

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(5);
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
  const [imageSize, setImageSize] = useState("1K");

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [editPrompt, setEditPrompt] = useState('');

  const [analyzedPrompt, setAnalyzedPrompt] = useState('');
  const [socialCaptions, setSocialCaptions] = useState<Record<string, string>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const saveToHistory = (newState: HistoryState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const state = history[prevIndex];
      restoreState(state);
      setHistoryIndex(prevIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      restoreState(state);
      setHistoryIndex(nextIndex);
    }
  };

  const restoreState = (state: HistoryState) => {
    setImage(state.image);
    setRefImage(state.refImage);
    setFaceImage2(state.faceImage2);
    setPrompt(state.prompt);
    setGeneratedImage(state.generatedImage);
    setBatchResults(state.batchResults || []);
    setAspectRatio(state.aspectRatio);
    setImageSize(state.imageSize);
    setIsBatchMode(state.isBatchMode || false);
    setAnalyzedPrompt('');
    setSocialCaptions({});
  };

  const handleGiveIdea = async () => {
    setTextLoading(true);
    try {
      const idea = await generateRandomPrompt();
      setPrompt(idea);
    } catch (e) {
      console.error(e);
    } finally {
      setTextLoading(false);
    }
  };

  const handleRefinePrompt = async () => {
    // Modified: Allow if custom handler exists, even if prompt is empty (it might use context)
    if (!prompt.trim() && !customRefineHandler) return;

    setTextLoading(true);
    try {
      let refined = '';
      if (customRefineHandler) {
        // Use custom handler (e.g., Cosplay character detailer)
        // Pass current prompt or empty string. The handler should know what to do.
        refined = await customRefineHandler(prompt);
      } else {
        // Default generic refine
        refined = await refineUserPrompt(prompt);
      }

      if (refined) {
        setPrompt(refined);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTextLoading(false);
    }
  };

  const handleCustomPromptGen = async () => {
    if (!customPromptGenerator) return;
    setTextLoading(true);
    try {
      const generated = await customPromptGenerator();
      if (generated) {
        setPrompt(generated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTextLoading(false);
    }
  };

  const handleAnalyzePrompt = async () => {
    if (!generatedImage) return;
    setAnalysisLoading(true);
    try {
      const result = await analyzeImagePrompt(generatedImage);
      setAnalyzedPrompt(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSocialCaption = async (platform: string) => {
    if (!generatedImage) return;
    setAnalysisLoading(true);
    try {
      const result = await generateSocialCaption(generatedImage, platform);
      setSocialCaptions(prev => ({ ...prev, [platform]: result }));
    } catch (e) {
      console.error(e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const startLoadingFlow = (targetSize: string, isBatch = false) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setAnalyzedPrompt('');
    setSocialCaptions({});

    if (isBatch) {
      setLoadingMessage("Mempersiapkan batch generation...");
    } else if (targetSize === "4K") {
      setLoadingMessage("Merender Ultra HD 4K (Mohon bersabar, ini butuh waktu)...");
    } else {
      setLoadingMessage(LOADING_MESSAGES[0]);
    }

    const isUltra = targetSize === "4K";
    const isHighRes = targetSize === "2K";
    const updateSpeed = isBatch ? 1000 : isUltra ? 800 : isHighRes ? 400 : 200;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const increment = prev < 30 ? 5 : prev < 60 ? 2 : prev < 80 ? 1 : 0.2;
        const next = prev + increment;
        return next > 95 ? 95 : next;
      });
    }, updateSpeed);

    const messageInterval = setInterval(() => {
      setLoadingMessage((prev) => {
        if (isUltra && Math.random() > 0.7) return "Memproses detail resolusi tinggi...";
        if (isBatch) return prev;
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
        return LOADING_MESSAGES[nextIndex];
      });
    }, 2500);

    return { progressInterval, messageInterval };
  };

  const handleGenerate = async () => {
    if (requireImage && !image && !customGenerateHandler) {
      setError("Silakan unggah gambar utama terlebih dahulu.");
      return;
    }

    const { progressInterval, messageInterval } = startLoadingFlow(imageSize, isBatchMode);

    try {
      let finalPrompt = promptPrefix;

      if (isInfographic) {
        setLoadingMessage("Menganalisis struktur data...");
        finalPrompt = await generateInfographicPrompt(prompt);
        setLoadingMessage("Mendesain tata letak infografis...");
      } else {
        finalPrompt = `${promptPrefix} ${prompt}`;
      }

      // --- CUSTOM HANDLER LOGIC (e.g. for Virtual Photoshoot Multi-Face) ---
      if (customGenerateHandler) {
        // Check if batch mode - handle progressively
        if (isBatchMode && batchModeAvailable) {
          // Initialize batch slots with loading state
          const initialSlots: BatchResultItem[] = Array.from({ length: batchCount }, () => ({ url: null, loading: true }));
          setBatchResults(initialSlots);

          const finalResults: BatchResultItem[] = [...initialSlots];
          let firstSuccess: string | null = null;

          for (let i = 0; i < batchCount; i++) {
            setLoadingMessage(`Mengenerate gambar ${i + 1} dari ${batchCount}...`);

            try {
              // Call handler for single image (isBatch=false, batchCount=1)
              const result = await customGenerateHandler(prompt, aspectRatio, imageSize, false, 1);
              const imageUrl = Array.isArray(result) ? result[0] : result;

              finalResults[i] = { url: imageUrl, loading: false };
              if (!firstSuccess) {
                firstSuccess = imageUrl;
                setGeneratedImage(imageUrl); // Show first successful image immediately
              }
            } catch (err: any) {
              console.error(`Batch ${i + 1} failed`, err);
              finalResults[i] = { url: null, error: err.message || 'Gagal', loading: false };
            }

            // Update state progressively after each image - THIS IS THE KEY!
            setBatchResults([...finalResults]);
          }

          const successCount = finalResults.filter(r => r.url).length;
          if (successCount === 0) throw new Error("Semua batch gagal dihasilkan.");

          saveToHistory({
            image: null, refImage, faceImage2: null, prompt,
            generatedImage: firstSuccess,
            batchResults: finalResults,
            aspectRatio, imageSize, isBatchMode: true
          });

        } else {
          // Single image mode
          const result = await customGenerateHandler(prompt, aspectRatio, imageSize, false, 1);
          const imageUrl = Array.isArray(result) ? result[0] : result;

          setGeneratedImage(imageUrl);
          setBatchResults([]);
          saveToHistory({
            image: null, refImage, faceImage2: null, prompt,
            generatedImage: imageUrl, batchResults: null,
            aspectRatio, imageSize, isBatchMode: false
          });
        }

      } else {
        // --- DEFAULT GENERATOR LOGIC ---
        if (isBatchMode && batchModeAvailable) {
          // Initialize batch slots with loading state
          const initialSlots: BatchResultItem[] = Array.from({ length: batchCount }, () => ({ url: null, loading: true }));
          setBatchResults(initialSlots);

          const finalResults: BatchResultItem[] = [...initialSlots];
          let firstSuccess: string | null = null;

          for (let i = 0; i < batchCount; i++) {
            setLoadingMessage(`Mengenerate gambar ${i + 1} dari ${batchCount} (Pose Acak)...`);
            const batchVariationPrompt = `${finalPrompt} \n\n[VARIASI BATCH #${i + 1}: Hasilkan variasi pose, sudut pandang, dan ekspresi yang unik dan berbeda dari biasanya. Acak gaya pose agar dinamis.]`;

            try {
              const result = await generateCreativeImage(batchVariationPrompt, image, aspectRatio, imageSize, refImage, faceImage2);
              finalResults[i] = { url: result, loading: false };
              if (!firstSuccess) firstSuccess = result;
            } catch (err: any) {
              console.error(`Batch ${i + 1} failed`, err);
              finalResults[i] = { url: null, error: err.message || 'Gagal', loading: false };
            }
            // Update state progressively after each image
            setBatchResults([...finalResults]);
          }

          const successCount = finalResults.filter(r => r.url).length;
          if (successCount === 0) throw new Error("Semua batch gagal dihasilkan.");

          setGeneratedImage(firstSuccess);
          saveToHistory({
            image, refImage, faceImage2, prompt,
            generatedImage: firstSuccess,
            batchResults: finalResults,
            aspectRatio, imageSize, isBatchMode: true
          });

        } else {
          const result = await generateCreativeImage(finalPrompt, image, aspectRatio, imageSize, refImage, faceImage2);
          setGeneratedImage(result);
          setBatchResults([]);

          saveToHistory({
            image, refImage, faceImage2, prompt,
            generatedImage: result,
            batchResults: null,
            aspectRatio, imageSize, isBatchMode: false
          });
        }
      }

      setProgress(100);
      setLoadingMessage("Menyelesaikan...");
      await new Promise(resolve => setTimeout(resolve, 600));

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal membuat gambar. Silakan coba lagi.");
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      setLoading(false);
    }
  };

  const handleQuickEdit = async (editInstruction: string) => {
    if (!generatedImage) return;

    const { progressInterval, messageInterval } = startLoadingFlow(imageSize);
    setLoadingMessage("Menerapkan pengeditan...");

    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const previousResultFile = new File([blob], "edit_source.png", { type: "image/png" });

      const finalPrompt = `Edit gambar ini: ${editInstruction}. Pertahankan komposisi utama, tapi terapkan perubahan gaya/objek yang diminta dengan kuat. Resolusi tinggi.`;

      const result = await generateCreativeImage(
        finalPrompt, previousResultFile, aspectRatio, imageSize, null, null
      );

      setProgress(100);
      setLoadingMessage("Menyelesaikan edit...");
      await new Promise(resolve => setTimeout(resolve, 600));

      setGeneratedImage(result);
      setBatchResults([]);
      setEditPrompt('');

      saveToHistory({
        image: previousResultFile,
        refImage: null, faceImage2: null,
        prompt: `Edit: ${editInstruction}`,
        generatedImage: result,
        aspectRatio, imageSize
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal mengedit gambar.");
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      setLoading(false);
    }
  };

  const renderUploadBox = (
    label: string,
    fileState: File | null,
    setter: React.Dispatch<React.SetStateAction<File | null>>,
    id: string,
    required: boolean = false,
    nameValue?: string,
    onNameChange?: (val: string) => void
  ) => (
    <div className="space-y-2 h-full flex flex-col">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex flex-col justify-center items-center relative min-h-[160px]">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setter)}
            className="hidden"
            id={id}
          />
          <label htmlFor={id} className="cursor-pointer flex flex-col items-center gap-2 w-full h-full justify-center">
            {fileState ? (
              <>
                <div className="relative w-full h-32 md:h-40">
                  <img src={URL.createObjectURL(fileState)} alt="Preview" className="w-full h-full object-contain rounded-lg shadow-sm" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setter(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 z-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
                <span className="text-xs text-primary-600 font-medium">Ganti Gambar</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
                  {required ? '📤' : '➕'}
                </div>
                <span className="text-xs text-gray-500">Unggah</span>
              </>
            )}
          </label>
        </div>

        {showNames && onNameChange && (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={`Nama ${label.toLowerCase().replace('*', '')}`}
            className="w-full text-center text-sm border-b border-gray-200 dark:border-gray-700 bg-transparent py-1 focus:border-primary-500 outline-none transition-colors text-gray-800 dark:text-gray-200"
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {error && (
        <ErrorPopup
          message={error}
          onClose={() => setError(null)}
          onRetry={handleGenerate}
        />
      )}

      {/* ZOOM MODAL */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/80 hover:text-white p-2 bg-white/10 rounded-full z-10"
            onClick={() => setZoomedImage(null)}
          >
            <X size={28} />
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed Image"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={zoomedImage}
            download={`nusantara-zoom-${Date.now()}.png`}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white text-black rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Unduh HD
          </a>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">


          {headerControls && (
            <div className="mb-4">
              {headerControls}
            </div>
          )}

          {(!isInfographic && !customGenerateHandler) && (
            <div className={`grid gap-4 ${(allowReferenceImage && allowAdditionalFaceImage)
              ? 'grid-cols-1 sm:grid-cols-3'
              : (allowReferenceImage || allowAdditionalFaceImage)
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1'
              }`}>
              {renderUploadBox(mainImageLabel, image, setImage, "file-upload", requireImage, name1, onName1Change)}
              {allowAdditionalFaceImage && renderUploadBox(secondFaceLabel, faceImage2, setFaceImage2, "face-upload-2", false, name2, onName2Change)}
              {allowReferenceImage && renderUploadBox(referenceImageLabel, refImage, setRefImage, "ref-upload", false)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Rasio Aspek</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-sm dark:text-white"
              >
                <option value="1:1">1:1 (Kotak)</option>
                <option value="9:16">9:16 (Potret)</option>
                <option value="16:9">16:9 (Lanskap)</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Resolusi</label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 text-sm dark:text-white"
              >
                <option value="1K">1K (Standar - Cepat ⚡)</option>
                <option value="2K">2K (Detail Tinggi - ~30dtk)</option>
                <option value="4K">4K (Ultra HD - ~1-2 menit)</option>
              </select>
            </div>
          </div>

          {extraControls}

          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-end">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {customPromptLabel || "Detail Prompt Tambahan"}
              </label>

              {!isInfographic && (
                <div className="flex gap-2">
                  {customPromptGenerator && (
                    <button
                      onClick={handleCustomPromptGen}
                      disabled={textLoading}
                      className="px-3 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full transition-colors flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                    >
                      {textLoading ? '...' : '📝 Generate Deskripsi'}
                    </button>
                  )}

                  <button
                    onClick={handleGiveIdea}
                    disabled={textLoading}
                    className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 rounded-full transition-colors flex items-center gap-1 border border-purple-200 dark:border-purple-800"
                  >
                    {textLoading ? '...' : '💡 Beri saya ide'}
                  </button>
                  {!useLargeRefineButton && (
                    <button
                      onClick={handleRefinePrompt}
                      disabled={textLoading || (!prompt && !customRefineHandler)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-full transition-colors flex items-center gap-1 border border-blue-200 dark:border-blue-800 disabled:opacity-50"
                    >
                      {textLoading ? '...' : (customRefineLabel || '✨ Detailkan prompt')}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white pr-10"
                rows={3}
                placeholder={isInfographic ? "Masukkan poin data Anda di sini..." : "Contoh: Gaya neon futuristik, pencahayaan matahari terbenam..."}
              />
              {prompt && (
                <button
                  onClick={() => setPrompt('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Hapus Teks"
                >
                  <X size={16} />
                </button>
              )}
              {textLoading && (
                <div className="absolute right-3 bottom-3 animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              )}
            </div>

            {useLargeRefineButton && (
              <button
                onClick={handleRefinePrompt}
                disabled={textLoading || (!prompt && !customRefineHandler)}
                className="w-full py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 shadow-sm disabled:opacity-50"
              >
                {textLoading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                    {customRefineLabel ? 'Sedang Menganalisis & Menulis...' : 'Sedang Mendetailkan...'}
                  </>
                ) : (
                  <>
                    <span className="text-lg">✨</span>
                    {customRefineLabel || 'Berikan Deskripsi Detail Otomatis'}
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {batchModeAvailable && (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer duration-300 ease-in-out ${isBatchMode ? 'bg-green-500' : 'bg-red-500'}`} onClick={() => setIsBatchMode(!isBatchMode)}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isBatchMode ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">Mode Batch (Banyak Gambar)</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Pose akan diacak otomatis untuk tiap gambar.</span>
                  </div>
                </div>
                {isBatchMode && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Jumlah (Max 15):</label>
                    <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-0.5">
                      <button
                        onClick={() => setBatchCount(prev => Math.max(1, prev - 1))}
                        disabled={batchCount <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors font-bold text-lg"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-white">
                        {batchCount}
                      </span>
                      <button
                        onClick={() => setBatchCount(prev => Math.min(15, prev + 1))}
                        disabled={batchCount >= 15}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition-colors font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0 || loading}
                className="p-4 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Urungkan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </button>

              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1 || loading}
                className="p-4 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Ulangi"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                </svg>
              </button>

              <button
                onClick={handleGenerate}
                disabled={loading || (requireImage && !image && !customGenerateHandler)}
                className={`flex-1 relative overflow-hidden group py-4 font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.99] duration-300
                    ${loading
                    ? 'bg-white dark:bg-dark-card border border-primary-200 dark:border-primary-900 cursor-wait shadow-none'
                    : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white shadow-primary-500/30'
                  }`}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                      </div>
                      <span className="text-sm font-medium tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400 animate-pulse">
                        {loadingMessage}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center gap-2">
                    <span>{isBatchMode ? `Buat ${batchCount} Variasi` : title.toUpperCase().includes('COSPLAY') ? 'GENERATE COSPLAY' : 'Buat Keajaiban'}</span>
                    <span>✨</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className={`bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 min-h-[400px] border border-gray-200 dark:border-gray-700 relative overflow-hidden group ${!generatedImage && !batchResults.length ? 'flex items-center justify-center' : ''}`}>
            {batchResults.length > 0 && isBatchMode ? (
              <div className="w-full h-full animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-700 dark:text-gray-200">
                    Hasil Batch ({batchResults.filter(r => r.url).length}/{batchResults.length} Berhasil)
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 auto-rows-max">
                  {batchResults.map((item, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden shadow-md bg-gray-200 dark:bg-gray-700 min-h-[200px]">
                      {item.loading ? (
                        // Loading State
                        <div className="flex flex-col items-center justify-center h-48 animate-pulse">
                          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-2"></div>
                          <span className="text-xs text-gray-500">Gambar {idx + 1}...</span>
                        </div>
                      ) : item.url ? (
                        // Success State
                        <div className="relative group/item">
                          <img src={item.url} alt={`Result ${idx + 1}`} className="w-full h-auto object-cover" />
                          {/* Action Buttons Below Image */}
                          <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 justify-center">
                            <button
                              onClick={() => setZoomedImage(item.url)}
                              className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-indigo-200 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                              </svg>
                              Zoom
                            </button>
                            <a
                              href={item.url}
                              download={`nusantara-batch-${idx + 1}-${Date.now()}.png`}
                              className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-green-200 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                              Unduh
                            </a>
                          </div>
                        </div>
                      ) : (
                        // Error State
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                          </div>
                          <span className="text-xs font-bold text-red-500 mb-1">Gambar {idx + 1} Gagal</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{item.error || 'Terjadi kesalahan'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : generatedImage ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center animate-fade-in">
                <img
                  src={generatedImage}
                  alt="Generated Art"
                  className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-2xl"
                />

                {/* RENDER CUSTOM RESULT ACTIONS HERE */}
                {renderCustomResultActions && (
                  <div className="w-full mt-4 animate-fade-in-up">
                    {renderCustomResultActions(generatedImage)}
                  </div>
                )}

                <a
                  href={generatedImage}
                  download={`nusantara-ai-${Date.now()}.png`}
                  className="mt-4 px-6 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-full font-medium shadow-xl hover:scale-105 transition-transform flex items-center gap-2 border border-gray-200 dark:border-gray-600"
                >
                  <span>Unduh Hasil HD</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3.3-3.3m0 0l-3.3 3.3m3.3-3.3v7.5" />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-500 w-full h-full flex items-center justify-center">
                {loading ? (
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-20 h-20 mb-6">
                      <div className="absolute inset-0 border-2 border-primary-500/20 rounded-full animate-[spin_3s_linear_infinite]"></div>
                      <div className="absolute inset-2 border-2 border-t-indigo-500 border-r-transparent border-b-indigo-500 border-l-transparent rounded-full animate-[spin_2s_linear_infinite]"></div>
                      <div className="absolute inset-5 bg-gradient-to-br from-primary-500/20 to-indigo-500/20 rounded-full animate-pulse backdrop-blur-sm"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-500 text-xs font-mono">AI</div>
                    </div>
                    <p className="text-sm font-medium tracking-widest uppercase text-gray-400 dark:text-gray-500 animate-pulse">Memproses</p>
                  </div>
                ) : (
                  <div className="opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p>Visual karakter akan muncul di sini</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {generatedImage && !loading && !isBatchMode && (
            <div className="bg-white/50 dark:bg-dark-card/50 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎨</span>
                <h3 className="font-bold text-gray-800 dark:text-gray-200">Edit Cepat & Variasi</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_EDITS.map((edit) => (
                  <button
                    key={edit}
                    onClick={() => handleQuickEdit(edit)}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200 dark:border-gray-700 rounded-full transition-all shadow-sm"
                  >
                    {edit}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Ketik instruksi edit... (cth: ubah rambut jadi merah)"
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent p-2.5 text-sm dark:text-white focus:ring-2 focus:ring-primary-500 outline-none pr-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit(editPrompt)}
                />
                {editPrompt && (
                  <button
                    onClick={() => setEditPrompt('')}
                    className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 rounded-full"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleQuickEdit(editPrompt)}
                  disabled={!editPrompt.trim()}
                  className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}

          {generatedImage && !loading && !isBatchMode && (
            <div className="bg-white/50 dark:bg-dark-card/50 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                <span className="text-xl">🚀</span>
                <h3 className="font-bold text-gray-800 dark:text-gray-200">Studio Konten & Sosial Media</h3>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleAnalyzePrompt}
                  disabled={analysisLoading}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {analysisLoading ? 'Menganalisis...' : '🔍 Analisis Prompt (Reverse Engineering)'}
                </button>
                {analyzedPrompt && (
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-mono relative group">
                    {analyzedPrompt}
                    <button
                      onClick={() => navigator.clipboard.writeText(analyzedPrompt)}
                      className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Salin"
                    >
                      📋
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['Instagram', 'Threads', 'TikTok'].map(platform => (
                  <div key={platform} className="space-y-2">
                    <button
                      onClick={() => handleSocialCaption(platform)}
                      disabled={analysisLoading}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${platform === 'Instagram' ? 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100 dark:bg-pink-900/20 dark:border-pink-800' :
                        platform === 'TikTok' ? 'bg-gray-800 text-white border-gray-700 hover:bg-black' :
                          'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
                        }`}
                    >
                      Buat Caption {platform}
                    </button>
                    {socialCaptions[platform] && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 h-64 min-h-[250px] overflow-y-auto text-xs whitespace-pre-wrap relative group">
                        {socialCaptions[platform]}
                        <button
                          onClick={() => navigator.clipboard.writeText(socialCaptions[platform])}
                          className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Salin"
                        >
                          📋
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};