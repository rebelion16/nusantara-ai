// lib/telegram/handlers.ts
import { sendMessage, editMessage, formatCurrency, formatDate } from './bot';
import {
    mainMenuKeyboard,
    backToMenuKeyboard,
    incomeCategoriesKeyboard,
    expenseCategoriesKeyboard,
    walletsKeyboard,
    walletsListKeyboard,
    walletTypeKeyboard,
    amountHintsKeyboard,
    loginKeyboard
} from './keyboards';
import { firestoreHelpers } from '../firebase-admin';

// User session state (in-memory, for simple flow tracking)
// In production, use Redis or Firestore for persistence
const userSessions: Map<string, any> = new Map();

// Generate main menu message
async function generateMainMenu(email: string): Promise<string> {
    const wallets = await firestoreHelpers.getWalletsByEmail(email);
    const transactions = await firestoreHelpers.getTransactionsByEmail(email, 100);

    const totalAssets = wallets.reduce((sum: number, w: any) => sum + (w.balance || 0), 0);

    const now = new Date();
    const thisMonth = transactions.filter((t: any) => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const monthIncome = thisMonth
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
    const monthExpense = thisMonth
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

    return `📊 <b>Catat Duitmu</b>

👤 ${email}

💰 <b>Total Aset:</b> ${formatCurrency(totalAssets)}
📈 <b>Pemasukan Bulan Ini:</b> <code>+${formatCurrency(monthIncome)}</code>
📉 <b>Pengeluaran Bulan Ini:</b> <code>-${formatCurrency(monthExpense)}</code>

Pilih menu di bawah:`;
}

// Handle /start command
export async function handleStart(chatId: string, telegramId: string, username?: string) {
    // Check if user is linked
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);

    if (telegramUser) {
        // User is linked, show main menu
        const menuText = await generateMainMenu(telegramUser.email);
        await sendMessage(chatId, menuText, { reply_markup: mainMenuKeyboard });
    } else {
        // User not linked, show login button
        const state = `${telegramId}_${Date.now()}`;
        await firestoreHelpers.createOAuthSession(state, telegramId, chatId);

        const authUrl = `${process.env.NEXTAUTH_URL}/api/telegram/auth?state=${state}`;

        await sendMessage(
            chatId,
            `👋 <b>Selamat datang di Catat Duitmu Bot!</b>

Untuk menggunakan bot ini, silakan hubungkan akun Gmail Anda (sama dengan yang digunakan di aplikasi Nusantara AI).

Klik tombol di bawah untuk login:`,
            { reply_markup: loginKeyboard(authUrl) }
        );
    }
}

// Handle main menu
export async function handleMainMenu(chatId: string, messageId: number, telegramId: string) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    const menuText = await generateMainMenu(telegramUser.email);
    await editMessage(chatId, messageId, menuText, { reply_markup: mainMenuKeyboard });
}

// Handle wallet list
export async function handleWalletsList(chatId: string, messageId: number, telegramId: string) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    const wallets = await firestoreHelpers.getWalletsByEmail(telegramUser.email);

    let text = `💳 <b>Dompet Saya</b>\n\n`;

    if (wallets.length === 0) {
        text += `<i>Belum ada dompet. Tambahkan dompet baru!</i>`;
    } else {
        wallets.forEach((wallet: any) => {
            const icon = wallet.type === 'bank' ? '🏦' : wallet.type === 'e-wallet' ? '📱' : '💵';
            text += `${icon} <b>${wallet.name}</b>\n`;
            text += `   └ ${formatCurrency(wallet.balance)}\n\n`;
        });
    }

    await editMessage(chatId, messageId, text, { reply_markup: walletsListKeyboard(wallets) });
}

// Handle income category selection
export async function handleIncomeStart(chatId: string, messageId: number, telegramId: string) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    userSessions.set(telegramId, { flow: 'income', step: 'category' });

    await editMessage(
        chatId,
        messageId,
        `💰 <b>Input Pemasukan</b>\n\nPilih kategori:`,
        { reply_markup: incomeCategoriesKeyboard }
    );
}

// Handle expense category selection
export async function handleExpenseStart(chatId: string, messageId: number, telegramId: string) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    userSessions.set(telegramId, { flow: 'expense', step: 'category' });

    await editMessage(
        chatId,
        messageId,
        `💸 <b>Input Pengeluaran</b>\n\nPilih kategori:`,
        { reply_markup: expenseCategoriesKeyboard }
    );
}

