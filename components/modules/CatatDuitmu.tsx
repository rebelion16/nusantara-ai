import React, { useState, useEffect, useMemo } from 'react';
import {
    Wallet,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    History,
    CreditCard,
    Bot,
    MoreHorizontal,
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    Trash2,
    X,
    Edit2,
    Calendar,
    PieChart,
    Filter,
    AlertTriangle,
    BarChart3,
    ChevronUp,
    ChevronDown,
    Download,
    FileText,
    RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../services/authService';
import { db } from '../../services/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    Timestamp,
    doc,
    updateDoc,
    increment,
    writeBatch,
    deleteDoc,
    getDoc
} from 'firebase/firestore';
import { WalletAccount, Transaction, WalletType, TransactionType } from '../../types';

// Predefined Categories
const INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Penjualan', 'Investasi', 'Hadiah', 'Lainnya'];
const EXPENSE_CATEGORIES = ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Donasi', 'Lainnya'];

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const CatatDuitmuModule: React.FC = () => {
    const user = authService.getCurrentUser();

    // Data State
    const [wallets, setWallets] = useState<WalletAccount[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense' | 'report'>('dashboard');

    // UI State
    const [showAddWallet, setShowAddWallet] = useState(false);
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [editingWallet, setEditingWallet] = useState<WalletAccount | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showDevWarning, setShowDevWarning] = useState(true);
    const [saving, setSaving] = useState(false);

    // Forms State
    const [walletForm, setWalletForm] = useState<Partial<WalletAccount>>({
        name: '',
        type: 'bank',
        balance: 0,
        color: 'bg-blue-600'
    });

    const [transactionForm, setTransactionForm] = useState<Partial<Transaction>>({
        amount: 0,
        category: 'Makanan',
        type: 'expense',
        description: '',
        walletId: ''
    });

    // Listen to Wallets
    useEffect(() => {
        if (!user) return;

        try {
            const q = query(collection(db, 'wallets'), where('userId', '==', user.email));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const walletList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletAccount));
                setWallets(walletList);

                // Set default wallet if not set
                if (!transactionForm.walletId && walletList.length > 0) {
                    setTransactionForm(prev => ({ ...prev, walletId: walletList[0].id }));
                }
            }, (error) => {
                console.error("Error listening to wallets:", error);
                setLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up wallet listener:", error);
            setLoading(false);
        }
    }, [user]);

    // Listen to Transactions
    useEffect(() => {
        if (!user) return;

        try {
            // Simple query without orderBy to avoid index requirement
            const q = query(collection(db, 'transactions'), where('userId', '==', user.email));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const txList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                // Sort client-side instead
                txList.sort((a, b) => b.date - a.date);
                setTransactions(txList);
                setLoading(false);
            }, (error) => {
                console.error("Error listening to transactions:", error);
                setLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up transaction listener:", error);
            setLoading(false);
        }
    }, [user]);

    // --- Actions ---

    const handleSaveWallet = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Error: User tidak ditemukan. Silakan login ulang.');
            return;
        }

        if (!walletForm.name || walletForm.name.trim() === '') {
            alert('Nama dompet harus diisi.');
            return;
        }

        setSaving(true);

        try {
            if (editingWallet) {
                // Edit existing
                await updateDoc(doc(db, 'wallets', editingWallet.id), {
                    name: walletForm.name,
                    type: walletForm.type,
                    color: walletForm.color,
                });
                console.log('Wallet updated successfully');
            } else {
                // Add new
                const newWallet = {
                    name: walletForm.name,
                    type: walletForm.type || 'bank',
                    color: walletForm.color || 'bg-blue-600',
                    userId: user.email,
                    balance: Number(walletForm.balance) || 0
                };
                console.log('Creating new wallet:', newWallet);
                await addDoc(collection(db, 'wallets'), newWallet);
                console.log('Wallet created successfully');
            }
            closeModals();
        } catch (error: any) {
            console.error("Error saving wallet: ", error);
            alert(`Gagal menyimpan dompet: ${error?.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWallet = async (walletId: string) => {
        if (!confirm('Apakah anda yakin? Transaksi terkait tidak akan dihapus otomatis.')) return;
        try {
            await deleteDoc(doc(db, 'wallets', walletId));
        } catch (error) {
            console.error("Error deleting wallet: ", error);
        }
    };

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Error: User tidak ditemukan. Silakan login ulang.');
            return;
        }

        if (!transactionForm.amount || transactionForm.amount <= 0) {
            alert('Jumlah harus diisi dan lebih dari 0.');
            return;
        }

        if (!transactionForm.walletId) {
            alert('Pilih dompet terlebih dahulu.');
            return;
        }

        setSaving(true);

        try {
            const batch = writeBatch(db);
            const amount = Number(transactionForm.amount);

            if (editingTransaction) {
                // EDIT LOGIC
                const oldTx = editingTransaction;
                const newTx = transactionForm;

                // 1. Revert Old Effect on Old Wallet
                const oldWalletRef = doc(db, 'wallets', oldTx.walletId);
                const oldRevert = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
                batch.update(oldWalletRef, { balance: increment(oldRevert) });

                // 2. Apply New Effect on New Wallet (could be same wallet)
                const newWalletRef = doc(db, 'wallets', newTx.walletId!);
                const newApply = newTx.type === 'income' ? amount : -amount;
                batch.update(newWalletRef, { balance: increment(newApply) });

                // 3. Update Transaction Doc
                const txRef = doc(db, 'transactions', editingTransaction.id);
                batch.update(txRef, {
                    ...newTx,
                    amount: amount
                });
                console.log('Updating transaction:', editingTransaction.id);

            } else {
                // ADD LOGIC
                const txRef = doc(collection(db, 'transactions'));
                const newTransaction = {
                    category: transactionForm.category,
                    type: transactionForm.type,
                    description: transactionForm.description || '',
                    walletId: transactionForm.walletId,
                    userId: user.email,
                    amount: amount,
                    date: Date.now()
                };
                console.log('Creating new transaction:', newTransaction);
                batch.set(txRef, newTransaction);

                const walletRef = doc(db, 'wallets', transactionForm.walletId);
                const balanceChange = transactionForm.type === 'income' ? amount : -amount;
                batch.update(walletRef, { balance: increment(balanceChange) });
            }

            await batch.commit();
            console.log('Transaction saved successfully!');
            closeModals();
        } catch (error: any) {
            console.error("Error saving transaction: ", error);
            alert(`Gagal menyimpan transaksi: ${error?.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTransaction = async (tx: Transaction) => {
        if (!confirm('Hapus transaksi ini? Saldo dompet akan dikembalikan.')) return;
        try {
            const batch = writeBatch(db);

            // Revert balance
            const walletRef = doc(db, 'wallets', tx.walletId);
            const revertAmount = tx.type === 'income' ? -tx.amount : tx.amount;
            batch.update(walletRef, { balance: increment(revertAmount) });

            // Delete doc
            const txRef = doc(db, 'transactions', tx.id);
            batch.delete(txRef);

            await batch.commit();
        } catch (error) {
            console.error("Error deleting filteredTx: ", error);
        }
    };

    // Reset all data for current user
    const handleResetData = async () => {
        if (!user) {
            alert('Error: User tidak ditemukan.');
            return;
        }

        // Double confirmation
        if (!confirm('⚠️ PERINGATAN: Anda akan menghapus SEMUA data (dompet dan transaksi). Tindakan ini tidak dapat dibatalkan!\n\nApakah Anda yakin?')) {
            return;
        }

        if (!confirm('🔴 KONFIRMASI AKHIR: Ketik OK untuk melanjutkan penghapusan semua data.')) {
            return;
        }

        setSaving(true);

        try {
            const batch = writeBatch(db);

            // Delete all wallets
            for (const wallet of wallets) {
                const walletRef = doc(db, 'wallets', wallet.id);
                batch.delete(walletRef);
            }

            // Delete all transactions
            for (const transaction of transactions) {
                const txRef = doc(db, 'transactions', transaction.id);
                batch.delete(txRef);
            }

            await batch.commit();

            alert('✅ Semua data berhasil dihapus! Anda bisa mulai dari awal.');
            console.log('All data reset successfully');
        } catch (error: any) {
            console.error("Error resetting data: ", error);
            alert(`Gagal mereset data: ${error?.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    // --- Helpers ---

    const formatNumber = (num: number) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const parseNumber = (str: string) => {
        return Number(str.replace(/\./g, ''));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, isWallet: boolean = false) => {
        const value = e.target.value.replace(/^0+/, ''); // Remove leading zeros
        const numberVal = parseNumber(value);

        if (isNaN(numberVal)) return;

        if (isWallet) {
            setWalletForm({ ...walletForm, balance: numberVal });
        } else {
            setTransactionForm({ ...transactionForm, amount: numberVal });
        }
    };

    const closeModals = () => {
        setShowAddWallet(false);
        setShowAddTransaction(false);
        setEditingWallet(null);
        setEditingTransaction(null);
        // Reset forms
        setWalletForm({ name: '', type: 'bank', balance: 0, color: 'bg-blue-600' });
        // Reset tx form but keep logic clean
        setTransactionForm({
            amount: 0,
            category: 'Makanan',
            type: 'expense',
            description: '',
            walletId: wallets[0]?.id || ''
        });
    };

    const openAddTransaction = () => {
        // Sync type with active tab
        const defaultType: TransactionType = activeTab === 'income' ? 'income' : activeTab === 'expense' ? 'expense' : 'expense';
        // If Dashboard, default to expense (most common)

        setTransactionForm({
            amount: 0,
            category: defaultType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
            type: defaultType,
            description: '',
            walletId: wallets[0]?.id || ''
        });
        setShowAddTransaction(true);
    };

    const openEditWallet = (w: WalletAccount) => {
        setEditingWallet(w);
        setWalletForm(w);
        setShowAddWallet(true);
    };

    const openEditTransaction = (tx: Transaction) => {
        setEditingTransaction(tx);
        setTransactionForm(tx);
        setShowAddTransaction(true);
    };

    // --- EXPORT FUNCTIONS ---

    const exportToJSON = () => {
        const exportData = {
            exportDate: new Date().toISOString(),
            user: user?.email,
            wallets: wallets.map(w => ({
                id: w.id,
                name: w.name,
                type: w.type,
                balance: w.balance,
                color: w.color
            })),
            transactions: transactions.map(t => ({
                id: t.id,
                amount: t.amount,
                category: t.category,
                type: t.type,
                description: t.description,
                walletId: t.walletId,
                date: new Date(t.date).toISOString()
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catat-duitmu-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportToCSV = () => {
        // Export transactions to CSV
        const headers = ['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah', 'Dompet'];
        const rows = transactions.map(t => {
            const wallet = wallets.find(w => w.id === t.walletId);
            return [
                new Date(t.date).toLocaleDateString('id-ID'),
                t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                t.category,
                t.description || '-',
                t.amount.toString(),
                wallet?.name || '-'
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaksi-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- Analytics & Filtering ---

    // Filter by Month & Year
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [transactions, selectedMonth, selectedYear]);

    // Calculate Totals based on filtered view (or total active view?)
    // Usually Dashboard shows Total Assets (all time) but Income/Expense for the month.
    const totalAssets = wallets.reduce((acc, curr) => acc + curr.balance, 0);
    const validIncome = filteredTransactions.filter(t => t.type === 'income');
    const validExpense = filteredTransactions.filter(t => t.type === 'expense');

    const monthlyIncome = validIncome.reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyExpense = validExpense.reduce((acc, curr) => acc + curr.amount, 0);

    // Percentage
    const burnRate = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0;

    // Grouping by Date
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};

        // Decide which list to show based on tabs
        let listToShow = filteredTransactions;
        if (activeTab === 'income') listToShow = validIncome;
        if (activeTab === 'expense') listToShow = validExpense;

        listToShow.forEach(tx => {
            const dateObj = new Date(tx.date);
            const dateKey = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(tx);
        });
        return groups;
    }, [filteredTransactions, activeTab, validIncome, validExpense]);

    // --- REPORT ANALYTICS ---

    // Helper: Get start/end of day
    const getDateRange = (date: Date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return { start: start.getTime(), end: end.getTime() };
    };

    // Today's transactions
    const todayRange = useMemo(() => getDateRange(new Date()), []);
    const todayTransactions = useMemo(() =>
        transactions.filter(tx => tx.date >= todayRange.start && tx.date <= todayRange.end),
        [transactions, todayRange]
    );
    const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    // Yesterday's transactions
    const yesterdayRange = useMemo(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return getDateRange(yesterday);
    }, []);
    const yesterdayTransactions = useMemo(() =>
        transactions.filter(tx => tx.date >= yesterdayRange.start && tx.date <= yesterdayRange.end),
        [transactions, yesterdayRange]
    );
    const yesterdayIncome = yesterdayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const yesterdayExpense = yesterdayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    // This month vs Last month
    const thisMonthData = useMemo(() => {
        const now = new Date();
        return transactions.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    }, [transactions]);

    const lastMonthData = useMemo(() => {
        const now = new Date();
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return transactions.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });
    }, [transactions]);

    const thisMonthIncome = thisMonthData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const thisMonthExpense = thisMonthData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const lastMonthIncome = lastMonthData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const lastMonthExpense = lastMonthData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    // Category breakdown for charts
    const categoryBreakdown = useMemo(() => {
        const incomeByCategory: Record<string, number> = {};
        const expenseByCategory: Record<string, number> = {};

        thisMonthData.forEach(tx => {
            if (tx.type === 'income') {
                incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
            } else {
                expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
            }
        });

        // Sort and get top 5
        const topIncome = Object.entries(incomeByCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const topExpense = Object.entries(expenseByCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return { topIncome, topExpense };
    }, [thisMonthData]);

    // Calculate percentage change
    const calcPercentChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
                        Catat Duitmu
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Atur keuanganmu, gapai impianmu.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Period Filter */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex items-center">
                        <select
                            className="bg-transparent border-none text-sm focus:ring-0 text-gray-900 dark:text-white cursor-pointer px-2"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {MONTHS.map((m, i) => <option key={i} value={i} className='bg-gray-800'>{m}</option>)}
                        </select>
                        <span className="text-gray-600">/</span>
                        <select
                            className="bg-transparent border-none text-sm focus:ring-0 text-gray-900 dark:text-white cursor-pointer px-2"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            <option value={2024} className='bg-gray-800'>2024</option>
                            <option value={2025} className='bg-gray-800'>2025</option>
                            <option value={2026} className='bg-gray-800'>2026</option>
                        </select>
                    </div>

                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                        <Bot size={18} className="text-blue-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">ID: {user?.email?.split('@')[0]}</span>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToJSON}
                            disabled={transactions.length === 0 && wallets.length === 0}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                            title="Export semua data ke JSON"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Backup</span>
                        </button>
                        <button
                            onClick={exportToCSV}
                            disabled={transactions.length === 0}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                            title="Export transaksi ke CSV (Excel)"
                        >
                            <FileText size={16} />
                            <span className="hidden sm:inline">CSV</span>
                        </button>
                        <button
                            onClick={handleResetData}
                            disabled={saving || (transactions.length === 0 && wallets.length === 0)}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                            title="Hapus semua data dan mulai ulang"
                        >
                            <RotateCcw size={16} />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Financial Health Stats (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 backdrop-blur-sm">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Aset (Semua)</p>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        Rp {totalAssets.toLocaleString('id-ID')}
                    </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/20 rounded-2xl border border-blue-200 dark:border-blue-500/20 backdrop-blur-sm">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Pemasukan ({MONTHS[selectedMonth]})</p>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        + Rp {monthlyIncome.toLocaleString('id-ID')}
                    </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-800/20 rounded-2xl border border-red-200 dark:border-red-500/20 backdrop-blur-sm">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Pengeluaran ({MONTHS[selectedMonth]})</p>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        - Rp {monthlyExpense.toLocaleString('id-ID')}
                    </div>
                </div>
                <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 backdrop-blur-sm flex flex-col justify-center">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Burn Rate</span>
                        <span className="font-bold">{burnRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-2.5 rounded-full ${burnRate > 80 ? 'bg-red-500' : burnRate > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(burnRate, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {burnRate > 100 ? 'Boros parah!' : burnRate > 75 ? 'Hati-hati.' : 'Aman terkendali.'}
                    </p>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Ringkasan
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'income' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Pemasukan
                </button>
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'expense' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Pengeluaran
                </button>
                <button
                    onClick={() => setActiveTab('report')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <BarChart3 size={16} />
                    Laporan
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Wallets (Only on Dashboard) or Info */}
                {activeTab === 'dashboard' && (
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-purple-400" />
                                Dompet Saya
                            </h2>
                            <button
                                onClick={() => setShowAddWallet(true)}
                                className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-lg text-sm transition-colors flex items-center gap-1"
                            >
                                <Plus size={14} /> Baru
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence>
                                {wallets.map((wallet) => (
                                    <motion.div
                                        key={wallet.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all ${wallet.color || 'bg-gray-800'}`}
                                        onClick={() => openEditWallet(wallet)}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <CreditCard size={100} />
                                        </div>
                                        {/* Always Visible Delete Button for Wallet */}
                                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteWallet(wallet.id); }}
                                                className="p-1.5 bg-black/40 hover:bg-red-500 rounded-lg text-white/80 hover:text-white transition-colors"
                                                title="Hapus Dompet"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-xs text-white/70 uppercase tracking-wider mb-1">{wallet.type}</p>
                                                    <h3 className="text-lg font-bold">{wallet.name}</h3>
                                                </div>
                                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                                                    {wallet.type === 'bank' ? <ArrowUpRight size={18} /> : <CreditCard size={18} />}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-mono font-bold">Rp {wallet.balance.toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {wallets.length === 0 && (
                                    <div className="col-span-full p-8 text-center border border-dashed border-gray-700 rounded-2xl text-gray-500">
                                        Belum ada dompet.
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Right/Main Column: Transaction List (Full width if not dashboard) */}
                <div className={activeTab === 'dashboard' ? "lg:col-span-1" : "lg:col-span-3"}>
                    <div className="bg-white dark:bg-[#131b2c] rounded-3xl p-6 border border-gray-200 dark:border-white/5 h-full flex flex-col min-h-[500px] shadow-sm dark:shadow-none">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <History className="w-5 h-5 text-orange-400" />
                                {activeTab === 'dashboard' ? 'Riwayat Terbaru' : `Daftar ${activeTab === 'income' ? 'Pemasukan' : 'Pengeluaran'}`}
                            </h2>
                            <button
                                onClick={openAddTransaction}
                                disabled={wallets.length === 0}
                                className="p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 max-h-[600px]">
                            {Object.entries(groupedTransactions).map(([date, txs]) => (
                                <div key={date}>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-[#131b2c] py-1 z-10">
                                        {date}
                                    </h3>
                                    <div className="space-y-2">
                                        {(txs as Transaction[]).map((tx) => (
                                            <div key={tx.id} className="group p-4 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/5 flex justify-between items-center">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 dark:text-white">{tx.description || tx.category}</div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">{tx.category}</span>
                                                        <span>•</span>
                                                        <span>{wallets.find(w => w.id === tx.walletId)?.name}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <div className={`font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                                                    </div>
                                                    {/* Always Visible Actions */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openEditTransaction(tx)}
                                                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTransaction(tx)}
                                                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(groupedTransactions).length === 0 && (
                                <div className="text-center text-gray-500 py-10">
                                    Tidak ada transaksi periode ini.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Tab Content */}
            {activeTab === 'report' && (
                <div className="space-y-6">
                    {/* Daily Report */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Today's Report */}
                        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl border border-blue-500/20 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Laporan Hari Ini</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-white/5 rounded-xl">
                                    <span className="text-gray-600 dark:text-gray-400">Pemasukan</span>
                                    <span className="font-bold text-emerald-400">+ Rp {todayIncome.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-white/5 rounded-xl">
                                    <span className="text-gray-600 dark:text-gray-400">Pengeluaran</span>
                                    <span className="font-bold text-red-400">- Rp {todayExpense.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-200 dark:bg-white/10 rounded-xl border border-gray-300 dark:border-white/10">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Selisih</span>
                                    <span className={`font-bold ${todayIncome - todayExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {todayIncome - todayExpense >= 0 ? '+' : ''} Rp {(todayIncome - todayExpense).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Today vs Yesterday Comparison */}
                        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-2xl border border-purple-500/20 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Perbandingan Hari Ini vs Kemarin</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Perubahan aktivitas keuangan</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Pemasukan</span>
                                        <div className="flex items-center gap-2">
                                            {calcPercentChange(todayIncome, yesterdayIncome) >= 0 ? (
                                                <ChevronUp className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className={`text-sm font-bold ${calcPercentChange(todayIncome, yesterdayIncome) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {calcPercentChange(todayIncome, yesterdayIncome).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Kemarin: Rp {yesterdayIncome.toLocaleString('id-ID')}</span>
                                        <span>Hari ini: Rp {todayIncome.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Pengeluaran</span>
                                        <div className="flex items-center gap-2">
                                            {calcPercentChange(todayExpense, yesterdayExpense) <= 0 ? (
                                                <ChevronDown className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <ChevronUp className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className={`text-sm font-bold ${calcPercentChange(todayExpense, yesterdayExpense) <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {Math.abs(calcPercentChange(todayExpense, yesterdayExpense)).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Kemarin: Rp {yesterdayExpense.toLocaleString('id-ID')}</span>
                                        <span>Hari ini: Rp {todayExpense.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Comparison */}
                    <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 rounded-2xl border border-cyan-500/20 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Perbandingan Bulan Ini vs Bulan Lalu</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{MONTHS[new Date().getMonth()]} vs {MONTHS[new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1]}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Income Comparison */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                    <TrendingUp size={14} /> Pemasukan
                                </h4>
                                <div className="flex justify-between items-end gap-4">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Bulan Lalu</p>
                                        <div className="h-8 bg-emerald-500/20 rounded-lg relative overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500/40 rounded-lg"
                                                style={{ width: `${Math.min((lastMonthIncome / Math.max(thisMonthIncome, lastMonthIncome, 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">Rp {lastMonthIncome.toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Bulan Ini</p>
                                        <div className="h-8 bg-emerald-500/20 rounded-lg relative overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-lg"
                                                style={{ width: `${Math.min((thisMonthIncome / Math.max(thisMonthIncome, lastMonthIncome, 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-sm font-bold text-emerald-400 mt-1">Rp {thisMonthIncome.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                                <div className={`text-center p-2 rounded-lg ${calcPercentChange(thisMonthIncome, lastMonthIncome) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <span className="text-sm font-bold">
                                        {calcPercentChange(thisMonthIncome, lastMonthIncome) >= 0 ? '↑' : '↓'} {Math.abs(calcPercentChange(thisMonthIncome, lastMonthIncome)).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            {/* Expense Comparison */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                                    <TrendingDown size={14} /> Pengeluaran
                                </h4>
                                <div className="flex justify-between items-end gap-4">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Bulan Lalu</p>
                                        <div className="h-8 bg-red-500/20 rounded-lg relative overflow-hidden">
                                            <div
                                                className="h-full bg-red-500/40 rounded-lg"
                                                style={{ width: `${Math.min((lastMonthExpense / Math.max(thisMonthExpense, lastMonthExpense, 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">Rp {lastMonthExpense.toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Bulan Ini</p>
                                        <div className="h-8 bg-red-500/20 rounded-lg relative overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-lg"
                                                style={{ width: `${Math.min((thisMonthExpense / Math.max(thisMonthExpense, lastMonthExpense, 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-sm font-bold text-red-400 mt-1">Rp {thisMonthExpense.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                                <div className={`text-center p-2 rounded-lg ${calcPercentChange(thisMonthExpense, lastMonthExpense) <= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <span className="text-sm font-bold">
                                        {calcPercentChange(thisMonthExpense, lastMonthExpense) >= 0 ? '↑' : '↓'} {Math.abs(calcPercentChange(thisMonthExpense, lastMonthExpense)).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top Income Categories */}
                        <div className="bg-white dark:bg-[#131b2c] rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Pemasukan Tertinggi</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Kategori bulan ini</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {categoryBreakdown.topIncome.length > 0 ? (
                                    categoryBreakdown.topIncome.map(([category, amount], index) => {
                                        const maxAmount = categoryBreakdown.topIncome[0][1];
                                        const percentage = (amount / maxAmount) * 100;
                                        return (
                                            <div key={category} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">{category}</span>
                                                    <span className="font-bold text-emerald-500 dark:text-emerald-400">Rp {amount.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-center text-gray-500 py-4">Belum ada data pemasukan bulan ini</p>
                                )}
                            </div>
                        </div>

                        {/* Top Expense Categories */}
                        <div className="bg-white dark:bg-[#131b2c] rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Pengeluaran Tertinggi</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Kategori bulan ini</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {categoryBreakdown.topExpense.length > 0 ? (
                                    categoryBreakdown.topExpense.map(([category, amount], index) => {
                                        const maxAmount = categoryBreakdown.topExpense[0][1];
                                        const percentage = (amount / maxAmount) * 100;
                                        return (
                                            <div key={category} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">{category}</span>
                                                    <span className="font-bold text-red-500 dark:text-red-400">Rp {amount.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-center text-gray-500 py-4">Belum ada data pengeluaran bulan ini</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}

            {/* Wallet Modal */}
            <AnimatePresence>
                {showAddWallet && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a2333] p-6 rounded-2xl border border-white/10 w-full max-w-md relative"
                        >
                            <button onClick={closeModals} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                            <h3 className="text-xl font-bold mb-4">{editingWallet ? 'Edit Dompet' : 'Tambah Dompet Baru'}</h3>
                            <form onSubmit={handleSaveWallet} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Nama Dompet</label>
                                    <input
                                        className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                                        placeholder="Contoh: BCA, GoPay"
                                        value={walletForm.name}
                                        onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Tipe</label>
                                    <select
                                        className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                                        value={walletForm.type}
                                        onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value as WalletType })}
                                    >
                                        <option value="bank">Bank Transfer</option>
                                        <option value="e-wallet">E-Wallet</option>
                                        <option value="cash">Uang Tunai</option>
                                    </select>
                                </div>
                                {!editingWallet && (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Saldo Awal</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                                            placeholder="0"
                                            value={walletForm.balance ? formatNumber(walletForm.balance!) : ''}
                                            onChange={(e) => handleAmountChange(e, true)}
                                        />
                                    </div>
                                )}
                                <div className="flex gap-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transaction Modal */}
            <AnimatePresence>
                {showAddTransaction && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a2333] p-6 rounded-2xl border border-white/10 w-full max-w-md relative"
                        >
                            <button onClick={closeModals} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                            <h3 className="text-xl font-bold mb-4">{editingTransaction ? 'Edit Transaksi' : 'Catat Transaksi'}</h3>
                            <form onSubmit={handleSaveTransaction} className="space-y-4">
                                <div className="flex gap-2 p-1 bg-[#0a0f1d] rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setTransactionForm({ ...transactionForm, type: 'expense', category: EXPENSE_CATEGORIES[0] })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${transactionForm.type === 'expense' ? 'bg-red-500/20 text-red-500' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Pengeluaran
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTransactionForm({ ...transactionForm, type: 'income', category: INCOME_CATEGORIES[0] })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${transactionForm.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Pemasukan
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Jumlah</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 text-lg font-bold"
                                        placeholder="0"
                                        value={transactionForm.amount ? formatNumber(transactionForm.amount!) : ''}
                                        onChange={(e) => handleAmountChange(e, false)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Dompet</label>
                                        <select
                                            className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                                            value={transactionForm.walletId}
                                            onChange={(e) => setTransactionForm({ ...transactionForm, walletId: e.target.value })}
                                        >
                                            {wallets.map(w => (
                                                <option key={w.id} value={w.id}>{w.name} ({formatNumber(w.balance)})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Kategori</label>
                                        <select
                                            className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                                            value={transactionForm.category}
                                            onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                                        >
                                            {(transactionForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
                                    <textarea
                                        className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 h-20"
                                        placeholder="Catatan tambahan (Opsional)..."
                                        value={transactionForm.description}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors font-bold">Simpan</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Development Warning Popup */}
            <AnimatePresence>
                {showDevWarning && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a2333] p-8 rounded-2xl border border-amber-500/30 w-full max-w-md relative text-center"
                        >
                            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-8 h-8 text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-amber-400 mb-3">Modul Dalam Pengembangan</h3>
                            <p className="text-gray-300 mb-6 leading-relaxed">
                                Modul <span className="font-semibold text-white">Catat Duitmu</span> sedang dalam tahap pengembangan dan belum bisa digunakan sepenuhnya.
                                Beberapa fitur mungkin tidak berfungsi dengan baik.
                            </p>
                            <button
                                onClick={() => setShowDevWarning(false)}
                                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold transition-colors"
                            >
                                Saya Mengerti
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
