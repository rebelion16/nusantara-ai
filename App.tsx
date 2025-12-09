import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ModuleId } from './types';
import { LoginScreen } from './components/LoginScreen';
import { authService, UserProfile } from './services/authService';

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

const App: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>('home');
  const [transferredImage, setTransferredImage] = useState<File | null>(null);
  const [storyBoardImage, setStoryBoardImage] = useState<File | null>(null);

  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Check Auth on Mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setIsAuthChecking(false);
  }, []);

  const handleLoginSuccess = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
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
        return <ContentCreatorModule onNavigate={setActiveModuleId} onTransfer={setTransferredImage} />;
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

  // Loading Screen (Auth Check)
  if (isAuthChecking) {
    return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center text-white">Loading Nusantara AI...</div>;
  }

  // Not Logged In
  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Logged In
  return (
    <Layout
      activeModule={activeModuleId}
      onNavigate={setActiveModuleId}
      user={user}
      onLogout={handleLogout}
    >
      {renderModule()}
    </Layout>
  );
};

export default App;