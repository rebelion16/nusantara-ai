import React, { useState, useEffect } from 'react';
import { GeneratorModule } from '../GeneratorModule';
import { generateCreativeImage } from '../../services/geminiService';

// --- PREWEDDING SPECIFIC CONSTANTS ---

const THEMES = [
  "✨ Auto (Recommended)",
  "Korean Minimalist Studio (Clean & Soft)",
  "Elegant Classic (Timeless & Luxury)",
  "Rustic Bohemian (Nature & Earthy)",
  "Cinematic Street Style (Candid & Urban)",
  "Fairytale Fantasy (Dreamy & Magical)",
  "Vintage Retro (Film Grain & Nostalgic)",
  "Traditional Modern Fusion (Cultural Blend)",
  "Dark & Moody (Dramatic & Intense)",
  "Beach Sunset (Golden Hour & Airy)"
];

const OUTFITS = [
  "✨ Auto (Matches Theme)",
  "Bridal Gown & Formal Suit (Classic White/Black)",
  "Casual Matching Earth Tones (Beige/Brown/Sage)",
  "Smart Casual (Blazer & Dress)",
  "Black Formal (Elegant Evening Wear)",
  "Traditional Kebaya & Batik (Indonesian Style)",
  "Hanbok Modern (Korean Style)",
  "Vintage 90s Attire",
  "Denim on Denim (Casual Street)"
];

const LOCATIONS = [
  "✨ Auto (Matches Theme)",
  "Indoor Studio (Plain Background)",
  "Botanical Garden (Lush Greenery)",
  "Beach Cliff at Sunset",
  "Pine Forest (Misty)",
  "City Rooftop (Night Lights)",
  "European Architecture Street",
  "Classic Library / Bookstore",
  "Field of Flowers",
  "Luxury Hotel Interior"
];

const POSES = [
  "✨ Auto (Natural Interaction)",
  "Saling Menatap (Intimate Gaze)",
  "Berpegangan Tangan (Walking Away)",
  "Back to Back (Cool/Editorial)",
  "Forehead Touch (Romantic)",
  "Sitting Together (Casual/Relaxed)",
  "Groom Lifting Bride (Playful)",
  "Whispering Secret",
  "Laughing Candidly",
  "Wide Shot (Small Couple, Big Scenery)"
];

const MOODS = [
  "Romantic & Intimate",
  "Joyful & Playful",
  "Serious & Editorial",
  "Calm & Serene",
  "Dramatic & Mysterious"
];

const COLOR_GRADING = [
  "Natural True-to-Life",
  "Warm & Airy (Pastel Tones)",
  "Moody Green (Cinematic)",
  "Black & White (Monochrome)",
  "Teal & Orange (Blockbuster)",
  "Vintage Film (Grainy)"
];

const CAMERA_ANGLES = [
  "✨ Auto (Best for Composition)",
  "Eye Level (Sejajar Mata - Natural)",
  "Low Angle (Dari Bawah - Megah)",
  "High Angle (Dari Atas - Romantis)",
  "Bird's Eye View (Drone Shot - Pemandangan)",
  "Dutch Angle (Miring - Artistik)",
  "Over-the-Shoulder (Intimate - Bahu)",
  "Close Up (Fokus Wajah/Emosi)",
  "Medium Shot (Setengah Badan)",
  "Full Body Shot (Seluruh Badan)",
  "Wide Angle (Lensa Lebar - Pemandangan Luas)",
  "Silhouette (Siluet Backlight)",
  "Reflection (Pantulan Cermin/Air)"
];

export const PrewedVirtualModule: React.FC = () => {
  // State
  const [theme, setTheme] = useState(THEMES[0]);
  const [outfit, setOutfit] = useState(OUTFITS[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [pose, setPose] = useState(POSES[0]);
  const [mood, setMood] = useState(MOODS[0]);
  const [grading, setGrading] = useState(COLOR_GRADING[0]);
  const [cameraAngle, setCameraAngle] = useState(CAMERA_ANGLES[0]);

  // Custom manual inputs
  const [customTheme, setCustomTheme] = useState('');
  const [customOutfit, setCustomOutfit] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  // Names for prompts
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');

  // Construct dynamic prompt for the prefix
  const getPromptPrefix = () => {
    const finalTheme = theme.includes("Auto") ? "Professional Prewedding Concept" : theme;
    const finalOutfit = outfit.includes("Auto") ? "Matching couple attire" : outfit;
    const finalLocation = location.includes("Auto") ? "Scenic romantic background" : location;
    const finalPose = pose.includes("Auto") ? "Natural intimate pose" : pose;
    const finalAngle = cameraAngle.includes("Auto") ? "Cinematic wedding photography angle" : cameraAngle;

    return `
    [KONSEP FOTO PREWEDDING PROFESIONAL]
    Subjek: Pasangan Romantis (Couple).
    Tema: ${finalTheme}.
    Lokasi: ${finalLocation}.
    Outfit: ${finalOutfit}.
    Pose: ${finalPose}.
    Angle Kamera: ${finalAngle}.
    Mood: ${mood}.
    Color Grading: ${grading}.
    
    INSTRUKSI KHUSUS:
    - Gabungkan wajah dari Gambar 1 (Pria/Wanita) dan Gambar 2 (Pasangan) ke dalam foto ini dengan sangat natural.
    - Pastikan chemistry terlihat romantis dan nyata.
    - Pencahayaan level fotografi pernikahan (Wedding Photography).
    `;
  };

  const renderDropdown = (label: string, value: string, setValue: (val: string) => void, options: string[]) => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-gray-500 uppercase">{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm dark:text-white outline-none"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const extraControls = (
    <div className="space-y-6">
      <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
        <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300 mb-3 flex items-center gap-2">
          <span>💍</span> Konsep Prewedding
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDropdown("Tema Utama", theme, setTheme, THEMES)}
          {renderDropdown("Lokasi", location, setLocation, LOCATIONS)}
          {renderDropdown("Gaya Outfit", outfit, setOutfit, OUTFITS)}
          {renderDropdown("Pose Pasangan", pose, setPose, POSES)}
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Atmosfer & Kamera</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDropdown("Mood / Emosi", mood, setMood, MOODS)}
          {renderDropdown("Angle Kamera", cameraAngle, setCameraAngle, CAMERA_ANGLES)}
          {renderDropdown("Color Grading (Filter)", grading, setGrading, COLOR_GRADING)}
        </div>
      </div>
    </div>
  );

  return (
    <GeneratorModule
      moduleId="prewed-virtual"
      title="Prewed Virtual"
      description="Buat foto prewedding impian Anda tanpa perlu sewa studio mahal. Cukup upload foto Anda dan pasangan."
      promptPrefix={getPromptPrefix()}

      // Enforce 2 Inputs
      requireImage={true}
      mainImageLabel="Pasangan 1"

      allowAdditionalFaceImage={true}
      secondFaceLabel="Pasangan 2"

      // Allow style reference if needed
      allowReferenceImage={true}
      referenceImageLabel="Referensi Gaya (Opsional)"

      extraControls={extraControls}
      batchModeAvailable={true}
      availablePoses={POSES} // NEW: Pass available poses for batch selection
      defaultAspectRatio="3:4"

      // Name inputs
      showNames={true}
      name1={name1} onName1Change={setName1}
      name2={name2} onName2Change={setName2}
    />
  );
};