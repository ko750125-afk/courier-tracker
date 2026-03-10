"use client";
import { useEffect } from "react";

export default function ErrorWatcher() {
    useEffect(() => {
        window.onerror = function (message, source, lineno, colno, error) {
            console.error("GLOBAL ERROR caught:", message, source, lineno, colno, error);
            const display = document.createElement("div");
            display.id = "error-bar-display";
            display.style.position = "fixed";
            display.style.top = "0";
            display.style.left = "0";
            display.style.width = "100%";
            display.style.zIndex = "99999";
            display.style.background = "#991b1b";
            display.style.color = "#ffffff";
            display.style.padding = "15px";
            display.style.fontSize = "12px";
            display.style.fontWeight = "bold";
            display.style.wordBreak = "break-all";
            display.innerText = `[모바일 에러]: ${message} (${lineno}:${colno})`;
            document.body.appendChild(display);
        };
    }, []);
    return null;
}
