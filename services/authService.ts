// src/services/authService.ts
import { firebaseAuth } from "./firebase";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signOut,
    User as FirebaseUser,
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

const STORAGE_KEY = "nusantara_auth";

// Check if running on native platform (Android/iOS)
const isNativePlatform = (): boolean => {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
};

// Initialize Google Auth for native platforms
// Plugin reads config from capacitor.config.ts automatically
const initGoogleAuth = async () => {
    if (isNativePlatform()) {
        try {
            // Initialize without explicit clientId - uses capacitor.config.ts
            await GoogleAuth.initialize();
            console.log("[AUTH] GoogleAuth initialized for native platform");
        } catch (error) {
            console.error("[AUTH] Failed to initialize GoogleAuth:", error);
        }
    }
};

// Initialize on module load
initGoogleAuth();


const mapFirebaseUserToProfile = (user: FirebaseUser): UserProfile => {
    return {
        id: user.uid,
        name: user.displayName || "User",
        email: user.email || "",
        avatar: user.photoURL || "",
    };
};

export const authService = {
    loginWithGoogle: async (): Promise<UserProfile> => {
        try {
            if (isNativePlatform()) {
                // Use native Google Sign-In for Android/iOS
                console.log("[AUTH] Using native Google Sign-In...");

                const googleUser = await GoogleAuth.signIn();
                console.log("[AUTH] Native Google Sign-In success:", googleUser.email);

                // Create Firebase credential from the ID token
                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);

                // Sign in to Firebase with the credential
                const result = await signInWithCredential(firebaseAuth, credential);
                console.log("[AUTH] Firebase credential sign-in success:", result.user.email);

                const profile = mapFirebaseUserToProfile(result.user);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
                return profile;
            } else {
                // Use popup for web browser
                console.log("[AUTH] Opening Google popup for web...");
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(firebaseAuth, provider);
                console.log("[AUTH] Google popup success:", result);

                const user = result.user;
                const profile = mapFirebaseUserToProfile(user);

                localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
                return profile;
            }
        } catch (error: any) {
            console.error("[AUTH] Firebase Google login error:", error);
            throw error;
        }
    },

    getCurrentUser: (): UserProfile | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? (JSON.parse(stored) as UserProfile) : null;
        } catch (err) {
            console.error("Failed to parse stored user:", err);
            return null;
        }
    },

    logout: async (): Promise<void> => {
        try {
            // Sign out from Google Auth on native
            if (isNativePlatform()) {
                await GoogleAuth.signOut();
            }
        } catch (e) {
            console.error("[AUTH] GoogleAuth signOut error:", e);
        }
        await signOut(firebaseAuth);
        localStorage.removeItem(STORAGE_KEY);
    },
};
