import React from 'react';
import { Node, NodeType } from '../types';
import { BrainCircuit, X, Play, Loader2 } from 'lucide-react';

interface NodeComponentProps {
    node: Node;
    onUpdate: (id: string, data: any) => void;
    onDelete: (id: string) => void;
    onGenerate: (id: string) => void;
    isSelected: boolean;
    readOnly?: boolean;
}

export const NodeComponent = React.memo<NodeComponentProps>(({ node, onUpdate, onDelete, onGenerate, isSelected, readOnly = false }) => {
    const colors: Record<string, string> = {
        slate: 'border-slate-700 bg-slate-800/80',
        blue: 'border-blue-700 bg-blue-800/80',
        emerald: 'border-emerald-700 bg-emerald-800/80',
        amber: 'border-amber-700 bg-amber-800/80',
    };

    return (
        <div
            className={`absolute flex flex-col rounded-2xl border-2 shadow-2xl backdrop-blur-lg transition-all animate-in ${colors[node.data.color || 'slate']} 
        ${isSelected ? 'ring-2 ring-blue-500 scale-[1.02]' : 'hover:border-slate-500'}`}
            style={{ left: node.position.x, top: node.position.y, width: node.width }}
        >
            <div
                data-handle-type="target"
                data-node-id={node.id}
                className="absolute -left-3 top-[76px] w-6 h-6 bg-slate-900 border-2 border-slate-600 rounded-full cursor-crosshair hover:bg-blue-500 hover:border-white transition-all z-10 flex items-center justify-center"
            >
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>

            <div className="p-4 flex items-center justify-between border-b border-white/5 node-drag-handle">
                <div className="flex items-center gap-3">
                    {node.type === NodeType.GENERATOR ? <BrainCircuit className="w-5 h-5 text-emerald-400" /> : <div className="w-4 h-4 rounded-full bg-slate-400" />}
                    <input
                        className="bg-transparent font-bold text-white outline-none w-32"
                        value={node.data.title}
                        onMouseDown={(e) => !readOnly && e.stopPropagation()}
                        onChange={(e) => !readOnly && onUpdate(node.id, { title: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
                {!readOnly && (
                    <button onClick={() => onDelete(node.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                <textarea
                    placeholder="Type something..."
                    className="w-full bg-slate-900/50 rounded-xl p-3 text-sm text-slate-300 outline-none h-24 resize-none border border-white/5 focus:border-blue-500/30"
                    value={node.data.content}
                    onMouseDown={(e) => !readOnly && e.stopPropagation()} // Impede o drag do container
                    onChange={(e) => !readOnly && onUpdate(node.id, { content: e.target.value })}
                    readOnly={readOnly}
                />

                {node.type === NodeType.GENERATOR && (
                    <div className="flex flex-col gap-3">
                        {!readOnly && (
                            <button
                                onClick={() => onGenerate(node.id)}
                                disabled={node.data.isProcessing}
                                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-2 font-bold transition-all text-sm"
                            >
                                {node.data.isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Generate AI Content
                            </button>
                        )}

                        {node.data.result && (
                            <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-400 max-h-32 overflow-y-auto border border-emerald-500/20">
                                {node.data.result}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div
                data-handle-type="source"
                data-node-id={node.id}
                className="absolute -right-3 top-[76px] w-6 h-6 bg-slate-900 border-2 border-slate-600 rounded-full cursor-crosshair hover:bg-blue-500 hover:border-white transition-all z-10 flex items-center justify-center"
            >
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    // Only re-render if:
    // 1. Position changed (x, y)
    // 2. Data changed (title, content, result, etc)
    // 3. Selection status changed
    // 4. ReadOnly status changed
    return (
        prev.node.position.x === next.node.position.x &&
        prev.node.position.y === next.node.position.y &&
        prev.node.data === next.node.data && // Simple ref check might fail if data is new object
        JSON.stringify(prev.node.data) === JSON.stringify(next.node.data) && // Deep check for data safety
        prev.isSelected === next.isSelected &&
        prev.readOnly === next.readOnly
    );
});
