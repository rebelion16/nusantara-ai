
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  // 1. Check Local Storage (User provided key - Priority 1)
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey && storedKey.trim().length > 0) {
      return storedKey;
    }
  }

  // 2. Fallback to Environment Variable (Developer provided key - Priority 2)
  if (process.env.API_KEY && process.env.API_KEY.trim().length > 0) {
    return process.env.API_KEY;
  }

  return '';
};

const getClient = () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  return new GoogleGenAI({ apiKey });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove "data:*/*;base64," prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Gagal membaca file"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const generateCreativeImage = async (
  prompt: string,
  baseImage: File | null,
  aspectRatio: string = "1:1",
  imageSize: string = "1K", // "1K", "2K", "4K"
  refImage: File | null = null, // Style Reference
  extraFaces: File[] | File | null = null, // Support Array of Files or Single File
  preserveFace: boolean = true // Option to disable face preservation
): Promise<string> => {
  const ai = getClient();

  // Model selection
  const isHighRes = imageSize === "2K" || imageSize === "4K";
  const model = isHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  const parts: any[] = [];

  // --- INTELLIGENT PROMPT CONSTRUCTION ---

  const lowerPrompt = prompt.toLowerCase();
  const isStylized = lowerPrompt.includes('anime') ||
    lowerPrompt.includes('kartun') ||
    lowerPrompt.includes('karikatur') ||
    lowerPrompt.includes('3d') ||
    lowerPrompt.includes('lukisan') ||
    lowerPrompt.includes('ilustrasi');

  // Build the Core Instructions
  let strictRealismInstruction = "";
  if (!isStylized) {
    strictRealismInstruction = `
    [GAYA VISUAL: FOTOGRAFI HYPER-REALISTIC & CRYSTAL CLEAR]
    - KUALITAS GAMBAR: Wajib Ultra-Sharp, 8K Resolution, Masterpiece. Gambar harus terlihat "Crystal Clear" (Sangat Jernih). Tidak ada boleh ada noise atau grain.
    - DETAIL: Fokus mikro-kontras tinggi. Tidak boleh ada noise atau grain yang mengganggu. Setiap detail (kulit, mata, kain) harus tajam.
    - KAMERA: Simulasikan output dari Phase One XF IQ4 150MP atau Sony A7R V. Gunakan lensa prime berkualitas tinggi. Fokus harus tajam pada subjek (Eye AF).
    - TEKSTUR: Wajib menampilkan pori-pori kulit asli (micro-details), tekstur kain yang nyata, dan helaian rambut individu.
    - PENCAHAYAAN: Gunakan pencahayaan fisik yang akurat (Global Illumination), hindari noise atau grain berlebih.
    - NEGATIVE PROMPT (DILARANG KERAS): Blur, Hazy, Out of focus, Bokeh berlebihan (kecuali diminta), Low resolution, Pixelated, Noise, Grainy, Distorted, Plastic skin, CGI feel, 3D Render look, Soft focus.
    `;
  }

  let identityInstruction = "";
  if (preserveFace) {
    identityInstruction = `
    ═══════════════════════════════════════════════════════════════════
    ⚠️⚠️⚠️ EMERGENCY PRIORITY OVERRIDE: PERFECT FACE CLONING PROTOCOL ⚠️⚠️⚠️
    ═══════════════════════════════════════════════════════════════════
    
    🚨 THE #1 ABSOLUTE REQUIREMENT: The output face MUST BE A PIXEL-PERFECT CLONE of the uploaded reference face(s).
    
    📋 MANDATORY FACIAL FEATURES TO PRESERVE (COPY EXACTLY FROM REFERENCE):
    ────────────────────────────────────────────────────────────────────
    ✦ BONE STRUCTURE: Skull shape, forehead size/shape, cheekbone prominence, jaw width, chin shape - MUST BE IDENTICAL
    ✦ EYE REGION: Eye shape, eye size, eye spacing, eyelid type (mono/double), eye corner angles - MUST BE IDENTICAL  
    ✦ NOSE: Bridge height, nose width, nostril shape, tip shape, overall nose length - MUST BE IDENTICAL
    ✦ MOUTH/LIPS: Lip shape, lip thickness, mouth width, philtrum shape - MUST BE IDENTICAL
    ✦ FACE PROPORTIONS: Distance between eyes, nose-to-mouth ratio, forehead-to-chin ratio - MUST BE IDENTICAL
    ✦ SKIN CHARACTERISTICS: Skin tone, moles, birthmarks, freckles, unique facial marks - MUST BE PRESERVED
    ✦ UNIQUE IDENTIFIERS: Any distinctive features (dimples, scars, asymmetry) - MUST BE PRESERVED
    
    🚫 STRICTLY FORBIDDEN MODIFICATIONS (ZERO TOLERANCE):
    ────────────────────────────────────────────────────────────────────
    ✗ DO NOT "beautify", "idealize", "enhance", or "perfect" the face
    ✗ DO NOT westernize or change ethnic features
    ✗ DO NOT smooth out or remove unique facial characteristics
    ✗ DO NOT change face shape to fit beauty standards
    ✗ DO NOT alter eye size or spacing
    ✗ DO NOT change nose shape or size
    ✗ DO NOT modify lip fullness or mouth shape
    ✗ DO NOT create a "generic attractive face" - keep ALL unique features
    ✗ DO NOT blend/morph with other faces
    
    ⚖️ CONFLICT RESOLUTION (FACE ALWAYS WINS):
    ────────────────────────────────────────────────────────────────────
    If ANY other instruction conflicts with face preservation:
    → The FACE IDENTITY takes 100% priority
    → Scene/pose/style must adapt to preserve face, not the other way around
    → Better to have wrong lighting than wrong face
    
    🎯 SUCCESS CRITERIA:
    ────────────────────────────────────────────────────────────────────
    The generated image should pass a "family member recognition test" - 
    Someone who knows the person in the reference photo should IMMEDIATELY 
    recognize them in the generated image without any doubt.
    
    👥 MULTI-SUBJECT PROTOCOL:
    ────────────────────────────────────────────────────────────────────
    - Subject 1 (Base Image) = Face 1 → Map to first/main person in scene
    - Subject 2+ (Extra Faces) = Face 2, 3, etc. → Map to secondary characters
    - NEVER mix or swap faces between subjects
    - Each face must maintain its OWN identity completely separate
    `;
  } else {
    identityInstruction = `
    [FOKUS OBJEK: ABAIKAN MANUSIA]
    - Fokus sepenuhnya pada benda mati (pakaian, produk, aksesoris).
    - JANGAN sertakan wajah, kepala, kulit, atau anggota tubuh manusia.
    `;
  }

  let fullPromptText = `${strictRealismInstruction}\n\n${identityInstruction}\n\n[DESKRIPSI ADEGAN]: ${prompt}`;

  // 3. Add Media Parts

  // Base Image (Main Subject OR Outfit Reference)
  if (baseImage) {
    const base64Data = await fileToBase64(baseImage);
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: baseImage.type
      }
    });
    fullPromptText += "\n\n🎯 [GAMBAR 1 - WAJAH SUMBER UTAMA]: INI ADALAH WAJAH YANG HARUS DI-CLONE 100%. Salin SEMUA fitur wajah: bentuk mata, hidung, bibir, rahang, proporsi wajah. Orang yang mengenal wajah ini HARUS bisa mengenali hasilnya.";
  }

  // Handle Extra Faces (can be single File or Array of Files)
  if (extraFaces) {
    const facesArray = Array.isArray(extraFaces) ? extraFaces : [extraFaces];

    for (let i = 0; i < facesArray.length; i++) {
      const file = facesArray[i];
      const base64Data = await fileToBase64(file);
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
      // Image index starts at 2 (since Base is 1)
      fullPromptText += `\n\n🎯 [GAMBAR ${i + 2} - WAJAH TAMBAHAN SUBJEK ${i + 2}]: Clone wajah ini 100%. Pertahankan SEMUA fitur unik: bentuk wajah, mata, hidung, bibir. JANGAN campur dengan wajah lain.`;
    }
  } else if (preserveFace && baseImage) {
    // FORCE SINGLE PERSON LOGIC if no extra faces
    fullPromptText += "\n\n(INSTRUKSI: Hanya ada satu subjek. Abaikan prompt 'pasangan' jika tidak ada gambar kedua. Buat 1 orang saja).";
  }

  // Reference Image (Style/Pose) - Added LAST so face priority is higher
  if (refImage) {
    const refBase64 = await fileToBase64(refImage);
    parts.push({
      inlineData: {
        data: refBase64,
        mimeType: refImage.type
      }
    });
    fullPromptText += "\n\n⚠️ [GAMBAR REFERENSI - GAYA/POSE/OUTFIT SAJA]: Tiru HANYA pose, pakaian, dan gaya dari gambar ini. ⛔ DILARANG KERAS mengambil wajah dari gambar ini. Wajah HARUS dari gambar sebelumnya.";
  }

  // 4. Add Text Part LAST
  parts.push({ text: fullPromptText });

  try {
    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio,
      }
    };

    if (isHighRes) {
      config.imageConfig.imageSize = imageSize;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      config: config
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Tidak ada gambar yang dihasilkan oleh model. Model mungkin mengembalikan teks atau terjadi kesalahan.");

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

export const generateInfographicPrompt = async (dataInput: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analisis data ini dan tulis deskripsi visual yang mendetail untuk gambar infografis dalam Bahasa Indonesia.
    Output harus berupa satu paragraf yang dioptimalkan untuk model pembuatan gambar.
    Data: ${dataInput}`,
  });
  return response.text || "Sebuah infografis yang menampilkan data.";
};

export const generateRandomPrompt = async (): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: "Buatlah skenario yang kreatif untuk pemotretan. Fokus HANYA pada aksi, objek, dan konsep latar belakang. Di bawah 30 kata. Bahasa Indonesia."
  });
  return response.text?.trim() || "Kota futuristik yang melayang di atas awan.";
};

export const refineUserPrompt = async (userInput: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Sempurnakan prompt gambar berikut agar SANGAT MENDETAIL, visual, dan kreatif untuk AI Art Generator (seperti Cosplay/Character Design).
    
    ATURAN OUTPUT:
    1. HANYA kembalikan teks prompt final. 
    2. JANGAN pakai kalimat pembuka (contoh: "Berikut adalah...", "Tentu...").
    3. JANGAN berikan opsi (Opsi 1, Opsi 2). Cukup 1 paragraf prompt terbaik.
    4. Fokus pada deskripsi kostum, pencahayaan, tekstur, dan suasana.
    
    Bahasa Indonesia.
    Input: "${userInput}"`
  });
  return response.text?.trim() || userInput;
};

