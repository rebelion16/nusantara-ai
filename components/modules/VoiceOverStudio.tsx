
import React, { useState } from 'react';
import { Mic, Play, Download, Trash2, Sparkles, Wand2, AudioLines, Loader2, Music, X } from 'lucide-react';
import { generateSpeech, generateScript } from '../../services/geminiService';

const VOICES = [
  { id: 'Puck', name: 'Puck (Laki-laki) - Tenang & Santai', gender: 'Male', desc: 'Suara lembut dan natural, cocok untuk narasi cerita atau podcast santai.' },
  { id: 'Charon', name: 'Charon (Laki-laki) - Berat & Berwibawa', gender: 'Male', desc: 'Suara dalam (deep voice), cocok untuk dokumenter, trailer film, atau horor.' },
  { id: 'Kore', name: 'Kore (Perempuan) - Lembut & Menenangkan', gender: 'Female', desc: 'Suara halus dan bersih, cocok untuk meditasi, puisi, atau iklan kosmetik.' },
  { id: 'Fenrir', name: 'Fenrir (Laki-laki) - Energik & Intens', gender: 'Male', desc: 'Suara cepat dan bersemangat, cocok untuk iklan promo, gaming, atau hype content.' },
  { id: 'Zephyr', name: 'Zephyr (Perempuan) - Profesional & Jelas', gender: 'Female', desc: 'Suara standar penyiar berita (News Anchor), jelas, formal, dan edukatif.' },
];

interface GeneratedAudio {
  id: number;
  url: string;
  text: string;
  voice: string;
  timestamp: string;
}

export const VoiceOverStudioModule: React.FC = () => {
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[2].id); // Default Kore
  const [emotion, setEmotion] = useState('');
  
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const [audioList, setAudioList] = useState<GeneratedAudio[]>([]);

  const handleAutoScript = async () => {
    setIsGeneratingScript(true);
    try {
      // Use the first few words of existing script as topic, or default
      const topic = script.length > 5 ? script : "Promosi Produk Teknologi Canggih";
      const generated = await generateScript(topic);
      setScript(generated);
    } catch (error) {
      console.error(error);
      alert("Gagal membuat naskah otomatis.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script.trim()) {
      alert("Mohon isi naskah terlebih dahulu.");
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const audioUrl = await generateSpeech(script, selectedVoice, emotion);
      
      const voiceName = VOICES.find(v => v.id === selectedVoice)?.name || selectedVoice;

      const newAudio: GeneratedAudio = {
        id: Date.now(),
        url: audioUrl,
        text: script.length > 50 ? script.substring(0, 50) + "..." : script,
        voice: voiceName,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setAudioList(prev => [newAudio, ...prev]);
    } catch (error: any) {
      console.error(error);
      alert("Gagal membuat audio: " + error.message);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleDeleteAudio = (id: number) => {
    setAudioList(prev => prev.filter(a => a.id !== id));
  };

  const handleClearAll = () => {
    setAudioList([]);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
          <Mic className="text-teal-500" size={32} /> Voice Over Studio
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Ubah teks menjadi narasi suara manusia yang natural dengan teknologi Google Gemini TTS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* INPUT SECTION */}
        <div className="bg-slate-900 dark:bg-dark-card rounded-2xl p-6 md:p-8 shadow-xl border border-slate-700 relative overflow-hidden">
           {/* Decorative Glow */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full pointer-events-none"></div>

           <div className="relative z-10 space-y-6">
              
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                   <AudioLines size={14} /> Naskah
                </label>
                <textarea 
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Tulis naskah di sini..."
                  className="w-full h-32 bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none transition-all pr-8"
                />
                {script && (
                    <button
                        onClick={() => setScript('')}
                        className="absolute right-3 top-[32px] text-gray-400 hover:text-teal-500 p-1"
                    >
                        <X size={16} />
                    </button>
                )}
                <div className="flex justify-end">
                   <button 
                     onClick={handleAutoScript}
                     disabled={isGeneratingScript}
                     className="text-xs flex items-center gap-1 text-teal-400 hover:text-teal-300 disabled:opacity-50 transition-colors border border-teal-500/30 px-3 py-1.5 rounded-full hover:bg-teal-500/10"
                   >
                      {isGeneratingScript ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {isGeneratingScript ? 'Menulis...' : 'Tuliskan Naskah Otomatis'}
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SUARA AI</label>
                    <div className="relative">
                       <select 
                         value={selectedVoice}
                         onChange={(e) => setSelectedVoice(e.target.value)}
                         className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white appearance-none outline-none focus:border-teal-500"
                       >
                         {VOICES.map(v => (
                           <option key={v.id} value={v.id}>{v.name}</option>
                         ))}
                       </select>
                       <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                       </div>
                    </div>
                    {/* Voice Description */}
                    <div className="text-[10px] text-teal-400/80 px-2">
                        {VOICES.find(v => v.id === selectedVoice)?.desc}
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">GAYA / EMOSI</label>
                    <input 
                      type="text" 
                      value={emotion}
                      onChange={(e) => setEmotion(e.target.value)}
                      placeholder="Contoh: Berbisik, Marah, Berita..."
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-teal-500 placeholder-slate-500"
                    />
                 </div>
              </div>

              <button 
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio || !script.trim()}
                className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                 {isGeneratingAudio ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                 <span>{isGeneratingAudio ? 'Sedang Memproses Suara...' : 'GENERATE AUDIO'}</span>
              </button>

           </div>
        </div>

        {/* RESULTS SECTION */}
        <div className="bg-slate-900/50 dark:bg-dark-card/50 rounded-2xl border border-slate-700/50 p-6 min-h-[200px]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Music size={20} className="text-teal-500" /> Hasil Rekaman
              </h3>
              {audioList.length > 0 && (
                 <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-300">Hapus Semua</button>
              )}
           </div>

           <div className="space-y-4">
              {audioList.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-10 text-slate-500 opacity-60">
                    <AudioLines size={48} className="mb-2" />
                    <p className="text-sm">Belum ada rekaman.</p>
                 </div>
              ) : (
                 audioList.map((audio) => (
                    <div key={audio.id} className="bg-slate-800 dark:bg-gray-800 border border-slate-700 dark:border-gray-700 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 animate-fade-in-up">
                       <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 text-teal-400">
                          <Play size={18} fill="currentColor" />
                       </div>
                       
                       <div className="flex-1 min-w-0 w-full text-center md:text-left">
                          <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-1 md:gap-2 mb-1">
                             <span className="text-sm font-bold text-white">{audio.voice}</span>
                             <span className="text-[10px] text-slate-400">{audio.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{audio.text}</p>
                       </div>

                       <div className="w-full md:w-auto flex items-center gap-3">
                          <audio controls src={audio.url} className="h-8 w-full md:w-48 rounded-lg" />
                          
                          <a 
                            href={audio.url} 
                            download={`voiceover-${audio.id}.wav`}
                            className="p-2 text-slate-400 hover:text-teal-400 transition-colors"
                            title="Unduh"
                          >
                             <Download size={18} />
                          </a>
                          
                          <button 
                            onClick={() => handleDeleteAudio(audio.id)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                            title="Hapus"
                          >
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>

      </div>
    </div>
  );
};
