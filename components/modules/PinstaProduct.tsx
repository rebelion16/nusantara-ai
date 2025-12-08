
import React, { useState, useEffect } from 'react';
import { GeneratorModule } from '../GeneratorModule';
import { generateVeoVideo } from '../../services/geminiService';
import { Copy, RefreshCw, Sparkles, Zap, Layout, Palette, Image as ImageIcon, Monitor, ChevronDown, Check, Wand2, CloudRain, MapPin, Loader2, CloudLightning, Sun, Cloud, ArrowRight, Type, PenTool, Calendar, Users, Target, Search, List, Download, ImageIcon as PhotoIcon, Gauge, X, Video, Film, Camera, MessageSquare } from 'lucide-react';
import { generateCreativeImage, refineUserPrompt } from '../../services/geminiService';
import { ErrorPopup } from '../ErrorPopup';

// --- DATA CONSTANTS ---

const BACKGROUNDS = [
  { id: 'white', name: 'Minimal White' },
  { id: 'marble', name: 'Luxury Marble' },
  { id: 'wood', name: 'Scandinavian Wood' },
  { id: 'pastel', name: 'Soft Pastel' },
  { id: 'dark', name: 'Moody Dark' },
  { id: 'fabric', name: 'Elegant Fabric' },
  { id: 'silk', name: 'Kain Sutra Mewah' },
  { id: 'podium', name: 'Podium Geometris' },
  { id: 'water', name: 'Permukaan Air (Ripples)' },
  { id: 'on-table', name: 'Di Atas Meja' },
  { id: 'on-rock', name: 'Di Atas Batu Alam' },
  { id: 'on-grass', name: 'Di Atas Rumput' },
  { id: 'beach-sand', name: 'Pasir Pantai' },
  { id: 'concrete-wall', name: 'Tembok Beton' },
  { id: 'cafe-vibe', name: 'Suasana Kafe' },
  { id: 'kitchen', name: 'Dapur Modern' },
  { id: 'desk', name: 'Meja Kerja / Kantor' },
  { id: 'shelf', name: 'Rak Kayu Estetik' },
  { id: 'urban', name: 'Jalanan Kota (Urban)' },
  { id: 'sky', name: 'Langit Biru Cerah' },
  { id: 'in-nature', name: 'Di Alam (Hutan)' }
];

const EFFECTS = [
  { id: 'soft-light', name: 'Cahaya Natural Lembut' },
  { id: 'dramatic', name: 'Bayangan Dramatis' },
  { id: 'golden-hour', name: 'Golden Hour' },
  { id: 'studio', name: 'Pencahayaan Studio' },
  { id: 'backlit', name: 'Backlit Glow' },
  { id: 'rembrandt', name: 'Rembrandt Lighting' },
  { id: 'noir', name: 'Product Noir (Gelap)' },
  { id: 'ring-light', name: 'Ring Light (Beauty)' }
];

const CATEGORIES = [
  { id: 'skincare', name: 'Skincare / Kosmetik' },
  { id: 'fashion', name: 'Fashion / Aksesoris' },
  { id: 'food', name: 'Makanan / Minuman' },
  { id: 'toys', name: 'Mainan / Hobi (Toys)' },
  { id: 'electronics', name: 'Gadget / Elektronik' },
  { id: 'jewelry', name: 'Perhiasan' },
  { id: 'home', name: 'Dekorasi Rumah' },
  { id: 'shoes', name: 'Sepatu / Alas Kaki' },
  { id: 'automotive', name: 'Otomotif / Sparepart' },
  { id: 'health', name: 'Kesehatan / Herbal' },
  { id: 'sports', name: 'Olahraga / Gym' }
];

const ANGLES = [
  { id: 'front', name: 'Tampak Depan' },
  { id: '45-degree', name: 'Sudut 45 Derajat' },
  { id: 'top-down', name: 'Flat Lay (Dari Atas)' },
  { id: 'side', name: 'Tampak Samping' },
  { id: 'macro', name: 'Macro Close-up' },
  { id: 'lifestyle', name: 'Konteks Lifestyle' },
  { id: 'low-angle', name: 'Low Angle (Heroic)' },
  { id: 'held-by-hand', name: 'Dipegang Tangan' }
];

