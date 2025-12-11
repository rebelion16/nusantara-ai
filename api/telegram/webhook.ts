// api/telegram/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Simple send message function
async function sendMessage(chatId: string, text: string, replyMarkup?: any) {
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({
            ok: true,
            message: 'Telegram webhook is ready',
            hasToken: !!BOT_TOKEN
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;
        console.log('Received update:', JSON.stringify(update));

        // Handle /start command
        if (update.message?.text === '/start') {
            const chatId = update.message.chat.id.toString();
            const username = update.message.from.first_name || 'User';

            await sendMessage(
                chatId,
                `👋 <b>Selamat datang di Catat Duitmu Bot, ${username}!</b>\n\n` +
                `Bot ini terintegrasi dengan aplikasi Nusantara AI untuk mengelola keuangan Anda.\n\n` +
                `🔗 Silakan login dengan Gmail untuk melanjutkan:`,
                {
                    inline_keyboard: [[
                        {
                            text: '🔐 Login dengan Gmail',
                            url: `${process.env.NEXTAUTH_URL}/api/telegram/auth?state=${update.message.from.id}_${Date.now()}`
                        }
                    ]]
                }
            );
        }

        // Handle callback queries
        if (update.callback_query) {
            const callbackId = update.callback_query.id;
            await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: callbackId }),
            });
        }

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(200).json({ ok: true, error: error.message });
    }
}
