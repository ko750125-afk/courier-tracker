"use client";
import React, { useRef, useState, useEffect } from "react";
import ImageAnnotator from "./ImageAnnotator";

interface FullScreenImageViewerProps {
    src: string;
    originalSrc?: string;
    initialAnnotations?: any[];
    onClose: () => void;
    onSave: (newUrl: string, annotations: any[]) => void;
}

export default function FullScreenImageViewer({ src, originalSrc, initialAnnotations, onClose, onSave }: FullScreenImageViewerProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    
    // Pinch to zoom state
    const lastTouchDistance = useRef<number | null>(null);

    useEffect(() => {
        if (!isEditing) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isEditing]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isEditing) return;
        if (e.touches.length === 2) {
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            lastTouchDistance.current = distance;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isEditing) return;
        if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const delta = distance / lastTouchDistance.current;
            setScale(prev => Math.min(Math.max(1, prev * delta), 5));
            lastTouchDistance.current = distance;
        } else if (e.touches.length === 1 && scale > 1) {
            // Basic panning when zoomed
            // Simplified for now to avoid jumpiness
        }
    };

    const handleTouchEnd = () => {
        lastTouchDistance.current = null;
    };

    return (
        <>
            <div 
                className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="absolute top-6 right-6 z-10 flex gap-4">
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 active:scale-95 transition-all text-sm font-black"
                    >
                        편집
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 active:scale-95 transition-all text-xl"
                    >
                        ✕
                    </button>
                </div>

                <div 
                    className={`w-full h-full flex items-center justify-center transition-transform ${lastTouchDistance.current ? '' : 'duration-100'}`}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    }}
                >
                    <img
                        ref={imageRef}
                        src={src}
                        alt="전체 화면"
                        className="max-w-full max-h-full object-contain shadow-2xl"
                        draggable={false}
                    />
                </div>
                
                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">두 손가락으로 확대해서 보세요</p>
                </div>
            </div>

            {isEditing && (
                <ImageAnnotator 
                    src={originalSrc || src} 
                    initialAnnotations={initialAnnotations}
                    onCancel={() => setIsEditing(false)}
                    onSave={(newUrl, anns) => {
                        onSave(newUrl, anns);
                        setIsEditing(false);
                    }}
                />
            )}
        </>
    );
}
