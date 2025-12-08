import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Sparkles, Zap, Layout, Palette, Image as ImageIcon, Monitor, ChevronDown, Check, Wand2, CloudRain, MapPin, Loader2, CloudLightning, Sun, Cloud, ArrowRight, Type, PenTool, Calendar, Users, Target, Search, List, Download, ImageIcon as PhotoIcon, Gauge, X } from 'lucide-react';
import { generateCreativeImage, refineUserPrompt } from '../../services/geminiService';
import { ErrorPopup } from '../ErrorPopup';

// --- CONSTANTS ---

const INFO_TYPES = [
  { id: 'timeline', label: 'Timeline / Kronologis', desc: 'Urutan waktu kejadian', details: 'A horizontal linear progression showcasing chronological milestones. Use clear time markers, connecting lines, and sequential data points to narrate the history or evolution.' },
  { id: 'flowchart', label: 'Flowchart / Proses', desc: 'Langkah-langkah sistematis', details: 'A complex system diagram with interconnected nodes, decision trees, and directional arrows. The layout should visualize a step-by-step workflow or algorithm with logical branching.' },
  { id: 'comparison', label: 'Perbandingan (Vs)', desc: 'Membandingkan dua hal atau lebih', details: 'A split-screen symmetrical composition. Use contrasting colors to differentiate two distinct subjects. Feature side-by-side data tables, radar charts, and pros/cons lists for direct comparison.' },
  { id: 'statistical', label: 'Statistik / Data Viz', desc: 'Grafik batang, pie chart, data berat', details: 'A data-heavy visualization focused on quantitative accuracy. Incorporate bar charts, donut graphs, and scatter plots. Use bold typography for key percentages and a clean grid layout.' },
  { id: 'anatomical', label: 'Anatomi / Bedah Komponen', desc: 'Menjelaskan bagian-bagian objek', details: 'An exploded view diagram showing internal components. Use leader lines with detailed labels to deconstruct the subject into its parts. Technical and precise illustrative style.' },
  { id: 'roadmap', label: 'Roadmap / Peta Jalan', desc: 'Rencana masa depan atau strategi', details: 'A winding path visualization representing a strategic journey. Mark key phases (Q1, Q2, etc.) as checkpoints along the route. Gamified aesthetic with start and end goals.' },
  { id: 'hierarchy', label: 'Hierarki / Struktur', desc: 'Piramida atau struktur organisasi', details: 'A tiered pyramid or tree structure layout. visualizes authority levels or categorization from top-down or bottom-up. Clear separation between layers using shades of color.' },
  { id: 'mindmap', label: 'Mind Map', desc: 'Hubungan ide yang bercabang', details: 'A network diagram with a central core concept and radiating branches. Organic connections linking related sub-topics. Use color coding to group thematic clusters.' },
  { id: 'cycle', label: 'Siklus / Loop', desc: 'Proses yang berulang', details: 'A circular flow diagram representing an infinite loop or closed system. Use rotational symmetry and arrows indicating continuous movement or recycling processes.' },
  { id: 'list', label: 'List / Daftar', desc: 'Daftar poin penting', details: 'A structured vertical listicle layout. Use stylized bullets, numbered icons, or cards to organize key points. Ensure high readability with ample whitespace between items.' },
];

const ART_STYLES = [
  { id: 'isometric', label: '3D Isometric', keyword: 'isometric 3D render, blender style, clean hard shadows, orthographic camera view, floating elements, 3d assets', lighting: 'Soft studio lighting' },
  { id: 'clay', label: 'Claymorphism (3D Clay)', keyword: 'claymorphism, soft clay 3d, rounded shapes, matte plastic finish, cute 3d style, playful aesthetics, soft studio lighting', lighting: 'Soft ambient lighting' },
  { id: 'flat', label: 'Flat Design Modern', keyword: 'flat vector art, corporate memphis style, minimalist, clean lines, solid colors, no gradients, geometric shapes', lighting: 'Flat lighting' },
  { id: 'sketch', label: 'Hand-Drawn Sketch', keyword: 'technical hand-drawn sketch, blueprint aesthetic, white lines on blue background, graphite texture, rough pencil strokes', lighting: 'None' },
  { id: 'neon', label: 'Cyberpunk / Neon', keyword: 'futuristic HUD interface, neon glowing lines, dark mode data visualization, grid background, cybernetic aesthetics, hologram effect', lighting: 'Neon glow' },
  { id: 'paper', label: 'Paper Cutout', keyword: 'layered paper craft style, depth of field, origami textures, shadow depth, collage art, tactile feel', lighting: 'Hard shadows' },
  { id: 'vintage', label: 'Vintage / Retro', keyword: 'vintage poster style, grain texture, muted colors, 1950s infographic, worn paper texture, retro typography', lighting: 'Warm vintage' },
  { id: 'glassmorphism', label: 'Glassmorphism', keyword: 'glassmorphism UI, frosted glass effect, translucent layers, modern UI, blur background, vivid gradients behind glass', lighting: 'Backlit' },
  { id: 'pixel', label: 'Pixel Art', keyword: 'pixel art style, 8-bit graphics, retro game ui, blocky aesthetic, dithering patterns', lighting: 'None' },
  { id: 'bauhaus', label: 'Bauhaus / Geometric', keyword: 'bauhaus design style, abstract geometric shapes, bold primary colors, diagonal composition, minimalist architecture', lighting: 'Flat' },
  { id: 'watercolor', label: 'Watercolor / Cat Air', keyword: 'watercolor painting style, soft edges, artistic splashes, paper texture, wet-on-wet technique', lighting: 'Natural' },
  { id: 'lowpoly', label: 'Low Poly', keyword: 'low poly art, polygon mesh, sharp edges, geometric 3d, minimalist 3d, faceted shading', lighting: 'Low poly shading' },
  { id: 'blueprint', label: 'Technical Blueprint', keyword: 'architectural blueprint, technical schematic, white lines on blue grid, engineering drawing style', lighting: 'None' },
  { id: 'popart', label: 'Pop Art', keyword: 'pop art style, comic book dots, halftone patterns, bold outlines, vibrant contrast, ben-day dots', lighting: 'Hard contrast' },
];

