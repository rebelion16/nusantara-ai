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
    - KUALITAS GAMBAR: Wajib Ultra-Sharp, 8K Resolution, Masterpiece. Gambar harus terlihat "Crystal Clear" (Sangat Jernih).
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
    [FORCE MAJEURE: ABSOLUTE FACIAL IDENTITY PRESERVATION]
    ⚠️ CRITICAL: The face in the output MUST BE AN EXACT COPY of the Reference Face(s).
    
    1. **NO STRUCTURAL MODIFICATION:** STRICTLY PROHIBITED to change: bone structure, eye shape, nose shape, mouth shape, jawline, or head shape.
    2. **100% LIKENESS:** The output must look EXACTLY like the person in the uploaded photo. Do not "idealize", "westernize", or "genericize" the face.
    3. **IDENTITY PRIORITY:** The face is the anchor. If the prompt asks for a style that conflicts with the face structure, the FACE STRUCTURE WINS.
    4. **MULTI-SUBJECT MAPPING:** If multiple faces are uploaded, map them accurately to the requested roles. Do not mix faces.
    5. **ACCEPTABLE EDITS:** Only lighting, skin texture resolution (upscaling), and color grading may be adapted to the scene. NO MORPHING.
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
    fullPromptText += "\n\n(GAMBAR 1: WAJAH UTAMA / SUBJEK 1 - PERTAHANKAN IDENTITAS WAJAH INI)";
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
        fullPromptText += `\n\n(GAMBAR ${i + 2}: WAJAH TAMBAHAN / SUBJEK ${i + 2} - PERTAHANKAN IDENTITAS WAJAH INI)`;
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
    fullPromptText += "\n\n(GAMBAR REFERENSI TERAKHIR: GAYA/POSE/OUTFIT - Tiru pose, pakaian, atau gaya dari gambar ini. JANGAN AMBIL WAJAH DARI GAMBAR INI)";
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
    contents: `Sempurnakan prompt gambar berikut agar lebih deskriptif dan kreatif dalam Bahasa Indonesia. Input: "${userInput}"`
  });
  return response.text?.trim() || userInput;
};

export const analyzeImagePrompt = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  const data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
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
  const data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
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
  const data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
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

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation completed but no video URI was returned.");

    // Veo download link requires API key
    const videoUrl = `${downloadLink}&key=${apiKey}`;
    const videoRes = await fetch(videoUrl);
    const blob = await videoRes.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Veo Video Error:", error);
    throw new Error(error.message || "Gagal membuat video.");
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

// --- FOREX & FINANCIAL AI ---

export const analyzeForexChart = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  const data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data } },
        { text: `Act as "Astra", an elite Forex Technical Analyst. Analyze this chart image in extreme detail. 
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

export const chatWithAstra = async (history: {role: 'user' | 'model', text: string}[], userMessage: string): Promise<string> => {
  const ai = getClient();
  
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    config: {
      systemInstruction: `You are "Astra", a world-class AI Forex Trading Assistant powered by RebelFX. 
      Your personality: Professional, sharp, slightly futuristic, risk-averse, and highly analytical (Institutional Trader Persona).
      
      Capabilities: Technical Analysis (SMC, Price Action), Fundamental Analysis, Risk Management.
      
      Rules:
      1. Always emphasize Risk Management.
      2. Never give financial advice as absolute certainty. Use probabilities.
      3. Use professional forex terminology (Liquidity Sweep, BOS, Order Block, etc.).
      4. If asked about "Signal", provide a detailed setup with SL/TP and reasoning.
      5. Keep answers concise but data-rich.`
    }
  });

  const response = await chat.sendMessage({ message: userMessage });
  return response.text;
};

export const generateForexSignal = async (pair: string, timeframe: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Act as an algorithmic trading bot. Generate a hypothetical but realistic TRADING SIGNAL for ${pair} on the ${timeframe} timeframe based on current general market structure concepts (Simulation).
    
    Output Format STRICTLY JSON:
    {
      "pair": "${pair}",
      "action": "BUY/SELL",
      "entry": "1.xxxx",
      "stop_loss": "1.xxxx",
      "take_profit_1": "1.xxxx",
      "take_profit_2": "1.xxxx",
      "confidence": "85%",
      "reasoning": "Brief technical reason (e.g. Bullish Engulfing at Support)"
    }
    `
  });
  return response.text || "{}";
};