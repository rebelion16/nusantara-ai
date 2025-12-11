// lib/firebase-admin.ts
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const initFirebaseAdmin = () => {
    if (admin.apps.length === 0) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    }
    return admin;
};

export const adminApp = initFirebaseAdmin();
export const adminDb = admin.firestore();

// Helper functions for Firestore operations
export const firestoreHelpers = {
    // Get user by telegram ID
    async getTelegramUser(telegramId: string) {
        const snapshot = await adminDb
            .collection('telegram_users')
            .where('telegramId', '==', telegramId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    // Link telegram user to email
    async linkTelegramUser(telegramId: string, chatId: string, email: string, username?: string) {
        const docRef = adminDb.collection('telegram_users').doc();
        await docRef.set({
            telegramId,
            chatId,
            email,
            username: username || null,
            linkedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return docRef.id;
    },

    // Get wallets by email
    async getWalletsByEmail(email: string) {
        const snapshot = await adminDb
            .collection('wallets')
            .where('userId', '==', email)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Get transactions by email
    async getTransactionsByEmail(email: string, limit = 10) {
        const snapshot = await adminDb
            .collection('transactions')
            .where('userId', '==', email)
            .orderBy('date', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Add wallet
    async addWallet(email: string, name: string, type: string, balance: number) {
        const docRef = adminDb.collection('wallets').doc();
        await docRef.set({
            userId: email,
            name,
            type,
            balance,
            color: type === 'bank' ? 'bg-blue-600' : type === 'e-wallet' ? 'bg-purple-600' : 'bg-green-600',
        });
        return docRef.id;
    },

    // Add transaction
    async addTransaction(
        email: string,
        walletId: string,
        amount: number,
        category: string,
        type: 'income' | 'expense',
        description: string = ''
    ) {
        const batch = adminDb.batch();

        // Create transaction
        const txRef = adminDb.collection('transactions').doc();
        batch.set(txRef, {
            userId: email,
            walletId,
            amount,
            category,
            type,
            description,
            date: Date.now(),
        });

        // Update wallet balance
        const walletRef = adminDb.collection('wallets').doc(walletId);
        const balanceChange = type === 'income' ? amount : -amount;
        batch.update(walletRef, {
            balance: admin.firestore.FieldValue.increment(balanceChange),
        });

        await batch.commit();
        return txRef.id;
    },

    // Create OAuth session
    async createOAuthSession(state: string, telegramId: string, chatId: string) {
        const docRef = adminDb.collection('telegram_sessions').doc(state);
        await docRef.set({
            telegramId,
            chatId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });
    },

    // Get and delete OAuth session
    async getAndDeleteOAuthSession(state: string) {
        const docRef = adminDb.collection('telegram_sessions').doc(state);
        const doc = await docRef.get();

        if (!doc.exists) return null;

        const data = doc.data();
        await docRef.delete();

        return data;
    },
};
