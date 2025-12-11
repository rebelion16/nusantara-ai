// api/telegram/callback.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { firestoreHelpers } from '../../lib/firebase-admin';
import { sendMessage } from '../../lib/telegram/bot';
import { mainMenuKeyboard } from '../../lib/telegram/keyboards';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).send(`
            <html>
                <head><title>Login Error</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
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
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${process.env.NEXTAUTH_URL}/api/telegram/callback`,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
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

        // Get session from Firestore
        const session = await firestoreHelpers.getAndDeleteOAuthSession(state);

        if (!session) {
            throw new Error('Session expired or invalid');
        }

        // Link telegram user
        await firestoreHelpers.linkTelegramUser(
            session.telegramId,
            session.chatId,
            userInfo.email,
            userInfo.name
        );

        // Get wallets for initial summary
        const wallets = await firestoreHelpers.getWalletsByEmail(userInfo.email);
        const totalAssets = wallets.reduce((sum: number, w: any) => sum + (w.balance || 0), 0);

        // Send success message to Telegram
        await sendMessage(
            session.chatId,
            `✅ <b>Login Berhasil!</b>

👤 Email: ${userInfo.email}
💰 Total Aset: Rp ${totalAssets.toLocaleString('id-ID')}
📊 Dompet: ${wallets.length} buah

Selamat menggunakan Catat Duitmu Bot!`,
            { reply_markup: mainMenuKeyboard }
        );

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
                        .icon {
                            font-size: 64px;
                            margin-bottom: 20px;
                        }
                        h1 {
                            font-size: 24px;
                            margin-bottom: 12px;
                            color: #4ade80;
                        }
                        p {
                            color: rgba(255,255,255,0.7);
                            line-height: 1.6;
                            margin-bottom: 8px;
                        }
                        .email {
                            background: rgba(74, 222, 128, 0.1);
                            border: 1px solid rgba(74, 222, 128, 0.3);
                            padding: 12px 20px;
                            border-radius: 12px;
                            margin: 20px 0;
                            color: #4ade80;
                            font-weight: 500;
                        }
                        .hint {
                            font-size: 14px;
                            color: rgba(255,255,255,0.5);
                            margin-top: 24px;
                        }
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

    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).send(`
            <html>
                <head><title>Error</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1>❌ Terjadi Kesalahan</h1>
                    <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
                    <p>Silakan tutup halaman ini dan coba lagi di Telegram.</p>
                </body>
            </html>
        `);
    }
}
