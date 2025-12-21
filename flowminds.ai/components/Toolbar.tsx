import React from 'react';
import { NodeType } from '../types';
import { Plus, BrainCircuit, StickyNote, Wand2 } from 'lucide-react';

interface ToolbarProps {
    onAddNode: (type: NodeType) => void;
    onAutoGenerate: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, onAutoGenerate }) => {
    return (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/80 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-[28px] shadow-2xl z-50 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                <button
                    onClick={() => onAddNode(NodeType.NOTE)}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className="w-12 h-12 bg-slate-800 group-hover:bg-blue-600/20 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-all">
                        <StickyNote className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400 uppercase tracking-widest">Note</span>
                </button>

                <button
                    onClick={() => onAddNode(NodeType.GENERATOR)}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className="w-12 h-12 bg-slate-800 group-hover:bg-emerald-600/20 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-emerald-500/30 transition-all">
                        <BrainCircuit className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-400 uppercase tracking-widest">AI Gen</span>
                </button>
            </div>

            <button
                onClick={onAutoGenerate}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/20 border border-white/10 transition-all hover:-translate-y-0.5"
            >
                <Wand2 className="w-5 h-5 text-white animate-pulse" />
                <span className="text-white whitespace-nowrap">AI Auto-Plan</span>
            </button>
        </div>
    );
};
