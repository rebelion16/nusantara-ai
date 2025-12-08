import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { ModuleId, UserProfile } from './types';

// Import distinct modules
import { HomeModule } from './components/modules/Home';
import { VirtualPhotoshootModule } from './components/modules/VirtualPhotoshoot';
import { ContentCreatorModule } from './components/modules/ContentCreator';
import { CosplayFusionModule } from './components/modules/CosplayFusion';
import { BikiniPhotoshootModule } from './components/modules/BikiniPhotoshoot';
import { PinstaProductModule } from './components/modules/PinstaProduct';
import { KarikaturModule } from './components/modules/Karikatur';
import { InfografisModule } from './components/modules/Infografis';
import { NusantaraStudioModule } from './components/modules/NusantaraStudio';
import { VidGenModule } from './components/modules/VidGen';
import { StoryBoardModule } from './components/modules/StoryBoard';
import { VoiceOverStudioModule } from './components/modules/VoiceOverStudio';
import { PrewedVirtualModule } from './components/modules/PrewedVirtual';
import { RebelFXModule } from './components/modules/RebelFX';
import { AiMelukisModule } from './components/modules/AiMelukis';
import { WallpaperGeneratorModule } from './components/modules/WallpaperGenerator';
import { YTShortMakerModule } from './components/modules/YTShortMaker';

import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>('home');
  const [transferredImage, setTransferredImage] = useState<File | null>(null);
  const [storyBoardImage, setStoryBoardImage] = useState<File | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // --- AUTH: cek user + listen perubahan sesi ---
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (u) {
        setUser({
          name:
            (u.user_metadata?.full_name as string) ||
            u.email ||
            'Pengguna',
          email: u.email || '',
          avatar: (u.user_metadata?.avatar_url as string) || '',
        });
      }
      setLoadingUser(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user;
        if (!u) {
          setUser(null);
          return;
        }
        setUser({
          name:
            (u.user_metadata?.full_name as string) ||
            u.email ||
            'Pengguna',
          email: u.email || '',
          avatar: (u.user_metadata?.avatar_url as string) || '',
        });
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const renderModule = () => {
    switch (activeModuleId) {
      case 'home':
        return <HomeModule onNavigate={setActiveModuleId} />;
      case 'virtual-photoshoot':
        return <VirtualPhotoshootModule initialRefImage={transferredImage} />;
      case 'prewed-virtual':
        return <PrewedVirtualModule />;
      case 'content-creator':
        return (
          <ContentCreatorModule
            onNavigate={setActiveModuleId}
            onTransfer={setTransferredImage}
          />
        );
      case 'cosplay-fusion':
        return (
          <CosplayFusionModule
            onNavigate={setActiveModuleId}
            onTransferToStoryBoard={setStoryBoardImage}
          />
        );
      case 'bikini-photoshoot':
        return <BikiniPhotoshootModule />;
      case 'pinsta-product':
        return <PinstaProductModule />;
      case 'karikatur':
        return <KarikaturModule />;
      case 'infografis':
        return <InfografisModule />;
      case 'nusantara-studio':
        return <NusantaraStudioModule />;
      case 'vidgen':
        return <VidGenModule />;
      case 'yt-short-maker':
        return <YTShortMakerModule />;
      case 'story-board':
        return <StoryBoardModule initialImage={storyBoardImage} />;
      case 'voice-over':
        return <VoiceOverStudioModule />;
      case 'rebel-fx':
        return <RebelFXModule />;
      case 'ai-melukis':
        return <AiMelukisModule />;
      case 'wallpaper-generator':
        return <WallpaperGeneratorModule />;
      default:
        return <div>Module not found</div>;
    }
  };

  // --- tampilan saat cek user ---
  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        Memuat...
      </div>
    );
    }

  // --- kalau BELUM login: tampilkan halaman login ---
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-50 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Nusantara AI</h1>
        <p className="mb-6 max-w-md text-slate-300">
          Silakan login dengan Google untuk menggunakan semua modul Nusantara AI.
        </p>
        <button
          onClick={loginWithGoogle}
          className="px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-200 transition"
        >
          Login dengan Google
        </button>
      </div>
    );
  }

  // --- kalau SUDAH login: pakai layout utama seperti biasa ---
  return (
    <Layout
      activeModule={activeModuleId}
      onNavigate={setActiveModuleId}
      user={user}
      onLogout={logout}
    >
      {renderModule()}
    </Layout>
  );
};

export default App;
