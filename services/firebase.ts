// services/firebase.ts
// Firebase configuration - only used for Google Authentication
// Database operations use Supabase (see lib/supabase.ts)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAzitVPXHn88j-d0dJELsDAQhXiINZe6w8",
    authDomain: "cobafix-59ee1.firebaseapp.com",
    projectId: "cobafix-59ee1",
    storageBucket: "cobafix-59ee1.firebasestorage.app",
    messagingSenderId: "461309680416",
    appId: "1:461309680416:web:a5deb24d1f6dd5af8b2c7f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth for Google login
export const firebaseAuth = getAuth(app);