// Handle category selection
export async function handleCategorySelection(
    chatId: string,
    messageId: number,
    telegramId: string,
    type: 'income' | 'expense',
    category: string
) {
    const session = userSessions.get(telegramId) || {};
    session.category = category;
    session.step = 'amount';
    userSessions.set(telegramId, session);

    const icon = type === 'income' ? '💰' : '💸';
    await editMessage(
        chatId,
        messageId,
        `${icon} <b>Kategori:</b> ${category}\n\nPilih atau ketik jumlah:`,
        { reply_markup: amountHintsKeyboard(`${type}_amount`) }
    );
}

// Handle amount selection
export async function handleAmountSelection(
    chatId: string,
    messageId: number,
    telegramId: string,
    type: 'income' | 'expense',
    amount: number
) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    const session = userSessions.get(telegramId) || {};
    session.amount = amount;
    session.step = 'wallet';
    userSessions.set(telegramId, session);

    const wallets = await firestoreHelpers.getWalletsByEmail(telegramUser.email);

    if (wallets.length === 0) {
        await editMessage(
            chatId,
            messageId,
            `⚠️ <b>Belum ada dompet!</b>\n\nTambahkan dompet terlebih dahulu.`,
            { reply_markup: backToMenuKeyboard }
        );
        return;
    }

    const icon = type === 'income' ? '💰' : '💸';
    await editMessage(
        chatId,
        messageId,
        `${icon} <b>Kategori:</b> ${session.category}\n💵 <b>Jumlah:</b> ${formatCurrency(amount)}\n\nPilih dompet ${type === 'income' ? 'tujuan' : 'sumber'}:`,
        { reply_markup: walletsKeyboard(wallets, `${type}_wallet`) }
    );
}

// Handle wallet selection and save transaction
export async function handleWalletSelection(
    chatId: string,
    messageId: number,
    telegramId: string,
    type: 'income' | 'expense',
    walletId: string
) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    const session = userSessions.get(telegramId);
    if (!session || !session.category || !session.amount) {
        await editMessage(chatId, messageId, '❌ Sesi tidak valid. Silakan mulai ulang.', { reply_markup: backToMenuKeyboard });
        return;
    }

    try {
        await firestoreHelpers.addTransaction(
            telegramUser.email,
            walletId,
            session.amount,
            session.category,
            type,
            `Via Telegram Bot`
        );

        const wallets = await firestoreHelpers.getWalletsByEmail(telegramUser.email);
        const wallet = wallets.find((w: any) => w.id === walletId);

        const icon = type === 'income' ? '✅' : '✅';
        const typeLabel = type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const sign = type === 'income' ? '+' : '-';

        await editMessage(
            chatId,
            messageId,
            `${icon} <b>${typeLabel} berhasil dicatat!</b>

📝 <b>Detail:</b>
• Kategori: ${session.category}
• Jumlah: ${sign}${formatCurrency(session.amount)}
• Dompet: ${wallet?.name || 'Unknown'}
• Saldo baru: ${formatCurrency(wallet?.balance || 0)}`,
            { reply_markup: backToMenuKeyboard }
        );

        // Clear session
        userSessions.delete(telegramId);
    } catch (error) {
        console.error('Error saving transaction:', error);
        await editMessage(chatId, messageId, '❌ Gagal menyimpan transaksi. Silakan coba lagi.', { reply_markup: backToMenuKeyboard });
    }
}

// Handle history view
export async function handleHistory(chatId: string, messageId: number, telegramId: string) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    const transactions = await firestoreHelpers.getTransactionsByEmail(telegramUser.email, 10);
    const wallets = await firestoreHelpers.getWalletsByEmail(telegramUser.email);

    let text = `📜 <b>Riwayat Transaksi</b>\n<i>10 transaksi terakhir</i>\n\n`;

    if (transactions.length === 0) {
        text += `<i>Belum ada transaksi.</i>`;
    } else {
        transactions.forEach((tx: any) => {
            const icon = tx.type === 'income' ? '📈' : '📉';
            const sign = tx.type === 'income' ? '+' : '-';
            const wallet = wallets.find((w: any) => w.id === tx.walletId);
            text += `${icon} ${sign}${formatCurrency(tx.amount)}\n`;
            text += `   └ ${tx.category} • ${wallet?.name || '-'}\n`;
            text += `   └ ${formatDate(tx.date)}\n\n`;
        });
    }

    await editMessage(chatId, messageId, text, { reply_markup: backToMenuKeyboard });
}

