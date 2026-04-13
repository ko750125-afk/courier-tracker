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

        const auth = getFirebaseAuth();
        try {
            // Set a safety timeout to force reload even if signOut hangs
            // We NO LONGER clear localStorage here because it's too dangerous if the logout fails.
            // The reload will clear React state.
            const forceReload = setTimeout(() => {
                window.location.href = "/settings";
            }, 1500);

            await firebaseSignOut(auth);
            
            clearTimeout(forceReload);
            window.location.href = "/settings";
        } catch (error) {
            console.error("Logout Error:", error);
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
