// === IMAGE GENERATION SERVICE ===
// Centralized service for image generation with multiple providers
// Supports: Bard Internal API (primary) + Gemini API (fallback)

import { GoogleGenAI } from "@google/genai";

// === TYPES ===

export type ImageProvider = 'bard_internal' | 'gemini_api' | 'auto';

export interface ImageGenerationOptions {
  provider?: ImageProvider;
  aspectRatio?: string;
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  provider: ImageProvider;
  success: boolean;
  error?: string;
}

// === STORAGE KEYS ===

const BARD_COOKIE_KEY = 'BARD_PSID_COOKIE';
const GEMINI_API_KEY = 'GEMINI_API_KEY';

// === COOKIE MANAGEMENT ===

export const getBardCookie = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(BARD_COOKIE_KEY) || '';
  }
  return '';
};

export const setBardCookie = (cookie: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BARD_COOKIE_KEY, cookie);
  }
};

export const hasBardCookie = (): boolean => {
  return getBardCookie().trim().length > 0;
};

// === GEMINI API CLIENT ===

const getGeminiClient = () => {
  if (typeof window !== 'undefined') {
    const apiKey = localStorage.getItem(GEMINI_API_KEY);
    if (apiKey && apiKey.trim().length > 0) {
      return new GoogleGenAI({ apiKey });
    }
  }
  return null;
};

// === BARD INTERNAL API ===

/**
 * Generate image using Bard's internal batchexecute API
 * Uses CORS proxy for development, and Vercel API route for production
 * 
 * IMPORTANT: The Bard internal API is complex and may not work reliably.
 * This is a best-effort implementation based on reverse-engineering.
 */
const generateWithBard = async (prompt: string): Promise<ImageGenerationResult> => {
  const cookie = getBardCookie();

  if (!cookie) {
    return {
      imageUrl: '',
      provider: 'bard_internal',
      success: false,
      error: 'Bard cookie belum diset. Masukkan __Secure-1PSID di pengaturan.'
    };
  }

  console.log('[Bard] Attempting image generation with cookie length:', cookie.length);

  try {
    // For Bard API to work, we need to route through a server
    // In production (Vercel), use the API route
    // In development, we'll try directly but expect CORS issues

    const isProduction = window.location.hostname !== 'localhost';

    if (isProduction) {
      // Production mode: Use Vercel API route
      const response = await fetch('/api/bard-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cookie: cookie,
          prompt: prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.imageUrl) {
        return {
          imageUrl: data.imageUrl,
          provider: 'bard_internal',
          success: true
        };
      }

      throw new Error('Tidak ada gambar dalam response');
    } else {
      // Development mode: Skip Bard and use Gemini API directly
      // because CORS blocks direct Bard requests from localhost
      console.log('[Bard] Development mode detected - skipping Bard API (CORS blocked)');
      console.log('[Bard] Use `vercel dev` instead of `npm run dev` to test Bard API routes');

      return {
        imageUrl: '',
        provider: 'bard_internal',
        success: false,
        error: 'Bard API tidak tersedia di development mode. Gunakan `vercel dev` atau deploy ke Vercel untuk menggunakannya. Fallback ke Gemini API...'
      };
    }

  } catch (error: any) {
    console.error('[Bard] Image generation error:', error);
    return {
      imageUrl: '',
      provider: 'bard_internal',
      success: false,
      error: error.message || 'Gagal generate gambar via Bard'
    };
  }
};

// === GEMINI API ===

/**
 * Generate image using official Gemini API
 * Uses gemini-2.5-flash-image model
 */
const generateWithGemini = async (
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<ImageGenerationResult> => {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      imageUrl: '',
      provider: 'gemini_api',
      success: false,
      error: 'Gemini API Key belum diset.'
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio as any
        }
      }
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          imageUrl: `data:image/png;base64,${part.inlineData.data}`,
          provider: 'gemini_api',
          success: true
        };
      }
    }

    throw new Error('Tidak ada gambar dalam response');

  } catch (error: any) {
    console.error('[Gemini] Image generation error:', error);
    return {
      imageUrl: '',
      provider: 'gemini_api',
      success: false,
      error: error.message || 'Gagal generate gambar via Gemini API'
    };
  }
};

// === MAIN FUNCTION ===

/**
 * Generate image with automatic provider selection and fallback
 * 
 * @param prompt - Text description of desired image
 * @param options - Generation options (provider, aspectRatio, etc)
 * @returns ImageGenerationResult with base64 data URL
 * 
 * @example
 * const result = await generateImage("A cute cat playing with yarn");
 * if (result.success) {
 *   console.log("Image URL:", result.imageUrl);
 * }
 */
export const generateImage = async (
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> => {
  const {
    provider = 'auto',
    aspectRatio = '1:1'
  } = options;

  console.log(`[ImageGen] Starting generation with provider: ${provider}`);
  console.log(`[ImageGen] Prompt: ${prompt.substring(0, 50)}...`);

  // Explicit provider selection
  if (provider === 'bard_internal') {
    return generateWithBard(prompt);
  }

  if (provider === 'gemini_api') {
    return generateWithGemini(prompt, aspectRatio);
  }

  // Auto mode: Try Bard first, fallback to Gemini

  // Check if Bard cookie is available
  if (hasBardCookie()) {
    console.log('[ImageGen] Trying Bard API first...');
    const bardResult = await generateWithBard(prompt);

    if (bardResult.success) {
      console.log('[ImageGen] Bard succeeded!');
      return bardResult;
    }

    console.log('[ImageGen] Bard failed, falling back to Gemini API...');
  }

  // Fallback to Gemini API
  console.log('[ImageGen] Using Gemini API...');
  const geminiResult = await generateWithGemini(prompt, aspectRatio);

  if (geminiResult.success) {
    console.log('[ImageGen] Gemini API succeeded!');
    return geminiResult;
  }

  // Both failed
  return {
    imageUrl: '',
    provider: 'auto',
    success: false,
    error: 'Semua provider gagal. Pastikan API Key atau Cookie sudah benar.'
  };
};

// === UTILITY FUNCTIONS ===

/**
 * Check which providers are available
 */
export const getAvailableProviders = (): { bard: boolean; gemini: boolean } => {
  return {
    bard: hasBardCookie(),
    gemini: getGeminiClient() !== null
  };
};

/**
 * Get provider status for UI display
 */
export const getProviderStatus = (): string => {
  const providers = getAvailableProviders();

  if (providers.bard && providers.gemini) {
    return 'Bard + Gemini API tersedia';
  }
  if (providers.bard) {
    return 'Bard tersedia';
  }
  if (providers.gemini) {
    return 'Gemini API tersedia';
  }
  return 'Tidak ada provider aktif';
};
