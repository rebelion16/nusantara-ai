// lib/firebase-admin.ts
// Using dynamic import to avoid initialization issues in serverless

let adminDb: any = null;
let adminInitialized = false;

async function getFirebaseAdmin() {
    if (adminInitialized) {
        return adminDb;
    }

    try {
        const admin = await import('firebase-admin');

        if (admin.default.apps.length === 0) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

            admin.default.initializeApp({
                credential: admin.default.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        }

        adminDb = admin.default.firestore();
        adminInitialized = true;
        return adminDb;
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
        throw error;
    }
}

// Helper functions for Firestore operations
export const firestoreHelpers = {
    // Get user by telegram ID
    async getTelegramUser(telegramId: string) {
        const db = await getFirebaseAdmin();
        const snapshot = await db
            .collection('telegram_users')
            .where('telegramId', '==', telegramId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    // Link telegram user to email
    async linkTelegramUser(telegramId: string, chatId: string, email: string, username?: string) {
        const db = await getFirebaseAdmin();
        const admin = await import('firebase-admin');

        const docRef = db.collection('telegram_users').doc();
        await docRef.set({
            telegramId,
            chatId,
            email,
            username: username || null,
            linkedAt: admin.default.firestore.FieldValue.serverTimestamp(),
        });
        return docRef.id;
    },

    // Get wallets by email
    async getWalletsByEmail(email: string) {
        const db = await getFirebaseAdmin();
        const snapshot = await db
            .collection('wallets')
            .where('userId', '==', email)
            .get();

        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    },

    // Get transactions by email
    async getTransactionsByEmail(email: string, limit = 10) {
        const db = await getFirebaseAdmin();
        const snapshot = await db
            .collection('transactions')
            .where('userId', '==', email)
            .orderBy('date', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    },

    // Add wallet
    async addWallet(email: string, name: string, type: string, balance: number) {
        const db = await getFirebaseAdmin();
        const docRef = db.collection('wallets').doc();
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
        const db = await getFirebaseAdmin();
        const admin = await import('firebase-admin');
        const batch = db.batch();

        // Create transaction
        const txRef = db.collection('transactions').doc();
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
        const walletRef = db.collection('wallets').doc(walletId);
        const balanceChange = type === 'income' ? amount : -amount;
        batch.update(walletRef, {
            balance: admin.default.firestore.FieldValue.increment(balanceChange),
        });

        await batch.commit();
        return txRef.id;
    },

    // Create OAuth session
    async createOAuthSession(state: string, telegramId: string, chatId: string) {
        const db = await getFirebaseAdmin();
        const admin = await import('firebase-admin');

        const docRef = db.collection('telegram_sessions').doc(state);
        await docRef.set({
            telegramId,
            chatId,
            createdAt: admin.default.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });
    },

    // Get and delete OAuth session
    async getAndDeleteOAuthSession(state: string) {
        const db = await getFirebaseAdmin();
        const docRef = db.collection('telegram_sessions').doc(state);
        const doc = await docRef.get();

        if (!doc.exists) return null;

        const data = doc.data();
        await docRef.delete();

        return data;
    },
};
