import React, { useState } from 'react';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await authService.loginWithGoogle();
      setTimeout(onLoginSuccess, 500); // Animation buffer
    } catch (error) {
      console.error("Login failed", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0f1d] overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/20 via-[#0a0f1d] to-black" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 animate-fade-in-up">
        {/* Glass Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">

          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* Logo/Header */}
          <div className="text-center mb-10 space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
              <Sparkles className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Nusantara AI
            </h1>
            <p className="text-gray-400 text-sm">
              Creative AI Superapp by Rebelion16
              <br />
              Instagram: @lukmandian17
              <br />
            </p>
          </div>

          {/* Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group-hover:shadow-white/10"
          >
            {isLoading ? (
              <Loader2 className="animate-spin text-gray-900" />
            ) : (
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-6 h-6"
              />
            )}
            {isLoading ? 'Menghubungkan...' : 'Sign in with Google'}
          </button>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={14} className="text-green-500" />
              <span>Secure Access Required</span>
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          &copy; 2025 Nusantara AI Ecosystem using Google Gemini
        </p>

      </div>
    </div>
  );
};