// Handle report view
export async function handleReport(chatId: string, messageId: number, telegramId: string) {
    const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
    if (!telegramUser) return;

    const transactions = await firestoreHelpers.getTransactionsByEmail(telegramUser.email, 1000);
    const now = new Date();

    // This month
    const thisMonth = transactions.filter((t: any) => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const monthIncome = thisMonth.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
    const monthExpense = thisMonth.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);

    // Category breakdown
    const expenseByCategory: Record<string, number> = {};
    thisMonth.filter((t: any) => t.type === 'expense').forEach((t: any) => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

    const topCategories = Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    let text = `📊 <b>Laporan Bulan Ini</b>\n\n`;
    text += `📈 <b>Total Pemasukan:</b> ${formatCurrency(monthIncome)}\n`;
    text += `📉 <b>Total Pengeluaran:</b> ${formatCurrency(monthExpense)}\n`;
    text += `💰 <b>Selisih:</b> ${formatCurrency(monthIncome - monthExpense)}\n\n`;

    if (topCategories.length > 0) {
        text += `🏆 <b>Top Pengeluaran:</b>\n`;
        topCategories.forEach(([category, amount], index) => {
            text += `${index + 1}. ${category}: ${formatCurrency(amount)}\n`;
        });
    }

    await editMessage(chatId, messageId, text, { reply_markup: backToMenuKeyboard });
}

// Handle add wallet start
export async function handleAddWalletStart(chatId: string, messageId: number, telegramId: string) {
    userSessions.set(telegramId, { flow: 'add_wallet', step: 'type' });

    await editMessage(
        chatId,
        messageId,
        `➕ <b>Tambah Dompet Baru</b>\n\nPilih jenis dompet:`,
        { reply_markup: walletTypeKeyboard }
    );
}

// Handle wallet type selection
export async function handleWalletTypeSelection(chatId: string, messageId: number, telegramId: string, walletType: string) {
    const session = userSessions.get(telegramId) || {};
    session.walletType = walletType;
    session.step = 'name';
    userSessions.set(telegramId, session);

    await editMessage(
        chatId,
        messageId,
        `➕ <b>Tambah Dompet Baru</b>\n\n🏷️ Jenis: ${walletType === 'bank' ? '🏦 Bank' : walletType === 'e-wallet' ? '📱 E-Wallet' : '💵 Tunai'}\n\n<i>Kirim nama dompet (contoh: BCA, GoPay, dll):</i>`,
        { reply_markup: backToMenuKeyboard }
    );
}

// Handle text message for wallet name input
export async function handleTextMessage(chatId: string, telegramId: string, text: string) {
    const session = userSessions.get(telegramId);
    if (!session) return false;

    if (session.flow === 'add_wallet' && session.step === 'name') {
        const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
        if (!telegramUser) return false;

        try {
            await firestoreHelpers.addWallet(telegramUser.email, text, session.walletType, 0);

            await sendMessage(
                chatId,
                `✅ <b>Dompet berhasil ditambahkan!</b>\n\n🏷️ Nama: ${text}\n💳 Jenis: ${session.walletType}`,
                { reply_markup: backToMenuKeyboard }
            );

            userSessions.delete(telegramId);
            return true;
        } catch (error) {
            console.error('Error adding wallet:', error);
            await sendMessage(chatId, '❌ Gagal menambahkan dompet. Silakan coba lagi.', { reply_markup: backToMenuKeyboard });
            return true;
        }
    }

    // Handle custom amount input
    if ((session.flow === 'income' || session.flow === 'expense') && session.step === 'amount') {
        const amount = parseInt(text.replace(/\D/g, ''), 10);
        if (isNaN(amount) || amount <= 0) {
            await sendMessage(chatId, '❌ Jumlah tidak valid. Masukkan angka yang benar.');
            return true;
        }

        const telegramUser = await firestoreHelpers.getTelegramUser(telegramId);
        if (!telegramUser) return false;

        session.amount = amount;
        session.step = 'wallet';
        userSessions.set(telegramId, session);

        const wallets = await firestoreHelpers.getWalletsByEmail(telegramUser.email);
        const icon = session.flow === 'income' ? '💰' : '💸';

        await sendMessage(
            chatId,
            `${icon} <b>Kategori:</b> ${session.category}\n💵 <b>Jumlah:</b> ${formatCurrency(amount)}\n\nPilih dompet:`,
            { reply_markup: walletsKeyboard(wallets, `${session.flow}_wallet`) }
        );
        return true;
    }

    return false;
}

// Export session getter for webhook
export function getSession(telegramId: string) {
    return userSessions.get(telegramId);
}
