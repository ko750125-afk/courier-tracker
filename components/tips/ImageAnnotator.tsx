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
    initialAnnotations?: Annotation[];
    onSave: (dataUrl: string, annotations: Annotation[]) => void;
    onCancel: () => void;
}

export default function ImageAnnotator({ src, initialAnnotations = [], onSave, onCancel }: ImageAnnotatorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [activeTool, setActiveTool] = useState<'arrow' | 'text' | 'select'>('arrow');
    const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
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
            
            imageRef.current = img;
            drawCanvas();
        };
    }, [src]);

    useEffect(() => {
        drawCanvas();
    }, [annotations, selectedId]);

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas || !imageRef.current) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

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
        const paddingX = 14;
        const paddingY = 8;
        const h = 36;
        const w = metrics.width + paddingX * 2;
        
        ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 1)' : 'rgba(59, 130, 246, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x - paddingX, y - h + 6, w, h, 12);
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

        for (let i = annotations.length - 1; i >= 0; i--) {
            const ann = annotations[i];
            if (ann.type === 'text' && ann.text) {
                ctx.font = 'bold 24px Inter, sans-serif';
                const metrics = ctx.measureText(ann.text);
                const paddingX = 14;
                const paddingY = 8;
                const h = 36;
                const w = metrics.width + paddingX * 2;
                
                // hitbox is slightly larger for easier touch
                if (pos.x >= ann.x1 - paddingX - 5 && pos.x <= ann.x1 + metrics.width + paddingX + 5 &&
                    pos.y >= ann.y1 - h + 6 - 5 && pos.y <= ann.y1 + 6 + 5) {
                    return ann.id;
                }
            } else if (ann.type === 'arrow' && ann.x2 !== undefined && ann.y2 !== undefined) {
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
        if (textInput.show) return;
        const pos = getPos(e);
        
        if (activeTool === 'select') {
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
        } else if (activeTool === 'arrow') {
            setSelectedId(null);
            setIsInteracting(true);
            setInteractionMode('drawing');
            setStartPos(pos);
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
            if (Math.abs(pos.x - startPos.x) > 5 || Math.abs(pos.y - startPos.y) > 5) {
                const newId = Date.now().toString();
                const newAnn: Annotation = {
                    id: newId,
                    type: 'arrow',
                    x1: startPos.x,
                    y1: startPos.y,
                    x2: pos.x,
                    y2: pos.y
                };
                setAnnotations(prev => [...prev, newAnn]);
                setSelectedId(newId);
                setActiveTool('select'); // Auto switch to select mode to position it
            }
        }
        
        setIsInteracting(false);
        setInteractionMode(null);
        setStartPos(null);
        setDragOffset(null);
    };

    const confirmText = () => {
        if (textInput.value) {
            const newAnn: Annotation = { 
                id: textInput.id, 
                type: 'text', 
                x1: textInput.x + 10, 
                y1: textInput.y + 24, 
                text: textInput.value 
            };
            setAnnotations(prev => [...prev, newAnn]);
            setSelectedId(textInput.id);
            setActiveTool('select');
        }
        setTextInput(prev => ({ ...prev, show: false }));
    };

    const handleSaveImage = () => {
        setSelectedId(null);
        setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            onSave(canvas.toDataURL('image/jpeg', 0.8), annotations);
        }, 50);
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg mb-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden">
                <div className="flex bg-slate-900/50 p-1 gap-1 overflow-x-auto scrollbar-hide rounded-xl mb-2">
                    <button 
                        onClick={() => { setActiveTool('arrow'); setSelectedId(null); }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[70px] transition-all border-2 ${activeTool === 'arrow' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 mb-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                        <span className="text-[10px] font-black uppercase">화살표</span>
                    </button>
                    <button 
                        onClick={() => { 
                            const canvas = canvasRef.current;
                            if (!canvas) return;
                            const newId = Date.now().toString();
                            setTextInput({ 
                                show: true, 
                                id: newId, 
                                x: canvas.width / 2 - 60, 
                                y: 50, 
                                value: '' 
                            });
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[70px] transition-all border-2 ${activeTool === 'text' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 mb-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-[10px] font-black uppercase">글쓰기</span>
                    </button>
                    <button 
                        onClick={() => { setActiveTool('select'); setSelectedId(null); }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[70px] transition-all border-2 ${activeTool === 'select' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 mb-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M18.757 17.243l-1.59 1.59" />
                        </svg>
                        <span className="text-[10px] font-black uppercase">이동/삭제</span>
                    </button>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={onCancel} 
                        className="flex-1 px-4 py-3 bg-white/5 text-gray-400 font-black rounded-xl text-xs active:scale-95 transition-all"
                    >
                        취소
                    </button>
                    <button 
                        onClick={handleSaveImage} 
                        className="flex-[2] px-4 py-3 bg-blue-600 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                        편집 내용 적용
                    </button>
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
                        className="absolute z-10 flex items-center gap-2"
                        style={{ left: textInput.x, top: textInput.y }}
                    >
                        <input 
                            autoFocus
                            className="bg-blue-600 text-white font-bold p-2 px-4 rounded-xl border-2 border-white shadow-xl focus:outline-none text-sm pointer-events-auto min-w-[120px]"
                            onBlur={() => {
                                // We use a small timeout to allow clicking the "Confirm" button
                                setTimeout(() => {
                                    if (textInput.show) {
                                        confirmText();
                                    }
                                }, 150);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmText();
                                if (e.key === 'Escape') setTextInput(prev => ({ ...prev, show: false, value: '' }));
                            }}
                            onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
                        />
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                confirmText();
                            }}
                            className="bg-white text-blue-600 p-2 rounded-xl shadow-xl border-2 border-white active:scale-95 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest text-center">
                        {textInput.show 
                            ? '입력 후 화면을 누르거나 Enter를 치면 텍스트가 고정됩니다'
                            : activeTool === 'select' 
                                ? (selectedId ? '선택된 항목을 드래그해서 위치를 옮기세요' : '이동할 항목을 터치하세요')
                                : (activeTool === 'arrow' ? '사진을 드래그하여 화살표를 그리세요' : '텍스트를 입력하세요')}
                    </p>
                </div>
                
                <div className="flex gap-3">
                    {annotations.length > 0 && (
                        <>
                            <button 
                                onClick={() => {
                                    setAnnotations(prev => prev.slice(0, -1));
                                    setSelectedId(null);
                                    setActiveTool('arrow');
                                }}
                                className="text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 px-4 py-2 rounded-full active:scale-95 bg-blue-500/5 transition-all"
                            >
                                실행 취소
                            </button>
                            <button 
                                onClick={() => {
                                    setAnnotations([]);
                                    setSelectedId(null);
                                    setActiveTool('arrow');
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

