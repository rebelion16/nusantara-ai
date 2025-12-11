// api/telegram/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = process.env.NEXTAUTH_URL || 'https://nusantara-ai-six.vercel.app';

// Simple in-memory session store (resets on cold start - for demo purposes)
const sessions: Map<string, any> = new Map();

// Send message
async function sendMessage(chatId: string, text: string, replyMarkup?: any) {
    return fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        }),
    });
}

// Edit message
async function editMessage(chatId: string, messageId: number, text: string, replyMarkup?: any) {
    return fetch(`${TELEGRAM_API}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        }),
    });
}

// Answer callback
async function answerCallback(callbackId: string, text?: string) {
    return fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
}

// Keyboards
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

const backKeyboard = {
    inline_keyboard: [[{ text: '🏠 Menu Utama', callback_data: 'menu_main' }]],
};

const incomeCategoriesKeyboard = {
    inline_keyboard: [
        [
            { text: '💼 Gaji', callback_data: 'income_cat_Gaji' },
            { text: '🎁 Bonus', callback_data: 'income_cat_Bonus' },
        ],
        [
            { text: '🛒 Penjualan', callback_data: 'income_cat_Penjualan' },
            { text: '📈 Investasi', callback_data: 'income_cat_Investasi' },
        ],
        [
            { text: '🎀 Hadiah', callback_data: 'income_cat_Hadiah' },
            { text: '📦 Lainnya', callback_data: 'income_cat_Lainnya' },
        ],
        [{ text: '❌ Batal', callback_data: 'menu_main' }],
    ],
};

const expenseCategoriesKeyboard = {
    inline_keyboard: [
        [
            { text: '🍔 Makanan', callback_data: 'expense_cat_Makanan' },
            { text: '🚗 Transport', callback_data: 'expense_cat_Transportasi' },
        ],
        [
            { text: '🛍️ Belanja', callback_data: 'expense_cat_Belanja' },
            { text: '📄 Tagihan', callback_data: 'expense_cat_Tagihan' },
        ],
        [
            { text: '🎮 Hiburan', callback_data: 'expense_cat_Hiburan' },
            { text: '💊 Kesehatan', callback_data: 'expense_cat_Kesehatan' },
        ],
        [{ text: '❌ Batal', callback_data: 'menu_main' }],
    ],
};

const amountKeyboard = (prefix: string) => ({
    inline_keyboard: [
        [
            { text: '10rb', callback_data: `${prefix}_10000` },
            { text: '25rb', callback_data: `${prefix}_25000` },
            { text: '50rb', callback_data: `${prefix}_50000` },
        ],
        [
            { text: '100rb', callback_data: `${prefix}_100000` },
            { text: '250rb', callback_data: `${prefix}_250000` },
            { text: '500rb', callback_data: `${prefix}_500000` },
        ],
        [
            { text: '1jt', callback_data: `${prefix}_1000000` },
            { text: '2jt', callback_data: `${prefix}_2000000` },
            { text: '5jt', callback_data: `${prefix}_5000000` },
        ],
        [{ text: '❌ Batal', callback_data: 'menu_main' }],
    ],
});

const walletTypeKeyboard = {
    inline_keyboard: [
        [
            { text: '🏦 Bank', callback_data: 'wallet_type_bank' },
            { text: '📱 E-Wallet', callback_data: 'wallet_type_e-wallet' },
            { text: '💵 Tunai', callback_data: 'wallet_type_cash' },
        ],
        [{ text: '❌ Batal', callback_data: 'menu_main' }],
    ],
};

// Format currency
function formatCurrency(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        return res.status(200).json({ ok: true, message: 'Webhook ready', hasToken: !!BOT_TOKEN });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;

        // Handle /start command
        if (update.message?.text === '/start') {
            const chatId = update.message.chat.id.toString();
            const telegramId = update.message.from.id.toString();
            const firstName = update.message.from.first_name || 'User';
            const state = `${telegramId}_${Date.now()}`;

            await sendMessage(
                chatId,
                `👋 <b>Selamat datang di Catat Duitmu Bot, ${firstName}!</b>\n\n` +
                `Bot ini terintegrasi dengan aplikasi <b>Nusantara AI</b> untuk mengelola keuangan Anda.\n\n` +
                `📱 <b>Fitur:</b>\n` +
                `• Tambah dompet (Bank, E-Wallet, Tunai)\n` +
                `• Catat pemasukan & pengeluaran\n` +
                `• Lihat laporan keuangan\n` +
                `• Sinkron dengan web app\n\n` +
                `🔗 Silakan login dengan Gmail yang sama dengan akun Nusantara AI Anda:`,
                { inline_keyboard: [[{ text: '🔐 Login dengan Gmail', url: `${APP_URL}/api/telegram/auth?state=${state}` }]] }
            );
        }

        // Handle callbacks
        if (update.callback_query) {
            const callbackId = update.callback_query.id;
            const chatId = update.callback_query.message.chat.id.toString();
            const messageId = update.callback_query.message.message_id;
            const telegramId = update.callback_query.from.id.toString();
            const data = update.callback_query.data;

            await answerCallback(callbackId);

            // Main Menu
            if (data === 'menu_main' || data === 'menu_refresh') {
                await editMessage(chatId, messageId,
                    `📊 <b>Catat Duitmu - Menu Utama</b>\n\n` +
                    `Pilih menu di bawah untuk melanjutkan:`,
                    mainMenuKeyboard
                );
            }

            // Wallets Menu
            else if (data === 'menu_wallets') {
                await editMessage(chatId, messageId,
                    `💳 <b>Dompet Saya</b>\n\n` +
                    `<i>Untuk melihat dan mengelola dompet, silakan buka aplikasi web Nusantara AI.</i>\n\n` +
                    `🌐 <a href="https://nusantara-ai-six.vercel.app">Buka Web App</a>\n\n` +
                    `Atau tambah dompet baru di sini:`,
                    {
                        inline_keyboard: [
                            [{ text: '➕ Tambah Dompet Baru', callback_data: 'wallet_add' }],
                            [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }],
                        ]
                    }
                );
            }

            // Add Wallet
            else if (data === 'wallet_add') {
                sessions.set(telegramId, { flow: 'add_wallet', step: 'type' });
                await editMessage(chatId, messageId,
                    `➕ <b>Tambah Dompet Baru</b>\n\nPilih jenis dompet:`,
                    walletTypeKeyboard
                );
            }

            // Wallet Type Selection
            else if (data.startsWith('wallet_type_')) {
                const walletType = data.replace('wallet_type_', '');
                const typeLabel = walletType === 'bank' ? '🏦 Bank' : walletType === 'e-wallet' ? '📱 E-Wallet' : '💵 Tunai';
                sessions.set(telegramId, { flow: 'add_wallet', step: 'name', walletType });

                await editMessage(chatId, messageId,
                    `➕ <b>Tambah Dompet Baru</b>\n\n` +
                    `📁 Jenis: ${typeLabel}\n\n` +
                    `<i>Kirim nama dompet (contoh: BCA, GoPay, Dompet Utama):</i>`,
                    backKeyboard
                );
            }

            // Income Start
            else if (data === 'menu_income') {
                sessions.set(telegramId, { flow: 'income', step: 'category' });
                await editMessage(chatId, messageId,
                    `💰 <b>Input Pemasukan</b>\n\nPilih kategori:`,
                    incomeCategoriesKeyboard
                );
            }

            // Income Category Selection
            else if (data.startsWith('income_cat_')) {
                const category = data.replace('income_cat_', '');
                const session = sessions.get(telegramId) || {};
                session.flow = 'income';
                session.step = 'amount';
                session.category = category;
                sessions.set(telegramId, session);

                await editMessage(chatId, messageId,
                    `💰 <b>Input Pemasukan</b>\n\n` +
                    `📁 Kategori: ${category}\n\n` +
                    `Pilih atau ketik jumlah:`,
                    amountKeyboard('income_amount')
                );
            }

            // Income Amount Selection
            else if (data.startsWith('income_amount_')) {
                const amount = parseInt(data.replace('income_amount_', ''), 10);
                const session = sessions.get(telegramId) || {};

                await editMessage(chatId, messageId,
                    `✅ <b>Pemasukan Dicatat!</b>\n\n` +
                    `📁 Kategori: ${session.category || '-'}\n` +
                    `💵 Jumlah: +${formatCurrency(amount)}\n\n` +
                    `<i>Catatan: Untuk menyimpan ke database, buka web app dan input di sana.</i>`,
                    backKeyboard
                );
                sessions.delete(telegramId);
            }

            // Expense Start
            else if (data === 'menu_expense') {
                sessions.set(telegramId, { flow: 'expense', step: 'category' });
                await editMessage(chatId, messageId,
                    `💸 <b>Input Pengeluaran</b>\n\nPilih kategori:`,
                    expenseCategoriesKeyboard
                );
            }

            // Expense Category Selection
            else if (data.startsWith('expense_cat_')) {
                const category = data.replace('expense_cat_', '');
                const session = sessions.get(telegramId) || {};
                session.flow = 'expense';
                session.step = 'amount';
                session.category = category;
                sessions.set(telegramId, session);

                await editMessage(chatId, messageId,
                    `💸 <b>Input Pengeluaran</b>\n\n` +
                    `📁 Kategori: ${category}\n\n` +
                    `Pilih atau ketik jumlah:`,
                    amountKeyboard('expense_amount')
                );
            }

            // Expense Amount Selection
            else if (data.startsWith('expense_amount_')) {
                const amount = parseInt(data.replace('expense_amount_', ''), 10);
                const session = sessions.get(telegramId) || {};

                await editMessage(chatId, messageId,
                    `✅ <b>Pengeluaran Dicatat!</b>\n\n` +
                    `📁 Kategori: ${session.category || '-'}\n` +
                    `💵 Jumlah: -${formatCurrency(amount)}\n\n` +
                    `<i>Catatan: Untuk menyimpan ke database, buka web app dan input di sana.</i>`,
                    backKeyboard
                );
                sessions.delete(telegramId);
            }

            // Report
            else if (data === 'menu_report') {
                await editMessage(chatId, messageId,
                    `📊 <b>Laporan Keuangan</b>\n\n` +
                    `<i>Untuk melihat laporan lengkap dengan grafik, silakan buka aplikasi web:</i>\n\n` +
                    `🌐 <a href="https://nusantara-ai-six.vercel.app">Buka Web App</a>`,
                    backKeyboard
                );
            }

            // History
            else if (data === 'menu_history') {
                await editMessage(chatId, messageId,
                    `📜 <b>Riwayat Transaksi</b>\n\n` +
                    `<i>Untuk melihat riwayat lengkap, silakan buka aplikasi web:</i>\n\n` +
                    `🌐 <a href="https://nusantara-ai-six.vercel.app">Buka Web App</a>`,
                    backKeyboard
                );
            }

            // Unknown callback
            else {
                await editMessage(chatId, messageId,
                    `⚠️ Menu tidak dikenal.\n\nKembali ke menu utama:`,
                    backKeyboard
                );
            }
        }

        // Handle text messages (for wallet name input)
        if (update.message?.text && update.message.text !== '/start') {
            const chatId = update.message.chat.id.toString();
            const telegramId = update.message.from.id.toString();
            const text = update.message.text;
            const session = sessions.get(telegramId);

            if (session?.flow === 'add_wallet' && session?.step === 'name') {
                await sendMessage(chatId,
                    `✅ <b>Dompet Berhasil Ditambahkan!</b>\n\n` +
                    `🏷️ Nama: ${text}\n` +
                    `📁 Jenis: ${session.walletType}\n\n` +
                    `<i>Catatan: Untuk menyimpan ke database secara permanen, tambahkan juga melalui web app.</i>`,
                    backKeyboard
                );
                sessions.delete(telegramId);
            }
        }

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(200).json({ ok: true, error: error.message });
    }
}