export const refineCharacterDescription = async (userInput: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Bertindaklah sebagai ahli desain karakter dan kostum cosplay. Tugas Anda adalah memperkaya deskripsi visual karakter berikut menjadi SANGAT MENDETAIL, tetapi DENGAN BATASAN KETAT.

    Input Pengguna: "${userInput}"

    ⚠️ ATURAN MUTLAK (NEGATIVE CONSTRAINTS):
    1. JANGAN mendeskripsikan LOKASI, BACKGROUND, atau PEMANDANGAN (Abaikan jika ada di input).
    2. JANGAN mendeskripsikan PENCAHAYAAN (Lighting).
    3. JANGAN mendeskripsikan SUDUT KAMERA (Angle) atau JENIS LENSA.
    4. JANGAN mendeskripsikan POSE (Gaya tubuh).
    5. JANGAN mendeskripsikan EFEK VISUAL (Bokeh, Blur, dll).
    6. JANGAN berikan kalimat pembuka atau penutup. Langsung ke deskripsi.
    7. JANGAN berikan opsi (Opsi 1, Opsi 2). Cukup 1 paragraf final.

    ✅ FOKUS HANYA PADA:
    - Detail fisik karakter (wajah, rambut, mata).
    - Detail kostum yang sangat spesifik (bahan, tekstur, warna, ornamen, lapisan armor/kain).
    - Aksesoris yang melekat pada tubuh (senjata, mahkota, perhiasan).

    OUTPUT:
    Satu paragraf padat deskripsi visual karakter dalam Bahasa Indonesia (atau Inggris jika istilah kostum lebih akurat).`
  });
  return response.text?.trim() || userInput;
};

export const analyzeImagePrompt = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  // Handle both raw base64 and data URL formats
  const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data } },
        { text: `Analisis gambar ini secara mendalam. Tuliskan prompt deskriptif dalam Bahasa Indonesia.` }
      ]
    }
  });
  return response.text?.trim() || "Gagal menganalisis gambar.";
};

export const generateSocialCaption = async (base64Image: string, platform: string): Promise<string> => {
  const ai = getClient();
  // Handle both raw base64 and data URL formats
  const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data } },
        { text: `Buatlah caption sosial media untuk ${platform} berdasarkan gambar ini. Bahasa Indonesia Gaul.` }
      ]
    }
  });
  return response.text?.trim() || "Gagal membuat caption.";
};

export const generateCharacterDescription = async (charName: string, seriesName: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Deskripsikan penampilan fisik karakter "${charName}" dari seri "${seriesName}" secara mendetail untuk prompt AI Art. Bahasa Indonesia.`
  });
  return response.text?.trim() || `Karakter ${charName} dengan kostum ikoniknya.`;
};

