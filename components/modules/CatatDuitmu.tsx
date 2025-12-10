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
    Filter
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense'>('dashboard');

    // UI State
    const [showAddWallet, setShowAddWallet] = useState(false);
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [editingWallet, setEditingWallet] = useState<WalletAccount | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
        const q = query(collection(db, 'wallets'), where('userId', '==', user.email));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const walletList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletAccount));
            setWallets(walletList);

            // Set default wallet if not set
            if (!transactionForm.walletId && walletList.length > 0) {
                setTransactionForm(prev => ({ ...prev, walletId: walletList[0].id }));
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Listen to Transactions
    useEffect(() => {
        if (!user) return;
        // In real app, might want to filter by date at Firestore level for scale
        const q = query(collection(db, 'transactions'), where('userId', '==', user.email), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const txList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            setTransactions(txList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // --- Actions ---

    const handleSaveWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !walletForm.name) return;

        try {
            if (editingWallet) {
                // Edit existing
                await updateDoc(doc(db, 'wallets', editingWallet.id), {
                    name: walletForm.name,
                    type: walletForm.type,
                    // Balance usually not editable directly here unless complex logic, 
                    // but for simplicity let's allow "correction" if user really wants, 
                    // though typically initial balance is fixed. 
                    // Let's ONLY update metadata to be safe, balance edits should be transactions.
                    // If user wants to change balance, they should add a transaction.
                });
            } else {
                // Add new
                await addDoc(collection(db, 'wallets'), {
                    ...walletForm,
                    userId: user.email,
                    balance: Number(walletForm.balance)
                });
            }
            closeModals();
        } catch (error) {
            console.error("Error saving wallet: ", error);
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
        if (!user || !transactionForm.amount || !transactionForm.walletId) return;

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

            } else {
                // ADD LOGIC
                const txRef = doc(collection(db, 'transactions'));
                batch.set(txRef, {
                    ...transactionForm,
                    userId: user.email,
                    amount: amount,
                    date: Date.now()
                });

                const walletRef = doc(db, 'wallets', transactionForm.walletId);
                const balanceChange = transactionForm.type === 'income' ? amount : -amount;
                batch.update(walletRef, { balance: increment(balanceChange) });
            }

            await batch.commit();
            closeModals();
        } catch (error) {
            console.error("Error saving transaction: ", error);
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

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
                        Catat Duitmu
                    </h1>
                    <p className="text-gray-400">Atur keuanganmu, gapai impianmu.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Period Filter */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex items-center">
                        <select
                            className="bg-transparent border-none text-sm focus:ring-0 text-white cursor-pointer px-2"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {MONTHS.map((m, i) => <option key={i} value={i} className='bg-gray-800'>{m}</option>)}
                        </select>
                        <span className="text-gray-600">/</span>
                        <select
                            className="bg-transparent border-none text-sm focus:ring-0 text-white cursor-pointer px-2"
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
                        <span className="text-sm text-gray-300">ID: {user?.email?.split('@')[0]}</span>
                    </div>
                </div>
            </div>

            {/* Financial Health Stats (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                    <p className="text-gray-400 text-sm mb-1">Total Aset (Semua)</p>
                    <div className="text-2xl font-bold text-white">
                        Rp {totalAssets.toLocaleString('id-ID')}
                    </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                    <p className="text-gray-400 text-sm mb-1">Pemasukan ({MONTHS[selectedMonth]})</p>
                    <div className="text-2xl font-bold text-emerald-400">
                        + Rp {monthlyIncome.toLocaleString('id-ID')}
                    </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-red-900/40 to-red-800/20 rounded-2xl border border-red-500/20 backdrop-blur-sm">
                    <p className="text-gray-400 text-sm mb-1">Pengeluaran ({MONTHS[selectedMonth]})</p>
                    <div className="text-2xl font-bold text-red-400">
                        - Rp {monthlyExpense.toLocaleString('id-ID')}
                    </div>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm flex flex-col justify-center">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Burn Rate</span>
                        <span className="font-bold">{burnRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
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
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
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
                    <div className="bg-[#131b2c] rounded-3xl p-6 border border-white/5 h-full flex flex-col min-h-[500px]">
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
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#131b2c] py-1 z-10">
                                        {date}
                                    </h3>
                                    <div className="space-y-2">
                                        {(txs as Transaction[]).map((tx) => (
                                            <div key={tx.id} className="group p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5 flex justify-between items-center">
                                                <div className="flex-1">
                                                    <div className="font-medium text-white">{tx.description || tx.category}</div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-2">
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
                                    <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors font-bold">Simpan</button>
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
        </div>
    );
};
