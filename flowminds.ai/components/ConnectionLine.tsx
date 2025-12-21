import React from 'react';
import { Position } from '../types';

interface ConnectionLineProps { start: Position; end: Position; isDraft?: boolean; }

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ start, end, isDraft }) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const curvature = 0.5;
    const cx1 = start.x + dx * curvature;
    const cy1 = start.y;
    const cx2 = end.x - dx * curvature;
    const cy2 = end.y;

    const path = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;

    return (
        <g>
            <path d={path} fill="none" stroke={isDraft ? '#3b82f6' : '#6366f1'} strokeWidth={isDraft ? 3 : 2} strokeDasharray={isDraft ? '5,5' : 'none'} className={isDraft ? 'opacity-50' : 'opacity-30'} />
            {!isDraft && (
                <circle cx={end.x} cy={end.y} r="3" fill="#6366f1" className="opacity-40" />
            )}
        </g>
    );
};
