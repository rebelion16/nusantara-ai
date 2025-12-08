
import React, { useState, useEffect } from 'react';
import { GeneratorModule } from '../GeneratorModule';
import { Trash2, Upload, Plus } from 'lucide-react';
import { generateCreativeImage } from '../../services/geminiService';

// --- CONSTANTS (Translated) ---

const GENDERS = ['Wanita', 'Pria'];

// Updated Body Types (Strict Order)
const BODY_TYPES: Record<string, string[]> = {
  Wanita: ['Standar (Proporsional)', 'Kurus (Skinny)', 'Langsing (Slim/Fit)', 'Gemoy (Chubby/Curvy)', 'Obesitas (Plus Size)'],
  Pria: ['Standar (Proporsional)', 'Kurus (Skinny)', 'Langsing (Slim/Fit)', 'Gemoy (Chubby)', 'Obesitas (Large Build)']
};

const HAIR_STYLES: Record<string, string[]> = {
  Wanita: ['Lurus Panjang', 'Bob Bergelombang', 'Potongan Pixie', 'Keriting Panjang', 'Kuncir Kuda', 'Kepang', 'Potongan Layer', 'Sanggul Berantakan', 'Hijab Modern', 'Hijab Syari'],
  Pria: ['Fade Pendek', 'Buzz Cut', 'Undercut', 'Man Bun', 'Panjang Bergelombang', 'Slicked Back', 'Berantakan Bertekstur', 'Belah Samping']
};

const HAIR_COLORS = ['Hitam', 'Cokelat Tua', 'Pirang', 'Merah', 'Perak', 'Putih', 'Pink Pastel', 'Biru', 'Hijau', 'Ungu'];
const CLOTHING_COLORS = ['✨ Sesuai Prompt', 'Putih', 'Hitam', 'Merah', 'Biru', 'Hijau', 'Emas', 'Perak', 'Pink', 'Kuning', 'Ungu', 'Navy', 'Krem'];
const FABRIC_TYPES = ['✨ Sesuai Prompt', 'Katun', 'Sutra', 'Kulit', 'Denim', 'Beludru', 'Satin', 'Linen', 'Wol', 'Latex', 'Sifon', 'Renda'];
const ACCESSORIES = ['Tidak Ada', 'Kacamata Hitam', 'Kalung Emas', 'Anting Berlian', 'Topi', 'Jam Tangan Mewah', 'Syal', 'Kacamata', 'Kalung Mutiara', 'Tas Tangan', 'Headphone'];

// Facial Expressions (New)
const EXPRESSIONS = [
  '✨ Auto (AI)', 'Senyum Natural', 'Tertawa Lepas', 'Serius / Fierce', 
  'Sedih / Melankolis', 'Terkejut', 'Menggoda (Flirty)', 'Misterius', 'Wajah Datar (Poker Face)',
  'Pose Konyol / Lucu', 'Pose Imut (Aegyo)', 'Menjulurkan Lidah'
];

const HEIGHT_OPTIONS = ['✨ Auto', '150 cm (Petite)', '155 cm', '160 cm (Average)', '165 cm', '170 cm (Tall)', '175 cm', '180 cm (Model)', '185 cm', '190 cm', '✎ Input Manual (cm)'];
const WEIGHT_OPTIONS = ['✨ Auto', '40 kg (Skinny)', '45 kg', '50 kg (Slim)', '55 kg (Ideal)', '60 kg', '65 kg (Curvy)', '70 kg', '75 kg (Full)', '80 kg+', '✎ Input Manual (kg)'];

const ART_STYLES = [
  'Foto Realistik', 
  'Photobox / Photobooth', // NEW
  'Sinematik', 
  'Seni Digital (Karikatur)', 
  'Lukisan Minyak', 
  'Gaya Anime', 
  'Hitam Putih', 
  'Vaporwave / Neon',
  'Vintage 90s',
  'Polaroid Style'
];

