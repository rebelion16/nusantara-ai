import React, { useState } from 'react';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate Google Login Delay and Profile Retrieval
    setTimeout(() => {
      const user: UserProfile = {
        name: 'Kreator Nusantara',
        email: 'kreator@gmail.com',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=NusantaraUser'
      };
      onLogin(user);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in-up">
         <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 transform rotate-3">
               <span className="text-4xl">🇮🇩</span>
            </div>
            
            <div className="space-y-2">
               <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                 Nusantara AI
               </h1>
               <p className="text-gray-500 dark:text-gray-400 text-sm">
                 Suite Kreatif Generatif AI #1 Indonesia
               </p>
            </div>

            <div className="py-6 space-y-4">
               <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                  <span className="flex-shrink-0 mx-4 text-xs text-gray-400 uppercase font-semibold">Akses Layanan</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
               </div>

               <button
                 onClick={handleLogin}
                 disabled={isLoading}
                 className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-[0.98] shadow-sm group relative overflow-hidden"
               >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <div className="absolute inset-0 w-full h-full bg-indigo-50 dark:bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span className="relative z-10">Lanjutkan dengan Google</span>
                    </>
                  )}
               </button>
               <p className="text-xs text-center text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                 Untuk menggunakan fitur Nusantara Studio dan generator lainnya, Anda harus login terlebih dahulu.
               </p>
            </div>
         </div>
         <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-100 dark:border-gray-700 text-center flex justify-center items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">System Operational</p>
         </div>
      </div>
    </div>
  );
};