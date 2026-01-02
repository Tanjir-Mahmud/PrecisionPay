
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAKSAtUfYS3_crilgLwHMbW8hg7TnMvv9U",
    authDomain: "precisionpay.firebaseapp.com",
    projectId: "precisionpay",
    storageBucket: "precisionpay.firebasestorage.app",
    messagingSenderId: "229554517164",
    appId: "1:229554517164:web:8eb3c43b4ee0d5417a5b09",
    measurementId: "G-CF5YRRCFKL"
};

// Initialize Firebase (Singleton pattern to avoid re-initialization)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
