// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAPEZbIMw23gZO-A1aBd7zWELxKVOSyWE",
    authDomain: "nusantara-ai-18db6.firebaseapp.com",
    projectId: "nusantara-ai-18db6",
    storageBucket: "nusantara-ai-18db6.appspot.com",
    messagingSenderId: "959578499658",
    appId: "1:959578499658:web:c2d84cae28ff6bce2154b3",
    measurementId: "G-82N7EN5L4D"
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
