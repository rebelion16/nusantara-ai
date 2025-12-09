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
    loginWithGoogle: async (): Promise<UserProfile> => {
        const provider = new GoogleAuthProvider();

        try {
            console.log("[AUTH] Opening Google popup...");
            const result = await signInWithPopup(firebaseAuth, provider);
            console.log("[AUTH] Google popup success:", result);

            const user = result.user;
            const profile = mapFirebaseUserToProfile(user);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
            return profile;
        } catch (error: any) {
            console.error("[AUTH] Firebase Google login error:", error);
            // lempar lagi biar ditangkap di LoginScreen
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
        await signOut(firebaseAuth);
        localStorage.removeItem(STORAGE_KEY);
    },
};
