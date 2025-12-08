
import React from 'react';
import { Youtube, Construction, Clock, Rocket } from 'lucide-react';

export const YTShortMakerModule: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center animate-fade-in space-y-8">
      
      {/* Icon Graphic */}
      <div className="relative">
        <div className="w-32 h-32 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center shadow-inner">
            <Youtube size={64} className="text-red-600 opacity-50" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 inline-flex items-center gap-2 transform -rotate-6 hover:rotate-0 transition-transform duration-300 cursor-default">
                <Construction size={24} className="text-yellow-500" />
                <span className="font-bold text-sm text-gray-800 dark:text-white">Under Construction</span>
            </div>
        </div>
      </div>
      
      <div className="space-y-6 max-w-lg">
        <div className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            YT Short Maker
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
            AI Video Repurposing Suite
            </p>
        </div>
        
        {/* Info Card */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-2xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-bl-full -mr-4 -mt-4"></div>
            
            <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-400 mb-3 flex items-center justify-center gap-2">
                <Clock size={22} /> Sedang Dalam Pengembangan
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-6">
                Kami sedang meracik algoritma AI canggih untuk memotong video panjang YouTube Anda menjadi Shorts viral secara otomatis. Fitur ini membutuhkan optimasi server khusus untuk performa terbaik.
            </p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-bold uppercase tracking-wider">
                <Rocket size={14} /> Segera Hadir
            </div>
        </div>
        
        <p className="text-xs text-gray-400 italic">
            *Fitur ini akan tersedia pada update berikutnya. Nantikan kejutannya!
        </p>
      </div>
    </div>
  );
};
    