const PHOTOBOX_CONCEPTS = [
  'Studio Polos Putih (Clean White)',
  'Studio Warna (Solid Color)',
  'Studio Motif (Patterned)',
  'Classic 4-Strip (White Frame)',
  'Classic 4-Strip (Black Frame)',
  'Y2K Aesthetic (00s Vibes)',
  'Neon Cyberpunk Glow',
  'Soft Floral Garden',
  'Vintage Retro 90s',
  'Minimalist Grey Studio',
  'Funky Pop Art Pattern',
  'Kawaii Pastel Cute',
  'Love/Heart Themed',
  'Grunge / Edgy Style'
];

const PHOTOBOX_COLORS = [
  'Pastel Pink', 'Sky Blue', 'Lemon Yellow', 'Mint Green', 'Lilac Purple',
  'Vibrant Red', 'Electric Blue', 'Neon Green', 'Hot Pink', 'Deep Maroon',
  'Cream / Beige', 'Warm Orange', 'Chocolate Brown', 'Black & White'
];

const PHOTOBOX_PATTERNS = [
  'Polka Dots (Bintik)', 'Checkerboard (Catur)', 'Stripes (Garis-garis)', 
  'Hearts (Hati)', 'Stars (Bintang)', 'Clouds (Awan)', 'Grid Lines', 
  'Abstract Shapes', 'Floral Repeat', 'Leopard Print', 'Cow Print'
];

const MAKEUP_STYLES = [
  { value: 'auto', label: '✨ Auto (AI)' },
  { value: 'natural_no_makeup', label: 'No Makeup / Natural Look' },
  { value: 'soft_glam', label: 'Soft Glam (Natural Radiance)' },
  { value: 'full_glam', label: 'Full Glam (Heavy Makeup)' },
  { value: 'editorial_fashion', label: 'Editorial / High Fashion' },
  { value: 'korean_glass_skin', label: 'Korean Glass Skin (Dewy)' },
  { value: 'smokey_eyes', label: 'Smokey Eyes & Nude Lips' },
  { value: 'vintage_retro', label: 'Vintage / Retro (Red Lips)' },
  { value: 'goth_dark', label: 'Gothic / Dark Aesthetics' },
  { value: 'fantasy_ethereal', label: 'Fantasy / Ethereal (Glitter)' },
  { value: 'cyberpunk_neon', label: 'Cyberpunk / Neon Accents' },
  { value: 'bridal', label: 'Bridal / Wedding Day' },
  { value: 'matte_finish', label: 'Matte Finish (Velvet Skin)' },
  { value: 'glossy_wet', label: 'Glossy / Wet Look' },
  { value: 'bronzed_beach', label: 'Bronzed / Sun-Kissed' }
];

const LOCATION_TYPES = ['✨ Otomatis', '✎ Input Manual', 'Indoor (Interior)', 'Outdoor (Alam)', 'Urban (Kota)', 'Fantasy/Sci-Fi'];

const INDOOR_LOCATIONS = ['Studio Photobox', 'Kamar Tidur', 'Kafe', 'Studio', 'Ruang Makan', 'Ruang Tamu', 'Perpustakaan', 'Kantor', 'Lobi Hotel Mewah', 'Industrial Loft', 'Gym/Fitness'];
const OUTDOOR_LOCATIONS = ['Sawah', 'Hutan', 'Air Terjun', 'Gunung', 'Perbukitan', 'Sungai', 'Pantai', 'Danau', 'Taman Kota', 'Taman Bunga'];
const URBAN_LOCATIONS = ['Jalanan Kota', 'Rooftop Gedung', 'Stasiun MRT', 'Pasar Malam', 'Neon City Street', 'Jembatan Penyeberangan'];
const FANTASY_LOCATIONS = ['Pesawat Luar Angkasa', 'Kastil Fantasi', 'Hutan Ajaib', 'Kota Cyberpunk', 'Bawah Air'];