export const generateStoryFromImage = async (base64Image: string, charName: string): Promise<string> => {
  const ai = getClient();
  // Handle both raw base64 and data URL formats
  const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data } },
        { text: `Analisis gambar ini. Karakter ini bernama "${charName}". Buatlah cerita pendek seru (3 paragraf) dalam Bahasa Indonesia.` }
      ]
    }
  });
  return response.text?.trim() || "Gagal membuat cerita.";
};

export interface StoryboardSceneData {
  action: string;
  camera: string;
  dialogue: string;
}

export const generateStoryboardPlan = async (theme: string, panelCount: number = 5): Promise<StoryboardSceneData[]> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are a professional movie director. Create a sequential ${panelCount}-panel storyboard plan based on the theme: "${theme}". 
    
    IMPORTANT: Output STRICTLY in BAHASA INDONESIA.
    - "action" must be in Indonesian.
    - "dialogue" must be in Indonesian.
    
    Output STRICTLY as a JSON Array of objects with keys: "action", "camera", "dialogue". Panel 1 starts immediately with action.`
  });
  const text = response.text || "[]";
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return parsed.slice(0, panelCount);
  } catch (e) {
    return Array(panelCount).fill({ action: "Adegan aksi.", camera: "Wide Shot", dialogue: "..." });
  }
};

// --- STORY VIDEO GENERATOR TYPES & FUNCTIONS ---

export type VideoTheme = 'education' | 'advertisement' | 'short_story' | 'tutorial' | 'documentary' | 'motivational';

export type CameraMotion =
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'zoom_in'
  | 'zoom_out'
  | 'dolly_in'
  | 'dolly_out'
  | 'crane_up'
  | 'crane_down'
  | 'tracking_shot'
  | 'handheld';

export interface StoryScene {
  id: number;
  narration: string;
  visualDescription: string;
  duration: number; // in seconds (8-10 per scene for VEO)
}

export interface StoryScript {
  title: string;
  synopsis: string;
  scenes: StoryScene[];
  totalDuration: number;
  ctaScene?: {
    text: string;
    style: 'bold' | 'subtle' | 'animated';
  };
}

export interface ScenePrompt {
  sceneId: number;
  prompt: string;
  cameraMotion: CameraMotion;
  duration: number;
}

const THEME_LABELS: Record<VideoTheme, string> = {
  education: 'Edukasi (Tutorial, penjelasan konsep)',
  advertisement: 'Iklan Produk (Promosi, commercial)',
  short_story: 'Cerita Pendek (Narasi, drama)',
  tutorial: 'Tutorial Langkah-demi-Langkah',
  documentary: 'Dokumenter (Fakta, investigasi)',
  motivational: 'Motivasi & Inspirasi'
};

const CAMERA_LABELS: Record<CameraMotion, string> = {
  static: 'Statis (Diam)',
  pan_left: 'Pan Kiri',
  pan_right: 'Pan Kanan',
  zoom_in: 'Zoom In',
  zoom_out: 'Zoom Out',
  dolly_in: 'Dolly In (Maju)',
  dolly_out: 'Dolly Out (Mundur)',
  crane_up: 'Crane Up',
  crane_down: 'Crane Down',
  tracking_shot: 'Tracking Shot',
  handheld: 'Handheld (Realistik)'
};

export { THEME_LABELS, CAMERA_LABELS };

/**
 * Generate a complete story script based on theme and idea
 */
export const generateStoryScript = async (
  storyIdea: string,
  videoTheme: VideoTheme,
  targetDuration: number = 60, // in seconds
  ctaText?: string
): Promise<StoryScript> => {
  const ai = getClient();

  // Calculate scenes (each VEO video is ~8-10 seconds)
  const sceneCount = Math.max(4, Math.ceil(targetDuration / 10));
  const sceneDuration = Math.floor(targetDuration / sceneCount);

  const themeInstructions: Record<VideoTheme, string> = {
    education: 'Fokus pada penjelasan konsep yang jelas, visual diagram, dan poin-poin pembelajaran.',
    advertisement: 'Fokus pada keunggulan produk, visual menarik, dan call-to-action yang kuat.',
    short_story: 'Fokus pada karakter, konflik, resolusi, dan emosi visual yang kuat.',
    tutorial: 'Fokus pada langkah-langkah jelas, demonstrasi visual, dan instruksi praktis.',
    documentary: 'Fokus pada fakta, narasi informatif, dan visual dokumenter sinematik.',
    motivational: 'Fokus pada quotes inspirasi, visual yang membangkitkan semangat, dan pesan kuat.'
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Kamu adalah seorang sutradara video profesional dan penulis naskah kreatif.

TUGAS: Buatkan naskah cerita video berdasarkan tema dan ide berikut:

IDE CERITA: "${storyIdea}"
TIPE VIDEO: ${THEME_LABELS[videoTheme]}
TARGET DURASI: ${targetDuration} detik (${sceneCount} scene, masing-masing ~${sceneDuration} detik)
${ctaText ? `CTA (Call-to-Action): "${ctaText}"` : ''}

INSTRUKSI KHUSUS: ${themeInstructions[videoTheme]}

OUTPUT STRICTLY sebagai JSON object dengan format:
{
  "title": "Judul video yang menarik",
  "synopsis": "Ringkasan singkat cerita (1-2 kalimat)",
  "scenes": [
    {
      "id": 1,
      "narration": "Teks narasi/voice over untuk scene ini (dalam Bahasa Indonesia)",
      "visualDescription": "Deskripsi visual sangat detail untuk AI video generator (dalam Bahasa Inggris untuk Veo)",
      "duration": ${sceneDuration}
    }
  ],
  "totalDuration": ${targetDuration}${ctaText ? `,
  "ctaScene": {
    "text": "${ctaText}",
    "style": "animated"
  }` : ''}
}

PENTING:
- Jumlah scene HARUS ${sceneCount} scenes
- visualDescription harus sangat detail dan cinematic (dalam Bahasa Inggris)
- narration dalam Bahasa Indonesia yang natural
- Setiap scene harus memiliki visual yang berbeda dan progresif`
  });

  const text = response.text || "{}";
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    // Fallback script
    return {
      title: storyIdea.substring(0, 50),
      synopsis: `Video ${THEME_LABELS[videoTheme]} tentang: ${storyIdea}`,
      scenes: Array(sceneCount).fill(null).map((_, i) => ({
        id: i + 1,
        narration: `Bagian ${i + 1} dari cerita...`,
        visualDescription: `Scene ${i + 1}: Cinematic shot related to ${storyIdea}`,
        duration: sceneDuration
      })),
      totalDuration: targetDuration,
      ...(ctaText ? { ctaScene: { text: ctaText, style: 'animated' as const } } : {})
    };
  }
};

