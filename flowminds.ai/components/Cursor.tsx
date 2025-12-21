import React from 'react';
import { MousePointer2 } from 'lucide-react';

interface CursorProps { x: number; y: number; color: string; name: string; }

export const Cursor: React.FC<CursorProps> = ({ x, y, color, name }) => {
    return (
        <div className="absolute pointer-events-none transition-transform duration-100 ease-linear z-[100] flex flex-col items-start" style={{ transform: `translate(${x}px, ${y}px)`, left: 0, top: 0 }}>
            <MousePointer2 className="w-5 h-5 fill-current" style={{ color: color }} />
            <div className="ml-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm whitespace-nowrap" style={{ backgroundColor: color }}>{name}</div>
        </div>
    );
};
