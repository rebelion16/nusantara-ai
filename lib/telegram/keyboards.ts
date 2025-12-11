// lib/telegram/keyboards.ts
import { InlineKeyboardMarkup } from './bot';

// Login keyboard
export const loginKeyboard = (authUrl: string): InlineKeyboardMarkup => ({
    inline_keyboard: [
        [{ text: '🔐 Login dengan Gmail', url: authUrl }],
    ],
});

// Main menu keyboard
export const mainMenuKeyboard: InlineKeyboardMarkup = {
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
        [
            { text: '🔄 Refresh', callback_data: 'menu_refresh' },
        ],
    ],
};

// Back to menu button
export const backToMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }],
    ],
};

// Income categories keyboard
export const incomeCategoriesKeyboard: InlineKeyboardMarkup = {
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

// Expense categories keyboard
export const expenseCategoriesKeyboard: InlineKeyboardMarkup = {
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
        [
            { text: '📚 Pendidikan', callback_data: 'expense_cat_Pendidikan' },
            { text: '📦 Lainnya', callback_data: 'expense_cat_Lainnya' },
        ],
        [{ text: '❌ Batal', callback_data: 'menu_main' }],
    ],
};

// Generate wallet selection keyboard
export const walletsKeyboard = (
    wallets: Array<{ id: string; name: string; balance: number; type: string }>,
    actionPrefix: string
): InlineKeyboardMarkup => {
    const buttons = wallets.map(wallet => ({
        text: `${wallet.type === 'bank' ? '🏦' : wallet.type === 'e-wallet' ? '📱' : '💵'} ${wallet.name}`,
        callback_data: `${actionPrefix}_${wallet.id}`,
    }));

    // Split into rows of 2
    const rows: Array<Array<{ text: string; callback_data: string }>> = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }
    rows.push([{ text: '❌ Batal', callback_data: 'menu_main' }]);

    return { inline_keyboard: rows };
};

// Add wallet type keyboard
export const walletTypeKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: '🏦 Bank', callback_data: 'wallet_type_bank' },
            { text: '📱 E-Wallet', callback_data: 'wallet_type_e-wallet' },
            { text: '💵 Tunai', callback_data: 'wallet_type_cash' },
        ],
        [{ text: '❌ Batal', callback_data: 'menu_main' }],
    ],
};

// Wallets list with add button
export const walletsListKeyboard = (
    wallets: Array<{ id: string; name: string; balance: number; type: string }>
): InlineKeyboardMarkup => {
    const buttons = wallets.map(wallet => ([{
        text: `${wallet.type === 'bank' ? '🏦' : wallet.type === 'e-wallet' ? '📱' : '💵'} ${wallet.name} - Rp ${wallet.balance.toLocaleString('id-ID')}`,
        callback_data: `wallet_view_${wallet.id}`,
    }]));

    return {
        inline_keyboard: [
            ...buttons,
            [{ text: '➕ Tambah Dompet', callback_data: 'wallet_add' }],
            [{ text: '🏠 Menu Utama', callback_data: 'menu_main' }],
        ],
    };
};

// Confirm keyboard
export const confirmKeyboard = (yesCallback: string, noCallback: string): InlineKeyboardMarkup => ({
    inline_keyboard: [
        [
            { text: '✅ Ya', callback_data: yesCallback },
            { text: '❌ Tidak', callback_data: noCallback },
        ],
    ],
});

// Amount input hints keyboard
export const amountHintsKeyboard = (prefix: string): InlineKeyboardMarkup => ({
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
