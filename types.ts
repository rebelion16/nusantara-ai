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
  | 'wallpaper-generator'
  | 'catat-duitmu'
  | 'social-downloader';

export interface ModuleDefinition {
  id: ModuleId;
  title: string;
  description: string;
  icon: string | React.ReactNode;
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

// Catat Duitmu Types
export type WalletType = 'bank' | 'e-wallet' | 'cash';

export interface WalletAccount {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  accountNumber?: string;
  color?: string; // For UI styling e.g. "bg-blue-500"
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  targetWalletId?: string; // For transfers
  amount: number;
  category: string;
  type: TransactionType;
  description: string;
  date: number; // Timestamp
}