const STYLES = [
  { id: 'minimalist', name: 'Minimalis' },
  { id: 'luxury', name: 'Mewah / Elegan' },
  { id: 'vintage', name: 'Vintage / Retro' },
  { id: 'modern', name: 'Modern Clean' },
  { id: 'organic', name: 'Organik / Natural' },
  { id: 'pop-art', name: 'Pop Art / Warna Warni' },
  { id: 'kawaii', name: 'Cute / Kawaii (Pastel)' },
  { id: 'rustic', name: 'Rustic / Pedesaan' },
  { id: 'ethereal', name: 'Ethereal / Dreamy' },
  { id: 'futuristic', name: 'Futuristik' },
  { id: 'neon', name: 'Neon Glow' },
  { id: 'industrial', name: 'Industrial' }
];

// Try-On Data
const LOCATIONS = [
  '✨ Otomatis',
  'Studio Foto', 'Kamar Tidur', 'Ruang Tamu', 'Dapur', 
  'Outdoor (Taman)', 'Jalanan Kota', 'Pantai', 'Kafe', 'Gym/Fitness Center', 'Mall', '✎ Input Manual'
];

const POSES = [
  '✨ Otomatis',
  'Berdiri Tegak', 'Berjalan (Walking)', 'Duduk Santai', 
  'Tangan di Pinggul', 'Melihat ke Samping', 'Close-up Wajah', 
  'Bersandar', 'Tangan di Saku', 'Pose Dinamis', 'Memegang Produk', 'Duduk di Lantai'
];

const TRY_ON_CONCEPTS = [
  '✨ Auto (AI Choice)',
  'Street Style Candid (Urban & Trendy)',
  'Studio Clean Look (Professional & Sharp)',
  'Editorial High Fashion (Magazine Style)',
  'Golden Hour Lifestyle (Warm & Emotional)',
  'Minimalist Aesthetic (Soft & Clean)',
  'Urban Grunge (Edgy & Cool)',
  'Bohemian Nature (Earthy & Free)',
  'Luxury Indoor (Elegant & Classy)',
  'Cyberpunk Neon (Futuristic & Bold)',
  'Vintage Film Look (Retro & Grainy)',
  'Casual Daily Wear (Relaxed & Natural)',
  'Sporty / Athleisure (Active & Dynamic)',
  'Ethereal Dreamy (Soft Focus & Magical)',
  'Monochrome Chic (Black & White)'
];

const CONCEPT_DEFAULTS: Record<string, { location: string, pose: string }> = {
  'Street Style Candid (Urban & Trendy)': { location: 'Jalanan Kota', pose: 'Berjalan (Walking)' },
  'Studio Clean Look (Professional & Sharp)': { location: 'Studio Foto', pose: 'Berdiri Tegak' },
  'Editorial High Fashion (Magazine Style)': { location: 'Studio Foto', pose: 'Pose Dinamis' },
  'Golden Hour Lifestyle (Warm & Emotional)': { location: 'Outdoor (Taman)', pose: 'Duduk Santai' },
  'Minimalist Aesthetic (Soft & Clean)': { location: 'Studio Foto', pose: 'Berdiri Tegak' },
  'Urban Grunge (Edgy & Cool)': { location: 'Jalanan Kota', pose: 'Bersandar' },
  'Bohemian Nature (Earthy & Free)': { location: 'Outdoor (Taman)', pose: 'Duduk di Lantai' },
  'Luxury Indoor (Elegant & Classy)': { location: 'Ruang Tamu', pose: 'Duduk Santai' },
  'Cyberpunk Neon (Futuristic & Bold)': { location: 'Jalanan Kota', pose: 'Pose Dinamis' },
  'Vintage Film Look (Retro & Grainy)': { location: 'Kafe', pose: 'Duduk Santai' },
  'Casual Daily Wear (Relaxed & Natural)': { location: 'Kamar Tidur', pose: 'Duduk Santai' },
  'Sporty / Athleisure (Active & Dynamic)': { location: 'Gym/Fitness Center', pose: 'Pose Dinamis' },
  'Ethereal Dreamy (Soft Focus & Magical)': { location: 'Outdoor (Taman)', pose: 'Close-up Wajah' },
  'Monochrome Chic (Black & White)': { location: 'Studio Foto', pose: 'Tangan di Saku' },
};

