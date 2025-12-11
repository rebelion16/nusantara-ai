// api/telegram/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = process.env.NEXTAUTH_URL || 'https://nusantara-ai-six.vercel.app';

// Firebase REST API config
const FIREBASE_PROJECT_ID = 'nusantara-ai-18db6';
const FIREBASE_API_KEY = 'AIzaSyAPEZbIMw23gZO-A1aBd7zWELxKVOsSYWE';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Simple in-memory session store
const sessions: Map<string, any> = new Map();

// Get user email from Firestore
async function getTelegramUserEmail(telegramId: string): Promise<string | null> {
    try {
        const url = `${FIRESTORE_URL}/telegram_users/${telegramId}?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        return data.fields?.email?.stringValue || null;
    } catch (error) {
        console.error('Error getting telegram user:', error);
        return null;
    }
}

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

// ==================== FIRESTORE REST API ====================

async function getWalletsByEmail(email: string): Promise<any[]> {
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

        if (!Array.isArray(data)) return [];

        return data
            .filter((item: any) => item.document)
            .map((item: any) => {
                const doc = item.document;
                const id = doc.name.split('/').pop();
                const fields = doc.fields || {};
                return {
                    id,
                    name: fields.name?.stringValue || '',
                    type: fields.type?.stringValue || 'cash',
                    balance: parseFloat(fields.balance?.doubleValue || fields.balance?.integerValue || '0'),
                    color: fields.color?.stringValue || 'bg-blue-600',
                };
            });
    } catch (error) {
        console.error('Error fetching wallets:', error);
        return [];
    }
}

async function getTransactionsByEmail(email: string, limit = 10): Promise<any[]> {
    try {
        const url = `${FIRESTORE_URL}:runQuery?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: 'transactions' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'userId' },
                            op: 'EQUAL',
                            value: { stringValue: email }
                        }
                    },
                    orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
                    limit: limit
                }
            })
        });
        const data = await response.json();

        if (!Array.isArray(data)) return [];

        return data
            .filter((item: any) => item.document)
            .map((item: any) => {
                const doc = item.document;
                const id = doc.name.split('/').pop();
                const fields = doc.fields || {};
                return {
                    id,
                    amount: parseFloat(fields.amount?.doubleValue || fields.amount?.integerValue || '0'),
                    category: fields.category?.stringValue || '',
                    type: fields.type?.stringValue || 'expense',
                    description: fields.description?.stringValue || '',
                    walletId: fields.walletId?.stringValue || '',
                    date: parseInt(fields.date?.integerValue || '0'),
                };
            });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

async function addWallet(email: string, name: string, type: string, balance: number): Promise<boolean> {
    try {
        const url = `${FIRESTORE_URL}/wallets?key=${FIREBASE_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    userId: { stringValue: email },
                    name: { stringValue: name },
                    type: { stringValue: type },
                    balance: { doubleValue: balance },
                    color: { stringValue: type === 'bank' ? 'bg-blue-600' : type === 'e-wallet' ? 'bg-purple-600' : 'bg-green-600' },
                }
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error adding wallet:', error);
        return false;
    }
}

async function addTransaction(
    email: string,
    walletId: string,
    amount: number,
    category: string,
    type: 'income' | 'expense',
    description: string = ''
): Promise<boolean> {
    try {
        // Add transaction
        const txUrl = `${FIRESTORE_URL}/transactions?key=${FIREBASE_API_KEY}`;
        const txResponse = await fetch(txUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    userId: { stringValue: email },
                    walletId: { stringValue: walletId },
                    amount: { doubleValue: amount },
                    category: { stringValue: category },
                    type: { stringValue: type },
                    description: { stringValue: description },
                    date: { integerValue: Date.now().toString() },
                }
            })
        });

        if (!txResponse.ok) return false;

        // Update wallet balance
        // First, get current wallet
        const walletUrl = `${FIRESTORE_URL}/wallets/${walletId}?key=${FIREBASE_API_KEY}`;
        const walletResponse = await fetch(walletUrl);
        const walletData = await walletResponse.json();

        if (walletData.fields) {
            const currentBalance = parseFloat(walletData.fields.balance?.doubleValue || walletData.fields.balance?.integerValue || '0');
            const newBalance = type === 'income' ? currentBalance + amount : currentBalance - amount;

            await fetch(`${walletUrl}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        ...walletData.fields,
                        balance: { doubleValue: newBalance }
                    }
                })
            });
        }

        return true;
    } catch (error) {
        console.error('Error adding transaction:', error);
        return false;
    }
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

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// ==================== MAIN HANDLER ====================

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

            // Get user email from Firestore
            const userEmail = await getTelegramUserEmail(telegramId);

            // Main Menu
            if (data === 'menu_main' || data === 'menu_refresh') {
                if (!userEmail) {
                    await editMessage(chatId, messageId,
                        `⚠️ Anda belum login.\n\nSilakan login terlebih dahulu:`,
                        { inline_keyboard: [[{ text: '🔐 Login dengan Gmail', url: `${APP_URL}/api/telegram/auth?state=${telegramId}_${Date.now()}` }]] }
                    );
                } else {
                    const wallets = await getWalletsByEmail(userEmail);
                    const totalAssets = wallets.reduce((sum, w) => sum + w.balance, 0);

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
                            `${getWalletIcon(w.type)} <b>${w.name}</b>\n   └ ${formatCurrency(w.balance)}`
                        ).join('\n\n');

                        const totalAssets = wallets.reduce((sum, w) => sum + w.balance, 0);

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
                const session = sessions.get(telegramId) || {};
                session.flow = 'income';
                session.step = 'amount';
                session.category = category;
                sessions.set(telegramId, session);

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

                // Get wallets for selection
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

                    // Split into rows of 2
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

            // Income Wallet Selection - Save to Firestore
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
                        `Via Telegram Bot`
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
                const session = sessions.get(telegramId) || {};
                session.flow = 'expense';
                session.step = 'amount';
                session.category = category;
                sessions.set(telegramId, session);

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

                // Get wallets for selection
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

            // Expense Wallet Selection - Save to Firestore
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
                        `Via Telegram Bot`
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

                    const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                    const totalExpense = monthlyTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                    const netFlow = totalIncome - totalExpense;
                    const totalAssets = wallets.reduce((sum, w) => sum + w.balance, 0);

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
                    const wallets = await getWalletsByEmail(userEmail);

                    if (transactions.length === 0) {
                        await editMessage(chatId, messageId,
                            `📜 <b>Riwayat Transaksi</b>\n\n` +
                            `<i>Belum ada transaksi.</i>`,
                            backKeyboard
                        );
                    } else {
                        const txList = transactions.map(t => {
                            const wallet = wallets.find(w => w.id === t.walletId);
                            const icon = t.type === 'income' ? '📈' : '📉';
                            const sign = t.type === 'income' ? '+' : '-';
                            return `${icon} <b>${t.category}</b>\n   ${sign}${formatCurrency(t.amount)} • ${formatDate(t.date)}`;
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
            const userEmail = await getTelegramUserEmail(telegramId);

            if (session?.flow === 'add_wallet' && session?.step === 'name' && userEmail) {
                const success = await addWallet(userEmail, text, session.walletType, 0);

                if (success) {
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