/**
 * Generate detailed video prompts for each scene with camera motion
 */
export const generateScenePrompts = async (
  script: StoryScript,
  cameraMotions: CameraMotion[],
  visualStyle: string = 'Cinematic'
): Promise<ScenePrompt[]> => {
  const ai = getClient();

  // Use provided camera motions or cycle through defaults
  const defaultMotions: CameraMotion[] = ['zoom_in', 'pan_right', 'dolly_in', 'tracking_shot', 'crane_up', 'static'];
  const motionsToUse = cameraMotions.length > 0 ? cameraMotions : defaultMotions;

  const prompts: ScenePrompt[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const cameraMotion = motionsToUse[i % motionsToUse.length];

    const cameraInstruction = {
      static: 'static locked camera, no movement',
      pan_left: 'smooth pan from right to left',
      pan_right: 'smooth pan from left to right',
      zoom_in: 'slow cinematic zoom in towards subject',
      zoom_out: 'gradual zoom out revealing the scene',
      dolly_in: 'dolly forward movement approaching subject',
      dolly_out: 'dolly backward movement away from subject',
      crane_up: 'crane shot rising upward',
      crane_down: 'crane shot descending downward',
      tracking_shot: 'tracking shot following subject movement',
      handheld: 'handheld realistic camera movement with slight shake'
    }[cameraMotion];

    // Enhance prompt with Veo-optimized instructions
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Enhance this video scene description for Veo 3 (Google's video AI):

ORIGINAL VISUAL: ${scene.visualDescription}
CAMERA MOTION: ${cameraInstruction}
STYLE: ${visualStyle}

Create a single, detailed prompt (max 200 words) in English that:
1. Describes the visual scene in cinematic detail
2. Includes the camera motion instruction
3. Adds lighting, color grading, and mood
4. Ensures coherent visual storytelling

Output ONLY the prompt text, no explanations.`
    });

    const enhancedPrompt = response.text?.trim() ||
      `${visualStyle} video: ${scene.visualDescription}. Camera: ${cameraInstruction}. High quality, cinematic lighting.`;

    prompts.push({
      sceneId: scene.id,
      prompt: enhancedPrompt,
      cameraMotion: cameraMotion,
      duration: scene.duration
    });
  }

  return prompts;
};

export const generateVeoVideo = async (
  prompt: string,
  aspectRatio: string = '16:9',
  imageFile: File | null = null
): Promise<string> => {
  const ai = getClient();
  const apiKey = getApiKey();
  const model = 'veo-3.1-fast-generate-preview';
  let operation: any;

  try {
    const config = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio as '16:9' | '9:16',
    };

    console.log("[VEO] Starting video generation with prompt:", prompt.substring(0, 100) + "...");

    if (imageFile) {
      const base64Data = await fileToBase64(imageFile);
      operation = await ai.models.generateVideos({
        model,
        prompt: prompt || undefined,
        image: { imageBytes: base64Data, mimeType: imageFile.type },
        config
      });
    } else {
      if (!prompt) throw new Error("Prompt text diperlukan.");
      operation = await ai.models.generateVideos({ model, prompt, config });
    }

    console.log("[VEO] Initial operation started:", operation?.name || 'unknown');

    // Poll for completion with timeout
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (30 * 10 seconds)

    while (!operation.done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      attempts++;
      console.log(`[VEO] Polling attempt ${attempts}/${maxAttempts}, done: ${operation.done}`);
    }

    if (!operation.done) {
      throw new Error("Video generation timeout - proses terlalu lama (lebih dari 5 menit).");
    }

    // Debug: Log full response structure
    console.log("[VEO] Full operation response:", JSON.stringify(operation, null, 2));

    // Check for error in response
    if (operation.error) {
      console.error("[VEO] Operation error:", operation.error);
      throw new Error(operation.error.message || `VEO Error: ${JSON.stringify(operation.error)}`);
    }

    // Try to extract video URI from various possible response structures
    const generatedVideos = operation.response?.generatedVideos || operation.result?.generatedVideos || [];
    const firstVideo = generatedVideos[0];

    if (!firstVideo) {
      console.error("[VEO] No generated videos in response. Available keys:", Object.keys(operation.response || operation.result || {}));
      throw new Error("Video generation completed but no video was returned. Coba lagi atau gunakan prompt yang berbeda.");
    }

    const downloadLink = firstVideo.video?.uri || firstVideo.uri || firstVideo.videoUri;

    if (!downloadLink) {
      console.error("[VEO] Video object structure:", JSON.stringify(firstVideo, null, 2));
      throw new Error("Video generated but download link not found. Struktur response tidak sesuai.");
    }

    console.log("[VEO] Video URI obtained:", downloadLink.substring(0, 50) + "...");

    // Veo download link requires API key
    const videoUrl = `${downloadLink}&key=${apiKey}`;
    const videoRes = await fetch(videoUrl);

    if (!videoRes.ok) {
      throw new Error(`Gagal mengunduh video: ${videoRes.status} ${videoRes.statusText}`);
    }

    const blob = await videoRes.blob();
    console.log("[VEO] Video downloaded successfully, size:", blob.size);
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("[VEO] Video Error:", error);

    // Provide more specific error messages
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error("API quota exceeded. Coba lagi nanti atau periksa quota API Anda.");
    }
    if (error.message?.includes('permission') || error.message?.includes('403')) {
      throw new Error("API permission denied. Pastikan Veo API sudah diaktifkan di Google Cloud Console.");
    }
    if (error.message?.includes('model')) {
      throw new Error("Model Veo tidak tersedia. Pastikan Anda memiliki akses ke Veo 3.");
    }

    throw new Error(error.message || "Gagal membuat video. Periksa console untuk detail.");
  }
};


const pcmToWav = (samples: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): ArrayBuffer => {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length, true);
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(samples);
  return buffer;
};

export const generateSpeech = async (text: string, voiceName: string, style?: string): Promise<string> => {
  const ai = getClient();
  const processedText = style ? `(Style: ${style}) ${text}` : text;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: processedText }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Gagal menghasilkan audio.");
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  const wavBuffer = pcmToWav(bytes, 24000, 1);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

export const generateScript = async (topic: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Buatkan naskah voice over pendek tentang: "${topic}". Bahasa Indonesia. Output teks saja.`
  });
  return response.text?.trim() || "";
};