const COLOR_PALETTES = [
  { id: 'vibrant', label: 'Vibrant & Pop', keyword: 'vibrant saturated colors, high contrast, bold primary colors (Cyan, Magenta, Yellow)' },
  { id: 'corporate', label: 'Corporate Blue & Grey', keyword: 'professional business palette, shades of blue and slate grey, clean white background, trustworthy' },
  { id: 'bmkg', label: 'BMKG Official (Green/Blue)', keyword: 'meteorological map colors, green for land, blue for ocean, heat map gradient (blue-green-yellow-red)' },
  { id: 'pastel', label: 'Soft Pastels', keyword: 'soft pastel color palette, soothing tones, baby pink, mint green, pale blue, low saturation' },
  { id: 'dark', label: 'Dark Mode', keyword: 'dark mode aesthetics, charcoal background, neon accent colors, high contrast text' },
  { id: 'monochrome', label: 'Monokromatik', keyword: 'monochromatic color scheme, single hue variations, clean and minimal, sophisticated' },
  { id: 'earth', label: 'Earth Tones', keyword: 'natural earth tones, organic colors, olive green, terracotta, beige, brown' },
  { id: 'luxury', label: 'Luxury Gold & Black', keyword: 'luxury color palette, matte black background, metallic gold accents, elegant typography' },
  { id: 'ocean', label: 'Ocean / Cool', keyword: 'cool color palette, deep blues, teal, aquamarine, refreshing and calm' },
  { id: 'sunset', label: 'Sunset / Warm', keyword: 'warm color palette, orange, purple and pink gradients, golden hour lighting' },
  { id: 'retro80s', label: 'Retro 80s / Vaporwave', keyword: 'vaporwave aesthetic, synthwave palette, neon pink, cyan, purple, retro gradient' },
  { id: 'forest', label: 'Forest / Nature', keyword: 'forest palette, deep emerald greens, wood browns, leaf textures, eco-friendly vibe' },
  { id: 'grayscale', label: 'Grayscale / B&W', keyword: 'grayscale, black and white only, high contrast, newspaper print style' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: 'Landscape (16:9)', value: '--ar 16:9' },
  { id: '9:16', label: 'Portrait (Story/Reels)', value: '--ar 9:16' },
  { id: '4:5', label: 'Instagram Feed (4:5)', value: '--ar 4:5' },
  { id: '1:1', label: 'Square (1:1)', value: '--ar 1:1' },
  { id: '3:2', label: 'Presentation (3:2)', value: '--ar 3:2' },
  { id: '21:9', label: 'Ultrawide (21:9)', value: '--ar 21:9' },
];

const FONTS = [
  { id: 'auto', label: '✨ Otomatis (AI Decision)', keyword: 'typography matching the art style' },
  { id: 'sans', label: 'Modern Sans Serif (Clean)', keyword: 'modern sans-serif typography, Helvetica or Roboto style, clean and legible' },
  { id: 'serif', label: 'Elegant Serif (Classic)', keyword: 'elegant serif typography, Times New Roman or Garamond style, editorial look' },
  { id: 'futuristic', label: 'Futuristic / Sci-Fi', keyword: 'futuristic sci-fi font, techno typography, digital glitch text effects' },
  { id: 'hand', label: 'Handwritten / Marker', keyword: 'handwritten marker font, casual script, organic typography, notebook style' },
  { id: 'bold', label: 'Bold Impact (Headline)', keyword: 'bold impact font, thick heavy typography, headline style, commanding' },
  { id: 'mono', label: 'Monospace (Code/Tech)', keyword: 'monospace typewriter font, coding style typography, technical data look' },
];

