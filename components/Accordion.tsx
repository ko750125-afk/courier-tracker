"use client";
import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp, LucideIcon } from "lucide-react";

interface AccordionProps {
    title: string;
    icon?: LucideIcon;
    children: ReactNode;
    defaultOpen?: boolean;
}

export default function Accordion({ title, icon: Icon, children, defaultOpen = false }: AccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-4 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-lg transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between bg-transparent focus:outline-none"
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="w-5 h-5 text-blue-400" />}
                    <h3 className="text-sm font-bold text-slate-200 tracking-wide">{title}</h3>
                </div>
                <div className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-400" : "text-slate-500"}`}>
                    <ChevronDown className="w-5 h-5" />
                </div>
            </button>
            
            <div className={`transition-all duration-300 ease-in-out origin-top ${isOpen ? "max-h-[2000px] opacity-100 pb-5" : "max-h-0 opacity-0"}`}>
                <div className="px-5 pt-2 border-t border-white/5">
                    {children}
                </div>
            </div>
        </div>
    );
}
