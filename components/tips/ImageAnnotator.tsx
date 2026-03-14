"use client";
import React, { useRef, useState, useEffect } from "react";

interface Annotation {
    id: string;
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
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    
    // Dragging/Drawing state
    const [isInteracting, setIsInteracting] = useState(false);
    const [interactionMode, setInteractionMode] = useState<'drawing' | 'dragging' | null>(null);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);
    
    // For text input
    const [textInput, setTextInput] = useState({ show: false, id: '', x: 0, y: 0, value: '' });

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const maxWidth = window.innerWidth * 0.95;
            const maxHeight = window.innerHeight * 0.7;
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            drawCanvas();
        };
    }, [src]);

    useEffect(() => {
        drawCanvas();
    }, [annotations, selectedId]);

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

            annotations.forEach(ann => {
                const isSelected = ann.id === selectedId;
                ctx.strokeStyle = '#3b82f6';
                ctx.fillStyle = '#3b82f6';
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';

                if (isSelected) {
                    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
                    ctx.shadowBlur = 15;
                } else {
                    ctx.shadowBlur = 0;
                }

                if (ann.type === 'arrow' && ann.x2 !== undefined && ann.y2 !== undefined) {
                    drawArrow(ctx, ann.x1, ann.y1, ann.x2, ann.y2, isSelected);
                } else if (ann.type === 'text' && ann.text) {
                    drawTextLabel(ctx, ann.text, ann.x1, ann.y1, isSelected);
                }
                
                ctx.shadowBlur = 0;
            });
        };
    };

    const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, isSelected: boolean) => {
        const headlen = 15;
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        
        if (isSelected) {
            ctx.strokeStyle = '#60a5fa'; // lighter blue
            ctx.fillStyle = '#60a5fa';
        }

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

    const drawTextLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, isSelected: boolean) => {
        ctx.font = 'bold 24px Inter, sans-serif';
        const metrics = ctx.measureText(text);
        const padding = 10;
        const h = 36;
        const w = metrics.width + padding * 2;
        
        ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 1)' : 'rgba(59, 130, 246, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x - padding, y - h + 6, w, h, 10);
        ctx.fill();
        
        if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
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

    const hitTest = (pos: { x: number, y: number }) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Check text first (labels are easier to target)
        for (let i = annotations.length - 1; i >= 0; i--) {
            const ann = annotations[i];
            if (ann.type === 'text' && ann.text) {
                ctx.font = 'bold 24px Inter, sans-serif';
                const metrics = ctx.measureText(ann.text);
                const padding = 10;
                const h = 36;
                const w = metrics.width + padding * 2;
                
                if (pos.x >= ann.x1 - padding && pos.x <= ann.x1 - padding + w &&
                    pos.y >= ann.y1 - h + 6 && pos.y <= ann.y1 + 6) {
                    return ann.id;
                }
            } else if (ann.type === 'arrow' && ann.x2 !== undefined && ann.y2 !== undefined) {
                // Check distance to line segment
                const dist = distToSegment(pos, { x: ann.x1, y: ann.y1 }, { x: ann.x2, y: ann.y2 });
                if (dist < 15) return ann.id;
            }
        }
        return null;
    };

    const distToSegment = (p: { x: number, y: number }, v: { x: number, y: number }, w: { x: number, y: number }) => {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPos(e);
        const hitId = hitTest(pos);

        if (hitId) {
            const ann = annotations.find(a => a.id === hitId);
            if (ann) {
                setSelectedId(hitId);
                setInteractionMode('dragging');
                setDragOffset({ x: pos.x - ann.x1, y: pos.y - ann.y1 });
                setIsInteracting(true);
                return;
            }
        }

        setSelectedId(null);
        if (activeTool === 'arrow') {
            setIsInteracting(true);
            setInteractionMode('drawing');
            setStartPos(pos);
        } else if (activeTool === 'text') {
            const newId = Date.now().toString();
            setTextInput({ show: true, id: newId, x: pos.x, y: pos.y - 18, value: '' });
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isInteracting) return;
        const pos = getPos(e);
        
        if (interactionMode === 'dragging' && selectedId && dragOffset) {
            setAnnotations(prev => prev.map(ann => {
                if (ann.id === selectedId) {
                    const dx = pos.x - dragOffset.x - ann.x1;
                    const dy = pos.y - dragOffset.y - ann.y1;
                    return {
                        ...ann,
                        x1: pos.x - dragOffset.x,
                        y1: pos.y - dragOffset.y,
                        x2: ann.x2 !== undefined ? ann.x2 + dx : undefined,
                        y2: ann.y2 !== undefined ? ann.y2 + dy : undefined
                    };
                }
                return ann;
            }));
        } else if (interactionMode === 'drawing' && startPos && activeTool === 'arrow') {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            drawCanvas();
            ctx.strokeStyle = '#3b82f6';
            ctx.fillStyle = '#3b82f6';
            ctx.lineWidth = 4;
            drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y, false);
        }
    };

    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isInteracting) return;
        
        if (interactionMode === 'drawing' && startPos && activeTool === 'arrow') {
            const pos = getPos(e);
            const newAnn: Annotation = {
                id: Date.now().toString(),
                type: 'arrow',
                x1: startPos.x,
                y1: startPos.y,
                x2: pos.x,
                y2: pos.y
            };
            setAnnotations(prev => [...prev, newAnn]);
            setSelectedId(newAnn.id);
        }
        
        setIsInteracting(false);
        setInteractionMode(null);
        setStartPos(null);
        setDragOffset(null);
    };

    const handleSaveImage = () => {
        setSelectedId(null);
        setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            onSave(canvas.toDataURL('image/jpeg', 0.8));
        }, 50);
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg mb-4 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setActiveTool('arrow'); setSelectedId(null); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${activeTool === 'arrow' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                        화살표
                    </button>
                    <button 
                        onClick={() => { setActiveTool('text'); setSelectedId(null); }}
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

            <div className="relative border-4 border-white/10 rounded-xl overflow-hidden shadow-2xl bg-slate-900 mx-auto">
                <canvas 
                    ref={canvasRef}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    className="touch-none cursor-crosshair max-w-full"
                />
                
                {textInput.show && (
                    <div 
                        className="absolute z-10"
                        style={{ left: textInput.x, top: textInput.y }}
                    >
                        <input 
                            autoFocus
                            className="bg-blue-600 text-white font-bold p-2 px-4 rounded-xl border-2 border-white shadow-xl focus:outline-none text-sm pointer-events-auto"
                            onBlur={() => {
                                if (textInput.value) {
                                    setAnnotations(prev => [...prev, { 
                                        id: textInput.id, 
                                        type: 'text', 
                                        x1: textInput.x + 10, 
                                        y1: textInput.y + 24, 
                                        text: textInput.value 
                                    }]);
                                }
                                setTextInput({ ...textInput, show: false });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                                if (e.key === 'Escape') setTextInput({ ...textInput, show: false, value: '' });
                            }}
                            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                        />
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">
                        {selectedId 
                            ? '선택된 항목을 드래그해서 위치를 옮기세요' 
                            : (activeTool === 'arrow' ? '사진을 드래그하여 화살표를 그리세요' : '사진을 터치하여 글자를 입력하세요')}
                    </p>
                </div>
                
                <div className="flex gap-3">
                    {annotations.length > 0 && (
                        <>
                            <button 
                                onClick={() => {
                                    setAnnotations(prev => prev.slice(0, -1));
                                    setSelectedId(null);
                                }}
                                className="text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 px-4 py-2 rounded-full active:scale-95 bg-blue-500/5 transition-all"
                            >
                                실행 취소
                            </button>
                            <button 
                                onClick={() => {
                                    setAnnotations([]);
                                    setSelectedId(null);
                                }}
                                className="text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20 px-4 py-2 rounded-full active:scale-95 bg-red-500/5 transition-all"
                            >
                                모두 지우기
                            </button>
                        </>
                    )}
                    {selectedId && (
                        <button 
                            onClick={() => {
                                setAnnotations(prev => prev.filter(a => a.id !== selectedId));
                                setSelectedId(null);
                            }}
                            className="bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full active:scale-95 shadow-xl transition-all"
                        >
                            삭제
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