// Expanded Time Logic
const TIMES = [
  '✨ Otomatis', 'Flash Photography (Studio)', 'Matahari Terbit (Sunrise)', 'Pagi Cerah', 'Siang Hari (High Noon)', 
  'Sore (Golden Hour)', 'Senja (Blue Hour)', 'Malam (City Lights)', 'Tengah Malam (Gelap)'
];

const LIGHTING_EFFECTS = ['✨ Otomatis', 'Ring Light (Photobooth)', 'Golden Hour', 'Pencahayaan Studio', 'Natural Lembut', 'Bayangan Dramatis', 'Lampu Neon', 'Volumetrik Sinematik', 'Gelap & Murung', 'Rembrandt Lighting', 'Butterfly Lighting'];

// Expanded Angle Logic
const CAMERA_ANGLES = [
  '✨ Otomatis', 'Selevel Mata (Eye Level)', 'Sudut Rendah (Low Angle)', 'Sudut Tinggi (High Angle)', 
  'Wide Shot (Full Body)', 'Potret Close-up', 'Dutch Angle (Miring)', 'Over the Shoulder', 
  'Drone View (Aerial)', 'GoPro View (Fisheye)', 'Macro (Detail)', 'Telephoto (Compressed Background)'
];

// Expanded Pose Logic
const POSES = [
  '✨ Otomatis', 'Berdiri Percaya Diri', 'Duduk Santai', 'Berjalan Candid', 'Pose Aksi', 
  'Tangan Bersedekap', 'Tangan di Saku', 'Melihat ke Belakang', 'Menoleh Samping (Side Profile)',
  'Duduk di Lantai', 'Melompat Dinamis', 'Selfie Mirror', 'Bersandar di Dinding',
  'Cheek to Cheek (Pipi Ketemu Pipi)', 'Bunny Ears (Telinga Kelinci)', 'Peace Sign (Dua Jari)',
  'Rangkulan Akrab', 'Gaya Bebas Photobooth', 'Saling Menatap'
];

const BG_EFFECTS = ['Bokeh (Blur)', 'Jelas / Tajam'];

interface SubjectData {
  id: number;
  image: File | null;
  name: string;
  gender: string;
  bodyType: string;
  hairStyle: string;
  hairColor: string;
  clothingColor: string;
  fabricType: string;
  accessory: string;
  expression: string;
  // New Fields
  height: string;
  weight: string;
  customHeight: string;
  customWeight: string;
}

interface VirtualPhotoshootProps {
  initialRefImage?: File | null;
}

