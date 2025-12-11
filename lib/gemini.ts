// lib/gemini.ts
// Google AI Studio / Gemini API Integration

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash'; // Fast and cost-effective
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface GeminiResponse {
    candidates: {
        content: {
            parts: { text: string }[];
            role: string;
        };
        finishReason: string;
    }[];
}

/**
 * Send a message to Gemini API
 */
export async function sendToGemini(
    prompt: string,
    systemInstruction?: string,
    history?: GeminiMessage[]
): Promise<string> {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not found. Set VITE_GEMINI_API_KEY in .env');
        throw new Error('API key not configured');
    }

    const contents: GeminiMessage[] = history || [];
    contents.push({
        role: 'user',
        parts: [{ text: prompt }]
    });

    const requestBody: any = {
        contents,
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    };

    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Gemini API error:', error);
            throw new Error(error.error?.message || 'API request failed');
        }

        const data: GeminiResponse = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

/**
 * Financial Assistant - Analyze spending and provide insights
 */
export async function getFinancialInsight(
    totalIncome: number,
    totalExpense: number,
    expenseByCategory: { category: string; amount: number }[],
    walletBalances: { name: string; balance: number }[]
): Promise<string> {
    const systemPrompt = `Kamu adalah asisten keuangan pribadi yang bernama "Catat Duit AI". 
Berikan analisis singkat dan saran praktis dalam bahasa Indonesia yang santai tapi informatif.
Gunakan emoji untuk membuat respons lebih menarik.
Fokus pada:
1. Pola pengeluaran
2. Saran penghematan
3. Rekomendasi anggaran
Maksimal 150 kata.`;

    const prompt = `Analisis keuangan saya bulan ini:
- Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}
- Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}
- Saldo: Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}

Pengeluaran per kategori:
${expenseByCategory.map(c => `- ${c.category}: Rp ${c.amount.toLocaleString('id-ID')}`).join('\n')}

Saldo dompet:
${walletBalances.map(w => `- ${w.name}: Rp ${w.balance.toLocaleString('id-ID')}`).join('\n')}

Berikan insight dan saran!`;

    return sendToGemini(prompt, systemPrompt);
}

/**
 * Parse natural language to transaction
 */
export async function parseTransactionFromText(text: string): Promise<{
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
} | null> {
    const systemPrompt = `Kamu adalah parser transaksi keuangan. Ekstrak informasi dari teks bahasa Indonesia.
Kembalikan HANYA JSON tanpa markdown atau penjelasan.
Format: {"type":"income"|"expense","category":"string","amount":number,"description":"string"}
Kategori pemasukan: Gaji, Bonus, Penjualan, Investasi, Hadiah, Lainnya
Kategori pengeluaran: Makanan, Transportasi, Belanja, Tagihan, Hiburan, Kesehatan, Pendidikan, Donasi, Lainnya
Jika tidak bisa diparsing, kembalikan: null`;

    const result = await sendToGemini(text, systemPrompt);

    try {
        const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.type && parsed.category && parsed.amount) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Chat with financial assistant
 */
export async function chatWithAssistant(
    message: string,
    context?: {
        totalBalance: number;
        monthlyIncome: number;
        monthlyExpense: number;
    },
    history?: GeminiMessage[]
): Promise<string> {
    const systemPrompt = `Kamu adalah "Catat Duit AI", asisten keuangan pribadi yang ramah dan membantu.
Gunakan bahasa Indonesia yang santai dengan emoji.
${context ? `
Konteks keuangan pengguna:
- Total Saldo: Rp ${context.totalBalance.toLocaleString('id-ID')}
- Pemasukan Bulan Ini: Rp ${context.monthlyIncome.toLocaleString('id-ID')}
- Pengeluaran Bulan Ini: Rp ${context.monthlyExpense.toLocaleString('id-ID')}
` : ''}
Bantu pengguna dengan pertanyaan keuangan, saran penghematan, atau tips budgeting.
Jaga respons tetap singkat (maksimal 100 kata) kecuali diminta lebih detail.`;

    return sendToGemini(message, systemPrompt, history);
}