const WRITING_STYLES = [
  { id: 'auto', label: '✨ Otomatis (Sesuai Topik)', keyword: 'neutral and informative tone' },
  { id: 'pro', label: 'Profesional & Formal', keyword: 'professional corporate tone, formal business language, executive summary style' },
  { id: 'casual', label: 'Casual & Friendly', keyword: 'casual friendly tone, easy to understand, approachable, conversational' },
  { id: 'academic', label: 'Akademis & Detail', keyword: 'academic scientific tone, detailed analysis, dense information, data-driven' },
  { id: 'witty', label: 'Witty & Fun', keyword: 'witty humorous tone, fun and engaging, creative copywriting, punchy' },
  { id: 'minimal', label: 'Minimalis (To-the-point)', keyword: 'minimalist concise tone, bullet points only, very little text, visual focus' },
  { id: 'persuasive', label: 'Persuasif (Marketing)', keyword: 'persuasive marketing tone, selling points, call to action focus, promotional' },
];

const TARGET_AUDIENCES = [
  { id: 'general', label: 'Umum (General Public)', keyword: 'designed for a general audience, easy to read for everyone' },
  { id: 'kids', label: 'Anak-anak (Kids/Students)', keyword: 'designed for kids, playful, colorful, educational, large text, simple concepts' },
  { id: 'pro', label: 'Profesional / C-Level', keyword: 'designed for business professionals, executive summary style, sophisticated, high-level data' },
  { id: 'tech', label: 'Tech Savvy / Developer', keyword: 'designed for tech enthusiasts, complex diagrams, schematic look, detailed specs' },
  { id: 'elderly', label: 'Lansia (Senior Friendly)', keyword: 'high accessibility design, large text, high contrast, clear visual hierarchy' },
  { id: 'social', label: 'Pengguna Medsos (Gen Z)', keyword: 'trendy, aesthetically pleasing, instagrammable, catchy visuals, social media optimized' },
];

const INFOGRAPHIC_GOALS = [
  { id: 'educate', label: 'Edukasi / Penjelasan', keyword: 'educational purpose, clear explanation, step-by-step breakdown, learning aid' },
  { id: 'market', label: 'Marketing / Promosi', keyword: 'marketing material, persuasive design, highlighting unique selling points, brand focus' },
  { id: 'viral', label: 'Viral / Shareable', keyword: 'highly shareable content, shock value, emotional impact, eye-catching design' },
  { id: 'report', label: 'Laporan / Data', keyword: 'data reporting, accuracy focused, clean charts, objective presentation, dashboard style' },
  { id: 'guide', label: 'Panduan / Tutorial', keyword: 'instructional guide, instructional design, how-to format, clear sequence' },
];

const CITY_COORDINATES: Record<string, { lat: number, lon: number }> = {
  "Jakarta": { lat: -6.2088, lon: 106.8456 },
  "Surabaya": { lat: -7.2575, lon: 112.7521 },
  "Bandung": { lat: -6.9175, lon: 107.6191 },
  "Medan": { lat: 3.5952, lon: 98.6722 },
  "Semarang": { lat: -6.9667, lon: 110.4167 },
  "Makassar": { lat: -5.1477, lon: 119.4327 },
  "Palembang": { lat: -2.9909, lon: 104.7567 },
  "Denpasar": { lat: -8.6705, lon: 115.2126 },
  "Yogyakarta": { lat: -7.7956, lon: 110.3695 },
  "Balikpapan": { lat: -1.2379, lon: 116.8529 },
  "Jayapura": { lat: -2.5000, lon: 140.7000 },
  "Manado": { lat: 1.4748, lon: 124.8428 },
  "Padang": { lat: -0.9471, lon: 100.4172 },
  "Banda Aceh": { lat: 5.5483, lon: 95.3238 },
  "Pontianak": { lat: -0.0263, lon: 109.3425 }
};

const INDONESIAN_CITIES = Object.keys(CITY_COORDINATES);

const MAGIC_KEYWORDS = [
  "masterpiece", "best quality", "8k resolution", "sharp focus",
  "award winning infographic", "trending on behance", "featured on dribbble",
  "professional corporate design", "high fidelity vector graphics",
  "unreal engine 5 render style", "cinematic lighting", "global illumination",
  "expert data visualization", "premium ui/ux design", "editorial layout",
  "intricate details", "hyperrealistic textures", "visually stunning"
];

const getWeatherDescription = (code: number) => {
  if (code === 0) return "Cerah (Clear Sky)";
  if ([1, 2, 3].includes(code)) return "Berawan (Cloudy)";
  if ([45, 48].includes(code)) return "Berkabut (Foggy)";
  if ([51, 53, 55].includes(code)) return "Gerimis (Drizzle)";
  if ([61, 63, 65].includes(code)) return "Hujan (Rain)";
  if ([80, 81, 82].includes(code)) return "Hujan Deras (Heavy Rain)";
  if ([95, 96, 99].includes(code)) return "Hujan Petir (Thunderstorm)";
  return "Berawan (Cloudy)";
};

const getIndonesianDate = () => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date().toLocaleDateString('id-ID', options);
};

