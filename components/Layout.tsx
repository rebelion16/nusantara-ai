import React, { useState, useEffect, useMemo } from 'react';
import { ModuleId, Theme, UserProfile } from '../types';
import {
  Menu,
  X,
  LogOut,
  Key,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Settings,
  Palette,
  Sun,
  Moon,
} from 'lucide-react';
import { MODULES } from './modules/Home';

interface LayoutProps {
  children: React.ReactNode;
  activeModule: ModuleId;
  onNavigate: (id: ModuleId) => void;
  user: UserProfile | null;
  onLogout: () => void;
  // NEW: minta Layout auto buka modal API Key ketika pertama kali render
  openApiKeyOnFirstLoad?: boolean;
}

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-sm font-mono opacity-80">
      {time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </div>
  );
};

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
}) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${className}`}
      title="Ubah Tema"
    >
      {theme === 'light' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
      )}
    </button>
  );
};

// API Key Modal Component
const ApiKeyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [key, setKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('GEMINI_API_KEY') || '';
      setKey(stored);
      setIsSaved(!!stored);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem('GEMINI_API_KEY', key.trim());
      setIsSaved(true);
      alert('API Key berhasil disimpan! Aplikasi siap digunakan.');
      onClose();
    } else {
      alert('API Key tidak boleh kosong.');
    }
  };

  const handleClear = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setKey('');
    setIsSaved(false);
    alert('API Key telah dihapus.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 transform scale-100 transition-transform relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg">
              <Key size={20} />
            </span>
            Konfigurasi API Key
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          Untuk menggunakan fitur AI canggih di aplikasi ini, Anda perlu memasukkan{' '}
          <strong>Google Gemini API Key</strong>. Anda dapat menggunakan key pribadi atau dari
          project Google Cloud teman.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Google AI Cloud Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste Key (AIzaSy...)"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white pr-10 transition-all"
              />
              {isSaved && (
                <span className="absolute right-3 top-3.5 text-green-500 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75S17.385 21.75 12 21.75 2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              *Key disimpan aman di browser Anda (LocalStorage).
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ExternalLink size={14} /> Dapatkan API Key Disini
            </a>
            {isSaved && (
              <button
                onClick={handleClear}
                className="py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                Hapus Key
              </button>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-lg transition-transform active:scale-95"
            >
              Simpan & Gunakan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Panel Component
interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bgOpacity: number;
  setBgOpacity: (val: number) => void;
  bgColor: string;
  setBgColor: (val: string) => void;
  theme: Theme;
  setTheme: (val: Theme) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  bgOpacity,
  setBgOpacity,
  bgColor,
  setBgColor,
  theme,
  setTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'background' | 'theme'>('background');

  const handleOpacityChange = (val: number) => {
    setBgOpacity(val);
    localStorage.setItem('NUSANTARA_BG_OPACITY', String(val));
  };

  const handleColorChange = (val: string) => {
    setBgColor(val);
    localStorage.setItem('NUSANTARA_BG_COLOR', val);
  };

  const handleThemeChange = (val: Theme) => {
    setTheme(val);
    localStorage.setItem('NUSANTARA_THEME', val);
  };

  const presetColors = [
    '#000000', '#1a1a2e', '#16213e', '#0f3460', '#1b262c',
    '#2d132c', '#3d1c02', '#0a3200', '#1a0000', '#0a1628'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 transform scale-100 transition-transform relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>

        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-1.5 rounded-lg">
              <Settings size={20} />
            </span>
            Pengaturan Tampilan
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setActiveTab('background')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'background'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Palette size={16} />
            Background
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'theme'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Sun size={16} />
            Tema
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'background' && (
            <>
              {/* Opacity Slider */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Transparansi Overlay
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bgOpacity}
                    onChange={(e) => handleOpacityChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="w-14 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-sm font-mono font-bold text-gray-700 dark:text-gray-300">
                    {bgOpacity}%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Atur tingkat kegelapan/kecerahan overlay di atas gambar background
                </p>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Warna Overlay (Mode Gelap)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-12 rounded-xl border-2 border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                {/* Preset Colors */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${bgColor === color ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'theme' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Pilih Tema Tampilan
              </label>

              {/* Base Mode Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${theme === 'light'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <Sun size={20} className="text-yellow-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">Terang</p>
                    <p className="text-[10px] text-gray-500">Mode siang</p>
                  </div>
                </button>

                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${theme === 'dark'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center shadow-sm">
                    <Moon size={20} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">Gelap</p>
                    <p className="text-[10px] text-gray-500">Mode malam</p>
                  </div>
                </button>
              </div>

              {/* Color Theme Presets */}
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Preset Warna
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Pastel - Light Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('light');
                    handleColorChange('#f8e8f0');
                    handleOpacityChange(75);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-pink-500">Pastel</p>
                </button>

                {/* Blue Sky - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#0c1e3d');
                    handleOpacityChange(65);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-sky-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-500"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-sky-500">Blue Sky</p>
                </button>

                {/* Pop Colors - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#2a0a3e');
                    handleOpacityChange(60);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-fuchsia-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-fuchsia-500">Pop</p>
                </button>

                {/* Sci-Fi - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#050a15');
                    handleOpacityChange(70);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-cyan-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-cyan-500">Sci-Fi</p>
                </button>

                {/* Nature - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#0a1f10');
                    handleOpacityChange(65);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-emerald-300 via-green-500 to-teal-600"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-emerald-500">Nature</p>
                </button>

                {/* Sunset - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#1f0505');
                    handleOpacityChange(60);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-orange-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-orange-500">Sunset</p>
                </button>

                {/* Midnight - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#0a0a1a');
                    handleOpacityChange(80);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-indigo-800 via-purple-900 to-slate-900"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-indigo-500">Midnight</p>
                </button>

                {/* Ocean - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#051520');
                    handleOpacityChange(68);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-teal-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-teal-300 via-cyan-500 to-blue-700"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-teal-500">Ocean</p>
                </button>

                {/* Monochrome - Dark Theme */}
                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    handleColorChange('#121212');
                    handleOpacityChange(75);
                  }}
                  className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 transition-all flex flex-col items-center gap-2 group"
                >
                  <div className="w-full h-8 rounded-lg bg-gradient-to-r from-gray-400 via-gray-600 to-gray-900"></div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-500">Mono</p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-700 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg shadow-lg transition-transform active:scale-95"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

const Footer: React.FC<{ theme: Theme; toggleTheme: () => void }> = ({
  theme,
  toggleTheme,
}) => (
  <footer className="mt-auto w-full border-t border-gray-200/60 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md">
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end md:items-center">
        {/* Branding & Quote */}
        <div className="text-center md:text-left space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Dibuat dengan <span className="text-red-500 animate-pulse">❤️</span> oleh{' '}
              <a
                href="https://t.me/rebelion_16"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-500 hover:opacity-80 transition-opacity"
              >
                Rebelion_16
              </a>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium tracking-wide">
              "Tetap Kreatif, Tetap Rebel."
            </p>
          </div>
        </div>

        {/* Center Stats & Tagline */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100/80 dark:bg-white/5 text-[10px] font-mono text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            v1.0.0 – Beta
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold">
            Ditenagai AI, disempurnakan imajinasi
          </p>
        </div>

        {/* Links & Switch */}
        <div className="flex flex-col items-center md:items-end gap-4">
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <a
              href="#"
              className="hover:text-primary-500 hover:underline transition-all"
            >
              Kebijakan Privasi
            </a>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <a
              href="#"
              className="hover:text-primary-500 hover:underline transition-all"
            >
              Syarat
            </a>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <a
              href="https://www.instagram.com/lukmandian17/"
              className="hover:text-primary-500 hover:underline transition-all"
            >
              Kontak
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Nusantara AI © 2025
            </span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeModule,
  onNavigate,
  user,
  onLogout,
  openApiKeyOnFirstLoad = false,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Settings Panel State
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('NUSANTARA_BG_OPACITY');
    return saved ? Number(saved) : 70;
  });
  const [bgColor, setBgColor] = useState<string>(() => {
    const saved = localStorage.getItem('NUSANTARA_BG_COLOR');
    return saved || '#000000';
  });

  // Grouping Modules Logic
  const groupedModules = useMemo(() => {
    const groups: Record<string, typeof MODULES> = {};
    MODULES.forEach((mod) => {
      const cat = mod.category || 'Lainnya';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(mod);
    });
    return groups;
  }, []);

  // State for expanded categories
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Auto-expand category of active module
  useEffect(() => {
    if (activeModule === 'home') return;
    const activeMod = MODULES.find((m) => m.id === activeModule);
    if (activeMod && activeMod.category) {
      setExpandedCats((prev) => ({
        ...prev,
        [activeMod.category!]: true,
      }));
    }
  }, [activeModule]);

  // Apply theme to <html>
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Check for API Key on mount and when modal closes
  useEffect(() => {
    const checkKey = () => {
      const stored = localStorage.getItem('GEMINI_API_KEY');
      const env = process.env.API_KEY;
      const has =
        (stored && stored.trim().length > 0) ||
        (env && env.trim().length > 0) ||
        false;
      setHasApiKey(has);
    };

    checkKey();
    if (!isSettingsOpen) checkKey();
  }, [isSettingsOpen]);

  // NEW: auto open API key modal setelah login kalau diminta dari App.tsx
  useEffect(() => {
    if (openApiKeyOnFirstLoad && !hasApiKey) {
      setIsSettingsOpen(true);
    }
  }, [openApiKeyOnFirstLoad, hasApiKey]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const handleNavClick = (id: ModuleId) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-gray-900 dark:text-dark-text transition-colors duration-300 relative font-sans selection:bg-indigo-500/30">
      {/* GLOBAL BACKGROUND IMAGE */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gray-50 dark:bg-dark-bg transition-colors duration-300"></div>
        <img
          src="https://i.ibb.co/dvPVtRw/wallpaper-landscape-1765110537087-1.jpg"
          alt="Global Background"
          className="w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: theme === 'dark' ? 0.5 : 0.8 }}
        />
        <div
          className="absolute inset-0 backdrop-blur-[1px] transition-colors duration-300"
          style={{
            backgroundColor: theme === 'dark'
              ? `${bgColor}${Math.round((bgOpacity / 100) * 255).toString(16).padStart(2, '0')}`
              : `rgba(255, 255, 255, ${bgOpacity / 100})`
          }}
        ></div>
      </div>

      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <SettingsPanel
        isOpen={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        bgOpacity={bgOpacity}
        setBgOpacity={setBgOpacity}
        bgColor={bgColor}
        setBgColor={setBgColor}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Sidebar / Topbar */}
      <nav className="w-full md:w-64 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 sticky top-0 md:h-screen transition-all duration-300">
        <div className="p-4 md:h-full md:flex md:flex-col">
          <div className="flex items-center justify-between w-full md:block mb-0 md:mb-6">
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <div
                className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600 cursor-pointer"
                onClick={() => handleNavClick('home')}
              >
                Nusantara AI
              </div>
            </div>

            {/* Mobile Header Actions */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setShowSettingsPanel(true)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <Settings size={24} />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-lg ${hasApiKey
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-red-500 bg-red-50 animate-pulse'
                  }`}
              >
                {hasApiKey ? <Key size={24} /> : <AlertTriangle size={24} />}
              </button>
            </div>
          </div>

          <div className="hidden md:flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Clock />
              <div className="flex items-center gap-2">
                {/* Desktop Settings Button */}
                <button
                  onClick={() => setShowSettingsPanel(true)}
                  className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
                  title="Pengaturan Tampilan"
                >
                  <Settings size={20} />
                </button>
                {/* Desktop API Key Button */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={`p-2 rounded-full transition-colors ${hasApiKey
                    ? 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'
                    : 'bg-red-100 text-red-600 hover:bg-red-200 shadow-sm'
                    }`}
                  title={
                    hasApiKey
                      ? 'Pengaturan API Key'
                      : 'API Key Belum Diatur!'
                  }
                >
                  {hasApiKey ? (
                    <Key size={20} />
                  ) : (
                    <div className="flex items-center gap-1.5 px-1 animate-pulse">
                      <AlertTriangle size={16} />
                      <span className="text-xs font-bold">API Key!</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div
            className={`${isMobileMenuOpen ? 'flex' : 'hidden'
              } md:flex flex-col flex-1 gap-1 overflow-y-auto mt-4 md:mt-4 h-[calc(100vh-80px)] md:h-auto`}
          >
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Menu Utama
            </div>

            <NavButton
              active={activeModule === 'home'}
              onClick={() => handleNavClick('home')}
              icon="🏠"
            >
              Beranda
            </NavButton>

            {/* Categorized Modules */}
            {Object.entries(groupedModules).map(([category, modules]) => (
              <div key={category} className="mt-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-2 py-1 mb-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {category}
                  {expandedCats[category] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>

                <div
                  className={`space-y-1 transition-all duration-300 overflow-hidden ${expandedCats[category]
                    ? 'max-h-[500px] opacity-100'
                    : 'max-h-0 opacity-0'
                    }`}
                >
                  {modules.map((mod) => (
                    <div key={mod.id} className="pl-2">
                      <NavButton
                        active={activeModule === mod.id}
                        onClick={() => handleNavClick(mod.id)}
                        icon={mod.icon}
                      >
                        {mod.title}
                      </NavButton>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* User Profile Section (Sidebar Footer) */}
          {user && (
            <div
              className={`${isMobileMenuOpen ? 'flex' : 'hidden'
                } md:flex flex-col mt-auto pt-4 border-t border-gray-200 dark:border-gray-700`}
            >
              <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-default">
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 object-cover bg-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Keluar"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative flex flex-col h-screen md:h-auto z-10">
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
        <Footer theme={theme} toggleTheme={toggleTheme} />
      </main>
    </div>
  );
};

const NavButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-3 ${active
      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium shadow-sm ring-1 ring-primary-100 dark:ring-primary-900'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
  >
    <span className="text-lg flex items-center justify-center w-6">{icon}</span>
    <span className="truncate">{children}</span>
  </button>
);
