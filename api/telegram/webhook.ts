// api/telegram/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = process.env.NEXTAUTH_URL || 'https://nusantara-ai-six.vercel.app';

// Send message to user
async function sendMessage(chatId: string, text: string, replyMarkup?: any): Promise<any> {
    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            }),
        });
        return response.json();
    } catch (error) {
        console.error('sendMessage error:', error);
        throw error;
    }
}

// Answer callback query
async function answerCallback(callbackId: string): Promise<any> {
    try {
        const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId }),
        });
        return response.json();
    } catch (error) {
        console.error('answerCallback error:', error);
        throw error;
    }
}

// Main menu keyboard
const mainMenuKeyboard = {
    inline_keyboard: [
        [
            { text: '💳 Dompet', callback_data: 'menu_wallets' },
            { text: '➕ Pemasukan', callback_data: 'menu_income' },
            { text: '➖ Pengeluaran', callback_data: 'menu_expense' },
        ],
        [
            { text: '📊 Laporan', callback_data: 'menu_report' },
            { text: '📜 Riwayat', callback_data: 'menu_history' },
        ],
        [{ text: '🔄 Refresh', callback_data: 'menu_refresh' }],
    ],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({
            ok: true,
            message: 'Telegram webhook is ready',
            hasToken: !!BOT_TOKEN,
            appUrl: APP_URL
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;
        console.log('Received update:', JSON.stringify(update).substring(0, 500));

        // Handle /start command
        if (update.message?.text === '/start') {
            const chatId = update.message.chat.id.toString();
            const telegramId = update.message.from.id.toString();
            const firstName = update.message.from.first_name || 'User';

            // Generate auth state
            const state = `${telegramId}_${Date.now()}`;
            const authUrl = `${APP_URL}/api/telegram/auth?state=${state}`;

            console.log('Sending welcome message to:', chatId);

            const result = await sendMessage(
                chatId,
                `👋 <b>Selamat datang di Catat Duitmu Bot, ${firstName}!</b>\n\n` +
                `Bot ini terintegrasi dengan aplikasi <b>Nusantara AI</b> untuk mengelola keuangan Anda.\n\n` +
                `📱 <b>Fitur:</b>\n` +
                `• Tambah dompet (Bank, E-Wallet, Tunai)\n` +
                `• Catat pemasukan & pengeluaran\n` +
                `• Lihat laporan keuangan\n` +
                `• Sinkron dengan web app\n\n` +
                `🔗 Silakan login dengan Gmail yang sama dengan akun Nusantara AI Anda:`,
                {
                    inline_keyboard: [[
                        { text: '🔐 Login dengan Gmail', url: authUrl }
                    ]]
                }
            );

            console.log('Message sent result:', JSON.stringify(result));
        }

        // Handle callback queries
        if (update.callback_query) {
            const callbackId = update.callback_query.id;
            const chatId = update.callback_query.message.chat.id.toString();
            const data = update.callback_query.data;

            await answerCallback(callbackId);

            // For now, show a simple response
            if (data === 'menu_main' || data === 'menu_refresh') {
                await sendMessage(
                    chatId,
                    `📊 <b>Menu Utama</b>\n\n` +
                    `Pilih menu di bawah:`,
                    mainMenuKeyboard
                );
            } else {
                await sendMessage(
                    chatId,
                    `⚠️ Fitur <b>${data}</b> sedang dalam pengembangan.\n\n` +
                    `Pastikan Anda sudah login dengan Gmail terlebih dahulu.`,
                    { inline_keyboard: [[{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]] }
                );
            }
        }

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(200).json({ ok: true, error: error.message });
    }
}
