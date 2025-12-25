// === BMKG Weather Service ===
// Data dari BMKG API (https://api.bmkg.go.id/publik/prakiraan-cuaca)

export interface BMKGWeatherData {
    temp: number;
    humidity: number;
    windSpeed: number;
    condition: string;
    conditionEn: string;
    city: string;
    localTime: string;
}

// Kode wilayah untuk kota-kota besar di Indonesia
export const CITY_CODES: Record<string, { name: string; code: string }> = {
    'jakarta': { name: 'Jakarta Pusat', code: '31.71.01.1001' },
    'bandung': { name: 'Bandung', code: '32.73.01.1001' },
    'surabaya': { name: 'Surabaya', code: '35.78.01.1001' },
    'medan': { name: 'Medan', code: '12.71.01.1001' },
    'semarang': { name: 'Semarang', code: '33.74.01.1001' },
    'makassar': { name: 'Makassar', code: '73.71.01.1001' },
    'palembang': { name: 'Palembang', code: '16.71.01.1001' },
    'yogyakarta': { name: 'Yogyakarta', code: '34.71.01.1001' },
    'denpasar': { name: 'Denpasar', code: '51.71.01.1001' },
    'balikpapan': { name: 'Balikpapan', code: '64.71.01.1001' },
    'manado': { name: 'Manado', code: '71.71.01.1001' },
    'pontianak': { name: 'Pontianak', code: '61.71.01.1001' },
    'banjarmasin': { name: 'Banjarmasin', code: '63.71.01.1001' },
    'depok': { name: 'Depok', code: '32.76.01.1001' },
    'tangerang': { name: 'Tangerang', code: '36.71.01.1001' },
    'bekasi': { name: 'Bekasi', code: '32.75.01.1001' },
    'bogor': { name: 'Bogor', code: '32.71.01.1001' },
    'malang': { name: 'Malang', code: '35.73.01.1001' },
    'solo': { name: 'Surakarta', code: '33.72.01.1001' },
    'batam': { name: 'Batam', code: '21.71.01.1001' },
};

// Fetch weather from BMKG API
export async function fetchBMKGWeather(cityCode: string): Promise<BMKGWeatherData | null> {
    try {
        const response = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${cityCode}`);

        if (!response.ok) {
            throw new Error(`BMKG API error: ${response.status}`);
        }

        const data = await response.json();

        // Parse response - struktur: data[0].cuaca[0][0] untuk data terkini
        if (data?.data?.[0]?.cuaca?.[0]?.[0]) {
            const current = data.data[0].cuaca[0][0];
            const location = data.data[0].lokasi;

            return {
                temp: current.t,
                humidity: current.hu,
                windSpeed: current.ws,
                condition: current.weather_desc,
                conditionEn: current.weather_desc_en,
                city: location?.desa || location?.kecamatan || 'Unknown',
                localTime: current.local_datetime
            };
        }

        return null;
    } catch (error) {
        console.error('Failed to fetch BMKG weather:', error);
        return null;
    }
}

// Find city code from input
export function findCityCode(input: string): { name: string; code: string } | null {
    const normalized = input.toLowerCase().trim();

    // Direct match
    if (CITY_CODES[normalized]) {
        return CITY_CODES[normalized];
    }

    // Partial match
    for (const [key, value] of Object.entries(CITY_CODES)) {
        if (key.includes(normalized) || value.name.toLowerCase().includes(normalized)) {
            return value;
        }
    }

    return null;
}

// Get available cities for autocomplete
export function getAvailableCities(): string[] {
    return Object.values(CITY_CODES).map(c => c.name);
}