// --- FOREX & FINANCIAL AI (UPDATED WITH INVESTING.COM TARGETING) ---

// 1. Get Real-Time Prices via Search
export const getRealTimeForexPrices = async (): Promise<any[]> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Retrieve the current live market price for these pairs: XAU/USD (Gold), EUR/USD, GBP/USD, USD/JPY, BTC/USD.
            Use Google Search to find the latest data points from reliable financial news sources or brokers (e.g., Bloomberg, Reuters, TradingView).
            
            Return ONLY a valid JSON Array with objects containing: 
            "pair" (string), "price" (number), "change" (number).
            Example: [{"pair": "XAUUSD", "price": 2345.50, "change": 0.15}]`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const text = response.text || "[]";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Price Fetch Error", e);
    return [];
  }
};

// 2. Get Deep Market Insight from Investing.com
export const getMarketInsight = async (pair: string): Promise<any> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using flash for quicker search summarization
      contents: `Search for "${pair} technical analysis summary investing.com" to find the latest signals (Moving Averages and Technical Indicators) from Investing.com.
            
            Summarize the findings into a JSON object:
            {
                "sentiment": "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell",
                "trend_strength": number (0-100 where 100 is strongest trend),
                "support": "Key support level price",
                "resistance": "Key resistance level price",
                "summary": "Brief explanation of why (e.g. 'MA5, MA10, MA20 indicate Strong Buy...')."
            }
            Ensure the data is based on the most recent available analysis (Daily or Hourly timeframe).`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Insight Error", e);
    return null;
  }
};

export const analyzeForexChart = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  const data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data } },
        {
          text: `Act as "Astra", an elite Forex Technical Analyst. Analyze this chart image in extreme detail. 
        Identify:
        1. Current Trend (with timeframe context)
        2. Key Support & Resistance Levels (Exact prices if visible)
        3. Chart Patterns (Head & Shoulders, Flags, Triangles, etc.)
        4. Candlestick Psychology
        5. Supply & Demand Zones
        6. Potential Setup (Bullish/Bearish) with Risk/Reward ratio.
        
        Style: Professional, concise, institutional trader language. Use bullet points.` }
      ]
    }
  });
  return response.text?.trim() || "Gagal menganalisis chart.";
};

export const chatWithAstra = async (history: { role: 'user' | 'model', text: string }[], userMessage: string): Promise<string> => {
  const ai = getClient();

  // Astra uses Google Search to get REAL-TIME data
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    config: {
      tools: [{ googleSearch: {} }], // ENABLE REAL-TIME SEARCH
      systemInstruction: `You are "Astra", a world-class AI Forex Trading Assistant powered by RebelFX. 
      Your personality: Professional, sharp, slightly futuristic, risk-averse, and highly analytical (Institutional Trader Persona).
      
      Capabilities: Technical Analysis, Fundamental Analysis, Risk Management, and REAL-TIME Market Data lookup.
      
      Rules:
      1. Always emphasize Risk Management.
      2. Use Google Search to find current prices, news, and economic events when asked.
      3. Never give financial advice as absolute certainty. Use probabilities.
      4. Use professional forex terminology (Liquidity Sweep, BOS, Order Block, etc.).
      5. Keep answers concise but data-rich.`
    }
  });

  const response = await chat.sendMessage({ message: userMessage });
  return response.text || "Connection weak. Please try again.";
};

export const generateForexSignal = async (pair: string, timeframe: string): Promise<string> => {
  const ai = getClient();

  // Uses Search to find current context BEFORE generating signal
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Act as an algorithmic trading bot. 
    First, use Google Search to find the CURRENT PRICE, LATEST NEWS, and MARKET SENTIMENT for ${pair}.
    Based on this REAL-TIME data, generate a high-probability TRADING SIGNAL for ${timeframe}.
    
    Output Format STRICTLY JSON (Do not use markdown code blocks, just raw JSON):
    {
      "pair": "${pair}",
      "action": "BUY/SELL",
      "entry": "Current Price range",
      "stop_loss": "Logical SL based on ATR/Structure",
      "take_profit_1": "1:1 R/R",
      "take_profit_2": "1:2 R/R",
      "confidence": "Percentage based on confluence",
      "reasoning": "Brief technical/fundamental reason based on search results"
    }
    `,
    config: {
      tools: [{ googleSearch: {} }] // ENABLE REAL-TIME SEARCH
    }
  });
  return response.text || "{}";
};

