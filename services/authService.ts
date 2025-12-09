// src/services/authService.ts

import { firebaseAuth } from "./firebase";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    User as FirebaseUser,
} from "firebase/auth";

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

const STORAGE_KEY = "nusantara_auth";

const mapFirebaseUserToProfile = (user: FirebaseUser): UserProfile => {
    return {
        id: user.uid,
        name: user.displayName || "User",
        email: user.email || "",
        avatar: user.photoURL || "",
    };
};

export const authService = {
    // Login Google beneran (Firebase)
    loginWithGoogle: async (): Promise<UserProfile> => {
        const provider = new GoogleAuthProvider();

        const result = await signInWithPopup(firebaseAuth, provider);
        const user = result.user;

        const profile = mapFirebaseUserToProfile(user);

        // Simpan ke localStorage supaya App.tsx bisa restore session di refresh
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

        return profile;
    },

    // Check Session dari localStorage (bukan dari Firebase langsung)
    getCurrentUser: (): UserProfile | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? (JSON.parse(stored) as UserProfile) : null;
        } catch (err) {
            console.error("Failed to parse stored user:", err);
            return null;
        }
    },

    // Logout
    logout: async (): Promise<void> => {
        await signOut(firebaseAuth);
        localStorage.removeItem(STORAGE_KEY);
    },
};
