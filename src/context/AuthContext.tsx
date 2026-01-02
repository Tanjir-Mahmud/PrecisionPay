"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    User,
    updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (e: string, p: string) => Promise<void>;
    googleLogin: () => Promise<void>;
    signup: (name: string, company: string, e: string, p: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
        router.push("/");
    };

    const googleLogin = async () => {
        const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Create Profile if new
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            await setDoc(docRef, {
                name: user.displayName,
                email: user.email,
                companyName: "Google Auth Company", // Default or prompt later
                role: "admin",
                createdAt: new Date()
            });

            // Payroll Settings creation logic removed to force onboarding wizard
        }

        router.push("/");
    };

    const signup = async (name: string, company: string, email: string, pass: string) => {
        // 1. Create Auth User
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;

        // 2. Create User Profile
        await setDoc(doc(db, "users", uid), {
            name,
            email,
            companyName: company,
            role: "admin", // Defaulting first user to admin
            createdAt: new Date()
        });

        // 3. Payroll Settings will be created in Onboarding Wizard
        // Removed auto-creation logic to force redirection to /onboarding

        // Update Display Name
        await updateProfile(cred.user, { displayName: name });

        router.push("/");
    };

    const logout = async () => {
        await signOut(auth);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, googleLogin, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
