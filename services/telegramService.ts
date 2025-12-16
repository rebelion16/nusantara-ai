// Telegram Bot Service for sending images
// Uses Telegram Bot API to send generated images to a specified chat

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

// Get stored Telegram settings from localStorage
export const getTelegramSettings = (): { botToken: string; chatId: string } | null => {
    if (typeof window === 'undefined') return null;

    const botToken = localStorage.getItem('TELEGRAM_BOT_TOKEN');
    const chatId = localStorage.getItem('TELEGRAM_CHAT_ID');

    if (botToken && chatId) {
        return { botToken, chatId };
    }
    return null;
};

// Save Telegram settings to localStorage
export const saveTelegramSettings = (botToken: string, chatId: string): void => {
    localStorage.setItem('TELEGRAM_BOT_TOKEN', botToken);
    localStorage.setItem('TELEGRAM_CHAT_ID', chatId);
};

// Clear Telegram settings
export const clearTelegramSettings = (): void => {
    localStorage.removeItem('TELEGRAM_BOT_TOKEN');
    localStorage.removeItem('TELEGRAM_CHAT_ID');
};

// Check if Telegram is configured
export const isTelegramConfigured = (): boolean => {
    return getTelegramSettings() !== null;
};

// Convert base64 data URL to Blob
const base64ToBlob = (base64DataUrl: string): Blob => {
    // Remove the data URL prefix (e.g., "data:image/png;base64,")
    const parts = base64DataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64Data = parts[1];

    // Decode base64
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

// Send image to Telegram
export const sendImageToTelegram = async (
    imageBase64: string,
    caption?: string
): Promise<{ success: boolean; message: string }> => {
    const settings = getTelegramSettings();

    if (!settings) {
        return {
            success: false,
            message: 'Telegram belum dikonfigurasi. Silakan masukkan Bot Token dan Chat ID di pengaturan.'
        };
    }

    const { botToken, chatId } = settings;

    try {
        // Convert base64 to Blob
        const imageBlob = base64ToBlob(imageBase64);

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', imageBlob, 'generated_image.png');

        if (caption) {
            formData.append('caption', caption);
        }

        // Send to Telegram API
        const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.ok) {
            return {
                success: true,
                message: '✅ Gambar berhasil dikirim ke Telegram!'
            };
        } else {
            // Handle specific Telegram errors
            let errorMsg = result.description || 'Unknown error';

            if (result.error_code === 401) {
                errorMsg = 'Bot Token tidak valid. Periksa kembali token Anda.';
            } else if (result.error_code === 400 && errorMsg.includes('chat not found')) {
                errorMsg = 'Chat ID tidak ditemukan. Pastikan Anda sudah memulai chat dengan bot.';
            }

            return {
                success: false,
                message: `❌ Gagal mengirim: ${errorMsg}`
            };
        }
    } catch (error: any) {
        console.error('Telegram send error:', error);
        return {
            success: false,
            message: `❌ Error: ${error.message || 'Gagal menghubungi Telegram API'}`
        };
    }
};

// Test Telegram connection by sending a test message
export const testTelegramConnection = async (): Promise<{ success: boolean; message: string }> => {
    const settings = getTelegramSettings();

    if (!settings) {
        return {
            success: false,
            message: 'Telegram belum dikonfigurasi.'
        };
    }

    const { botToken, chatId } = settings;

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: '🎨 Nusantara AI Studio terhubung! Gambar hasil generate akan dikirim ke sini.'
            })
        });

        const result = await response.json();

        if (result.ok) {
            return {
                success: true,
                message: '✅ Koneksi berhasil! Cek chat Telegram Anda.'
            };
        } else {
            return {
                success: false,
                message: `❌ Gagal: ${result.description || 'Unknown error'}`
            };
        }
    } catch (error: any) {
        return {
            success: false,
            message: `❌ Error: ${error.message || 'Gagal menghubungi Telegram API'}`
        };
    }
};
