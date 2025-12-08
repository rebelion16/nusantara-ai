
import React from 'react';
import { ModuleDefinition, ModuleId } from '../../types';

interface HomeProps {
  onNavigate: (id: ModuleId) => void;
}

// Exported and Sorted Alphabetically
export const MODULES: ModuleDefinition[] = ([
  {
    id: 'virtual-photoshoot',
    title: 'Foto Studio Virtual',
    description: 'Ubah selfie biasa menjadi foto studio profesional dengan berbagai konsep.',
    icon: '📸',
    gradient: 'from-pink-500 to-rose-500',
    category: 'Virtual Studio'
  },
  {
    id: 'prewed-virtual',
    title: 'Prewed Virtual',
    description: 'Simulasi foto prewedding profesional dengan berbagai tema (Korean, Rustic, Modern).',
    icon: '💍',
    gradient: 'from-rose-400 to-pink-600',
    category: 'Virtual Studio'
  },
  {
    id: 'cosplay-fusion',
    title: 'Cosplay Fusion',
    description: 'Berubah menjadi karakter favorit Anda dengan transformasi cosplay berkualitas tinggi.',
    icon: '🎭',
    gradient: 'from-purple-500 to-indigo-500',
    category: 'Virtual Studio'
  },
  {
    id: 'nusantara-studio',
    title: 'Studio Pakaian Adat',
    description: 'Tampilkan warisan budaya dengan pakaian adat tradisional Indonesia.',
    icon: '🏛️',
    gradient: 'from-red-600 to-red-800',
    category: 'Virtual Studio'
  },
  {
    id: 'bikini-photoshoot',
    title: 'Mode Musim Panas',
    description: 'Ubah foto menjadi suasana pantai yang cerah dan estetika musim panas.',
    icon: '🏖️',
    gradient: 'from-blue-400 to-cyan-400',
    category: 'Virtual Studio'
  },
  {
    id: 'yt-short-maker',
    title: 'YT Short Maker',
    description: 'Ubah video YouTube panjang menjadi Shorts viral otomatis dengan analisis AI.',
    icon: '📹',
    gradient: 'from-red-600 to-orange-600',
    category: 'Video & Audio'
  },
  {
    id: 'vidgen',
    title: 'VidGen by VEO3',
    description: 'Buat video sinematik dari teks atau gambar dengan AI Generatif Google Veo 3.',
    icon: '🎥',
    gradient: 'from-indigo-600 to-purple-600',
    category: 'Video & Audio'
  },
  {
    id: 'voice-over',
    title: 'Voice Over Studio',
    description: 'Ubah teks menjadi suara manusia yang natural dengan berbagai pilihan emosi.',
    icon: '🎙️',
    gradient: 'from-teal-500 to-emerald-600',
    category: 'Video & Audio'
  },
  {
    id: 'ai-melukis',
    title: 'AI Melukis Imajinasi',
    description: 'Atelier digital: Ubah teks & foto menjadi lukisan cat minyak artistik dengan kontrol komposisi.',
    icon: '🖌️',
    gradient: 'from-amber-600 to-yellow-600',
    category: 'Seni & Desain'
  },
  {
    id: 'wallpaper-generator',
    title: 'Wallpaper Generator',
    description: 'Buat wallpaper HD estetik untuk HP (9:16) dan Desktop (16:9) dengan berbagai gaya.',
    icon: '🖼️',
    gradient: 'from-fuchsia-500 to-purple-600',
    category: 'Seni & Desain'
  },
  {
    id: 'karikatur',
    title: 'AI Karikatur',
    description: 'Buat gambar karikatur artistik yang lucu dan unik dari potret standar.',
    icon: '🎨',
    gradient: 'from-orange-400 to-amber-500',
    category: 'Seni & Desain'
  },
  {
    id: 'story-board',
    title: 'Story Board',
    description: 'Buat alur cerita visual 5 panel otomatis dari tema atau gambar referensi.',
    icon: '🎬',
    gradient: 'from-blue-600 to-cyan-500',
    category: 'Seni & Desain'
  },
  {
    id: 'infografis',
    title: 'Infografis Builder',
    description: 'Ubah teks data mentah menjadi konsep infografis visual yang indah.',
    icon: '📊',
    gradient: 'from-slate-500 to-gray-600',
    category: 'Bisnis & Marketing'
  },
  {
    id: 'content-creator',
    title: 'Analisa & Prompt',
    description: 'Reverse engineering prompt, ekstrak outfit, dan optimasi konten sosial media.',
    icon: '⚡',
    gradient: 'from-yellow-400 to-orange-500',
    category: 'Bisnis & Marketing'
  },
  {
    id: 'pinsta-product',
    title: 'Pinsta Produk',
    description: 'Tingkatkan foto produk UMKM menjadi kualitas komersial kelas atas.',
    icon: '🛍️',
    gradient: 'from-emerald-400 to-teal-500',
    category: 'Bisnis & Marketing'
  },
  {
    id: 'rebel-fx',
    title: 'Digital RebelFX',
    description: 'AI Market Analysis, Chatbot Astra, dan Signal Generator untuk Trader Forex Modern.',
    icon: '📈',
    gradient: 'from-cyan-500 to-blue-600',
    category: 'Bisnis & Marketing'
  }
] as ModuleDefinition[]).sort((a, b) => a.title.localeCompare(b.title));

export const HomeModule: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4 py-10">
        <h1 className="text-4xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600">
          Nusantara AI Modul All in One
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Satu platform, kemungkinan kreatif tak terbatas. Pilih modul untuk memulai perjalanan Anda.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULES.map((mod) => (
          <div 
            key={mod.id}
            onClick={() => onNavigate(mod.id)}
            className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${mod.gradient} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform`} />
            <div className="relative z-10 space-y-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-lg`}>
                <span className="text-4xl">{mod.icon}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{mod.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{mod.description}</p>
                {mod.category && (
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 tracking-wider">
                        {mod.category}
                    </span>
                )}
              </div>
              <div className="pt-2 flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:translate-x-1 transition-transform">
                Buka Modul 
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};