// api/telegram/callback.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Firebase REST API config
const FIREBASE_PROJECT_ID = 'nusantara-ai-18db6';
const FIREBASE_API_KEY = 'AIzaSyAPEZbIMw23gZO-A1aBd7zWELxKVOsSYWE';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

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
    ],
};

// Save telegram user link to Firestore
async function saveTelegramUser(telegramId: string, email: string): Promise<boolean> {
    try {
        // Use telegramId as document ID for easy lookup
        const url = `${FIRESTORE_URL}/telegram_users/${telegramId}?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    telegramId: { stringValue: telegramId },
                    email: { stringValue: email },
                    linkedAt: { timestampValue: new Date().toISOString() },
                }
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving telegram user:', error);
        return false;
    }
}

// Get wallets count for summary
async function getWalletsCount(email: string): Promise<number> {
    try {
        const url = `${FIRESTORE_URL}:runQuery?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: 'wallets' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'userId' },
                            op: 'EQUAL',
                            value: { stringValue: email }
                        }
                    }
                }
            })
        });
        const data = await response.json();
        if (!Array.isArray(data)) return 0;
        return data.filter((item: any) => item.document).length;
    } catch (error) {
        return 0;
    }
}

// Format currency helper
function formatCurrency(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).send(`
            <html>
                <head><title>Login Error</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
                    <h1>❌ Login Gagal</h1>
                    <p>Error: ${error}</p>
                    <p>Silakan tutup halaman ini dan coba lagi di Telegram.</p>
                </body>
            </html>
        `);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        return res.status(400).send('Missing code or state');
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const appUrl = process.env.NEXTAUTH_URL || 'https://nusantara-ai-six.vercel.app';

        if (!clientId || !clientSecret) {
            throw new Error('Missing OAuth credentials');
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: `${appUrl}/api/telegram/callback`,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
            console.error('Token response:', tokens);
            throw new Error('Failed to get access token');
        }

        // Get user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const userInfo = await userInfoResponse.json();

        if (!userInfo.email) {
            throw new Error('Failed to get user email');
        }

        // Extract telegram ID from state (format: telegramId_timestamp)
        const telegramId = state.split('_')[0];

        // Save telegram user link to Firestore
        await saveTelegramUser(telegramId, userInfo.email);

        // Get wallet count for summary
        const walletCount = await getWalletsCount(userInfo.email);

        // Send success message to Telegram
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramId,
                text: `✅ <b>Login Berhasil!</b>\n\n` +
                    `👤 Email: ${userInfo.email}\n` +
                    `📁 Dompet: ${walletCount} buah\n\n` +
                    `Selamat menggunakan Catat Duitmu Bot!\n\n` +
                    `<i>Pilih menu di bawah untuk melanjutkan:</i>`,
                parse_mode: 'HTML',
                reply_markup: mainMenuKeyboard,
            }),
        });

        // Show success page
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Login Berhasil - Catat Duitmu</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: linear-gradient(135deg, #1a2333 0%, #0f1520 100%);
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 20px;
                            color: white;
                        }
                        .card {
                            background: rgba(255,255,255,0.05);
                            backdrop-filter: blur(10px);
                            border-radius: 24px;
                            padding: 40px;
                            text-align: center;
                            max-width: 400px;
                            border: 1px solid rgba(255,255,255,0.1);
                        }
                        .icon { font-size: 64px; margin-bottom: 20px; }
                        h1 { font-size: 24px; margin-bottom: 12px; color: #4ade80; }
                        p { color: rgba(255,255,255,0.7); line-height: 1.6; }
                        .email {
                            background: rgba(74, 222, 128, 0.1);
                            border: 1px solid rgba(74, 222, 128, 0.3);
                            padding: 12px 20px;
                            border-radius: 12px;
                            margin: 20px 0;
                            color: #4ade80;
                            font-weight: 500;
                        }
                        .hint { font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 24px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">✅</div>
                        <h1>Login Berhasil!</h1>
                        <p>Akun Anda telah terhubung dengan Telegram Bot.</p>
                        <div class="email">${userInfo.email}</div>
                        <p class="hint">Anda bisa menutup halaman ini dan kembali ke Telegram.</p>
                    </div>
                </body>
            </html>
        `);

    } catch (err: any) {
        console.error('Callback error:', err);
        res.status(500).send(`
            <html>
                <head><title>Error</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
                    <h1>❌ Terjadi Kesalahan</h1>
                    <p>${err.message}</p>
                    <p>Silakan tutup halaman ini dan coba lagi di Telegram.</p>
                </body>
            </html>
        `);
    }
}
