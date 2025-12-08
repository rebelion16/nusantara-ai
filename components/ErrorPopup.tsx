
import React from 'react';

interface ErrorPopupProps {
  message: string;
  onClose: () => void;
  onRetry: () => void;
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({ message, onClose, onRetry }) => {
  // 1. Ekstrak pesan bersih jika formatnya JSON (seperti respon error Google API)
  let displayMessage = message;
  try {
    if (message.includes('{"error":')) {
        const jsonStart = message.indexOf('{');
        const jsonEnd = message.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = message.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);
            if (parsed.error && parsed.error.message) {
                displayMessage = parsed.error.message;
            }
        }
    }
  } catch (e) {
    // Jika gagal parse, gunakan pesan original
  }

  const lowerMsg = displayMessage.toLowerCase();

  const isNoImageError = lowerMsg.includes("tidak ada gambar") || lowerMsg.includes("no image");
  
  const isApiKeyError = 
    lowerMsg.includes("missing_api_key") || 
    lowerMsg.includes("api key") || 
    lowerMsg.includes("apikey") ||
    lowerMsg.includes("403") ||
    lowerMsg.includes("invalid_argument"); 
    
  const isQuotaError = 
    lowerMsg.includes("429") || 
    lowerMsg.includes("quota") || 
    lowerMsg.includes("resource_exhausted") || 
    lowerMsg.includes("too many requests");

  const isSafetyError = lowerMsg.includes("safety") || lowerMsg.includes("blocked") || lowerMsg.includes("harmful") || lowerMsg.includes("prohibited");
  
  let slangTitle = "Yah, Error Nih! 🤯";
  let slangMessage = `Ada masalah teknis nih kak: "${displayMessage}". Biasalah, namanya juga sistem. Coba lagi aja kak!`;

  if (isNoImageError) {
    slangTitle = "Waduh, Gagal Bestie! 🙈";
    slangMessage = "AI-nya lagi tantrum nih, gambarnya gak mau keluar. Mungkin server lagi padet atau dia bingung sama prompt kamu. Jangan nyerah, gass coba lagi dong! 🚀";
  } else if (isApiKeyError) {
    slangTitle = "API KEY Verifikasi";
    slangMessage = "API Key kamu sepertinya tidak valid, kadaluarsa, atau belum diatur. Cek pengaturan di pojok kiri atas (ikon kunci) dan masukkan API Key Google AI Studio yang benar ya!";
  } else if (isQuotaError) {
    slangTitle = "Kuota Habis Hehe! 🔋";
    slangMessage = "Waduh, kuota AI kamu udah mentok nih (Limit Tercapai). Coba tunggu sebentar, atau ganti API Key yang masih fresh. Maklum, barang bagus banyak yang pake! 😅";
  } else if (isSafetyError) {
    slangTitle = "Ups, Kena Sensor! 🛡️";
    slangMessage = "Prompt kamu dianggap kurang aman oleh sistem keamanan AI (Safety Filter). Coba ganti kata-katanya biar lebih sopan atau aman ya!";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-red-100 dark:border-red-900/50 transform scale-100 transition-transform text-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <span className="text-4xl">
                {isApiKeyError ? '🔑' : isQuotaError ? '🔋' : isSafetyError ? '🛡️' : '😤'}
            </span>
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
            {slangTitle}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed px-2 break-words">
            {slangMessage}
            </p>
            
            <div className="flex gap-3 justify-center">
            <button 
                onClick={onClose}
                className="flex-1 px-5 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
                Tutup Aja
            </button>
            <button 
                onClick={onRetry}
                className="flex-1 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-red-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                <span>🔄</span> Coba Lagi
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};