export const getForexNews = async (): Promise<any[]> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search for the top 5 most important Forex/Economic news headlines from the last 24 hours. Focus on USD, EUR, GBP, JPY, and Gold (XAU).
            
            Output STRICTLY JSON Array:
            [
                { "time": "Time (e.g. 2h ago)", "currency": "USD", "event": "Headline", "impact": "High/Medium/Low" }
            ]`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "[]";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("News Fetch Error", e);
    return [];
  }
};

// --- YT SHORT MAKER LOGIC ---

export const analyzeYouTubeContent = async (videoUrl: string, duration: string, targetStyle: string): Promise<any> => {
  const ai = getClient();

  // Since we cannot actually download the video in browser, we will use Gemini's knowledge of the video 
  // (if it's a popular public video) or analyze the metadata/context provided via Search.

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Stronger reasoning model
      contents: `You are an expert Video Editor and Viral Content Strategist.
             Target Video: "${videoUrl}"
             Task: Create a plan to repurpose this long video into a viral YouTube Short (9:16).
             
             1. First, USE GOOGLE SEARCH to find the transcript, summary, or key discussions of this specific YouTube video URL.
             2. Identify the ONE most viral/interesting segment fitting for a ${duration} duration.
             3. Generate a "Shorts Production Plan".

             Output STRICTLY JSON:
             {
                "title": "Catchy Viral Title",
                "viralityScore": 95,
                "summary": "Brief context of this segment",
                "segmentStart": "MM:SS",
                "segmentEnd": "MM:SS",
                "keyQuote": "The most impactful sentence spoken",
                "suggestedBroll": "Description of visuals to overlay",
                "captionStyle": "${targetStyle}"
             }
             `,
      config: {
        tools: [{ googleSearch: {} }] // Critical: Use search to "watch" the video content via text/reviews/transcripts
      }
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);

  } catch (e: any) {
    console.error("YT Analysis Error", e);

    // Dynamic Fallback based on requested duration
    const startMin = 2;
    const startSec = 15;
    const durationSec = duration === '30s' ? 30 : 60;

    // Calculate End Time
    const endTotalSec = (startMin * 60) + startSec + durationSec;
    const endMin = Math.floor(endTotalSec / 60);
    const endSec = endTotalSec % 60;

    const fmt = (n: number) => n.toString().padStart(2, '0');

    return {
      title: "Viral Segment Detected (Simulated)",
      viralityScore: 88,
      summary: "AI detected a high-engagement peak in the video discussion.",
      segmentStart: `${fmt(startMin)}:${fmt(startSec)}`,
      segmentEnd: `${fmt(endMin)}:${fmt(endSec)}`,
      keyQuote: "This is the game changing moment...",
      suggestedBroll: "Fast paced cuts, zoom on face",
      captionStyle: targetStyle
    };
  }
};
