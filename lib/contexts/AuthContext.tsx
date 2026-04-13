"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { 
    User, 
    onAuthStateChanged, 
    signInWithPopup, 
    signOut as firebaseSignOut 
} from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getFirebaseAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const auth = getFirebaseAuth();
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        if (typeof window === "undefined") return;

        // 1. Clear local storage immediately for UI responsiveness
        const keysToClear = [
            "courier-tracker-settings",
            "courier-tracker-deliveries",
            "courier-tracker-tips",
            "courier-tracker-settlements"
        ];
        keysToClear.forEach(key => localStorage.removeItem(key));

        const auth = getFirebaseAuth();
        try {
            // 2. Set a safety timeout to force reload even if signOut hangs
            const forceReload = setTimeout(() => {
                window.location.href = "/settings";
            }, 1000);

            await firebaseSignOut(auth);
            
            clearTimeout(forceReload);
            window.location.href = "/settings";
        } catch (error) {
            console.error("Logout Error:", error);
            // Even on error, we want to force the state reset
            window.location.href = "/settings";
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
