// api/telegram/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({
            ok: true,
            message: 'Telegram webhook is ready',
            method: 'GET'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;

        // Import handlers dynamically to avoid cold start issues
        const { answerCallback } = await import('../../lib/telegram/bot');
        const handlers = await import('../../lib/telegram/handlers');

        // Handle text messages
        if (update.message?.text) {
            const chatId = update.message.chat.id.toString();
            const telegramId = update.message.from.id.toString();
            const text = update.message.text;
            const username = update.message.from.username;

            // Handle commands
            if (text === '/start') {
                await handlers.handleStart(chatId, telegramId, username);
            } else {
                // Handle text input (wallet name, custom amount, etc.)
                await handlers.handleTextMessage(chatId, telegramId, text);
            }
        }

        // Handle callback queries (inline keyboard buttons)
        if (update.callback_query) {
            const callbackId = update.callback_query.id;
            const chatId = update.callback_query.message.chat.id.toString();
            const messageId = update.callback_query.message.message_id;
            const telegramId = update.callback_query.from.id.toString();
            const data = update.callback_query.data;

            // Acknowledge the callback
            await answerCallback(callbackId);

            // Route based on callback data
            if (data === 'menu_main' || data === 'menu_refresh') {
                await handlers.handleMainMenu(chatId, messageId, telegramId);
            }
            else if (data === 'menu_wallets') {
                await handlers.handleWalletsList(chatId, messageId, telegramId);
            }
            else if (data === 'menu_income') {
                await handlers.handleIncomeStart(chatId, messageId, telegramId);
            }
            else if (data === 'menu_expense') {
                await handlers.handleExpenseStart(chatId, messageId, telegramId);
            }
            else if (data === 'menu_history') {
                await handlers.handleHistory(chatId, messageId, telegramId);
            }
            else if (data === 'menu_report') {
                await handlers.handleReport(chatId, messageId, telegramId);
            }
            else if (data === 'wallet_add') {
                await handlers.handleAddWalletStart(chatId, messageId, telegramId);
            }
            // Income category selection
            else if (data.startsWith('income_cat_')) {
                const category = data.replace('income_cat_', '');
                await handlers.handleCategorySelection(chatId, messageId, telegramId, 'income', category);
            }
            // Expense category selection
            else if (data.startsWith('expense_cat_')) {
                const category = data.replace('expense_cat_', '');
                await handlers.handleCategorySelection(chatId, messageId, telegramId, 'expense', category);
            }
            // Income amount selection
            else if (data.startsWith('income_amount_')) {
                const amount = parseInt(data.replace('income_amount_', ''), 10);
                await handlers.handleAmountSelection(chatId, messageId, telegramId, 'income', amount);
            }
            // Expense amount selection
            else if (data.startsWith('expense_amount_')) {
                const amount = parseInt(data.replace('expense_amount_', ''), 10);
                await handlers.handleAmountSelection(chatId, messageId, telegramId, 'expense', amount);
            }
            // Income wallet selection
            else if (data.startsWith('income_wallet_')) {
                const walletId = data.replace('income_wallet_', '');
                await handlers.handleWalletSelection(chatId, messageId, telegramId, 'income', walletId);
            }
            // Expense wallet selection
            else if (data.startsWith('expense_wallet_')) {
                const walletId = data.replace('expense_wallet_', '');
                await handlers.handleWalletSelection(chatId, messageId, telegramId, 'expense', walletId);
            }
            // Wallet type selection
            else if (data.startsWith('wallet_type_')) {
                const walletType = data.replace('wallet_type_', '');
                await handlers.handleWalletTypeSelection(chatId, messageId, telegramId, walletType);
            }
        }

        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ ok: true, error: String(error) }); // Always return 200 to Telegram
    }
}