export const VirtualPhotoshootModule: React.FC<VirtualPhotoshootProps> = ({ initialRefImage }) => {
  // --- SUBJECTS STATE (Array of 1 to 5) ---
  const [subjects, setSubjects] = useState<SubjectData[]>([
    {
      id: 1,
      image: null,
      name: '',
      gender: 'Wanita',
      bodyType: BODY_TYPES['Wanita'][0],
      hairStyle: HAIR_STYLES['Wanita'][0],
      hairColor: 'Hitam',
      clothingColor: '✨ Sesuai Prompt',
      fabricType: '✨ Sesuai Prompt',
      accessory: 'Tidak Ada',
      expression: EXPRESSIONS[0],
      height: HEIGHT_OPTIONS[0],
      weight: WEIGHT_OPTIONS[0],
      customHeight: '',
      customWeight: ''
    }
  ]);

  // ENVIRONMENT & STYLE STATE
  const [artStyle, setArtStyle] = useState(ART_STYLES[0]);
  const [photoboxConcept, setPhotoboxConcept] = useState(PHOTOBOX_CONCEPTS[0]);
  const [photoboxColor, setPhotoboxColor] = useState(PHOTOBOX_COLORS[0]);
  const [photoboxPattern, setPhotoboxPattern] = useState(PHOTOBOX_PATTERNS[0]);

  const [makeup, setMakeup] = useState(MAKEUP_STYLES[0].value);
  
  // Location Logic
  const [locationType, setLocationType] = useState(LOCATION_TYPES[0]);
  const [specificLocation, setSpecificLocation] = useState(''); 
  const [manualLocation, setManualLocation] = useState('');

  const [timeOfDay, setTimeOfDay] = useState(TIMES[0]);
  const [lighting, setLighting] = useState(LIGHTING_EFFECTS[0]);
  const [angle, setAngle] = useState(CAMERA_ANGLES[0]);
  const [pose, setPose] = useState(POSES[0]);
  const [bgEffect, setBgEffect] = useState(BG_EFFECTS[0]);

  // Update logic for Photobox Mode
  useEffect(() => {
    if (artStyle === 'Photobox / Photobooth') {
        setLocationType('Indoor (Interior)');
        setSpecificLocation('Studio Photobox');
        setTimeOfDay('Flash Photography (Studio)');
        setLighting('Ring Light (Photobooth)');
        setAngle('Selevel Mata (Eye Level)');
        // Ensure "Group" poses are preferred if multiple subjects
        setPose('Gaya Bebas Photobooth');
    }
  }, [artStyle]);

  // Handle Subject Changes
  const updateSubject = (id: number, field: keyof SubjectData, value: any) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== id) return s;
      
      const updated = { ...s, [field]: value };
      
      // Auto-update Body/Hair options if Gender changes
      if (field === 'gender') {
        updated.bodyType = BODY_TYPES[value as string][0];
        updated.hairStyle = HAIR_STYLES[value as string][0];
      }
      
      return updated;
    }));
  };

  const addSubject = () => {
    if (subjects.length >= 5) return;
    const newId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
    setSubjects([...subjects, {
      id: newId,
      image: null,
      name: '',
      gender: 'Wanita',
      bodyType: BODY_TYPES['Wanita'][0],
      hairStyle: HAIR_STYLES['Wanita'][0],
      hairColor: 'Hitam',
      clothingColor: '✨ Sesuai Prompt',
      fabricType: '✨ Sesuai Prompt',
      accessory: 'Tidak Ada',
      expression: EXPRESSIONS[0],
      height: HEIGHT_OPTIONS[0],
      weight: WEIGHT_OPTIONS[0],
      customHeight: '',
      customWeight: ''
    }]);
  };

  const removeSubject = (id: number) => {
    if (subjects.length <= 1) return;
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleLocationTypeChange = (val: string) => {
    setLocationType(val);
    if (val === 'Indoor (Interior)') setSpecificLocation(INDOOR_LOCATIONS[0]);
    if (val === 'Outdoor (Alam)') setSpecificLocation(OUTDOOR_LOCATIONS[0]);
    if (val === 'Urban (Kota)') setSpecificLocation(URBAN_LOCATIONS[0]);
    if (val === 'Fantasy/Sci-Fi') setSpecificLocation(FANTASY_LOCATIONS[0]);
  };

  // Helper to get description for makeup
  const getMakeupDescription = (makeupValue: string) => {
    if (makeupValue === 'auto') return '';
    return `${makeupValue.replace(/_/g, ' ')} style makeup, professional application.`;
  };

  const getBodyPrompt = (val: string) => {
    if (val.includes("Kurus")) return "very thin, skinny physique, visible collarbones, slender frame";
    if (val.includes("Langsing")) return "slim, fit, athletic toned build, elegant figure";
    if (val.includes("Gemoy")) return "chubby, soft round features, curvy, thick thighs, soft skin texture";
    if (val.includes("Obesitas")) return "obese, plus-size, heavy full figure, massive build";
    return "average build, balanced proportions"; // Standard
  };

  // --- CUSTOM GENERATION HANDLER ---
  const handleCustomGenerate = async (
    userPrompt: string, 
    aspectRatio: string, 
    imageSize: string, 
    isBatch: boolean, 
    batchCount: number
  ) => {
    // 1. Validate Images
    if (!subjects[0].image) {
        throw new Error("Wajah Utama (Subjek 1) wajib diisi!");
    }

    // 2. Build Prompt
    let locationText = '';
    if (locationType === '✎ Input Manual') locationText = manualLocation;
    else if (locationType !== '✨ Otomatis') locationText = specificLocation;
    
    const makeupText = getMakeupDescription(makeup);

    const environmentDetails = [
      `Gaya Seni: ${artStyle}`,
      locationText ? `Lokasi: ${locationText}` : '',
      (timeOfDay !== '✨ Otomatis' && artStyle !== 'Photobox / Photobooth') ? `Waktu: ${timeOfDay}` : '',
      lighting !== '✨ Otomatis' ? `Pencahayaan: ${lighting}` : '',
      angle !== '✨ Otomatis' ? `Sudut Kamera: ${angle}` : '',
      pose !== '✨ Otomatis' ? `Pose: ${pose}` : '',
      `Latar Belakang: ${bgEffect}`,
    ].filter(Boolean).join(', ');

    // Build descriptions for each subject
    const subjectDescriptions = subjects.map((s, idx) => {
       const bodyDesc = getBodyPrompt(s.bodyType);
       const finalHeight = s.height.includes('Input Manual') ? (s.customHeight || 'Average Height') : (s.height.includes('Auto') ? 'Average Height' : s.height);
       const finalWeight = s.weight.includes('Input Manual') ? (s.customWeight || 'Proportional Weight') : (s.weight.includes('Auto') ? 'Proportional Weight' : s.weight);
       
       return `SUBJEK ${idx + 1} (${s.name || `Orang ${idx + 1}`}): ${s.gender}, tubuh ${bodyDesc} (Tinggi: ${finalHeight}, Berat: ${finalWeight}), rambut ${s.hairStyle} warna ${s.hairColor}, pakaian ${s.clothingColor === '✨ Sesuai Prompt' ? 'sesuai tema' : s.clothingColor} ${s.fabricType !== '✨ Sesuai Prompt' ? `bahan ${s.fabricType}` : ''} ${s.accessory !== 'Tidak Ada' ? `, aksesoris ${s.accessory}` : ''}, ekspresi ${s.expression}.`;
    }).join('\n');

    let fullPrompt = `Generasi KUALITAS TERTINGGI (8k resolution, Ultra-Sharp, Crystal Clear).
    
    [GLOBAL SETTINGS]
    - Quality: Crystal Clear, Masterpiece, No Blur, High Definition, Micro-Contrast.
    - Camera: Simulated Phase One XF IQ4 150MP output. Sharp Focus.
    
    ${environmentDetails}.
    
    [PROFESSIONAL MAKEUP PROTOCOL]:
    ${makeupText ? `Apply the following makeup style strictly: ${makeupText}` : 'Ensure makeup is professional, high-definition, and matches the lighting.'}
    
    ${subjectDescriptions}
    
    Kualitas keseluruhan: sangat detail, fotorealistik (kecuali jika gaya seni menentukan lain), tekstur kulit nyata (pores, vellus hair), pencahayaan fisik akurat.
    
    Instruksi Tambahan: ${userPrompt}`;

    if (artStyle === 'Photobox / Photobooth') {
        let conceptDetails = photoboxConcept;
        
        // Append dynamic sub-options
        if (photoboxConcept === 'Studio Warna (Solid Color)') {
            conceptDetails = `Solid Color Background: ${photoboxColor}`;
        } else if (photoboxConcept === 'Studio Motif (Patterned)') {
            conceptDetails = `Patterned Background: ${photoboxPattern}`;
        }

        fullPrompt += `\n[PHOTOBOX MODE]: Concept: ${conceptDetails}. Create a fun, candid, photobooth style image. Flash lighting, playful interaction between subjects if multiple. The frame and background should match the '${conceptDetails}' theme.`;
    }

    // 3. Prepare Images
    const mainImage = subjects[0].image;
    // Collect extra images (Subject 2 to 5)
    const extraFaces = subjects.slice(1).map(s => s.image).filter((img): img is File => img !== null);

    // 4. Batch Logic Support
    if (isBatch) {
        const results: string[] = [];
        for (let i = 0; i < batchCount; i++) {
            const batchPrompt = `${fullPrompt} \n\n[VARIASI BATCH #${i + 1}: Hasilkan variasi pose dan ekspresi yang berbeda/acak untuk photobox ini.]`;
            const result = await generateCreativeImage(batchPrompt, mainImage, aspectRatio, imageSize, initialRefImage, extraFaces, true);
            results.push(result);
        }
        return results;
    } else {
        return await generateCreativeImage(fullPrompt, mainImage, aspectRatio, imageSize, initialRefImage, extraFaces, true);
    }
  };

  const renderSubjectControls = (subject: SubjectData, index: number) => (
    <div key={subject.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 relative group">
      <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
         <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            👤 Subjek {index + 1} {index === 0 ? '(Utama)' : ''}
         </h3>
         {index > 0 && (
            <button 
                onClick={() => removeSubject(subject.id)}
                className="text-red-500 hover:text-red-700 p-1 bg-white dark:bg-gray-700 rounded shadow-sm"
                title="Hapus Subjek"
            >
                <Trash2 size={14}/>
            </button>
         )}
      </div>

      <div className="flex gap-4 mb-4">
         {/* Custom Mini Upload Box */}
         <div className="w-24 h-32 flex-shrink-0 relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 transition-colors bg-white dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
            <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => e.target.files && updateSubject(subject.id, 'image', e.target.files[0])}
            />
            {subject.image ? (
                <img src={URL.createObjectURL(subject.image)} alt="Subject" className="w-full h-full object-cover" />
            ) : (
                <div className="text-center text-gray-400 p-1">
                    <Upload size={16} className="mx-auto mb-1" />
                    <span className="text-[9px] block leading-tight">Upload Wajah</span>
                </div>
            )}
         </div>

         {/* Basic Controls */}
         <div className="flex-1 grid grid-cols-2 gap-2">
            <div>
               <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Nama (Opsional)</label>
               <input 
                 type="text" 
                 value={subject.name} 
                 onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                 className="w-full p-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-white" 
                 placeholder="Nama..."
               />
            </div>
            <div>
               <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Gender</label>
               <select 
                 value={subject.gender} 
                 onChange={(e) => updateSubject(subject.id, 'gender', e.target.value)}
                 className="w-full p-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-white dark:bg-gray-700"
               >
                 {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Rambut</label>
               <select 
                 value={subject.hairStyle} 
                 onChange={(e) => updateSubject(subject.id, 'hairStyle', e.target.value)}
                 className="w-full p-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-white dark:bg-gray-700"
               >
                 {HAIR_STYLES[subject.gender].map(h => <option key={h} value={h}>{h}</option>)}
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Ekspresi</label>
               <select 
                 value={subject.expression} 
                 onChange={(e) => updateSubject(subject.id, 'expression', e.target.value)}
                 className="w-full p-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-white dark:bg-gray-700"
               >
                 {EXPRESSIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
               </select>
            </div>
         </div>
      </div>

      {/* NEW: Physical Details (Height/Weight) */}
      <div className="grid grid-cols-2 gap-3 mb-2 bg-white dark:bg-gray-900/50 p-2 rounded border border-dashed border-gray-200 dark:border-gray-700">
          <div>
             <label className="text-[9px] font-bold text-indigo-500 block mb-0.5">Tinggi Badan</label>
             <select 
                value={subject.height} onChange={(e) => updateSubject(subject.id, 'height', e.target.value)}
                className="w-full p-1 text-[10px] rounded bg-transparent border border-gray-300 dark:border-gray-600 dark:text-white"
             >
                {HEIGHT_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
             </select>
             {subject.height.includes('Input Manual') && (
                <input 
                   type="text" placeholder="Cth: 168 cm" value={subject.customHeight} onChange={(e) => updateSubject(subject.id, 'customHeight', e.target.value)}
                   className="mt-1 w-full p-1 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-white"
                />
             )}
          </div>
          <div>
             <label className="text-[9px] font-bold text-indigo-500 block mb-0.5">Berat Badan</label>
             <select 
                value={subject.weight} onChange={(e) => updateSubject(subject.id, 'weight', e.target.value)}
                className="w-full p-1 text-[10px] rounded bg-transparent border border-gray-300 dark:border-gray-600 dark:text-white"
             >
                {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
             </select>
             {subject.weight.includes('Input Manual') && (
                <input 
                   type="text" placeholder="Cth: 55 kg" value={subject.customWeight} onChange={(e) => updateSubject(subject.id, 'customWeight', e.target.value)}
                   className="mt-1 w-full p-1 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:text-white"
                />
             )}
          </div>
      </div>

      {/* Advanced Toggle Details */}
      <div className="grid grid-cols-3 gap-2 border-t border-gray-200 dark:border-gray-700 pt-2">
          <div>
             <label className="text-[9px] text-gray-400 block">Warna Baju</label>
             <select 
               value={subject.clothingColor} onChange={(e) => updateSubject(subject.id, 'clothingColor', e.target.value)}
               className="w-full p-1 text-[10px] rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
             >
               {CLOTHING_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          <div>
             <label className="text-[9px] text-gray-400 block">Tipe Tubuh</label>
             <select 
               value={subject.bodyType} onChange={(e) => updateSubject(subject.id, 'bodyType', e.target.value)}
               className="w-full p-1 text-[10px] rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
             >
               {BODY_TYPES[subject.gender].map(b => <option key={b} value={b}>{b}</option>)}
             </select>
          </div>
          <div>
             <label className="text-[9px] text-gray-400 block">Aksesoris</label>
             <select 
               value={subject.accessory} onChange={(e) => updateSubject(subject.id, 'accessory', e.target.value)}
               className="w-full p-1 text-[10px] rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
             >
               {ACCESSORIES.map(a => <option key={a} value={a}>{a}</option>)}
             </select>
          </div>
      </div>
    </div>
  );

  const extraControls = (
    <div className="space-y-6">
      
      {/* Subject Management Section */}
      <div className="space-y-4">
         <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Daftar Subjek ({subjects.length}/5)</h3>
            <button 
                onClick={addSubject}
                disabled={subjects.length >= 5}
                className="text-xs flex items-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full font-bold transition-colors disabled:opacity-50"
            >
                <Plus size={14}/> Tambah Orang
            </button>
         </div>
         
         <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {subjects.map((subject, index) => renderSubjectControls(subject, index))}
         </div>
      </div>

      {/* Scene & Atmosphere Controls */}
      <div className="bg-white dark:bg-gray-800/80 p-5 rounded-xl border-2 border-primary-100 dark:border-primary-900/30 shadow-sm">
        <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400 mb-4 uppercase tracking-wider flex items-center gap-2">
          <span className="text-xl">🎨</span> Pemandangan & Suasana
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Art Style */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Gaya Artistik</label>
            <select 
              value={artStyle} 
              onChange={(e) => setArtStyle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ART_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Photobox Sub-Menu (CONDITIONAL) */}
          {artStyle === 'Photobox / Photobooth' && (
            <div className="space-y-1 animate-fade-in">
                <label className="text-[10px] font-semibold text-gray-500 uppercase text-pink-500">Konsep Photobox</label>
                <select
                    value={photoboxConcept}
                    onChange={(e) => setPhotoboxConcept(e.target.value)}
                    className="w-full rounded-lg border border-pink-300 dark:border-pink-800 bg-pink-50 dark:bg-gray-800 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                >
                    {PHOTOBOX_CONCEPTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                {/* SUB-DROPDOWN: COLOR */}
                {photoboxConcept === 'Studio Warna (Solid Color)' && (
                    <div className="mt-2 animate-fade-in">
                       <label className="text-[10px] font-semibold text-gray-500 uppercase text-blue-500">Pilih Warna</label>
                       <select
                           value={photoboxColor}
                           onChange={(e) => setPhotoboxColor(e.target.value)}
                           className="w-full rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-gray-800 p-2 text-xs dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                       >
                           {PHOTOBOX_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                )}

                {/* SUB-DROPDOWN: PATTERN */}
                {photoboxConcept === 'Studio Motif (Patterned)' && (
                    <div className="mt-2 animate-fade-in">
                       <label className="text-[10px] font-semibold text-gray-500 uppercase text-purple-500">Pilih Motif</label>
                       <select
                           value={photoboxPattern}
                           onChange={(e) => setPhotoboxPattern(e.target.value)}
                           className="w-full rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-gray-800 p-2 text-xs dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                       >
                           {PHOTOBOX_PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                    </div>
                )}
            </div>
          )}

          {/* Makeup Selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Makeup / Riasan</label>
            <select 
              value={makeup} 
              onChange={(e) => setMakeup(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MAKEUP_STYLES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Location Group */}
          <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-3">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Lokasi</label>
             <div className="flex gap-2">
                {/* Category Selector */}
                <select 
                  value={locationType} 
                  onChange={(e) => handleLocationTypeChange(e.target.value)}
                  disabled={artStyle === 'Photobox / Photobooth'}
                  className="w-1/3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Specific Logic */}
                {locationType === '✎ Input Manual' ? (
                  <input 
                    type="text" 
                    placeholder="Contoh: Di pesawat luar angkasa, di toko permen..." 
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : locationType !== '✨ Otomatis' ? (
                  <select 
                    value={specificLocation} 
                    onChange={(e) => setSpecificLocation(e.target.value)}
                    disabled={artStyle === 'Photobox / Photobooth'}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                     {locationType === 'Indoor (Interior)' && INDOOR_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                     {locationType === 'Outdoor (Alam)' && OUTDOOR_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                     {locationType === 'Urban (Kota)' && URBAN_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                     {locationType === 'Fantasy/Sci-Fi' && FANTASY_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                ) : (
                   <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 text-sm text-gray-400 italic">
                      AI akan memilih lokasi terbaik
                   </div>
                )}
             </div>
          </div>

          {/* Time */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Waktu</label>
            <select 
              value={timeOfDay} 
              onChange={(e) => setTimeOfDay(e.target.value)}
              disabled={artStyle === 'Photobox / Photobooth'}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Lighting */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Pencahayaan</label>
            <select 
              value={lighting} 
              onChange={(e) => setLighting(e.target.value)}
              disabled={artStyle === 'Photobox / Photobooth'}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {LIGHTING_EFFECTS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Angle */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Sudut Kamera</label>
            <select 
              value={angle} 
              onChange={(e) => setAngle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Pose */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Pose Subjek</label>
            <select 
              value={pose} 
              onChange={(e) => setPose(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              {POSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Background Effect */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Efek Latar Belakang</label>
            <select 
              value={bgEffect} 
              onChange={(e) => setBgEffect(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            >
              {BG_EFFECTS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <GeneratorModule 
      moduleId="virtual-photoshoot"
      title="Foto Studio Virtual (Multi-Subject)"
      description="Studio foto virtual canggih dengan dukungan hingga 5 wajah subjek sekaligus."
      promptPrefix="" // Handled by custom handler
      
      // We disable the default image uploaders because we implemented custom ones
      requireImage={false} 
      allowReferenceImage={true}
      referenceImageLabel="Referensi Outfit/Pose (Global)"
      allowAdditionalFaceImage={false} // Disabled because we handle it manually
      
      extraControls={extraControls}
      
      // Enable Batch Mode
      batchModeAvailable={true}
      initialRefImage={initialRefImage}
      
      // Pass the Custom Generator
      customGenerateHandler={handleCustomGenerate}
    />
  );
};
