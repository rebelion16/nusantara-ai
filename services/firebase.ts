// services/firebase.ts
// Firebase Auth only - Database uses Supabase (lib/supabase.ts)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config - Note: Firebase web config is safe to expose in frontend
// These are public identifiers, not secret keys
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAPEZbIMw23gZO-A1aBd7zWELxKVOsSYWE",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nusantara-ai-18db6.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nusantara-ai-18db6",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nusantara-ai-18db6.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "959578499658",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:959578499658:web:c2d84cae28ff6bce2154b3",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-82N7EN5L4D"
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
