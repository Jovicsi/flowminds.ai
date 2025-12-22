export interface Position {
    x: number;
    y: number;
}

export enum NodeType {
    NOTE = 'NOTE',
    GENERATOR = 'GENERATOR',
    IMAGE = 'IMAGE',
}

export interface NodeData {
    title: string;
    content: string;
    isProcessing?: boolean;
    result?: string;
    imageUrl?: string;
    color?: string; // Hex or Tailwind class key
}

export interface Node {
    id: string;
    type: NodeType;
    position: Position;
    data: NodeData;
    width: number;
    height: number;
    selected?: boolean;
}

export interface Edge {
    id: string;
    source: string;
    target: string;
}

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export type DragItem = {
    type: 'node' | 'viewport' | 'connection';
    id?: string;
    startPos: Position;
    currentPos: Position;
    sourceHandle?: Position; // For connection dragging
    handleType?: 'source' | 'target';
} | null;

export interface RemoteCursor {
    id: string;
    x: number;
    y: number;
    color: string;
    name: string;
}

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectMember {
    id: string;
    user_id: string;
    user_email: string;
    role: ProjectRole;
    created_at: string;
    display_name?: string;
    avatar_url?: string;
}

// Events for Broadcast
export type BroadcastEvent =
    | { type: 'cursor-move'; payload: RemoteCursor }
    | { type: 'node-update'; payload: Node }
    | { type: 'node-create'; payload: Node }
    | { type: 'node-delete'; payload: string }
    | { type: 'edge-create'; payload: Edge }
    | { type: 'edge-delete'; payload: string }
    | { type: 'project-rename'; payload: string };
