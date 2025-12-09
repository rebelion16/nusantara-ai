
import React, { useState, useEffect } from 'react';
import { 
  Copy, RefreshCw, Sparkles, Zap, Layout, Palette, Image as ImageIcon, 
  Monitor, ChevronDown, Check, Wand2, CloudRain, MapPin, Loader2, 
  CloudLightning, Sun, Cloud, ArrowRight, Type, PenTool, Calendar, 
  Users, Target, Search, List, Download, ImageIcon as PhotoIcon, 
  Gauge, X, Settings, Layers, Sliders 
} from 'lucide-react';
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

// --- HELPER COMPONENTS ---

const Dropdown = ({ label, icon: Icon, options, value, onChange, isDarkMode }: any) => (
  <div>
      <div className={`flex items-center gap-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {Icon && <Icon size={12} />} {label}
      </div>
      <div className="relative">
          <select 
              value={value.id}
              onChange={(e) => onChange(options.find((o: any) => o.id === e.target.value))}
              className={`w-full p-2.5 text-xs rounded-lg border appearance-none outline-none focus:ring-2 focus:ring-opacity-50 transition-all font-medium ${
                  isDarkMode 
                  ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-900' 
                  : 'bg-white border-slate-200 text-slate-700 focus:border-blue-300 focus:ring-blue-100'
              }`}
          >
              {options.map((o: any) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} className={`absolute right-3 top-3 pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
      </div>
  </div>
);

const TabButton = ({ active, label, onClick, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            active 
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' 
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
        {Icon && <Icon size={14}/>} {label}
    </button>
);

// --- MAIN MODULE ---

export const InfografisModule: React.FC = () => {
  // Sync Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // UI Tabs
  const [configTab, setConfigTab] = useState<'visual' | 'context'>('visual');

  const [isWeatherMode, setIsWeatherMode] = useState(false);
  
  // Inputs
  const [topic, setTopic] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  
  // Weather Specific
  const [selectedCity, setSelectedCity] = useState(INDONESIAN_CITIES[0]);
  const [isManualCityInput, setIsManualCityInput] = useState(false);
  const [realTimeWeather, setRealTimeWeather] = useState<any>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  
  // Selections
  const [selectedType, setSelectedType] = useState(INFO_TYPES[0]);
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[2]);
  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[1]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]); 
  const [selectedTone, setSelectedTone] = useState(WRITING_STYLES[0]);
  const [selectedTarget, setSelectedTarget] = useState(TARGET_AUDIENCES[0]);
  const [selectedGoal, setSelectedGoal] = useState(INFOGRAPHIC_GOALS[0]);
  
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [imageSize, setImageSize] = useState('2K'); 
  const [promptFormat, setPromptFormat] = useState('gemini'); 

  // Generation
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For Magic Enhance
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false); // For Image Generation
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentDate(getIndonesianDate());
  }, []);

  // Fetch Weather Logic
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
              throw new Error("Kota tidak ditemukan");
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
          console.error("Gagal ambil cuaca:", error);
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
  }, [topic, selectedType, selectedStyle, selectedPalette, aspectRatio, promptFormat, selectedCity, realTimeWeather, isWeatherMode, manualPrompt, selectedFont, selectedTone, selectedTarget, selectedGoal]);

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

    const styleDetails = `Art Style: ${selectedStyle.keyword}. Lighting: ${selectedStyle.lighting}. Materials: High fidelity textures.`;
    const colorDetails = `Color Palette: ${selectedPalette.keyword}. Visual Hierarchy: Use color to distinguish key data points.`;
    const fontDetails = selectedFont.id !== 'auto' ? ` Typography: ${selectedFont.keyword}.` : '';
    const toneDetails = selectedTone.id !== 'auto' ? ` Tone: ${selectedTone.keyword}.` : '';
    const targetDetails = !isWeatherMode ? ` Target Audience: ${selectedTarget.keyword}. Goal: ${selectedGoal.keyword}.` : '';

    const manualInjection = manualPrompt ? ` CUSTOM INSTRUCTIONS: ${manualPrompt}.` : '';
    
    if (promptFormat === 'midjourney') {
        base = `/imagine prompt: ${topicDescription} ${layoutDetails} ${styleDetails} ${colorDetails} ${fontDetails} ${manualInjection} ${aspectRatio.value} --v 6.0`;
    } else if (promptFormat === 'dalle') {
        base = `Create a high quality infographic. ${topicDescription} ${layoutDetails} ${styleDetails} ${colorDetails} ${manualInjection}`;
    } else {
        base = `**Subject:** ${topic || (isWeatherMode ? selectedCity : 'Topic')}\n**Description:** ${topicDescription}\n**Format:** ${selectedType.label} (${isWeatherMode ? 'Map' : selectedType.details})\n**Style:** ${selectedStyle.label}\n**Visual Keywords:** ${selectedStyle.keyword}\n**Color Scheme:** ${selectedPalette.label} (${selectedPalette.keyword})\n**Typography:** ${selectedFont.label}\n**Target:** ${selectedTarget.label}\n**Aspect Ratio:** ${aspectRatio.label}\n**Custom Instructions:** ${manualPrompt || 'None'}\n\n**Detailed Directive:**\nPlease generate a highly detailed and data-rich visualization. The layout should strictly follow the logic of a ${isWeatherMode ? 'Meteorological Map' : selectedType.label}. Use the specified art style to create a unique aesthetic. Ensure the background provides good contrast for the data elements.`;
    }

    setGeneratedPrompt(base);
  };

  const activateGeminiMagic = async () => {
    setIsProcessing(true);
    try {
        const baseTopic = topic || (isWeatherMode ? `Cuaca ${selectedCity}` : 'Infografis Umum');
        let promptContext = `Buatkan konsep visual infografis yang sangat detail, kreatif, dan profesional tentang: ${baseTopic}. Target audiens: ${selectedTarget.label}. Gaya: ${selectedStyle.label}.`;
        
        if (manualPrompt && manualPrompt.trim().length > 0) {
             promptContext += `\n\n[PENTING] Instruksi Tambahan User: "${manualPrompt}". Pastikan instruksi ini diintegrasikan dengan baik ke dalam deskripsi visual.`;
        }

        const refinedTopic = await refineUserPrompt(promptContext);
        setManualPrompt(refinedTopic);
        
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
      const ar = aspectRatio.id;
      const result = await generateCreativeImage(generatedPrompt, null, ar, imageSize);
      setResultImage(result);
    } catch (e: any) {
      console.error(e);
      setGenError(e.message || "Gagal membuat infografis.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
          <div className="relative z-10 text-center md:text-left w-full md:w-auto">
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 tracking-tight">Infografis Builder</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-lg mx-auto md:mx-0">
                  Visualisasikan data kompleks menjadi karya seni informatif dalam hitungan detik dengan AI Generatif.
              </p>
          </div>
          <button 
                onClick={toggleWeatherMode}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md z-10 ${
                    isWeatherMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-200 dark:ring-blue-900' 
                    : `bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600`
                }`}
            >
                {isWeatherMode ? <><ArrowRight size={16} /> Kembali ke Mode Normal</> : <><CloudRain size={16} /> Mode Peta Cuaca</>}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT SIDEBAR: CONFIGURATION --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. TOPIC & MODE */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 relative overflow-hidden">
             {isWeatherMode ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between font-bold border-b border-blue-100 dark:border-blue-900/50 pb-3 mb-2 text-blue-600 dark:text-blue-400">
                        <div className="flex items-center gap-2"><CloudRain size={18} /> Data Cuaca Real-Time</div>
                        {isLoadingWeather && <Loader2 size={14} className="animate-spin"/>}
                    </div>
                    
                    {/* City Selector */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400 mb-1">
                            <span>Lokasi Target</span>
                            <button onClick={() => { setIsManualCityInput(!isManualCityInput); if(!isManualCityInput) setSelectedCity(''); else setSelectedCity(INDONESIAN_CITIES[0]); }} className="text-blue-500 hover:underline">
                                {isManualCityInput ? "Pilih Daftar" : "Input Manual"}
                            </button>
                        </div>
                        {isManualCityInput ? (
                            <div className="relative">
                                <input type="text" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} placeholder="Ketik nama kota..." className="w-full p-3 rounded-xl bg-blue-50 dark:bg-gray-900 border border-blue-100 dark:border-gray-700 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                                <Search size={14} className="absolute right-3 top-3.5 text-gray-400"/>
                            </div>
                        ) : (
                            <div className="relative">
                                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full p-3 rounded-xl bg-blue-50 dark:bg-gray-900 border border-blue-100 dark:border-gray-700 text-sm font-bold appearance-none outline-none dark:text-white">
                                    {INDONESIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400"/>
                            </div>
                        )}
                    </div>

                    {/* Weather Card */}
                    <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                            {isLoadingWeather ? <Loader2 className="animate-spin"/> : (realTimeWeather?.desc.includes('Cerah') ? <Sun /> : <Cloud />)}
                        </div>
                        <div>
                            <div className="text-xs opacity-80 font-mono mb-1">LIVE DATA • {currentDate}</div>
                            {realTimeWeather ? (
                                <div>
                                    <div className="text-2xl font-black">{realTimeWeather.temp}°C</div>
                                    <div className="text-xs font-medium">{realTimeWeather.desc}</div>
                                </div>
                            ) : <span className="text-xs italic opacity-70">Menunggu data...</span>}
                        </div>
                    </div>
                </div>
             ) : (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Topik Utama</label>
                    <div className="relative">
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Contoh: Manfaat Kopi, Sejarah Batik, Roadmap Bisnis..."
                            className="w-full p-4 h-28 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none dark:text-white placeholder-gray-400"
                        />
                        {topic && (
                            <button onClick={() => setTopic('')} className="absolute top-2 right-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
             )}
          </div>

          {/* 2. CONFIGURATION TABS */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
             <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-5">
                <TabButton active={configTab === 'visual'} label="Visual & Gaya" onClick={() => setConfigTab('visual')} icon={Palette} />
                <TabButton active={configTab === 'context'} label="Konteks & Strategi" onClick={() => setConfigTab('context')} icon={Target} />
             </div>

             <div className="space-y-4 animate-fade-in">
                {configTab === 'visual' ? (
                    <>
                        {!isWeatherMode && (
                            <Dropdown label="Tipe Infografis" icon={Layout} options={INFO_TYPES} value={selectedType} onChange={setSelectedType} isDarkMode={isDarkMode} />
                        )}
                        <Dropdown label="Gaya Artistik" icon={ImageIcon} options={ART_STYLES} value={selectedStyle} onChange={setSelectedStyle} isDarkMode={isDarkMode} />
                        <Dropdown label="Palet Warna" icon={Palette} options={COLOR_PALETTES} value={selectedPalette} onChange={setSelectedPalette} isDarkMode={isDarkMode} />
                        <Dropdown label="Tipografi" icon={Type} options={FONTS} value={selectedFont} onChange={setSelectedFont} isDarkMode={isDarkMode} />
                    </>
                ) : (
                    <>
                        <Dropdown label="Gaya Bahasa" icon={PenTool} options={WRITING_STYLES} value={selectedTone} onChange={setSelectedTone} isDarkMode={isDarkMode} />
                        <Dropdown label="Target Audiens" icon={Users} options={TARGET_AUDIENCES} value={selectedTarget} onChange={setSelectedTarget} isDarkMode={isDarkMode} />
                        <Dropdown label="Tujuan Visual" icon={Target} options={INFOGRAPHIC_GOALS} value={selectedGoal} onChange={setSelectedGoal} isDarkMode={isDarkMode} />
                    </>
                )}
             </div>
          </div>

          {/* 3. MAGIC ACTION */}
          <button 
                onClick={activateGeminiMagic}
                disabled={(!isWeatherMode && !topic) || isProcessing}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                    isProcessing 
                    ? 'bg-gray-400 cursor-wait' 
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-indigo-500/30'
                }`}
            >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 />}
                <span>{isProcessing ? 'AI Sedang Berpikir...' : '✨ Magic Enhance Prompt'}</span>
          </button>

        </div>

        {/* --- RIGHT MAIN: PREVIEW & EXECUTE --- */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* 1. TOOLBAR */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                    {['gemini', 'midjourney', 'dalle'].map((m) => (
                        <button 
                            key={m} onClick={() => setPromptFormat(m)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${promptFormat === m ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <select value={aspectRatio.id} onChange={(e) => setAspectRatio(ASPECT_RATIOS.find(ar => ar.id === e.target.value) || ASPECT_RATIOS[0])} className="text-xs font-bold p-2 bg-gray-100 dark:bg-gray-900 rounded-lg border border-transparent hover:border-gray-300 dark:hover:border-gray-600 outline-none dark:text-white cursor-pointer">
                        {ASPECT_RATIOS.map(ar => <option key={ar.id} value={ar.id}>{ar.label}</option>)}
                    </select>
                    <select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className="text-xs font-bold p-2 bg-gray-100 dark:bg-gray-900 rounded-lg border border-transparent hover:border-gray-300 dark:hover:border-gray-600 outline-none dark:text-white cursor-pointer">
                        <option value="1K">Standard (1K)</option>
                        <option value="2K">High Res (2K)</option>
                        <option value="4K">Ultra (4K)</option>
                    </select>
                </div>
            </div>

            {/* 2. PROMPT TERMINAL & MANUAL OVERRIDE */}
            <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-2xl relative group overflow-hidden">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">PROMPT TERMINAL</span>
                    <button onClick={handleCopy} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                        {showToast ? <Check size={12}/> : <Copy size={12}/>} {showToast ? 'Copied' : 'Copy'}
                    </button>
                </div>
                
                <textarea 
                    readOnly 
                    value={generatedPrompt || "// Prompt akan muncul di sini setelah konfigurasi..."}
                    className="w-full h-32 bg-transparent text-green-400 font-mono text-xs leading-relaxed focus:outline-none resize-none mb-4"
                />

                <div className="relative mt-2 pt-4 border-t border-slate-800 border-dashed">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2"><Settings size={10}/> Manual Override</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={manualPrompt}
                            onChange={(e) => setManualPrompt(e.target.value)}
                            placeholder="Tambahkan detail khusus (cth: jangan pakai warna merah, tambah logo)..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                        {manualPrompt && <button onClick={() => setManualPrompt('')} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-red-400"><X size={14}/></button>}
                    </div>
                </div>
            </div>

            {/* 3. GENERATE BUTTON */}
            <button
                onClick={handleGenerateImage}
                disabled={!generatedPrompt || isGeneratingImage}
                className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] group ${
                    isGeneratingImage 
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-wait' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25'
                }`}
            >
                {isGeneratingImage ? (
                    <>
                        <Loader2 className="animate-spin" size={24} />
                        <span className="tracking-widest">RENDERING...</span>
                    </>
                ) : (
                    <>
                        <PhotoIcon size={24} className="group-hover:scale-110 transition-transform"/>
                        <span className="tracking-widest">GENERATE INFOGRAPHIC ({imageSize})</span>
                    </>
                )}
            </button>

            {genError && (
                <ErrorPopup message={genError} onClose={() => setGenError(null)} onRetry={handleGenerateImage} />
            )}

            {/* 4. RESULT CANVAS */}
            {resultImage && (
                <div className="bg-gray-100 dark:bg-gray-900 rounded-3xl p-2 border border-gray-200 dark:border-gray-800 animate-fade-in shadow-inner">
                    <div className="rounded-2xl overflow-hidden shadow-2xl relative group">
                        <img src={resultImage} alt="Result" className="w-full h-auto" />
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                            <a 
                                href={resultImage} 
                                download={`infografis-${Date.now()}.png`}
                                className="px-6 py-3 bg-white text-gray-900 font-bold rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                <Download size={20}/> Download HD
                            </a>
                            <button 
                                onClick={() => window.open(resultImage, '_blank')}
                                className="p-3 bg-white/20 text-white rounded-full backdrop-blur hover:bg-white/40 transition-colors"
                            >
                                <Monitor size={20}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Chips */}
            {history.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide opacity-60 hover:opacity-100 transition-opacity">
                    {history.map((h, i) => (
                        <div key={i} className="flex-shrink-0 max-w-[200px] text-[10px] bg-gray-100 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 truncate cursor-help" title={h}>
                            {h}
                        </div>
                    ))}
                </div>
            )}

        </div>

      </div>
    </div>
  );
};
