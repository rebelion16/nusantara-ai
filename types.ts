import React from 'react';

export type ModuleId = 
  | 'home'
  | 'virtual-photoshoot'
  | 'prewed-virtual'
  | 'content-creator'
  | 'cosplay-fusion'
  | 'bikini-photoshoot'
  | 'pinsta-product'
  | 'karikatur'
  | 'infografis'
  | 'nusantara-studio'
  | 'vidgen'
  | 'yt-short-maker'
  | 'story-board'
  | 'voice-over'
  | 'rebel-fx'
  | 'ai-melukis'
  | 'wallpaper-generator';

export interface ModuleDefinition {
  id: ModuleId;
  title: string;
  description: string;
  icon: string; // Changed to string for raw emoji
  gradient: string;
  category?: string; // New field for grouping
}

export interface GenerationConfig {
  prompt: string;
  image?: File;
  aspectRatio: string;
  imageSize?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export type Theme = 'light' | 'dark';