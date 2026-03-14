"use client";
import React, { useRef, useState, useEffect } from "react";

interface Annotation {
    type: 'arrow' | 'text';
    x1: number;
    y1: number;
    x2?: number;
    y2?: number;
    text?: string;
}

interface ImageAnnotatorProps {
    src: string;
    onSave: (dataUrl: string) => void;
    onCancel: () => void;
}

export default function ImageAnnotator({ src, onSave, onCancel }: ImageAnnotatorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeTool, setActiveTool] = useState<'arrow' | 'text'>('arrow');
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    
    // For text input
    const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' });

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            // Fit canvas to image aspect ratio
            const maxWidth = window.innerWidth * 0.95;
            const maxHeight = window.innerHeight * 0.7;
            let w = img.width;
            let h = img.height;
            
            const ratio = Math.min(maxWidth / w, maxHeight / h);
            canvas.width = w * ratio;
            canvas.height = h * ratio;
            
            drawCanvas();
        };
    }, [src]);

    useEffect(() => {
        drawCanvas();
    }, [annotations]);

    const drawCanvas = () => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw annotations
            ctx.strokeStyle = '#3b82f6'; // blue-500
            ctx.fillStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            annotations.forEach(ann => {
                if (ann.type === 'arrow' && ann.x2 !== undefined && ann.y2 !== undefined) {
                    drawArrow(ctx, ann.x1, ann.y1, ann.x2, ann.y2);
                } else if (ann.type === 'text' && ann.text) {
                    ctx.font = 'bold 24px Inter, sans-serif';
                    
                    // Measure text
                    const metrics = ctx.measureText(ann.text);
                    const padding = 8;
                    const h = 32;
                    const w = metrics.width + padding * 2;
                    
                    // Draw background
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'; // blue-500
                    ctx.roundRect(ann.x1 - padding, ann.y1 - h + 6, w, h, 8);
                    ctx.fill();
                    
                    // Draw text
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(ann.text, ann.x1, ann.y1);
                }
            });
        };
    };

    const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) => {
        const headlen = 15;
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX = 0;
        let clientY = 0;
        
        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('changedTouches' in e && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else if ('clientX' in e) {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPos(e);
        if (activeTool === 'arrow') {
            setIsDrawing(true);
            setStartPos(pos);
        } else if (activeTool === 'text') {
            setTextInput({ show: true, x: pos.x, y: pos.y - 40, value: '' });
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !startPos || activeTool !== 'arrow') return;
        const pos = getPos(e);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        drawCanvas();
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = '#3b82f6';
        ctx.lineWidth = 4;
        drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
    };

    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !startPos || activeTool !== 'arrow') return;
        const pos = getPos(e);
        setAnnotations(prev => [...prev, { type: 'arrow', x1: startPos.x, y1: startPos.y, x2: pos.x, y2: pos.y }]);
        setIsDrawing(false);
        setStartPos(null);
    };

    const handleSaveImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        onSave(canvas.toDataURL('image/jpeg', 0.8));
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg mb-4 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTool('arrow')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${activeTool === 'arrow' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                        화살표
                    </button>
                    <button 
                        onClick={() => setActiveTool('text')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${activeTool === 'text' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        텍스트
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-4 py-2 bg-white/5 text-white font-black rounded-xl text-xs">취소</button>
                    <button onClick={handleSaveImage} className="px-4 py-2 bg-blue-600 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-500/20">저장</button>
                </div>
            </div>

            <div className="relative border-4 border-white/10 rounded-xl overflow-hidden shadow-2xl bg-slate-900">
                <canvas 
                    ref={canvasRef}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    className="touch-none cursor-crosshair"
                />
                {textInput.show && (
                    <div 
                        className="absolute z-10"
                        style={{ left: textInput.x, top: textInput.y }}
                    >
                        <input 
                            autoFocus
                            className="bg-blue-600 text-white font-bold p-2 rounded-lg border-2 border-white shadow-xl focus:outline-none text-sm pointer-events-auto"
                            onBlur={() => {
                                if (textInput.value) {
                                    setAnnotations(prev => [...prev, { type: 'text', x1: textInput.x, y1: textInput.y + 15, text: textInput.value }]);
                                }
                                setTextInput({ ...textInput, show: false });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                        />
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    {activeTool === 'arrow' ? '사진 위를 드래그해서 화살표를 그리세요' : '사진을 터치해서 글자를 입력하세요'}
                </p>
                {annotations.length > 0 && (
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setAnnotations(prev => prev.slice(0, -1))}
                            className="text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 px-4 py-2 rounded-full active:scale-95 bg-blue-500/5"
                        >
                            실행 취소
                        </button>
                        <button 
                            onClick={() => setAnnotations([])}
                            className="text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20 px-4 py-2 rounded-full active:scale-95 bg-red-500/5"
                        >
                            모두 지우기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