// Poster Data
const POSTER_STYLES = [
  { id: 'umkm', name: 'Street Food / UMKM' },
  { id: 'fresh', name: 'Minuman Segar (Fresh)' },
  { id: 'luxury', name: 'Luxury & Premium' },
  { id: 'dramatic', name: 'Dramatis / Gelap' },
  { id: 'cinematic', name: 'Sinematik' },
  { id: 'tech', name: 'Tech & Futuristic' },
  { id: 'clean-minimal', name: 'Clean & Minimalist' },
  { id: 'tropical', name: 'Summer / Tropical' },
  { id: 'cyberpunk', name: 'Neon Cyberpunk' },
  { id: 'playful', name: 'Playful / Anak-anak' }
];

const COLOR_PALETTES = [
  { id: 'vibrant', name: 'Vibrant Pop (Merah/Kuning)' },
  { id: 'pastel', name: 'Soft Pastel (Pink/Biru Muda)' },
  { id: 'monochrome', name: 'Monokrom (Hitam/Putih)' },
  { id: 'gold_navy', name: 'Mewah (Emas & Navy)' },
  { id: 'nature', name: 'Natural (Hijau/Cokelat)' },
  { id: 'minimal', name: 'Minimal (Putih Bersih)' },
  { id: 'dark', name: 'Dark Mode (Hitam/Abu)' }
];

// Video Constants
const CAMERA_MOTIONS = [
  'Zoom In (Perlahan mendekat)',
  'Zoom Out (Perlahan menjauh)',
  'Pan Left (Geser Kiri)',
  'Pan Right (Geser Kanan)',
  'Orbit / Rotate (Berputar Mengelilingi)',
  'Handheld Shake (Kamera Tangan Natural)',
  'Tilt Up (Dongak ke Atas)',
  'Static (Diam / Fokus Gerakan Objek)'
];

const VIDEO_EFFECTS = [
  '✨ Auto (AI Choice)',
  'Cinematic Slow Motion',
  'Particle Dust (Debu Partikel)',
  'Light Leaks (Bocoran Cahaya)',
  'Bokeh Pulse (Fokus Berubah)',
  'Foggy / Misty (Berkabut)',
  'Ethereal Glow (Cahaya Surgawi)',
  'Vintage Film Grain',
  'No Effect (Clean)'
];

