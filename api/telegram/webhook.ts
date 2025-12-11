// api/telegram/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = process.env.NEXTAUTH_URL || 'https://nusantara-ai-six.vercel.app';

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Simple in-memory session store
const sessions: Map<string, any> = new Map();

// ==================== TELEGRAM API ====================

async function sendMessage(chatId: string, text: string, replyMarkup?: any) {
    return fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
            disable_web_page_preview: true,
        }),
    });
}

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
            disable_web_page_preview: true,
        }),
    });
}

async function answerCallback(callbackId: string, text?: string) {
    return fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
}

// ==================== SUPABASE FUNCTIONS ====================

async function getTelegramUser(telegramId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

    if (error) {
        console.log('getTelegramUser error:', error.message);
        return null;
    }
    return data;
}

async function getWalletsByEmail(email: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', email)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching wallets:', error);
        return [];
    }
    return data || [];
}

async function getTransactionsByEmail(email: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', email)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return data || [];
}

async function addWallet(email: string, name: string, type: string, balance: number = 0): Promise<any> {
    const color = type === 'bank' ? 'bg-blue-600' : type === 'e-wallet' ? 'bg-purple-600' : 'bg-green-600';

    const { data, error } = await supabase
        .from('wallets')
        .insert({
            user_id: email,
            name,
            type,
            balance,
            color,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding wallet:', error);
        return null;
    }
    return data;
}

async function addTransaction(
    email: string,
    walletId: string,
    amount: number,
    category: string,
    type: 'income' | 'expense',
    description: string = ''
): Promise<boolean> {
    // Add transaction
    const { error: txError } = await supabase
        .from('transactions')
        .insert({
            user_id: email,
            wallet_id: walletId,
            amount,
            category,
            type,
            description,
            date: new Date().toISOString(),
        });

    if (txError) {
        console.error('Error adding transaction:', txError);
        return false;
    }

    // Update wallet balance
    const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

    if (wallet) {
        const newBalance = type === 'income' ? wallet.balance + amount : wallet.balance - amount;
        await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', walletId);
    }

    return true;
}

// ==================== KEYBOARDS ====================

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

// ==================== HELPERS ====================

function formatCurrency(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

function getWalletIcon(type: string): string {
    return type === 'bank' ? '🏦' : type === 'e-wallet' ? '📱' : '💵';
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// ==================== MAIN HANDLER ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        return res.status(200).json({
            ok: true,
            message: 'Webhook ready (Supabase JS)',
            hasToken: !!BOT_TOKEN,
            hasSupabase: !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY
        });
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

            // Get user from Supabase
            const telegramUser = await getTelegramUser(telegramId);
            const userEmail = telegramUser?.email;

            // Main Menu
            if (data === 'menu_main' || data === 'menu_refresh') {
                if (!userEmail) {
                    await editMessage(chatId, messageId,
                        `⚠️ Anda belum login.\n\nSilakan login terlebih dahulu:`,
                        { inline_keyboard: [[{ text: '🔐 Login dengan Gmail', url: `${APP_URL}/api/telegram/auth?state=${telegramId}_${Date.now()}` }]] }
                    );
                } else {
                    const wallets = await getWalletsByEmail(userEmail);
                    const totalAssets = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

                    await editMessage(chatId, messageId,
                        `📊 <b>Catat Duitmu - Menu Utama</b>\n\n` +
                        `👤 ${userEmail}\n` +
                        `💰 Total Aset: <b>${formatCurrency(totalAssets)}</b>\n` +
                        `📁 Dompet: ${wallets.length} buah\n\n` +
                        `Pilih menu di bawah:`,
                        mainMenuKeyboard
                    );
                }
            }

            // Wallets Menu
            else if (data === 'menu_wallets') {
                if (!userEmail) {
                    await editMessage(chatId, messageId, `⚠️ Silakan login terlebih dahulu.`, backKeyboard);
                } else {
                    const wallets = await getWalletsByEmail(userEmail);

                    if (wallets.length === 0) {
                        await editMessage(chatId, messageId,
                            `💳 <b>Dompet Saya</b>\n\n` +
                            `<i>Belum ada dompet. Tambahkan dompet pertama Anda!</i>`,
                            {
                                inline_keyboard: [
                                    [{ text: '➕ Tambah Dompet Baru', callback_data: 'wallet_add' }],
                                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }],
                                ]
                            }
                        );
                    } else {
                        const walletList = wallets.map(w =>
                            `${getWalletIcon(w.type)} <b>${w.name}</b>\n   └ ${formatCurrency(w.balance || 0)}`
                        ).join('\n\n');

                        const totalAssets = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

                        await editMessage(chatId, messageId,
                            `💳 <b>Dompet Saya</b>\n\n` +
                            `${walletList}\n\n` +
                            `━━━━━━━━━━━━━━━━━━\n` +
                            `💰 <b>Total: ${formatCurrency(totalAssets)}</b>`,
                            {
                                inline_keyboard: [
                                    [{ text: '➕ Tambah Dompet Baru', callback_data: 'wallet_add' }],
                                    [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }],
                                ]
                            }
                        );
                    }
                }
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
                if (!userEmail) {
                    await editMessage(chatId, messageId, `⚠️ Silakan login terlebih dahulu.`, backKeyboard);
                } else {
                    sessions.set(telegramId, { flow: 'income', step: 'category' });
                    await editMessage(chatId, messageId,
                        `💰 <b>Input Pemasukan</b>\n\nPilih kategori:`,
                        incomeCategoriesKeyboard
                    );
                }
            }

            // Income Category Selection
            else if (data.startsWith('income_cat_')) {
                const category = data.replace('income_cat_', '');
                sessions.set(telegramId, { flow: 'income', step: 'amount', category });

                await editMessage(chatId, messageId,
                    `💰 <b>Input Pemasukan</b>\n\n` +
                    `📁 Kategori: ${category}\n\n` +
                    `Pilih jumlah:`,
                    amountKeyboard('income_amount')
                );
            }

            // Income Amount Selection
            else if (data.startsWith('income_amount_')) {
                const amount = parseInt(data.replace('income_amount_', ''), 10);
                const session = sessions.get(telegramId) || {};
                session.amount = amount;
                session.step = 'wallet';
                sessions.set(telegramId, session);

                const wallets = await getWalletsByEmail(userEmail || '');

                if (wallets.length === 0) {
                    await editMessage(chatId, messageId,
                        `⚠️ Belum ada dompet. Tambahkan dompet terlebih dahulu.`,
                        {
                            inline_keyboard: [
                                [{ text: '➕ Tambah Dompet', callback_data: 'wallet_add' }],
                                [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }],
                            ]
                        }
                    );
                } else {
                    const walletButtons = wallets.map(w => ({
                        text: `${getWalletIcon(w.type)} ${w.name}`,
                        callback_data: `income_wallet_${w.id}`
                    }));

                    const rows = [];
                    for (let i = 0; i < walletButtons.length; i += 2) {
                        rows.push(walletButtons.slice(i, i + 2));
                    }
                    rows.push([{ text: '❌ Batal', callback_data: 'menu_main' }]);

                    await editMessage(chatId, messageId,
                        `💰 <b>Input Pemasukan</b>\n\n` +
                        `📁 Kategori: ${session.category}\n` +
                        `💵 Jumlah: +${formatCurrency(amount)}\n\n` +
                        `Pilih dompet tujuan:`,
                        { inline_keyboard: rows }
                    );
                }
            }

            // Income Wallet Selection - Save to Supabase
            else if (data.startsWith('income_wallet_')) {
                const walletId = data.replace('income_wallet_', '');
                const session = sessions.get(telegramId) || {};

                if (userEmail && session.amount && session.category) {
                    const success = await addTransaction(
                        userEmail,
                        walletId,
                        session.amount,
                        session.category,
                        'income',
                        'Via Telegram Bot'
                    );

                    if (success) {
                        await editMessage(chatId, messageId,
                            `✅ <b>Pemasukan Berhasil Dicatat!</b>\n\n` +
                            `📁 Kategori: ${session.category}\n` +
                            `💵 Jumlah: +${formatCurrency(session.amount)}\n\n` +
                            `<i>Data sudah tersimpan dan sync dengan web app.</i>`,
                            backKeyboard
                        );
                    } else {
                        await editMessage(chatId, messageId,
                            `❌ Gagal menyimpan pemasukan. Coba lagi.`,
                            backKeyboard
                        );
                    }
                }
                sessions.delete(telegramId);
            }

            // Expense Start
            else if (data === 'menu_expense') {
                if (!userEmail) {
                    await editMessage(chatId, messageId, `⚠️ Silakan login terlebih dahulu.`, backKeyboard);
                } else {
                    sessions.set(telegramId, { flow: 'expense', step: 'category' });
                    await editMessage(chatId, messageId,
                        `💸 <b>Input Pengeluaran</b>\n\nPilih kategori:`,
                        expenseCategoriesKeyboard
                    );
                }
            }

            // Expense Category Selection
            else if (data.startsWith('expense_cat_')) {
                const category = data.replace('expense_cat_', '');
                sessions.set(telegramId, { flow: 'expense', step: 'amount', category });

                await editMessage(chatId, messageId,
                    `💸 <b>Input Pengeluaran</b>\n\n` +
                    `📁 Kategori: ${category}\n\n` +
                    `Pilih jumlah:`,
                    amountKeyboard('expense_amount')
                );
            }

            // Expense Amount Selection
            else if (data.startsWith('expense_amount_')) {
                const amount = parseInt(data.replace('expense_amount_', ''), 10);
                const session = sessions.get(telegramId) || {};
                session.amount = amount;
                session.step = 'wallet';
                sessions.set(telegramId, session);

                const wallets = await getWalletsByEmail(userEmail || '');

                if (wallets.length === 0) {
                    await editMessage(chatId, messageId,
                        `⚠️ Belum ada dompet. Tambahkan dompet terlebih dahulu.`,
                        {
                            inline_keyboard: [
                                [{ text: '➕ Tambah Dompet', callback_data: 'wallet_add' }],
                                [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }],
                            ]
                        }
                    );
                } else {
                    const walletButtons = wallets.map(w => ({
                        text: `${getWalletIcon(w.type)} ${w.name}`,
                        callback_data: `expense_wallet_${w.id}`
                    }));

                    const rows = [];
                    for (let i = 0; i < walletButtons.length; i += 2) {
                        rows.push(walletButtons.slice(i, i + 2));
                    }
                    rows.push([{ text: '❌ Batal', callback_data: 'menu_main' }]);

                    await editMessage(chatId, messageId,
                        `💸 <b>Input Pengeluaran</b>\n\n` +
                        `📁 Kategori: ${session.category}\n` +
                        `💵 Jumlah: -${formatCurrency(amount)}\n\n` +
                        `Pilih dompet sumber:`,
                        { inline_keyboard: rows }
                    );
                }
            }

            // Expense Wallet Selection - Save to Supabase
            else if (data.startsWith('expense_wallet_')) {
                const walletId = data.replace('expense_wallet_', '');
                const session = sessions.get(telegramId) || {};

                if (userEmail && session.amount && session.category) {
                    const success = await addTransaction(
                        userEmail,
                        walletId,
                        session.amount,
                        session.category,
                        'expense',
                        'Via Telegram Bot'
                    );

                    if (success) {
                        await editMessage(chatId, messageId,
                            `✅ <b>Pengeluaran Berhasil Dicatat!</b>\n\n` +
                            `📁 Kategori: ${session.category}\n` +
                            `💵 Jumlah: -${formatCurrency(session.amount)}\n\n` +
                            `<i>Data sudah tersimpan dan sync dengan web app.</i>`,
                            backKeyboard
                        );
                    } else {
                        await editMessage(chatId, messageId,
                            `❌ Gagal menyimpan pengeluaran. Coba lagi.`,
                            backKeyboard
                        );
                    }
                }
                sessions.delete(telegramId);
            }

            // Report
            else if (data === 'menu_report') {
                if (!userEmail) {
                    await editMessage(chatId, messageId, `⚠️ Silakan login terlebih dahulu.`, backKeyboard);
                } else {
                    const transactions = await getTransactionsByEmail(userEmail, 100);
                    const wallets = await getWalletsByEmail(userEmail);

                    const now = new Date();
                    const thisMonth = now.getMonth();
                    const thisYear = now.getFullYear();

                    const monthlyTx = transactions.filter(t => {
                        const txDate = new Date(t.date);
                        return txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear;
                    });

                    const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
                    const totalExpense = monthlyTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
                    const netFlow = totalIncome - totalExpense;
                    const totalAssets = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

                    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

                    await editMessage(chatId, messageId,
                        `📊 <b>Laporan Keuangan</b>\n` +
                        `📅 ${monthNames[thisMonth]} ${thisYear}\n\n` +
                        `━━━━━━━━━━━━━━━━━━\n\n` +
                        `💰 <b>Total Aset:</b> ${formatCurrency(totalAssets)}\n\n` +
                        `📈 Pemasukan: +${formatCurrency(totalIncome)}\n` +
                        `📉 Pengeluaran: -${formatCurrency(totalExpense)}\n` +
                        `━━━━━━━━━━━━━━━━━━\n` +
                        `${netFlow >= 0 ? '✅' : '⚠️'} <b>Net: ${netFlow >= 0 ? '+' : ''}${formatCurrency(netFlow)}</b>\n\n` +
                        `📊 Transaksi bulan ini: ${monthlyTx.length}`,
                        backKeyboard
                    );
                }
            }

            // History
            else if (data === 'menu_history') {
                if (!userEmail) {
                    await editMessage(chatId, messageId, `⚠️ Silakan login terlebih dahulu.`, backKeyboard);
                } else {
                    const transactions = await getTransactionsByEmail(userEmail, 10);

                    if (transactions.length === 0) {
                        await editMessage(chatId, messageId,
                            `📜 <b>Riwayat Transaksi</b>\n\n` +
                            `<i>Belum ada transaksi.</i>`,
                            backKeyboard
                        );
                    } else {
                        const txList = transactions.map(t => {
                            const icon = t.type === 'income' ? '📈' : '📉';
                            const sign = t.type === 'income' ? '+' : '-';
                            return `${icon} <b>${t.category}</b>\n   ${sign}${formatCurrency(t.amount || 0)} • ${formatDate(t.date)}`;
                        }).join('\n\n');

                        await editMessage(chatId, messageId,
                            `📜 <b>Riwayat Transaksi</b>\n` +
                            `<i>10 transaksi terakhir</i>\n\n` +
                            `${txList}`,
                            backKeyboard
                        );
                    }
                }
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

            const telegramUser = await getTelegramUser(telegramId);
            const userEmail = telegramUser?.email;

            if (session?.flow === 'add_wallet' && session?.step === 'name' && userEmail) {
                const wallet = await addWallet(userEmail, text, session.walletType, 0);

                if (wallet) {
                    await sendMessage(chatId,
                        `✅ <b>Dompet Berhasil Ditambahkan!</b>\n\n` +
                        `🏷️ Nama: ${text}\n` +
                        `📁 Jenis: ${session.walletType}\n` +
                        `💵 Saldo: Rp 0\n\n` +
                        `<i>Data sudah tersimpan dan sync dengan web app.</i>`,
                        backKeyboard
                    );
                } else {
                    await sendMessage(chatId,
                        `❌ Gagal menambahkan dompet. Coba lagi.`,
                        backKeyboard
                    );
                }
                sessions.delete(telegramId);
            }
        }

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return res.status(200).json({ ok: true, error: error.message });
    }
}
