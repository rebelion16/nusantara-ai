
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Cloud, Sun, CloudRain, Sparkles, Calendar, Clock, ArrowRight, MapPin, Navigation, Search, Loader, X, ExternalLink, AlertTriangle, Info, Zap } from 'lucide-react';
import { ModuleDefinition, ModuleId } from '../../types';

interface HomeProps {
  onNavigate: (id: ModuleId) => void;
}

// === TIME PERIOD HELPER ===
type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'dusk' | 'night';
type WeatherCondition = 'sunny' | 'cloudy' | 'rainy';

const getTimePeriod = (): TimePeriod => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 10) return 'morning';    // Pagi: 04:00 - 10:00
  if (hour >= 10 && hour < 14) return 'afternoon'; // Siang: 10:00 - 14:00
  if (hour >= 14 && hour < 18) return 'evening';   // Sore: 14:00 - 18:00 (adjusted from 15:00)
  if (hour >= 18 && hour < 19) return 'dusk';      // Petang: 18:00 - 19:00
  return 'night';                                   // Malam: 19:00 - 04:00
};

const getGreeting = (): { text: string; emoji: string } => {
  const period = getTimePeriod();
  switch (period) {
    case 'morning': return { text: 'Selamat Pagi', emoji: '🌅' };
    case 'afternoon': return { text: 'Selamat Siang', emoji: '☀️' };
    case 'evening': return { text: 'Selamat Sore', emoji: '🌇' };
    case 'dusk': return { text: 'Selamat Petang', emoji: '🌆' };
    case 'night': return { text: 'Selamat Malam', emoji: '🌙' };
  }
};

// === DYNAMIC BACKGROUND STYLES ===
const getBackgroundStyle = (time: TimePeriod, weather: WeatherCondition): string => {
  // Time + Weather combinations
  const backgrounds: Record<TimePeriod, Record<WeatherCondition, string>> = {
    morning: {
      sunny: 'from-orange-400 via-amber-300 to-yellow-200', // Sunrise warm
      cloudy: 'from-gray-400 via-slate-300 to-blue-200', // Cloudy morning
      rainy: 'from-slate-500 via-gray-400 to-blue-300', // Rainy morning
    },
    afternoon: {
      sunny: 'from-blue-400 via-cyan-300 to-sky-200', // Clear blue sky
      cloudy: 'from-slate-400 via-gray-300 to-zinc-200', // Overcast
      rainy: 'from-slate-600 via-gray-500 to-blue-400', // Rainy afternoon
    },
    evening: {
      sunny: 'from-orange-500 via-rose-400 to-purple-500', // Sunset
      cloudy: 'from-gray-500 via-slate-400 to-purple-400', // Cloudy sunset
      rainy: 'from-slate-600 via-gray-500 to-indigo-500', // Rainy evening
    },
    dusk: {
      sunny: 'from-purple-600 via-pink-500 to-orange-400', // Dusk golden hour
      cloudy: 'from-slate-600 via-purple-500 to-pink-400', // Cloudy dusk
      rainy: 'from-slate-700 via-purple-600 to-indigo-600', // Rainy dusk
    },
    night: {
      sunny: 'from-indigo-900 via-purple-800 to-slate-900', // Clear night
      cloudy: 'from-slate-800 via-gray-700 to-zinc-800', // Cloudy night
      rainy: 'from-slate-900 via-gray-800 to-blue-900', // Rainy night
    }
  };
  return backgrounds[time][weather];
};

// === QUOTES ===
const QUOTES = [
  { text: "Kreativitas adalah kecerdasan yang sedang bersenang-senang.", author: "Albert Einstein" },
  { text: "Satu-satunya cara untuk melakukan pekerjaan hebat adalah mencintai apa yang kamu lakukan.", author: "Steve Jobs" },
  { text: "Masa depan milik mereka yang percaya pada keindahan mimpi-mimpi mereka.", author: "Eleanor Roosevelt" },
  { text: "Imajinasi lebih penting daripada pengetahuan.", author: "Albert Einstein" },
  { text: "Mulailah dari mana kamu berada. Gunakan apa yang kamu punya. Lakukan apa yang kamu bisa.", author: "Arthur Ashe" },
  { text: "Setiap hari adalah kesempatan baru untuk menjadi lebih baik.", author: "Unknown" },
  { text: "AI adalah alat, kreativitas adalah kekuatan super.", author: "Nusantara AI" },
];

// === PRAYER TIMES HOOK ===
interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