export const PinstaProductModule: React.FC = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'photo' | 'try-on' | 'poster'>('photo');
  
  // Common
  const [productName, setProductName] = useState('');

  // Photo Mode
  const [bg, setBg] = useState(BACKGROUNDS[0].id);
  const [effect, setEffect] = useState(EFFECTS[0].id);
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [angle, setAngle] = useState(ANGLES[0].id);
  const [style, setStyle] = useState(STYLES[0].id);

  // Try-On Mode
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [manualLocation, setManualLocation] = useState('');
  const [pose, setPose] = useState(POSES[0]);
  const [tryOnConcept, setTryOnConcept] = useState(TRY_ON_CONCEPTS[0]);

  // Poster Mode
  const [posterTitle, setPosterTitle] = useState('');
  const [posterTagline, setPosterTagline] = useState('');
  const [posterPrice, setPosterPrice] = useState('');
  const [posterPromo, setPosterPromo] = useState('');
  const [posterCTA, setPosterCTA] = useState('');
  const [posterStyle, setPosterStyle] = useState(POSTER_STYLES[0].id);
  const [colorPalette, setColorPalette] = useState(COLOR_PALETTES[0].id);
  
  // Contacts State
  const [contacts, setContacts] = useState({
    wa: '',
    tiktok: '',
    telegram: '',
    shopee: '',
    facebook: '',
    instagram: ''
  });

  // Benefits State
  const [benefits, setBenefits] = useState(['', '', '']);

  const [promptPrefix, setPromptPrefix] = useState('');

  // Video Generation State
  const [videoMotion, setVideoMotion] = useState(CAMERA_MOTIONS[0]);
  const [videoEffect, setVideoEffect] = useState(VIDEO_EFFECTS[0]);
  const [videoManualEffect, setVideoManualEffect] = useState('');
  const [videoDialogue, setVideoDialogue] = useState('');
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // --- AUTO LOGIC FOR TRY-ON ---
  useEffect(() => {
    if (activeTab === 'try-on') {
        const defaults = CONCEPT_DEFAULTS[tryOnConcept];
        if (defaults) {
            setLocation(defaults.location);
            setPose(defaults.pose);
        } else {
            // Default reset if concept is generic or not in map
            setLocation(LOCATIONS[0]); // Auto
            setPose(POSES[0]); // Auto
        }
    }
  }, [tryOnConcept, activeTab]);

  // --- HANDLERS ---
  const handleContactChange = (field: keyof typeof contacts, value: string) => {
    setContacts(prev => ({ ...prev, [field]: value }));
  };

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...benefits];
    newBenefits[index] = value;
    setBenefits(newBenefits);
  };

  const addBenefitField = () => {
    setBenefits([...benefits, '']);
  };

  const handleProductIdea = async () => {
    const product = productName || 'produk';
    let type = 'fotografi produk';
    
    if (activeTab === 'try-on') type = 'fotografi model fashion (try-on)';
    else if (activeTab === 'poster') type = 'desain poster iklan komersial';

    // Seed text to guide the refining process towards a specific idea structure
    const seedInput = `Buatkan ide konsep ${type} untuk ${product} yang sangat realistis, estetik, dan menjual. Sertakan detail setting dan mood.`;
    
    // We use refineUserPrompt to generate the idea based on the seed
    return await refineUserPrompt(seedInput);
  };

  // --- PROMPT LOGIC ---
  useEffect(() => {
    const productText = productName ? `Produk: ${productName}.` : 'Produk utama dalam gambar.';

    if (activeTab === 'photo') {
      const bgName = BACKGROUNDS.find(b => b.id === bg)?.name;
      const effName = EFFECTS.find(e => e.id === effect)?.name;
      const catName = CATEGORIES.find(c => c.id === category)?.name;
      const angName = ANGLES.find(a => a.id === angle)?.name;
      const styName = STYLES.find(s => s.id === style)?.name;

      setPromptPrefix(
        `Fotografi Produk Profesional Kualitas Tinggi (8K). ${productText}
        Kategori: ${catName}.
        Gaya Visual: ${styName}.
        Latar Belakang: ${bgName}.
        Pencahayaan: ${effName}.
        Sudut Kamera: ${angName}.
        Pastikan produk terlihat sangat jelas, tajam, dan menarik secara komersial. Fokus penuh pada detail produk.`
      );

    } else if (activeTab === 'try-on') {
      let locText = location;
      if (location === '✎ Input Manual') locText = manualLocation;
      else if (location === '✨ Otomatis') locText = `Automatically selected to perfectly match the '${tryOnConcept}' theme`;

      let poseText = pose;
      if (pose === '✨ Otomatis') poseText = `Natural and attractive pose suitable for '${tryOnConcept}'`;
      
      setPromptPrefix(
        `Fotografi Model Fashion Profesional. ${productText}
        Instruksi Utama: Pakaikan produk (Gambar 1) pada Model (Gambar 2).
        Konsep Visual: ${tryOnConcept}.
        Lokasi: ${locText}.
        Pose: ${poseText}.
        
        ATURAN WAJAH: Wajib mempertahankan 100% identitas wajah dari Gambar Referensi (Gambar 2). Jangan ubah fitur wajah.
        Pastikan produk menempel pada tubuh model secara natural dan realistis.`
      );

    } else if (activeTab === 'poster') {
      const pStyle = POSTER_STYLES.find(s => s.id === posterStyle)?.name;
      const pColor = COLOR_PALETTES.find(c => c.id === colorPalette)?.name;

      // Construct Benefits Text
      const benefitsText = benefits.filter(b => b.trim()).map((b, i) => `${i+1}. ${b}`).join(', ');
      
      // Construct Contacts Text with Icon Instructions
      const contactsList = [];
      if (contacts.wa) contactsList.push(`[Logo WhatsApp] ${contacts.wa}`);
      if (contacts.tiktok) contactsList.push(`[Logo TikTok] ${contacts.tiktok}`);
      if (contacts.telegram) contactsList.push(`[Logo Telegram] ${contacts.telegram}`);
      if (contacts.shopee) contactsList.push(`[Logo Shopee] ${contacts.shopee}`);
      if (contacts.facebook) contactsList.push(`[Logo Facebook] ${contacts.facebook}`);
      if (contacts.instagram) contactsList.push(`[Logo Instagram] ${contacts.instagram}`);
      const contactsText = contactsList.join(' | ');

      setPromptPrefix(
        `Desain Poster Iklan Komersial Profesional. ${productText}
        Gaya Desain: ${pStyle}.
        Palet Warna Dominan: ${pColor}.
        
        Elemen Teks Wajib (RENDER TEKS DENGAN EJAAN YANG SEMPURNA DAN JELAS):
        - JUDUL BESAR: "${posterTitle || 'PRODUK BARU'}"
        - TAGLINE: "${posterTagline}"
        - HARGA: "${posterPrice}"
        - PROMO: "${posterPromo}"
        - CTA (Call To Action): "${posterCTA}"
        
        ${benefitsText ? `Poin Keunggulan (List): ${benefitsText}` : ''}
        
        ${contactsText ? `Kontak & Sosial Media (Wajib tampilkan Ikon Logo Kecil + Teks): ${contactsText}` : ''}
        
        Komposisi: Produk harus menjadi fokus utama di tengah atau area strategis. Teks harus terbaca jelas, font modern dan tebal. Desain harus memenuhi seluruh frame tanpa area kosong.`
      );
    }
  }, [
    activeTab, productName, 
    bg, effect, category, angle, style,
    location, manualLocation, pose, tryOnConcept,
    posterTitle, posterTagline, posterPrice, posterPromo, posterCTA, posterStyle, colorPalette,
    contacts, benefits
  ]);

  // --- UI HELPERS ---
  const renderSelector = (label: string, value: string, setValue: any, options: any[]) => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
      <select 
        value={value} onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-xs dark:text-white outline-none"
      >
        {options.map(opt => (
          <option key={opt.id || opt} value={opt.id || opt}>{opt.name || opt}</option>
        ))}
      </select>
    </div>
  );

  const extraControls = (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('photo')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'photo' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          📸 Foto Produk
        </button>
        <button
          onClick={() => setActiveTab('try-on')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'try-on' ? 'bg-white dark:bg-gray-700 text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          👗 Model Try-On
        </button>
        <button
          onClick={() => setActiveTab('poster')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'poster' ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          💡 Poster Iklan
        </button>
      </div>

      {/* Common Input */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-500 uppercase">Nama Produk (Untuk Konteks AI)</label>
        <input 
          type="text" 
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Cth: Sepatu Lari Merah, Serum Wajah..."
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-sm dark:text-white outline-none focus:border-emerald-500"
        />
      </div>

      {/* Mode Specific Controls */}
      <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
        
        {activeTab === 'photo' && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            {renderSelector('Kategori', category, setCategory, CATEGORIES)}
            {renderSelector('Gaya Visual', style, setStyle, STYLES)}
            {renderSelector('Latar Belakang', bg, setBg, BACKGROUNDS)}
            {renderSelector('Pencahayaan', effect, setEffect, EFFECTS)}
            {renderSelector('Sudut Pengambilan', angle, setAngle, ANGLES)}
          </div>
        )}

        {activeTab === 'try-on' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              ℹ️ Upload foto produk di <b>Subjek 1</b>. Upload foto model di <b>Model Referensi</b>.
            </div>
            
            {/* Concept Selection - Moved to Top */}
            {renderSelector('Konsep Foto', tryOnConcept, setTryOnConcept, TRY_ON_CONCEPTS)}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Lokasi</label>
                <select 
                  value={location} onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-xs dark:text-white"
                >
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {location === '✎ Input Manual' && (
                  <input 
                    type="text" value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} placeholder="Lokasi..."
                    className="mt-1 w-full rounded-md border border-gray-300 bg-transparent p-2 text-xs"
                  />
                )}
              </div>
              
              {renderSelector('Pose Model', pose, setPose, POSES)}
            </div>
          </div>
        )}

        {activeTab === 'poster' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Judul Poster</label>
                <input 
                  type="text" value={posterTitle} onChange={(e) => setPosterTitle(e.target.value)} placeholder="DISKON BESAR"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-xs dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Tagline</label>
                <input 
                  type="text" value={posterTagline} onChange={(e) => setPosterTagline(e.target.value)} placeholder="Kualitas Terbaik"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-xs dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Harga</label>
                <input 
                  type="text" value={posterPrice} onChange={(e) => setPosterPrice(e.target.value)} placeholder="Rp 99.000"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-xs dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Promo</label>
                <input 
                  type="text" value={posterPromo} onChange={(e) => setPosterPromo(e.target.value)} placeholder="Beli 1 Gratis 1"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-xs dark:text-white"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Call To Action (CTA)</label>
                <input 
                  type="text" value={posterCTA} onChange={(e) => setPosterCTA(e.target.value)} placeholder="Pesan Sekarang / Kunjungi Toko"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-xs dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               {renderSelector('Gaya Desain', posterStyle, setPosterStyle, POSTER_STYLES)}
               {renderSelector('Palet Warna', colorPalette, setColorPalette, COLOR_PALETTES)}
            </div>

            {/* BENEFITS SECTION */}
            <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Manfaat / Keunggulan Produk</label>
                {benefits.map((benefit, idx) => (
                    <input 
                        key={idx}
                        type="text"
                        value={benefit}
                        onChange={(e) => handleBenefitChange(idx, e.target.value)}
                        placeholder={`Keunggulan ${idx + 1}`}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-xs dark:text-white mb-2"
                    />
                ))}
                <button onClick={addBenefitField} className="text-xs text-purple-600 hover:underline">+ Tambah Kolom</button>
            </div>

            {/* CONTACTS SECTION */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Kontak & Sosial Media (Otomatis Tambah Logo)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-green-500 text-xs">WA</span>
                        <input type="text" value={contacts.wa} onChange={(e) => handleContactChange('wa', e.target.value)} placeholder="0812..." className="flex-1 rounded-md border border-gray-300 bg-transparent p-1.5 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-black dark:text-white text-xs">TikTok</span>
                        <input type="text" value={contacts.tiktok} onChange={(e) => handleContactChange('tiktok', e.target.value)} placeholder="@username" className="flex-1 rounded-md border border-gray-300 bg-transparent p-1.5 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400 text-xs">Tele</span>
                        <input type="text" value={contacts.telegram} onChange={(e) => handleContactChange('telegram', e.target.value)} placeholder="@username" className="flex-1 rounded-md border border-gray-300 bg-transparent p-1.5 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-orange-500 text-xs">Shopee</span>
                        <input type="text" value={contacts.shopee} onChange={(e) => handleContactChange('shopee', e.target.value)} placeholder="Nama Toko" className="flex-1 rounded-md border border-gray-300 bg-transparent p-1.5 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-pink-500 text-xs">IG</span>
                        <input type="text" value={contacts.instagram} onChange={(e) => handleContactChange('instagram', e.target.value)} placeholder="@username" className="flex-1 rounded-md border border-gray-300 bg-transparent p-1.5 text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-blue-600 text-xs">FB</span>
                        <input type="text" value={contacts.facebook} onChange={(e) => handleContactChange('facebook', e.target.value)} placeholder="Nama Halaman" className="flex-1 rounded-md border border-gray-300 bg-transparent p-1.5 text-xs" />
                    </div>
                </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );

  const handleGenerateVideo = async (imageUrl: string) => {
    setIsVideoLoading(true);
    setResultVideo(null);
    setVideoError(null);
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], "product_base.png", { type: "image/png" });

        const prompt = `Professional Product Video. 
        Motion: ${videoMotion}. 
        Visual Style: ${videoEffect !== '✨ Auto (AI Choice)' ? videoEffect : 'Cinematic'}, ${videoManualEffect}. 
        ${videoDialogue ? `Character Speaking/Dialogue: "${videoDialogue}".` : '(No Dialogue).'}
        High quality, smooth motion, commercial grade video.`;

        const videoUrl = await generateVeoVideo(prompt, "9:16", file);
        setResultVideo(videoUrl);
    } catch (e: any) {
        console.error("Video Gen Error", e);
        setVideoError(e.message || "Gagal membuat video.");
    } finally {
        setIsVideoLoading(false);
    }
  };

  const renderCustomResultActions = (imageUrl: string) => (
    <div className="w-full mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 animate-fade-in-up">
        {videoError && (
            <ErrorPopup 
                message={videoError} 
                onClose={() => setVideoError(null)} 
                onRetry={() => {
                    setVideoError(null);
                    handleGenerateVideo(imageUrl);
                }}
            />
        )}

        <div className="flex items-center gap-2 mb-3">
            <Video size={18} className="text-indigo-500"/>
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Transform to Video</h3>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Camera size={10}/> Motion Kamera</label>
                    <select 
                        value={videoMotion}
                        onChange={(e) => setVideoMotion(e.target.value)}
                        className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white"
                    >
                        {CAMERA_MOTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Film size={10}/> Efek Visual</label>
                    <select 
                        value={videoEffect}
                        onChange={(e) => setVideoEffect(e.target.value)}
                        className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white"
                    >
                        {VIDEO_EFFECTS.map(ef => <option key={ef} value={ef}>{ef}</option>)}
                    </select>
                </div>
            </div>

            <input 
                type="text"
                value={videoManualEffect}
                onChange={(e) => setVideoManualEffect(e.target.value)}
                placeholder="Efek manual tambahan (opsional)..."
                className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white"
            />

            {/* Dialogue Input - Highlighted for Try-On */}
            {activeTab === 'try-on' && (
                <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-1"><MessageSquare size={10}/> Dialog Model (Lip Sync)</label>
                    <textarea 
                        value={videoDialogue}
                        onChange={(e) => setVideoDialogue(e.target.value)}
                        placeholder="Tulis apa yang diucapkan model..."
                        className="w-full text-xs p-2 rounded border border-pink-300 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/30 dark:text-white h-16 resize-none focus:ring-1 focus:ring-pink-500"
                    />
                </div>
            )}

            <button 
                onClick={() => handleGenerateVideo(imageUrl)}
                disabled={isVideoLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
                {isVideoLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                {isVideoLoading ? 'Merender Video (Veo)...' : 'Generate Video'}
            </button>

            {resultVideo && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-black animate-fade-in">
                    <video src={resultVideo} controls autoPlay loop className="w-full h-auto" />
                    <a href={resultVideo} download={`pinsta-video-${Date.now()}.mp4`} className="block text-center py-2 bg-gray-800 text-white text-xs font-bold hover:bg-gray-900">Unduh Video MP4</a>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <GeneratorModule 
      moduleId="pinsta-product"
      title="Pinsta Produk"
      description="Tingkatkan foto produk UMKM menjadi kualitas komersial kelas atas."
      promptPrefix={promptPrefix}
      requireImage={activeTab !== 'poster'}
      mainImageLabel={activeTab === 'try-on' ? "Foto Produk (Wajib)" : "Foto Produk"}
      
      allowReferenceImage={activeTab === 'try-on'}
      referenceImageLabel="Model Referensi (Wajib)"
      
      extraControls={extraControls}
      batchModeAvailable={true}
      defaultAspectRatio="4:5"
      
      customPromptGenerator={handleProductIdea}
      
      // Inject Custom Actions for Video Generation
      renderCustomResultActions={renderCustomResultActions}
    />
  );
};
