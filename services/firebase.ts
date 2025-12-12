// services/firebase.ts
// Firebase Auth only - Database uses Supabase (lib/supabase.ts)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config - uses environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

if (!firebaseConfig.apiKey) {
    console.error('Missing Firebase environment variables. Please set VITE_FIREBASE_* variables in .env.local');
}

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