const usePrayerTimes = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<string>('');
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; countdown: string } | null>(null);

  // Fetch prayer times from Aladhan API
  const fetchPrayerTimes = useCallback(async (lat: number, lon: number) => {
    try {
      const today = new Date();
      const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}&method=20`
      );

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();

      if (data?.data?.timings) {
        const timings = data.data.timings;
        setPrayerTimes({
          Fajr: timings.Fajr,
          Dhuhr: timings.Dhuhr,
          Asr: timings.Asr,
          Maghrib: timings.Maghrib,
          Isha: timings.Isha
        });

        // Get location name
        if (data.data.meta?.timezone) {
          const tz = data.data.meta.timezone.split('/').pop()?.replace('_', ' ') || '';
          setLocation(tz);
        }
      }
    } catch (err) {
      console.error('Prayer times fetch error:', err);
    }
  }, []);

  // Calculate next prayer
  useEffect(() => {
    if (!prayerTimes) return;

    const calculateNextPrayer = () => {
      const now = new Date();
      const prayers = [
        { name: 'Subuh', time: prayerTimes.Fajr },
        { name: 'Dzuhur', time: prayerTimes.Dhuhr },
        { name: 'Ashar', time: prayerTimes.Asr },
        { name: 'Maghrib', time: prayerTimes.Maghrib },
        { name: 'Isya', time: prayerTimes.Isha }
      ];

      for (const prayer of prayers) {
        const [hours, minutes] = prayer.time.split(':').map(Number);
        const prayerDate = new Date();
        prayerDate.setHours(hours, minutes, 0, 0);

        if (prayerDate > now) {
          const diffMs = prayerDate.getTime() - now.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          setNextPrayer({
            name: prayer.name,
            time: prayer.time,
            countdown: diffHours > 0 ? `${diffHours}j ${diffMins}m` : `${diffMins} menit`
          });
          return;
        }
      }

      // If all prayers passed, next is tomorrow's Fajr
      setNextPrayer({
        name: 'Subuh (besok)',
        time: prayerTimes.Fajr,
        countdown: '-'
      });
    };

    calculateNextPrayer();
    const interval = setInterval(calculateNextPrayer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [prayerTimes]);

  // Get GPS and fetch prayer times
  useEffect(() => {
    // Try to get saved coordinates first
    const savedLat = localStorage.getItem('PRAYER_LAT');
    const savedLon = localStorage.getItem('PRAYER_LON');

    if (savedLat && savedLon) {
      fetchPrayerTimes(parseFloat(savedLat), parseFloat(savedLon));
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          localStorage.setItem('PRAYER_LAT', latitude.toString());
          localStorage.setItem('PRAYER_LON', longitude.toString());
          fetchPrayerTimes(latitude, longitude);
        },
        () => {
          // Default to Jakarta if GPS fails
          fetchPrayerTimes(-6.2088, 106.8456);
        }
      );
    } else {
      // Default to Jakarta
      fetchPrayerTimes(-6.2088, 106.8456);
    }
  }, [fetchPrayerTimes]);

  return { prayerTimes, nextPrayer, location };
};

// === HERO SECTION COMPONENT ===
const HeroSection: React.FC<{ weather: WeatherCondition }> = ({ weather }) => {
  const greeting = getGreeting();
  const timePeriod = getTimePeriod();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { prayerTimes, nextPrayer, location } = usePrayerTimes();

  const bgGradient = getBackgroundStyle(timePeriod, weather);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Dynamic text color based on background brightness
  const isNight = timePeriod === 'night';
  const isDark = isNight || weather === 'rainy';

  // Build prayer marquee text
  const prayerMarqueeText = prayerTimes
    ? `🕌 Waktu Sholat${location ? ` (${location})` : ''}: Subuh ${prayerTimes.Fajr} • Dzuhur ${prayerTimes.Dhuhr} • Ashar ${prayerTimes.Asr} • Maghrib ${prayerTimes.Maghrib} • Isya ${prayerTimes.Isha}${nextPrayer ? ` | ⏰ Sholat berikutnya: ${nextPrayer.name} pukul ${nextPrayer.time} (${nextPrayer.countdown} lagi)` : ''}`
    : '🕌 Memuat jadwal sholat...';

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bgGradient} p-6 pb-4 mb-8 transition-all duration-1000`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Stars for night */}
        {isNight && (
          <>
            <div className="absolute top-4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-8 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-12 left-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-6 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          </>
        )}

        {/* Rain drops effect */}
        {weather === 'rainy' && (
          <>
            <div className="absolute top-0 left-1/4 w-0.5 h-8 bg-blue-300/50 rounded-full animate-bounce" style={{ animationDuration: '0.5s' }}></div>
            <div className="absolute top-2 left-1/2 w-0.5 h-6 bg-blue-300/50 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.1s' }}></div>
            <div className="absolute top-0 right-1/3 w-0.5 h-10 bg-blue-300/50 rounded-full animate-bounce" style={{ animationDuration: '0.4s', animationDelay: '0.2s' }}></div>
          </>
        )}

        {/* Sun/cloud elements */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 ${isDark ? 'bg-white/5' : 'bg-white/20'} rounded-full blur-2xl animate-pulse`}></div>
        <div className={`absolute -bottom-10 -left-10 w-60 h-60 ${isDark ? 'bg-white/5' : 'bg-white/15'} rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{greeting.emoji}</span>
              <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {greeting.text}!
              </h1>
            </div>
            <p className={`text-lg ${isDark ? 'text-white/80' : 'text-gray-700/80'}`}>
              Selamat datang di <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Nusantara AI</span> — Satu platform, kemungkinan kreatif tak terbatas
            </p>
          </div>

          {/* Time Display */}
          <div className={`${isDark ? 'bg-white/20' : 'bg-black/10'} backdrop-blur-sm rounded-2xl px-6 py-4`}>
            <div className={`flex items-center gap-2 text-sm mb-1 ${isDark ? 'text-white/80' : 'text-gray-700/80'}`}>
              <Calendar size={14} />
              <span>{formattedDate}</span>
            </div>
            <div className={`flex items-center gap-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Clock size={20} />
              <span className="font-mono">{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Prayer Times Running Text */}
        <div className={`mt-4 pt-3 border-t ${isDark ? 'border-white/20' : 'border-black/10'}`}>
          <div className="overflow-hidden">
            <div
              className={`whitespace-nowrap animate-marquee text-sm ${isDark ? 'text-white/90' : 'text-gray-700'}`}
              style={{
                animation: 'marquee 30s linear infinite'
              }}
            >
              {prayerMarqueeText} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; {prayerMarqueeText}
            </div>
          </div>
        </div>
      </div>

      {/* Marquee CSS */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

// === WEATHER WIDGET ===
interface WeatherWidgetProps {
  onWeatherChange: (condition: WeatherCondition) => void;
}

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  city: string;
}

// WMO Weather interpretation codes
const WMO_CODES: Record<number, { condition: string; type: WeatherCondition }> = {
  0: { condition: 'Cerah', type: 'sunny' },
  1: { condition: 'Cerah Sebagian', type: 'sunny' },
  2: { condition: 'Berawan Sebagian', type: 'cloudy' },
  3: { condition: 'Berawan', type: 'cloudy' },
  45: { condition: 'Berkabut', type: 'cloudy' },
  48: { condition: 'Kabut Tebal', type: 'cloudy' },
  51: { condition: 'Gerimis Ringan', type: 'rainy' },
  53: { condition: 'Gerimis', type: 'rainy' },
  55: { condition: 'Gerimis Lebat', type: 'rainy' },
  61: { condition: 'Hujan Ringan', type: 'rainy' },
  63: { condition: 'Hujan', type: 'rainy' },
  65: { condition: 'Hujan Lebat', type: 'rainy' },
  71: { condition: 'Salju Ringan', type: 'rainy' },
  73: { condition: 'Salju', type: 'rainy' },
  75: { condition: 'Salju Lebat', type: 'rainy' },
  80: { condition: 'Hujan Lokal', type: 'rainy' },
  81: { condition: 'Hujan Lokal Lebat', type: 'rainy' },
  82: { condition: 'Hujan Deras', type: 'rainy' },
  95: { condition: 'Petir', type: 'rainy' },
  96: { condition: 'Petir Hujan Es Ringan', type: 'rainy' },
  99: { condition: 'Petir Hujan Es', type: 'rainy' },
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ onWeatherChange }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch weather from Open-Meteo API using coordinates
  const fetchWeatherByCoords = useCallback(async (lat: number, lon: number, cityName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data?.current) {
        const weatherCode = data.current.weather_code || 0;
        const wmoInfo = WMO_CODES[weatherCode] || { condition: 'Tidak Diketahui', type: 'sunny' as WeatherCondition };

        const weatherData: WeatherData = {
          temp: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          condition: wmoInfo.condition,
          city: cityName
        };

        setWeather(weatherData);
        localStorage.setItem('WEATHER_LAT', lat.toString());
        localStorage.setItem('WEATHER_LON', lon.toString());
        localStorage.setItem('WEATHER_CITY', cityName);

        onWeatherChange(wmoInfo.type);
        setShowInput(false);
      } else {
        throw new Error('Data tidak tersedia');
      }
    } catch (err) {
      console.error('Open-Meteo fetch error:', err);
      setError('Gagal mengambil data cuaca. Coba lagi nanti.');
    } finally {
      setIsLoading(false);
    }
  }, [onWeatherChange]);

  // Geocode city name to coordinates using Open-Meteo Geocoding API
  const fetchWeatherByCity = useCallback(async (cityName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // First, geocode the city name
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=id&format=json`
      );

      if (!geoResponse.ok) {
        throw new Error('Geocoding failed');
      }

      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        setError(`Kota "${cityName}" tidak ditemukan. Coba nama lain.`);
        setIsLoading(false);
        return;
      }

      const location = geoData.results[0];
      const displayName = location.admin1
        ? `${location.name}, ${location.admin1}`
        : location.name;

      // Now fetch weather for these coordinates
      await fetchWeatherByCoords(location.latitude, location.longitude, displayName);
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Gagal mencari lokasi. Coba lagi.');
      setIsLoading(false);
    }
  }, [fetchWeatherByCoords]);

  // Get GPS location
  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini.');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get city name
        try {
          const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&format=json`
          );

          let cityName = 'Lokasi GPS';
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.results?.[0]) {
              const loc = geoData.results[0];
              cityName = loc.admin1 ? `${loc.name}, ${loc.admin1}` : loc.name;
            }
          }

          await fetchWeatherByCoords(latitude, longitude, cityName);
        } catch {
          await fetchWeatherByCoords(latitude, longitude, 'Lokasi GPS');
        }
      },
      (err) => {
        console.error('GPS Error:', err);
        setError('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle manual city search
  const handleSearch = () => {
    if (cityInput.trim()) {
      fetchWeatherByCity(cityInput.trim());
      setCityInput('');
    }
  };

  // Initial load
  useEffect(() => {
    const savedLat = localStorage.getItem('WEATHER_LAT');
    const savedLon = localStorage.getItem('WEATHER_LON');
    const savedCity = localStorage.getItem('WEATHER_CITY');

    if (savedLat && savedLon && savedCity) {
      fetchWeatherByCoords(parseFloat(savedLat), parseFloat(savedLon), savedCity);
    } else {
      // Default to Jakarta
      fetchWeatherByCoords(-6.2088, 106.8456, 'Jakarta, Indonesia');
    }
  }, [fetchWeatherByCoords]);

  const getWeatherIcon = (condition: string) => {
    const cond = condition.toLowerCase();
    if (cond.includes('cerah') && !cond.includes('berawan')) return <Sun className="text-yellow-400" size={36} />;
    if (cond.includes('hujan') || cond.includes('petir')) return <CloudRain className="text-blue-400" size={36} />;
    return <Cloud className="text-gray-400" size={36} />;
  };

  if (!weather && !isLoading && !error) return null;

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-lg">
      {/* Header with location */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-red-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {isLoading ? 'Memuat...' : weather?.city}
          </span>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Ubah lokasi"
        >
          <Search size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Location Input */}
      {showInput && (
        <div className="mb-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Masukkan nama kota..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cari
            </button>
          </div>
          <button
            onClick={getGPSLocation}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Navigation size={14} />
            Gunakan Lokasi GPS
          </button>
        </div>
      )}

      {/* Weather Display */}
      {error ? (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          <button
            onClick={() => setShowInput(true)}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            Coba kota lain
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : weather && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold text-gray-800 dark:text-white">{weather.temp}°C</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{weather.condition}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center">
              {getWeatherIcon(weather.condition)}
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-500">💧</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">💨</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{weather.windSpeed} km/h</span>
            </div>
          </div>

          {/* BMKG Source */}
          <p className="text-[10px] text-gray-400 mt-2 text-center">Data: Open-Meteo.com</p>
        </>
      )}
    </div>
  );
};

// === QUOTE WIDGET ===
const QUOTE_REFRESH_INTERVAL = 5 * 60; // 5 minutes in seconds

const QuoteWidget: React.FC = () => {
  const [quote, setQuote] = useState(QUOTES[0]);
  const [fadeIn, setFadeIn] = useState(true);
  const [countdown, setCountdown] = useState(QUOTE_REFRESH_INTERVAL);

  // Get random quote
  const getRandomQuote = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    return QUOTES[randomIndex];
  }, []);

  // Initial quote and 5-minute refresh
  useEffect(() => {
    setQuote(getRandomQuote());
    setCountdown(QUOTE_REFRESH_INTERVAL);

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuote(getRandomQuote());
        setFadeIn(true);
        setCountdown(QUOTE_REFRESH_INTERVAL);
      }, 300);
    }, QUOTE_REFRESH_INTERVAL * 1000);

    return () => clearInterval(interval);
  }, [getRandomQuote]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : QUOTE_REFRESH_INTERVAL));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-900/30 dark:to-pink-900/30 backdrop-blur-sm rounded-2xl p-4 pb-3 border border-purple-200/50 dark:border-purple-700/50 shadow-lg relative overflow-hidden">
      {/* Floating Sparkles Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-4 text-purple-400/40 animate-bounce" style={{ animationDuration: '3s', animationDelay: '0s' }}>✨</div>
        <div className="absolute top-6 right-6 text-pink-400/40 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>💫</div>
        <div className="absolute top-1/2 left-2 text-purple-300/20 animate-pulse" style={{ animationDuration: '4s' }}>🌸</div>
        <div className="absolute top-1/3 right-2 text-pink-300/20 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>🍃</div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={16} />
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 uppercase font-bold tracking-wider">Quote Hari Ini</p>
        </div>

        {/* Quote Content */}
        <div className={`transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-gray-700 dark:text-gray-200 italic text-sm leading-relaxed line-clamp-2">"{quote.text}"</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">— {quote.author}</p>
        </div>

        {/* Cool Timer at Bottom Center */}
        <div className="flex justify-center mt-3 pt-2 border-t border-purple-300/20 dark:border-purple-700/30">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full">
            <div className="relative w-5 h-5">
              {/* Circular Progress */}
              <svg className="w-5 h-5 transform -rotate-90">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-purple-200 dark:text-purple-900"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={50.27}
                  strokeDashoffset={50.27 - (50.27 * countdown / QUOTE_REFRESH_INTERVAL)}
                  className="text-purple-500 transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
              {formatCountdown(countdown)}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">hingga quote baru</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// === QUICK ACCESS WIDGET (Customizable) ===
const DEFAULT_QUICK_ACCESS: ModuleId[] = ['ai-chat', 'virtual-photoshoot', 'vidgen'];
const MAX_QUICK_ACCESS = 4;

const QuickAccessWidget: React.FC<{ onNavigate: (id: ModuleId) => void }> = ({ onNavigate }) => {
  const [quickAccess, setQuickAccess] = useState<ModuleId[]>(DEFAULT_QUICK_ACCESS);
  const [isEditing, setIsEditing] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('QUICK_ACCESS_MODULES');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickAccess(parsed);
        }
      } catch (e) {
        console.error('Failed to parse quick access:', e);
      }
    }
  }, []);

  // Save to localStorage
  const saveQuickAccess = (modules: ModuleId[]) => {
    setQuickAccess(modules);
    localStorage.setItem('QUICK_ACCESS_MODULES', JSON.stringify(modules));
  };

  // Toggle module in quick access
  const toggleModule = (moduleId: ModuleId) => {
    if (quickAccess.includes(moduleId)) {
      // Remove
      saveQuickAccess(quickAccess.filter(id => id !== moduleId));
    } else if (quickAccess.length < MAX_QUICK_ACCESS) {
      // Add
      saveQuickAccess([...quickAccess, moduleId]);
    }
  };

  // Get module info - will be defined after MODULES export, so we use a lookup
  const getModuleInfo = (id: ModuleId) => {
    const moduleMap: Record<string, { title: string; icon: string; gradient: string }> = {
      'ai-chat': { title: 'Ngobrol dengan AI', icon: '💬', gradient: 'from-violet-500/10 to-purple-500/10' },
      'virtual-photoshoot': { title: 'Foto Studio Virtual', icon: '📸', gradient: 'from-pink-500/10 to-rose-500/10' },
      'vidgen': { title: 'VidGen by VEO3', icon: '🎥', gradient: 'from-indigo-500/10 to-blue-500/10' },
      'prewed-virtual': { title: 'Prewed Virtual', icon: '💍', gradient: 'from-rose-400/10 to-pink-600/10' },
      'cosplay-fusion': { title: 'Cosplay Fusion', icon: '🎭', gradient: 'from-purple-500/10 to-indigo-500/10' },
      'nusantara-studio': { title: 'Studio Pakaian Adat', icon: '🏛️', gradient: 'from-red-600/10 to-red-800/10' },
      'yt-short-maker': { title: 'YT Short Maker', icon: '📹', gradient: 'from-red-600/10 to-orange-600/10' },
      'voice-over': { title: 'Voice Over Studio', icon: '🎙️', gradient: 'from-teal-500/10 to-emerald-600/10' },
      'ai-melukis': { title: 'AI Melukis', icon: '🖌️', gradient: 'from-amber-600/10 to-yellow-600/10' },
      'wallpaper-generator': { title: 'Wallpaper Generator', icon: '🖼️', gradient: 'from-fuchsia-500/10 to-purple-600/10' },
      'karikatur': { title: 'AI Karikatur', icon: '🎨', gradient: 'from-orange-400/10 to-amber-500/10' },
      'story-board': { title: 'Story Board', icon: '🎬', gradient: 'from-blue-600/10 to-cyan-500/10' },
      'infografis': { title: 'Infografis Builder', icon: '📊', gradient: 'from-slate-500/10 to-gray-600/10' },
      'content-creator': { title: 'Analisa & Prompt', icon: '⚡', gradient: 'from-yellow-400/10 to-orange-500/10' },
      'pinsta-product': { title: 'Pinsta Produk', icon: '🛍️', gradient: 'from-emerald-400/10 to-teal-500/10' },
      'rebel-fx': { title: 'Digital RebelFX', icon: '📈', gradient: 'from-cyan-500/10 to-blue-600/10' },
      'catat-duitmu': { title: 'Catat Duitmu', icon: '💰', gradient: 'from-emerald-500/10 to-teal-500/10' },
      'social-downloader': { title: 'Social Downloader', icon: '⬇️', gradient: 'from-pink-500/10 to-purple-500/10' },
      'bikini-photoshoot': { title: 'Mode Musim Panas', icon: '🏖️', gradient: 'from-blue-400/10 to-cyan-400/10' },
    };
    return moduleMap[id] || { title: id, icon: '📦', gradient: 'from-gray-500/10 to-gray-600/10' };
  };

  const allModuleIds: ModuleId[] = [
    'ai-chat', 'virtual-photoshoot', 'vidgen', 'prewed-virtual', 'cosplay-fusion',
    'nusantara-studio', 'yt-short-maker', 'voice-over', 'ai-melukis', 'wallpaper-generator',
    'karikatur', 'story-board', 'infografis', 'content-creator', 'pinsta-product',
    'rebel-fx', 'catat-duitmu', 'social-downloader', 'bikini-photoshoot'
  ];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-gray-700/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Akses Cepat</p>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`text-xs px-2 py-1 rounded-lg transition-colors ${isEditing
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        >
          {isEditing ? '✓ Selesai' : '✏️ Edit'}
        </button>
      </div>

      {/* Edit Mode - Module Selection */}
      {isEditing ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Pilih hingga {MAX_QUICK_ACCESS} modul ({quickAccess.length}/{MAX_QUICK_ACCESS})
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
            {allModuleIds.map((id) => {
              const mod = getModuleInfo(id);
              const isSelected = quickAccess.includes(id);
              const isDisabled = !isSelected && quickAccess.length >= MAX_QUICK_ACCESS;

              return (
                <button
                  key={id}
                  onClick={() => !isDisabled && toggleModule(id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${isSelected
                    ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                    : isDisabled
                      ? 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                    }`}
                >
                  <span className="text-lg">{mod.icon}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{mod.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Normal Mode - Quick Access Buttons */
        <div className="space-y-2">
          {quickAccess.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Klik "Edit" untuk menambahkan shortcut
            </p>
          ) : (
            quickAccess.map((id) => {
              const mod = getModuleInfo(id);
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r ${mod.gradient} hover:opacity-80 transition-all group`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mod.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{mod.title}</span>
                  </div>
                  <ArrowRight size={14} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// Exported and Sorted Alphabetically
export const MODULES: ModuleDefinition[] = ([
  {
    id: 'virtual-photoshoot',
    title: 'Foto Studio Virtual',
    description: 'Ubah selfie biasa menjadi foto studio profesional dengan berbagai konsep.',
    icon: '📸',
    gradient: 'from-pink-500 to-rose-500',
    category: 'Virtual Studio'
  },
  {
    id: 'prewed-virtual',
    title: 'Prewed Virtual',
    description: 'Simulasi foto prewedding profesional dengan berbagai tema (Korean, Rustic, Modern).',
    icon: '💍',
    gradient: 'from-rose-400 to-pink-600',
    category: 'Virtual Studio'
  },
  {
    id: 'cosplay-fusion',
    title: 'Cosplay Fusion',
    description: 'Berubah menjadi karakter favorit Anda dengan transformasi cosplay berkualitas tinggi.',
    icon: '🎭',
    gradient: 'from-purple-500 to-indigo-500',
    category: 'Virtual Studio'
  },
  {
    id: 'nusantara-studio',
    title: 'Studio Pakaian Adat',
    description: 'Tampilkan warisan budaya dengan pakaian adat tradisional Indonesia.',
    icon: '🏛️',
    gradient: 'from-red-600 to-red-800',
    category: 'Virtual Studio'
  },
  {
    id: 'bikini-photoshoot',
    title: 'Mode Musim Panas',
    description: 'Ubah foto menjadi suasana pantai yang cerah dan estetika musim panas.',
    icon: '🏖️',
    gradient: 'from-blue-400 to-cyan-400',
    category: 'Virtual Studio'
  },
  {
    id: 'yt-short-maker',
    title: 'YT Short Maker',
    description: 'Ubah video YouTube panjang menjadi Shorts viral otomatis dengan analisis AI.',
    icon: '📹',
    gradient: 'from-red-600 to-orange-600',
    category: 'Video & Audio'
  },
  {
    id: 'vidgen',
    title: 'VidGen by VEO3',
    description: 'Buat video sinematik dari teks atau gambar dengan AI Generatif Google Veo 3.',
    icon: '🎥',
    gradient: 'from-indigo-600 to-purple-600',
    category: 'Video & Audio'
  },
  {
    id: 'voice-over',
    title: 'Voice Over Studio',
    description: 'Ubah teks menjadi suara manusia yang natural dengan berbagai pilihan emosi.',
    icon: '🎙️',
    gradient: 'from-teal-500 to-emerald-600',
    category: 'Video & Audio'
  },
  {
    id: 'ai-melukis',
    title: 'AI Melukis Imajinasi',
    description: 'Atelier digital: Ubah teks & foto menjadi lukisan cat minyak artistik dengan kontrol komposisi.',
    icon: '🖌️',
    gradient: 'from-amber-600 to-yellow-600',
    category: 'Seni & Desain'
  },
  {
    id: 'wallpaper-generator',
    title: 'Wallpaper Generator',
    description: 'Buat wallpaper HD estetik untuk HP (9:16) dan Desktop (16:9) dengan berbagai gaya.',
    icon: '🖼️',
    gradient: 'from-fuchsia-500 to-purple-600',
    category: 'Seni & Desain'
  },
  {
    id: 'karikatur',
    title: 'AI Karikatur',
    description: 'Buat gambar karikatur artistik yang lucu dan unik dari potret standar.',
    icon: '🎨',
    gradient: 'from-orange-400 to-amber-500',
    category: 'Seni & Desain'
  },
  {
    id: 'story-board',
    title: 'Story Board',
    description: 'Buat alur cerita visual 5 panel otomatis dari tema atau gambar referensi.',
    icon: '🎬',
    gradient: 'from-blue-600 to-cyan-500',
    category: 'Seni & Desain'
  },
  {
    id: 'infografis',
    title: 'Infografis Builder',
    description: 'Ubah teks data mentah menjadi konsep infografis visual yang indah.',
    icon: '📊',
    gradient: 'from-slate-500 to-gray-600',
    category: 'Bisnis & Marketing'
  },
  {
    id: 'content-creator',
    title: 'Analisa & Prompt',
    description: 'Reverse engineering prompt, ekstrak outfit, dan optimasi konten sosial media.',
    icon: '⚡',
    gradient: 'from-yellow-400 to-orange-500',
    category: 'Bisnis & Marketing'
  },
  {
    id: 'pinsta-product',
    title: 'Pinsta Produk',
    description: 'Tingkatkan foto produk UMKM menjadi kualitas komersial kelas atas.',
    icon: '🛍️',
    gradient: 'from-emerald-400 to-teal-500',
    category: 'Bisnis & Marketing'
  },
  {
    id: 'rebel-fx',
    title: 'Digital RebelFX',
    description: 'AI Market Analysis, Chatbot Astra, dan Signal Generator untuk Trader Forex Modern.',
    icon: '📈',
    gradient: 'from-cyan-500 to-blue-600',
    category: 'Bisnis & Marketing'
  },
  {
    id: 'catat-duitmu',
    title: 'Catat Duitmu',
    description: 'Kelola keuangan harian dengan fitur dompet pintar dan pelacakan transaksi real-time.',
    icon: <Wallet />,
    gradient: 'from-emerald-500 to-teal-500',
    category: 'Keuangan'
  },
  {
    id: 'social-downloader',
    title: 'Social Media Downloader',
    description: 'Download video & gambar dari Instagram, TikTok, YouTube, Twitter, Facebook, dan lainnya.',
    icon: '⬇️',
    gradient: 'from-pink-500 via-purple-500 to-blue-500',
    category: 'Utilitas'
  },
  {
    id: 'ai-chat',
    title: 'Ngobrol dengan AI',
    description: 'Teman ngobrol AI yang santai & ceplas-ceplos. Bisa chat suara & minta dibuatkan gambar!',
    icon: '💬',
    gradient: 'from-violet-500 to-purple-600',
    category: 'AI Assistant'
  }
] as ModuleDefinition[]).sort((a, b) => a.title.localeCompare(b.title));

// === INFO POPUP COMPONENT ===
const INFO_POPUP_STORAGE_KEY = 'NUSANTARA_AI_INFO_DISMISSED';

const InfoPopup: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleDismiss}
      />

      {/* Popup Card */}
      <div
        className={`relative w-full max-w-lg transform transition-all duration-500 ease-out ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
      >
        {/* Outer Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 rounded-3xl blur-lg opacity-75 animate-pulse" />

        {/* Card Content */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-white/10 overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-violet-500 rounded-full filter blur-3xl animate-blob" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-500 rounded-full filter blur-3xl animate-blob animation-delay-2000" />
            <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-cyan-500 rounded-full filter blur-3xl animate-blob animation-delay-4000" />
          </div>

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 border-b border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Info className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Informasi Penting
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      BACA INI
                    </span>
                  </h3>
                  <p className="text-sm text-slate-400">Tentang API Key & Fitur Generate Gambar</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative px-6 py-5 space-y-4">
            {/* Warning Card */}
            <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="flex-shrink-0 text-amber-400 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-white leading-relaxed">
                  <span className="font-semibold text-amber-300">API KEY dari AI Studio</span> hanya bisa digunakan untuk:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Chat / Text biasa ✓
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Text-to-Speech (TTS) ✓
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span className="text-red-300">Generate Gambar ✗</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Solution Card */}
            <div className="flex gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
              <Zap className="flex-shrink-0 text-violet-400 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-white font-medium mb-1">
                  Mau fitur Generate Gambar?
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Klaim <span className="font-bold text-cyan-300">FREE TRIAL KREDIT $300</span> dari Google Cloud untuk menikmati API key yang support image generation.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative px-6 py-4 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row gap-3">
            <a
              href="https://cloud.google.com/free"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ExternalLink size={16} />
              Klaim Free Trial $300
            </a>
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all"
            >
              Mengerti, Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(30px, 10px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export const HomeModule: React.FC<HomeProps> = ({ onNavigate }) => {
  // Shared weather state for Hero background
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('sunny');

  // Info popup state - check localStorage
  const [showInfoPopup, setShowInfoPopup] = useState(() => {
    return localStorage.getItem(INFO_POPUP_STORAGE_KEY) !== 'true';
  });

  const handleDismissPopup = () => {
    setShowInfoPopup(false);
    localStorage.setItem(INFO_POPUP_STORAGE_KEY, 'true');
  };

  // Determine weather condition from simulated data
  useEffect(() => {
    const conditions: WeatherCondition[] = ['sunny', 'cloudy', 'rainy'];
    // Randomly select weather (in production, this would come from real API)
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    setWeatherCondition(randomCondition);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Popup */}
      {showInfoPopup && <InfoPopup onDismiss={handleDismissPopup} />}

      {/* Hero Section with dynamic background */}
      <HeroSection weather={weatherCondition} />

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <WeatherWidget onWeatherChange={setWeatherCondition} />
        <QuoteWidget />
        <QuickAccessWidget onNavigate={onNavigate} />
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Semua Modul</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">({MODULES.length} modul)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const slider = document.getElementById('module-slider');
              if (slider) slider.scrollBy({ left: -300, behavior: 'smooth' });
            }}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => {
              const slider = document.getElementById('module-slider');
              if (slider) slider.scrollBy({ left: 300, behavior: 'smooth' });
            }}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Module Horizontal Slider */}
      <div
        id="module-slider"
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {MODULES.map((mod) => (
          <div
            key={mod.id}
            onClick={() => onNavigate(mod.id)}
            className="flex-shrink-0 w-[280px] bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all cursor-pointer group relative overflow-hidden snap-start"
          >
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${mod.gradient} opacity-10 rounded-bl-full group-hover:scale-125 transition-transform duration-300`} />
            <div className="relative z-10 space-y-2">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-lg`}>
                <span className="text-xl">{mod.icon}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0.5 line-clamp-1">{mod.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 h-8">{mod.description}</p>
                {mod.category && (
                  <span className="inline-block mt-1.5 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 tracking-wider">
                    {mod.category}
                  </span>
                )}
              </div>
              <div className="pt-1 flex items-center text-primary-600 dark:text-primary-400 font-medium text-xs group-hover:translate-x-1 transition-transform">
                Buka
                <ArrowRight size={12} className="ml-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};