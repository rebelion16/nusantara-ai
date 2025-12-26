import React, { useState } from "react";
import { Loader2, ShieldCheck, Sparkles, Instagram } from "lucide-react";
import { authService, UserProfile } from "../services/authService";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const user = await authService.loginWithGoogle();
      onLoginSuccess(user);
    } catch (error: any) {
      console.error("Login failed", error);
      alert(
        `Login gagal: ${error?.code || error?.message || "Terjadi kesalahan tak dikenal"}`
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0f1d] overflow-hidden font-sans">
      {/* STUNNING BACKGROUND WITH AURORA & SNOW */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#0d1033] to-[#020618]" />

        {/* Aurora Borealis Effect */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-gradient-to-r from-emerald-500/30 via-cyan-400/20 to-transparent rounded-full blur-[100px] animate-aurora1" />
          <div className="absolute top-[10%] right-1/4 w-[500px] h-[350px] bg-gradient-to-l from-purple-500/25 via-pink-400/15 to-transparent rounded-full blur-[100px] animate-aurora2" />
          <div className="absolute top-[5%] left-1/2 w-[400px] h-[300px] bg-gradient-to-b from-blue-400/20 via-indigo-500/15 to-transparent rounded-full blur-[80px] animate-aurora3" />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-[20%] left-[15%] w-3 h-3 bg-cyan-400/60 rounded-full blur-[2px] animate-float1" />
        <div className="absolute top-[30%] right-[20%] w-2 h-2 bg-purple-400/60 rounded-full blur-[1px] animate-float2" />
        <div className="absolute top-[50%] left-[30%] w-4 h-4 bg-emerald-400/40 rounded-full blur-[3px] animate-float3" />
        <div className="absolute top-[60%] right-[35%] w-2 h-2 bg-pink-400/50 rounded-full blur-[1px] animate-float1" />
        <div className="absolute top-[40%] left-[60%] w-3 h-3 bg-blue-400/50 rounded-full blur-[2px] animate-float2" />

        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}

        {/* SNOW PARTICLES */}
        {[...Array(50)].map((_, i) => (
          <div
            key={`snow-${i}`}
            className="absolute bg-white rounded-full animate-snowfall"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              opacity: Math.random() * 0.6 + 0.4,
              animationDuration: `${8 + Math.random() * 10}s`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}

        {/* Ground glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-indigo-900/30 to-transparent" />
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes aurora1 {
          0%, 100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.3; }
          25% { transform: translateX(50px) translateY(-30px) scale(1.1); opacity: 0.4; }
          50% { transform: translateX(-30px) translateY(20px) scale(0.9); opacity: 0.25; }
          75% { transform: translateX(20px) translateY(-10px) scale(1.05); opacity: 0.35; }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.25; }
          33% { transform: translateX(-40px) translateY(20px) scale(1.15); opacity: 0.35; }
          66% { transform: translateX(30px) translateY(-15px) scale(0.95); opacity: 0.2; }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translateX(0) scale(1); opacity: 0.2; }
          50% { transform: translateX(-20px) scale(1.1); opacity: 0.3; }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(15px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(-10px); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-25px) translateX(20px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes snowfall {
          0% { 
            transform: translateY(0) translateX(0) rotate(0deg); 
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { 
            transform: translateY(100vh) translateX(100px) rotate(360deg); 
            opacity: 0;
          }
        }
        .animate-aurora1 { animation: aurora1 12s ease-in-out infinite; }
        .animate-aurora2 { animation: aurora2 15s ease-in-out infinite; }
        .animate-aurora3 { animation: aurora3 10s ease-in-out infinite; }
        .animate-float1 { animation: float1 6s ease-in-out infinite; }
        .animate-float2 { animation: float2 8s ease-in-out infinite; }
        .animate-float3 { animation: float3 7s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .animate-snowfall { animation: snowfall linear infinite; }
      `}</style>

      <div className="relative z-10 w-full max-w-md p-8 animate-fade-in-up">
        {/* Glass Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          {/* Logo/Header */}
          <div className="text-center mb-10 space-y-4">
            <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 overflow-hidden">
              <img
                src="https://i.ibb.co/1GfbDhHh/Gemini-Generated-Image-8q6tx78q6tx78q6t-1-removebg-preview.png"
                alt="Nusantara AI Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Nusantara AI
            </h1>
            <p className="text-gray-400 text-sm">
              Creative AI Superapp by Rebelion16
            </p>
            <a
              href="https://www.instagram.com/lukmandian17/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-full text-white font-bold text-sm hover:scale-105 transition-transform shadow-lg"
            >
              <Instagram size={18} />
              @lukmandian17
            </a>
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
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {isLoading ? "Menghubungkan..." : "Sign in with Google"}
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
