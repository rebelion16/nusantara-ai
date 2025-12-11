// lib/telegram/bot.ts

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export interface InlineKeyboardButton {
    text: string;
    callback_data?: string;
    url?: string;
}

export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
}

export interface SendMessageOptions {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: InlineKeyboardMarkup;
}

// Send message to user
export async function sendMessage(
    chatId: string | number,
    text: string,
    options?: SendMessageOptions
): Promise<any> {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: options?.parse_mode || 'HTML',
            reply_markup: options?.reply_markup,
        }),
    });
    return response.json();
}

// Edit existing message
export async function editMessage(
    chatId: string | number,
    messageId: number,
    text: string,
    options?: SendMessageOptions
): Promise<any> {
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: options?.parse_mode || 'HTML',
            reply_markup: options?.reply_markup,
        }),
    });
    return response.json();
}

// Answer callback query (acknowledge button press)
export async function answerCallback(
    callbackQueryId: string,
    text?: string,
    showAlert?: boolean
): Promise<any> {
    const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text,
            show_alert: showAlert,
        }),
    });
    return response.json();
}

// Delete message
export async function deleteMessage(
    chatId: string | number,
    messageId: number
): Promise<any> {
    const response = await fetch(`${TELEGRAM_API}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
        }),
    });
    return response.json();
}

// Format currency
export function formatCurrency(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

// Format date
export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
