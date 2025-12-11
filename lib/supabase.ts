// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Supabase config
// Note: For production, use environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ngjdmeuownnvurpsitqn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5namRtZXVvd25udnVycHNpdHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODEwMTUsImV4cCI6MjA4MDc1NzAxNX0.PA_XW-iOFKTOpWgXKmjl3Zgxp1AfAsqNreI9O64QAsk';

// Create Supabase client for browser
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types
export interface WalletRow {
    id: string;
    user_id: string;
    name: string;
    type: string;
    balance: number;
    color: string;
    created_at: string;
}

export interface TransactionRow {
    id: string;
    user_id: string;
    wallet_id: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    description: string;
    date: string;
    created_at: string;
}

export interface TelegramUserRow {
    id: string;
    telegram_id: string;
    email: string;
    username?: string;
    linked_at: string;
}

// Helper functions for web app

export async function getWallets(userId: string): Promise<WalletRow[]> {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching wallets:', error);
        return [];
    }
    return data || [];
}

export async function addWallet(wallet: Omit<WalletRow, 'id' | 'created_at'>): Promise<WalletRow | null> {
    const { data, error } = await supabase
        .from('wallets')
        .insert(wallet)
        .select()
        .single();

    if (error) {
        console.error('Error adding wallet:', error);
        return null;
    }
    return data;
}

export async function updateWallet(id: string, updates: Partial<WalletRow>): Promise<boolean> {
    const { error } = await supabase
        .from('wallets')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating wallet:', error);
        return false;
    }
    return true;
}

export async function deleteWallet(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting wallet:', error);
        return false;
    }
    return true;
}

export async function getTransactions(userId: string): Promise<TransactionRow[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return data || [];
}

export async function addTransaction(
    transaction: Omit<TransactionRow, 'id' | 'created_at'>,
    updateBalance: boolean = true
): Promise<TransactionRow | null> {
    const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

    if (error) {
        console.error('Error adding transaction:', error);
        return null;
    }

    // Update wallet balance
    if (updateBalance && data) {
        const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        await supabase.rpc('update_wallet_balance', {
            wallet_id: transaction.wallet_id,
            amount_change: balanceChange
        });
    }

    return data;
}

export async function deleteTransaction(id: string, walletId: string, amount: number, type: 'income' | 'expense'): Promise<boolean> {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting transaction:', error);
        return false;
    }

    // Revert wallet balance
    const balanceChange = type === 'income' ? -amount : amount;
    await supabase.rpc('update_wallet_balance', {
        wallet_id: walletId,
        amount_change: balanceChange
    });

    return true;
}

// Subscribe to real-time changes
export function subscribeToWallets(userId: string, callback: (wallets: WalletRow[]) => void) {
    const channel = supabase
        .channel('wallets-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'wallets',
                filter: `user_id=eq.${userId}`
            },
            async () => {
                // Re-fetch all wallets on any change
                const wallets = await getWallets(userId);
                callback(wallets);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

export function subscribeToTransactions(userId: string, callback: (transactions: TransactionRow[]) => void) {
    const channel = supabase
        .channel('transactions-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'transactions',
                filter: `user_id=eq.${userId}`
            },
            async () => {
                // Re-fetch all transactions on any change
                const transactions = await getTransactions(userId);
                callback(transactions);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