// Component moved outside main module to prevent re-mounting
const Dropdown = ({ label, icon: Icon, options, value, onChange, isDarkMode }: any) => (
  <div>
      <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {Icon && <Icon size={14} />} {label}
      </div>
      <div className="relative">
          <select 
              value={value.id}
              onChange={(e) => onChange(options.find((o: any) => o.id === e.target.value))}
              className={`w-full p-2.5 text-sm rounded-lg border appearance-none outline-none focus:ring-2 focus:ring-opacity-50 transition-all ${
                  isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-indigo-900' 
                  : 'bg-white border-slate-200 text-slate-700 focus:border-indigo-300 focus:ring-indigo-100'
              }`}
          >
              {options.map((o: any) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} className={`absolute right-3 top-3.5 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
      </div>
  </div>
);

export const InfografisModule: React.FC = () => {
  // Sync Dark Mode with App State
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [isWeatherMode, setIsWeatherMode] = useState(false);
  
  // Inputs
  const [topic, setTopic] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  
  // Weather Specific State
  const [selectedCity, setSelectedCity] = useState(INDONESIAN_CITIES[0]);
  const [isManualCityInput, setIsManualCityInput] = useState(false);
  
  // Selections
  const [selectedType, setSelectedType] = useState(INFO_TYPES[0]);
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[2]);
  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[1]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]); 
  const [selectedTone, setSelectedTone] = useState(WRITING_STYLES[0]);
  const [selectedTarget, setSelectedTarget] = useState(TARGET_AUDIENCES[0]);
  const [selectedGoal, setSelectedGoal] = useState(INFOGRAPHIC_GOALS[0]);
  
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [imageSize, setImageSize] = useState('2K'); // DEFAULT to 2K for Gemini 3
  const [isEnhanced, setIsEnhanced] = useState(true); 
  const [promptFormat, setPromptFormat] = useState('gemini'); 
  
  const [realTimeWeather, setRealTimeWeather] = useState<any>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Generation
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Actual Image Generation State
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentDate(getIndonesianDate());
  }, []);

  // Fetch Weather Data with Debounce & Geocoding fallback
  useEffect(() => {
    if (isWeatherMode && selectedCity) {
      const timeoutId = setTimeout(async () => {
        setIsLoadingWeather(true);
        try {
          let lat, lon;
          if (CITY_COORDINATES[selectedCity]) {
            lat = CITY_COORDINATES[selectedCity].lat;
            lon = CITY_COORDINATES[selectedCity].lon;
          } else {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(selectedCity)}&count=1&language=id&format=json`);
            const geoData = await geoRes.json();
            if (geoData.results && geoData.results.length > 0) {
              lat = geoData.results[0].latitude;
              lon = geoData.results[0].longitude;
            } else {
              throw new Error("Kota tidak ditemukan di satelit");
            }
          }

          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia%2FBangkok`
          );
          const data = await response.json();
          if (data.current_weather) {
            setRealTimeWeather({
              temp: data.current_weather.temperature,
              desc: getWeatherDescription(data.current_weather.weathercode),
              wind: data.current_weather.windspeed
            });
          }
        } catch (error) {
          console.error("Gagal mengambil data cuaca:", error);
          setRealTimeWeather({ temp: 30, desc: "Cerah (Data Tidak Ditemukan)", wind: 10 });
        } finally {
          setIsLoadingWeather(false);
        }
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCity, isWeatherMode]);

  const toggleWeatherMode = () => {
    setIsWeatherMode(!isWeatherMode);
    if (!isWeatherMode) {
        setSelectedPalette(COLOR_PALETTES[2]); // BMKG
        setSelectedType({ id: 'weather', label: 'Peta Cuaca (BMKG)', desc: '', details: '' });
    } else {
        setSelectedPalette(COLOR_PALETTES[1]); 
        setSelectedType(INFO_TYPES[0]);
    }
  };

  useEffect(() => {
    if (isProcessing) return; 
    buildPrompt();
  }, [topic, selectedType, selectedStyle, selectedPalette, aspectRatio, isEnhanced, promptFormat, selectedCity, realTimeWeather, isWeatherMode, manualPrompt, selectedFont, selectedTone, selectedTarget, selectedGoal]);

  const buildPrompt = () => {
    const today = getIndonesianDate();
    let base = '';
    let topicDescription = '';
    
    if (isWeatherMode) {
      const weatherData = realTimeWeather 
        ? `${realTimeWeather.desc}, ${realTimeWeather.temp}°C, Wind ${realTimeWeather.wind}km/h`
        : "Loading weather data...";
      topicDescription = `Subject: Professional Real-Time Weather Forecast Infographic for ${selectedCity}, Indonesia. Date: "${today}". Data: ${weatherData}.`;
    } else {
      const safeTopic = topic || 'General Knowledge';
      topicDescription = `Subject: A comprehensive ${selectedType.label} regarding "${safeTopic}".`;
    }

    const layoutDetails = isWeatherMode 
        ? `Layout: Meteorological map focused on ${selectedCity}, displaying the date "${today}", authentic temperature and condition icons. BMKG style inspiration.`
        : `Layout: ${selectedType.details} The composition should be balanced, guiding the viewer's eye through the ${selectedType.label} structure logicaly.`;

    // GEMINI OPTIMIZED PROMPT CONSTRUCTION
    const styleDetails = `Art Style: ${selectedStyle.keyword}. Lighting: ${selectedStyle.lighting}. Materials: High fidelity textures.`;
    const colorDetails = `Color Palette: ${selectedPalette.keyword}. Visual Hierarchy: Use color to distinguish key data points.`;
    const fontDetails = selectedFont.id !== 'auto' ? ` Typography: ${selectedFont.keyword}.` : '';
    const toneDetails = selectedTone.id !== 'auto' ? ` Tone: ${selectedTone.keyword}.` : '';
    const targetDetails = !isWeatherMode ? ` Target Audience: ${selectedTarget.keyword}. Goal: ${selectedGoal.keyword}.` : '';

    const manualInjection = manualPrompt ? ` CUSTOM INSTRUCTIONS: ${manualPrompt}.` : '';
    
    // Check if prompt format is explicitly set to others, otherwise default to Gemini Structure
    if (promptFormat === 'midjourney') {
        base = `/imagine prompt: ${topicDescription} ${layoutDetails} ${styleDetails} ${colorDetails} ${fontDetails} ${manualInjection} ${aspectRatio.value} --v 6.0`;
    } else if (promptFormat === 'dalle') {
        base = `Create a high quality infographic. ${topicDescription} ${layoutDetails} ${styleDetails} ${colorDetails} ${manualInjection}`;
    } else {
        // DEFAULT GEMINI STRUCTURE
        base = `**Subject:** ${topic || (isWeatherMode ? selectedCity : 'Topic')}\n**Description:** ${topicDescription}\n**Format:** ${selectedType.label} (${isWeatherMode ? 'Map' : selectedType.details})\n**Style:** ${selectedStyle.label}\n**Visual Keywords:** ${selectedStyle.keyword}\n**Color Scheme:** ${selectedPalette.label} (${selectedPalette.keyword})\n**Typography:** ${selectedFont.label}\n**Target:** ${selectedTarget.label}\n**Aspect Ratio:** ${aspectRatio.label}\n**Custom Instructions:** ${manualPrompt || 'None'}\n\n**Detailed Directive:**\nPlease generate a highly detailed and data-rich visualization. The layout should strictly follow the logic of a ${isWeatherMode ? 'Meteorological Map' : selectedType.label}. Use the specified art style to create a unique aesthetic. Ensure the background provides good contrast for the data elements.`;
    }

    setGeneratedPrompt(base);
  };

  const activateGeminiMagic = async () => {
    setIsProcessing(true);
    try {
        // Use Real Gemini API to refine the prompt concept
        const baseTopic = topic || (isWeatherMode ? `Cuaca ${selectedCity}` : 'Infografis Umum');
        
        // Include manual prompt in the context sent to AI
        let promptContext = `Buatkan konsep visual infografis yang sangat detail, kreatif, dan profesional tentang: ${baseTopic}. Target audiens: ${selectedTarget.label}. Gaya: ${selectedStyle.label}.`;
        
        if (manualPrompt && manualPrompt.trim().length > 0) {
             promptContext += `\n\n[PENTING] Instruksi Tambahan User: "${manualPrompt}". Pastikan instruksi ini diintegrasikan dengan baik ke dalam deskripsi visual.`;
        }

        const refinedTopic = await refineUserPrompt(promptContext);
        
        // Update manual prompt with the AI suggestion to trigger a rebuild
        setManualPrompt(refinedTopic);
        
        // Allow time for state update to trigger buildPrompt
        setTimeout(() => {
             if (generatedPrompt && !history.includes(generatedPrompt)) {
                setHistory(prev => [generatedPrompt, ...prev].slice(0, 5));
            }
        }, 100);

    } catch (e) {
        console.error("Magic fail", e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  const handleGenerateImage = async () => {
    if (!generatedPrompt) return;
    setIsGeneratingImage(true);
    setGenError(null);
    setResultImage(null);
    
    try {
      // Parse aspect ratio from ID (e.g., '16:9')
      const ar = aspectRatio.id;
      // Pass imageSize to the service. '2K' triggers Gemini 3 Pro.
      const result = await generateCreativeImage(generatedPrompt, null, ar, imageSize);
      setResultImage(result);
    } catch (e: any) {
      console.error(e);
      setGenError(e.message || "Gagal membuat infografis.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRandomize = () => {
    if (isWeatherMode) return; 
    const randomType = INFO_TYPES[Math.floor(Math.random() * INFO_TYPES.length)];
    const randomStyle = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
    const randomPalette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
    const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)];
    const randomTone = WRITING_STYLES[Math.floor(Math.random() * WRITING_STYLES.length)];
    const randomTarget = TARGET_AUDIENCES[Math.floor(Math.random() * TARGET_AUDIENCES.length)];
    const randomGoal = INFOGRAPHIC_GOALS[Math.floor(Math.random() * INFOGRAPHIC_GOALS.length)];
    
    setSelectedType(randomType);
    setSelectedStyle(randomStyle);
    setSelectedPalette(randomPalette);
    setSelectedFont(randomFont);
    setSelectedTone(randomTone);
    setSelectedTarget(randomTarget);
    setSelectedGoal(randomGoal);
  };

  // Styles based on dark mode state
  const bgMain = 'bg-slate-50 dark:bg-dark-bg';
  const textMain = 'text-slate-800 dark:text-slate-100';
  const textSub = 'text-slate-500 dark:text-slate-400';
  const cardBg = 'bg-white dark:bg-dark-card';
  const cardBorder = 'border-slate-100 dark:border-slate-700';

  return (
    <div className={`font-sans selection:bg-rose-200 transition-colors duration-300 animate-fade-in ${bgMain} ${textMain}`}>
      
      {/* Top Controls Bar */}
      <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Infografis Builder</h2>
            <p className="text-gray-500 dark:text-gray-400">Desain visual data kompleks dalam hitungan detik dengan Gemini 3.</p>
          </div>
          <button 
                onClick={toggleWeatherMode}
                className={`relative px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                    isWeatherMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : `border ${isDarkMode ? 'border-rose-500/50 text-rose-400 hover:bg-rose-900/20' : 'border-rose-200 text-rose-500 hover:bg-rose-50'} bg-transparent`
                }`}
            >
                {isWeatherMode ? <><ArrowRight size={16} /> Kembali</> : <><CloudRain size={16} /> Mode Cuaca</>}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
        
        {/* Left Column: Input (35%) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Input Section */}
          <section className={`p-6 rounded-2xl shadow-sm border transition-all duration-500 flex flex-col ${
            isWeatherMode 
              ? isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50/50 border-blue-100' 
              : `${cardBg} ${cardBorder}`
          }`}>
            {isWeatherMode ? (
              <div className="space-y-4 animate-fade-in">
                <div className={`flex items-center justify-between font-bold border-b pb-2 mb-2 ${isDarkMode ? 'text-blue-400 border-blue-800' : 'text-blue-700 border-blue-200'}`}>
                   <div className="flex items-center gap-2">
                      <CloudRain size={20} />
                      <span>Data Cuaca Real-Time</span>
                   </div>
                   {isLoadingWeather && <div className="text-xs font-normal opacity-70 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Mengambil data...</div>}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1 flex items-center justify-between gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-800/60'}`}>
                      <div className="flex items-center gap-1"><MapPin size={12}/> {isManualCityInput ? "Ketik Nama Kota" : "Pilih Kota"}</div>
                      <button 
                        onClick={() => {
                          setIsManualCityInput(!isManualCityInput);
                          if (!isManualCityInput) setSelectedCity(''); 
                          else setSelectedCity(INDONESIAN_CITIES[0]); 
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${
                          isDarkMode 
                            ? 'bg-blue-900 border-blue-700 hover:bg-blue-800 text-blue-200' 
                            : 'bg-white border-blue-200 hover:bg-blue-50 text-blue-600'
                        }`}
                      >
                        {isManualCityInput ? <><List size={10}/> Pilih Daftar</> : <><PenTool size={10}/> Input Manual</>}
                      </button>
                    </label>

                    <div className="relative">
                      {isManualCityInput ? (
                        <div className="relative">
                           <input
                            type="text"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            placeholder="Contoh: Malang, Bukittinggi..."
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all font-medium pr-10 ${
                              isDarkMode 
                                ? 'bg-slate-800 border-blue-900 text-blue-100 focus:border-blue-500 focus:ring-blue-900/50' 
                                : 'bg-white border-blue-200 text-blue-900 focus:border-blue-400 focus:ring-blue-100'
                            }`}
                          />
                          <Search size={16} className={`absolute right-3 top-3.5 pointer-events-none ${isDarkMode ? 'text-blue-500' : 'text-blue-300'}`} />
                        </div>
                      ) : (
                        <div className="relative">
                          <select 
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className={`w-full p-3 rounded-xl appearance-none focus:ring-2 outline-none font-medium transition-colors ${
                              isDarkMode 
                                ? 'bg-slate-800 border-blue-900 text-blue-100 focus:border-blue-500 focus:ring-blue-900/50' 
                                : 'bg-white border-blue-200 text-blue-900 focus:border-blue-400 focus:ring-blue-100'
                            }`}
                          >
                            {INDONESIAN_CITIES.map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className={`absolute right-3 top-3.5 pointer-events-none ${isDarkMode ? 'text-blue-400' : 'text-blue-400'}`} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all shadow-sm ${
                    isDarkMode ? 'bg-slate-800 border-blue-900' : 'bg-white border-blue-200'
                  }`}>
                     <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        {isLoadingWeather ? <Loader2 size={24} className="animate-spin"/> : (
                           realTimeWeather?.desc.includes('Cerah') ? <Sun size={24}/> : 
                           realTimeWeather?.desc.includes('Hujan') ? <CloudRain size={24}/> : 
                           realTimeWeather?.desc.includes('Petir') ? <CloudLightning size={24}/> : 
                           <Cloud size={24}/>
                        )}
                     </div>
                     <div>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-400'}`}>
                           Kondisi Saat Ini
                        </div>
                        {realTimeWeather ? (
                           <div>
                              <div className="flex items-end gap-2">
                                <span className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{realTimeWeather.temp}°C</span>
                                <span className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>• {realTimeWeather.desc}</span>
                              </div>
                              <div className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                <Calendar size={10} /> {currentDate}
                              </div>
                           </div>
                        ) : (
                           <span className="text-sm text-slate-400 italic">
                             {isLoadingWeather ? 'Mencari data...' : 'Menunggu input...'}
                           </span>
                        )}
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Apa topik infografismu hari ini?
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Manfaat Minum Kopi..."
                  className={`w-full p-4 text-lg border-2 rounded-xl focus:ring-4 transition-all outline-none pr-10 ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-rose-500 focus:ring-rose-900/30' 
                      : 'border-slate-200 text-slate-900 focus:border-rose-400 focus:ring-rose-100'
                  }`}
                />
                {topic && (
                    <button
                        onClick={() => setTopic('')}
                        className="absolute right-3 top-[38px] text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                        <X size={16} />
                    </button>
                )}
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-700 flex-1 relative">
               <label className={`block text-xs font-bold mb-2 flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <PenTool size={12}/> Instruksi Tambahan (Manual Prompt)
               </label>
               <textarea
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  placeholder="Tulis instruksi spesifik di sini... (Contoh: Jangan pakai warna merah, tambahkan logo di pojok)"
                  className={`w-full p-3 text-sm border rounded-xl focus:ring-2 transition-all outline-none resize-none h-32 pr-8 ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-indigo-900/30' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-300 focus:ring-indigo-50'
                  }`}
               />
               {manualPrompt && (
                    <button
                        onClick={() => setManualPrompt('')}
                        className="absolute right-3 top-[40px] text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                        <X size={16} />
                    </button>
               )}
               <p className={`text-[10px] mt-1 text-right ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>*Otomatis masuk ke prompt</p>
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={activateGeminiMagic}
                disabled={(!isWeatherMode && !topic) || isProcessing}
                className={`px-4 py-3 rounded-lg font-bold text-white shadow-sm flex items-center gap-2 transition-all text-sm w-full justify-center ${
                  (!isWeatherMode && !topic)
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : isProcessing
                        ? 'bg-slate-400 cursor-wait'
                        : isWeatherMode 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 active:scale-95 shadow-blue-200'
                            : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:scale-105 active:scale-95 shadow-rose-200'
                }`}
              >
                 {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                 <span>{isProcessing ? 'Gemini Sedang Berpikir...' : '✨ Magic Enhance (Gemini AI)'}</span>
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Output & Controls (65%) */}
        <div className="lg:col-span-7 space-y-6">
          
          <section className={`${cardBg} ${cardBorder} p-6 rounded-2xl shadow-sm border`}>
            {isWeatherMode ? (
                <div className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900 p-4 rounded-xl text-center mb-6">
                    <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Mode cuaca aktif. Beberapa pengaturan otomatis disesuaikan untuk akurasi data.</p>
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-4">
                    {isWeatherMode ? (
                         <div className="opacity-50 pointer-events-none">
                            <Dropdown label="Tipe Infografis (Terkunci)" icon={Layout} options={[{id:'weather', label:'Peta Cuaca (BMKG)'}]} value={{id:'weather'}} onChange={()=>{}} isDarkMode={isDarkMode} />
                         </div>
                    ) : (
                        <Dropdown label="Tipe Infografis" icon={Layout} options={INFO_TYPES} value={selectedType} onChange={setSelectedType} isDarkMode={isDarkMode} />
                    )}
                    
                    <Dropdown label="Gaya Visual" icon={ImageIcon} options={ART_STYLES} value={selectedStyle} onChange={setSelectedStyle} isDarkMode={isDarkMode} />
                    <Dropdown label="Warna" icon={Palette} options={COLOR_PALETTES} value={selectedPalette} onChange={setSelectedPalette} isDarkMode={isDarkMode} />
                </div>

                <div className="space-y-4">
                    <Dropdown label="Jenis Font" icon={Type} options={FONTS} value={selectedFont} onChange={setSelectedFont} isDarkMode={isDarkMode} />
                    <Dropdown label="Gaya Penulisan" icon={PenTool} options={WRITING_STYLES} value={selectedTone} onChange={setSelectedTone} isDarkMode={isDarkMode} />
                    <Dropdown label="Target Pembaca" icon={Users} options={TARGET_AUDIENCES} value={selectedTarget} onChange={setSelectedTarget} isDarkMode={isDarkMode} />
                    <Dropdown label="Tujuan Infografis" icon={Target} options={INFOGRAPHIC_GOALS} value={selectedGoal} onChange={setSelectedGoal} isDarkMode={isDarkMode} />
                </div>
            </div>
          </section>

          {/* Output Box */}
          <section className={`${cardBg} ${cardBorder} p-6 rounded-2xl shadow-lg border relative overflow-hidden transition-colors duration-500`}>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-all duration-500 ${isWeatherMode ? 'from-blue-400 via-cyan-400 to-teal-400' : 'from-rose-400 via-purple-400 to-indigo-400'}`}></div>
            
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-bold flex items-center gap-2 ${isWeatherMode ? 'text-blue-500' : 'text-rose-500'}`}>
                <Monitor size={18} />
                Hasil Prompt
              </h2>
              <div className="flex gap-2">
                 <button 
                  onClick={handleRandomize}
                  disabled={isWeatherMode}
                  className={`p-2 rounded-lg transition-colors ${
                      isWeatherMode 
                        ? 'text-slate-300 cursor-not-allowed' 
                        : isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title={isWeatherMode ? "Acak dinonaktifkan di mode cuaca" : "Acak Pengaturan"}
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {/* Parameters Bar */}
            <div className={`flex flex-wrap gap-4 mb-4 pb-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
               <div className={`flex p-1 rounded-lg gap-1 flex-grow ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                {['gemini', 'midjourney', 'dalle'].map((m) => (
                    <button 
                    key={m}
                    onClick={() => setPromptFormat(m)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${
                        promptFormat === m 
                            ? `${cardBg} shadow-sm ${m === 'midjourney' ? 'text-indigo-500' : m === 'dalle' ? 'text-green-500' : 'text-blue-500'}` 
                            : 'text-slate-500 hover:text-slate-400'
                    }`}
                    >
                    {m}
                    </button>
                ))}
              </div>

              <div className="w-32">
                  <select 
                    value={aspectRatio.id}
                    onChange={(e) => setAspectRatio(ASPECT_RATIOS.find(ar => ar.id === e.target.value) || ASPECT_RATIOS[0])}
                    className={`w-full border text-xs font-bold rounded-lg p-2 outline-none focus:ring-2 h-full ${
                        isDarkMode 
                        ? 'bg-slate-800 border-slate-700 text-slate-200' 
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    } ${isWeatherMode ? 'focus:border-blue-400 focus:ring-blue-100' : 'focus:border-rose-400 focus:ring-rose-100'}`}
                  >
                    {ASPECT_RATIOS.map(ar => (
                      <option key={ar.id} value={ar.id}>{ar.label}</option>
                    ))}
                  </select>
              </div>

              <div className="w-40">
                  <div className="relative h-full">
                    <select 
                        value={imageSize}
                        onChange={(e) => setImageSize(e.target.value)}
                        className={`w-full h-full border text-xs font-bold rounded-lg p-2 pl-7 outline-none focus:ring-2 appearance-none ${
                            isDarkMode 
                            ? 'bg-slate-800 border-slate-700 text-slate-200' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        } ${isWeatherMode ? 'focus:border-blue-400 focus:ring-blue-100' : 'focus:border-rose-400 focus:ring-rose-100'}`}
                    >
                        <option value="1K">Gemini 2.5 (Fast)</option>
                        <option value="2K">Gemini 3 Pro (High)</option>
                        <option value="4K">Gemini 3 Pro (Ultra)</option>
                    </select>
                    <Gauge size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                  </div>
              </div>
            </div>

            <div className={`rounded-xl p-4 group relative mb-4 ${isDarkMode ? 'bg-black/50' : 'bg-slate-900'}`}>
              <textarea
                readOnly
                value={generatedPrompt || "Tulis topik di kiri, prompt akan muncul otomatis di sini..."}
                className="w-full h-32 bg-transparent text-slate-300 text-sm font-mono focus:outline-none resize-none"
              />
              <button
                onClick={handleCopy}
                className="absolute bottom-3 right-3 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                {showToast ? <Check size={16} /> : <Copy size={16} />}
                {showToast ? 'Tersalin!' : 'Salin Prompt'}
              </button>
            </div>

            {/* --- GENERATE IMAGE SECTION (NEW) --- */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={handleGenerateImage}
                    disabled={!generatedPrompt || isGeneratingImage}
                    className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isGeneratingImage 
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                    }`}
                >
                    {isGeneratingImage ? (
                        <>
                           <Loader2 size={20} className="animate-spin" />
                           <span>Sedang Merender ({imageSize === '1K' ? 'Flash' : 'Pro'})...</span>
                        </>
                    ) : (
                        <>
                           <PhotoIcon size={20} />
                           <span>GENERATE INFOGRAPHIC ({imageSize === '1K' ? 'Standard' : 'Gemini 3 Pro'})</span>
                        </>
                    )}
                </button>
                
                {genError && (
                    <ErrorPopup 
                      message={genError} 
                      onClose={() => setGenError(null)} 
                      onRetry={handleGenerateImage} 
                    />
                )}

                {resultImage && (
                    <div className="mt-4 animate-fade-in space-y-3">
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md">
                            <img src={resultImage} alt="Result" className="w-full h-auto" />
                        </div>
                        <a 
                            href={resultImage} 
                            download={`infografis-${Date.now()}.png`}
                            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Download size={18} /> Unduh Hasil HD
                        </a>
                    </div>
                )}
            </div>
          </section>

          {/* History */}
          {history.length > 0 && (
            <section className={`${cardBg} ${cardBorder} p-5 rounded-2xl shadow-sm border`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Riwayat Remix</h3>
                <button onClick={() => setHistory([])} className="text-xs text-rose-500 hover:underline">Hapus Semua</button>
              </div>
              <div className="space-y-3">
                {history.map((prompt, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-xs line-clamp-2 hover:line-clamp-none cursor-pointer transition-all ${
                    isDarkMode 
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' 
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                  }`}>
                    {prompt}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};