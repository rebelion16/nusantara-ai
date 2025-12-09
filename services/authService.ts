
// --- Mock Auth Service (Simulating Backend) ---

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

const MOCK_USER: UserProfile = {
    id: 'google_123456789',
    name: 'Rebelion16 User',
    email: 'user@nusantara-ai.com',
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocIqC6jK3_w_k_59238475' // Generic Google Avatar
};

export const authService = {
    // Simulate Login API Call
    loginWithGoogle: async (): Promise<UserProfile> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.setItem('nusantara_auth', JSON.stringify(MOCK_USER));
                resolve(MOCK_USER);
            }, 1500); // 1.5s network delay simulation
        });
    },

    // Check Session
    getCurrentUser: (): UserProfile | null => {
        const stored = localStorage.getItem('nusantara_auth');
        return stored ? JSON.parse(stored) : null;
    },

    // Logout
    logout: async (): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.removeItem('nusantara_auth');
                resolve();
            }, 500);
        });
    }
};
