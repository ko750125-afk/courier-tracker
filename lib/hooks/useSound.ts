"use client";
import { useCallback, useEffect, useRef } from "react";

export function useSound(enabled: boolean = false) {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Preload the sound
        if (typeof window !== "undefined") {
            const audio = new Audio("/sounds/click.mp3");
            audio.preload = "auto";
            audio.volume = 0.3; // Subtle volume
            audioRef.current = audio;
        }
    }, []);

    const play = useCallback(() => {
        if (!enabled || !audioRef.current) return;

        // Reset and play for low latency repeated clicks
        const audio = audioRef.current;
        audio.currentTime = 0;
        audio.play().catch((e) => {
            // Browsers might block audio if no user interaction has occurred,
            // but since this is a click handler, it should generally be fine.
            console.debug("Sound playback failed:", e);
        });
    }, [enabled]);

    return { play };
}
