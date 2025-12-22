import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Node, Edge, Position, NodeType, Viewport, DragItem, RemoteCursor, BroadcastEvent, ProjectRole, ProjectMember } from './types';
import { NodeComponent } from './components/NodeComponent';
import { ConnectionLine } from './components/ConnectionLine';
import { Toolbar } from './components/Toolbar';
import { AuthPage } from './components/AuthPage';
import { Cursor } from './components/Cursor';
import { generateText, enhanceWorkflowIdea } from './services/geminiService';
import { Grid, MousePointer2, BrainCircuit, LogOut, Save, Loader2, CheckCircle2, Focus, Share2, Copy, Home } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ProjectGallery } from './components/ProjectGallery';
import { SaveProjectModal } from './components/SaveProjectModal';
import { MemberManagementModal } from './components/MemberManagementModal';
import { ProfilePage } from './components/ProfilePage';
import { Users } from 'lucide-react';

const INITIAL_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const getRandomColor = () => {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const throttle = (func: Function, limit: number) => {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
};

export default function App() {
    const [session, setSession] = useState<any>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    const [roomId, setRoomId] = useState<string | null>(null);
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
    const [myColor] = useState(getRandomColor());
    const [copiedLink, setCopiedLink] = useState(false);
    const [instanceId] = useState(crypto.randomUUID());

    const [view, setView] = useState<'editor' | 'gallery' | 'profile'>('gallery');
    const [currentProjectName, setCurrentProjectName] = useState('Untitled Project');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [projectExistsInDb, setProjectExistsInDb] = useState(false);
    const [originalOwnerId, setOriginalOwnerId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<ProjectRole>('viewer');
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [showMembersModal, setShowMembersModal] = useState(false);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [dragItem, setDragItem] = useState<DragItem>(null);
    const [draftConnection, setDraftConnection] = useState<{ start: Position, current: Position } | null>(null);
    const [showAutoPlanModal, setShowAutoPlanModal] = useState(false);
    const [autoPlanPrompt, setAutoPlanPrompt] = useState("");
    const [isPlanning, setIsPlanning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const initAppRef = useRef<((user: any) => Promise<void>) | null>(null);

    const broadcastChange = useCallback((event: BroadcastEvent) => {
        if (channel) {
            channel.send({
                type: 'broadcast',
                event: 'app-change',
                payload: event
            });
        }
    }, [channel]);

    const broadcastCursor = useCallback(
        throttle((x: number, y: number) => {
            if (channel) {
                const displayName = session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
                channel.send({
                    type: 'broadcast',
                    event: 'cursor-move',
                    payload: { id: instanceId, x, y, color: myColor, name: displayName }
                });
            }
        }, 50),
        [channel, myColor, instanceId, session]
    );

    const broadcastNodeUpdate = useCallback(
        throttle((node: Node) => {
            broadcastChange({ type: 'node-update', payload: node });
        }, 50), // Throttle to 50ms (20fps) for network efficiency
        [broadcastChange]
    );

    const initApp = useCallback(async (user: any) => {
        const params = new URLSearchParams(window.location.search);
        const urlRoomId = params.get('room');

        if (!urlRoomId) {
            setRoomId(null);
            setView('gallery');
            return;
        }

        const activeRoomId = urlRoomId;
        setRoomId(activeRoomId);
        setView('editor');

        try {
            const { data, error } = await supabase
                .from('workflows')
                .select('*')
                .eq('id', activeRoomId)
                .single();

            if (data) {
                if (data.nodes) setNodes(data.nodes);
                if (data.edges) setEdges(data.edges);
                if (data.name) setCurrentProjectName(data.name);
                if (data.updated_at) setLastSaved(new Date(data.updated_at));
                setProjectExistsInDb(true); // Mark as existing project
                setOriginalOwnerId(data.user_id); // Store original owner ID

                // Detecção de Role
                if (data.user_id === user.id) {
                    setUserRole('owner');
                } else {
                    // Se não tivermos certeza do cargo (ex: vindo via link direto), buscamos
                    if (userRole === 'viewer' || !roomId) {
                        const { data: memberData } = await supabase
                            .from('project_members')
                            .select('role')
                            .eq('workflow_id', activeRoomId)
                            .or(`user_id.eq.${user.id},user_email.eq.${user.email}`)
                            .maybeSingle();

                        if (memberData) {
                            setUserRole(memberData.role as ProjectRole);
                        } else {
                            // BLOQUEIO: Se não for dono nem membro, tchau!
                            alert("Você não tem permissão para acessar este projeto.");
                            setView('gallery');
                            setRoomId(null);
                            window.history.replaceState({}, '', window.location.origin + window.location.pathname);
                            return;
                        }
                    }
                }
            } else {
                // Se o projeto não existe e o ID não é o do próprio usuário (vindo da galeria)
                if (activeRoomId !== user.id && !urlRoomId) {
                    setView('gallery');
                    return;
                }
                setNodes([]);
                setEdges([]);
                setCurrentProjectName('New Project');
                setUserRole('owner');
                setProjectExistsInDb(false); // New project not yet saved
                setOriginalOwnerId(null); // No owner yet
            }
        } catch (err) {
            console.error("Load error:", err);
            setView('gallery');
        }

        const newChannel = supabase.channel(`room:${activeRoomId}`, {
            config: { broadcast: { self: false } }
        });

        newChannel
            .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
                setRemoteCursors(prev => ({ ...prev, [payload.id]: payload }));
            })
            .on('broadcast', { event: 'app-change' }, ({ payload }) => {
                const event = payload as BroadcastEvent;
                if (event.type === 'node-update') {
                    setNodes(prev => {
                        const exists = prev.find(n => n.id === event.payload.id);
                        if (exists) return prev.map(n => n.id === event.payload.id ? event.payload : n);
                        return [...prev, event.payload];
                    });
                } else if (event.type === 'node-create') {
                    setNodes(prev => prev.find(n => n.id === event.payload.id) ? prev : [...prev, event.payload]);
                } else if (event.type === 'node-delete') {
                    setNodes(prev => prev.filter(n => n.id !== event.payload));
                    setEdges(prev => prev.filter(e => e.source !== event.payload && e.target !== event.payload));
                } else if (event.type === 'edge-create') {
                    setEdges(prev => prev.find(e => e.id === event.payload.id) ? prev : [...prev, event.payload]);
                } else if (event.type === 'project-rename') {
                    setCurrentProjectName(event.payload);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Sincronizar nome atual ao entrar
                    const { data } = await supabase.from('workflows').select('name').eq('id', activeRoomId).single();
                    if (data?.name) setCurrentProjectName(data.name);
                }
            });

        setChannel(newChannel);
    }, [setRoomId, setView, setNodes, setEdges, setCurrentProjectName, setLastSaved, setChannel, supabase]);

    useEffect(() => {
        let mounted = true;
        initAppRef.current = initApp;

        const cleanup = () => { if (channel) supabase.removeChannel(channel); };

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) {
                setSession(session);
                setIsAuthChecking(false);
                if (session?.user) initAppRef.current?.(session.user);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                if (session?.user) {
                    initAppRef.current?.(session.user);
                } else {
                    setNodes([]);
                    setEdges([]);
                    setRoomId(null);
                    cleanup();
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            cleanup();
        };
    }, [initApp, channel]);

    const handleLogout = async () => {
        if (channel) await supabase.removeChannel(channel);
        await supabase.auth.signOut();
        setNodes([]);
        setEdges([]);
        setSession(null);
        window.location.search = '';
    };

    const shareLink = async () => {
        const idToShare = roomId || session?.user?.id;
        if (!idToShare) return;
        const url = new URL(window.location.href);
        url.searchParams.set('room', idToShare);
        const urlString = url.toString();
        try {
            await navigator.clipboard.writeText(urlString);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch (err) {
            window.prompt("Copy this link to share:", urlString);
        }
    };

    // Base persistence function used by both Manual Save and Auto-Save
    const persistWorkflow = async (name: string, silent: boolean = false) => {
        if (!roomId || !session?.user || userRole === 'viewer') return;

        if (!silent) setIsSaving(true);

        try {
            // Use locally stored originalOwnerId to avoid RLS issues
            // If originalOwnerId exists, use it (preserves owner)
            // Otherwise, use current user (first save)
            const finalUserId = originalOwnerId || session.user.id;

            console.log('👤 [persistWorkflow] User IDs:', {
                originalOwner: originalOwnerId,
                currentUser: session.user.id,
                finalUserId: finalUserId,
                willPreserveOwner: !!originalOwnerId
            });

            const workflowData: any = {
                id: roomId,
                user_id: finalUserId, // Preserve original owner
                name: name,
                nodes,
                edges,
                updated_at: new Date().toISOString()
            };

            console.log('💾 [persistWorkflow] Saving with user_id:', finalUserId);

            const { error: firstError } = await supabase.from('workflows').upsert(workflowData, { onConflict: 'id' });

            if (firstError) {
                if (firstError.message?.includes('column "name" of relation "workflows" does not exist')) {
                    const { name: _, ...basicData } = workflowData;
                    const { error: secondError } = await supabase.from('workflows').upsert(basicData, { onConflict: 'id' });
                    if (secondError) throw secondError;
                } else {
                    throw firstError;
                }
            }

            console.log('✅ [persistWorkflow] Save successful!');

            // Store the owner ID after first save
            if (!originalOwnerId) {
                setOriginalOwnerId(session.user.id);
            }

            setLastSaved(new Date());
            return true;
        } catch (error: any) {
            console.error('Error in persistWorkflow:', error);
            if (!silent) alert(`Erro ao salvar: ${error.message}`);
            return false;
        } finally {
            if (!silent) setIsSaving(false);
        }
    };

    const saveWorkflow = async (name: string) => {
        const success = await persistWorkflow(name);
        if (success) {
            setProjectExistsInDb(true); // Mark as saved
            setCurrentProjectName(name); // Update project name
            setShowSaveModal(false);
            // Stay in editor - auto-save will handle future changes
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (!roomId || userRole === 'viewer' || view !== 'editor') return;

        const timeout = setTimeout(() => {
            console.log('Auto-saving...');
            persistWorkflow(currentProjectName, true);
        }, 3000); // 3 seconds of inactivity

        return () => clearTimeout(timeout);
    }, [nodes, edges, currentProjectName, roomId, userRole, view]);

    const createNewProject = () => {
        const newId = crypto.randomUUID();
        setNodes([]);
        setEdges([]);
        setViewport(INITIAL_VIEWPORT);
        setCurrentProjectName('New Project');
        setRoomId(newId);
        setUserRole('owner'); // Define imediatamente como dono
        setProjectExistsInDb(false); // New project not yet saved
        setOriginalOwnerId(null); // No owner yet
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', newId);
        window.history.pushState({}, '', newUrl.toString());
        setView('editor');
    };

    const openProject = (id: string, isOwner?: boolean) => {
        setRoomId(id);
        if (isOwner !== undefined) {
            setUserRole(isOwner ? 'owner' : 'viewer');
        }
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', id);
        window.history.pushState({}, '', newUrl.toString());
        setView('editor');
        if (session?.user) initAppRef.current?.(session.user);
    };

    const screenToWorld = useCallback((screenX: number, screenY: number): Position => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (screenX - rect.left - viewport.x) / viewport.zoom,
            y: (screenY - rect.top - viewport.y) / viewport.zoom,
        };
    }, [viewport]);

    const fitView = useCallback(() => {
        if (nodes.length === 0) { setViewport(INITIAL_VIEWPORT); return; }
        const PADDING = 100;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.width);
            maxY = Math.max(maxY, node.position.y + node.height);
        });
        const width = maxX - minX, height = maxY - minY;
        if (width === 0 || height === 0) return;
        const screenW = containerRef.current?.clientWidth || window.innerWidth;
        const screenH = containerRef.current?.clientHeight || window.innerHeight;
        const zoomX = (screenW - PADDING * 2) / width, zoomY = (screenH - PADDING * 2) / height;
        const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.1), 1.5);
        const centerWorldX = minX + width / 2, centerWorldY = minY + height / 2;
        const newX = (screenW / 2) - (centerWorldX * newZoom), newY = (screenH / 2) - (centerWorldY * newZoom);
        setViewport({ x: newX, y: newY, zoom: newZoom });
    }, [nodes]);

    const getNodeCenterLeft = useCallback((nodeId: string): Position => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { x: 0, y: 0 };
        return { x: node.position.x, y: node.position.y + 76 };
    }, [nodes]);

    const getNodeCenterRight = useCallback((nodeId: string): Position => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { x: 0, y: 0 };
        return { x: node.position.x + node.width, y: node.position.y + 76 };
    }, [nodes]);

    // --- Auto-Save Management ---
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const triggerAutoSave = useCallback((delay: number = 1000) => {
        if (!roomId || !currentProjectName) return;

        // Clear existing timeout to ensure debounce (reset timer on new changes)
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            persistWorkflow(currentProjectName, true);
            saveTimeoutRef.current = null;
        }, delay);
    }, [roomId, currentProjectName, persistWorkflow]);

    const addNode = (type: NodeType, pos?: Position) => {
        const newNode: Node = {
            id: crypto.randomUUID(),
            type,
            position: pos || screenToWorld(window.innerWidth / 2, window.innerHeight / 2),
            data: { title: type === NodeType.GENERATOR ? 'AI Generator' : 'New Note', content: '', color: 'slate' },
            width: 320,
            height: 200,
        };
        setNodes((prev) => [...prev, newNode]);
        broadcastChange({ type: 'node-create', payload: newNode });
        triggerAutoSave(0); // Immediate save
    };

    const updateNode = useCallback((id: string, data: Partial<Node['data']>) => {
        setNodes((prev) => prev.map(n => {
            if (n.id === id) {
                const updated = { ...n, data: { ...n.data, ...data } };
                broadcastChange({ type: 'node-update', payload: updated });
                return updated;
            }
            return n;
        }));
        triggerAutoSave(1000); // Debounce text edits by 1s
    }, [broadcastChange, triggerAutoSave]);

    const deleteNode = (id: string) => {
        setNodes((prev) => prev.filter(n => n.id !== id));
        setEdges((prev) => prev.filter(e => e.source !== id && e.target !== id));
        broadcastChange({ type: 'node-delete', payload: id });
        triggerAutoSave(0); // Immediate save
    };

    const executeGemini = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.data.content) return;
        updateNode(nodeId, { isProcessing: true, result: '' });
        const result = await generateText(node.data.content);
        updateNode(nodeId, { isProcessing: false, result });
        triggerAutoSave(0); // Save result immediately
    };

    const executeAutoPlan = async () => {
        if (!autoPlanPrompt.trim()) return;
        setIsPlanning(true);
        const plan = await enhanceWorkflowIdea(autoPlanPrompt);
        setIsPlanning(false);
        setShowAutoPlanModal(false);
        const centerX = -viewport.x / viewport.zoom + (window.innerWidth / 2 / viewport.zoom);
        const centerY = -viewport.y / viewport.zoom + (window.innerHeight / 2 / viewport.zoom);
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        plan.forEach((step, index) => {
            const id = crypto.randomUUID();
            const node: Node = {
                id,
                type: NodeType.NOTE,
                position: { x: centerX + (index * 350), y: centerY },
                data: { title: step.title, content: step.content, color: 'slate' },
                width: 300,
                height: 200
            };
            newNodes.push(node);
            broadcastChange({ type: 'node-create', payload: node });
            if (index > 0) {
                const edge: Edge = { id: crypto.randomUUID(), source: newNodes[index - 1].id, target: id };
                newEdges.push(edge);
                broadcastChange({ type: 'edge-create', payload: edge });
            }
        });
        setNodes(prev => [...prev, ...newNodes]);
        setEdges(prev => [...prev, ...newEdges]);
        triggerAutoSave(0);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const handle = (e.target as HTMLElement).closest('[data-handle-type]');
        if (handle) {
            e.stopPropagation();
            const type = handle.getAttribute('data-handle-type') as 'source' | 'target';
            const nodeId = handle.getAttribute('data-node-id');
            if (nodeId) {
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    const worldMouse = screenToWorld(e.clientX, e.clientY);
                    const startPos = type === 'source' ? getNodeCenterRight(nodeId) : getNodeCenterLeft(nodeId);
                    setDraftConnection({ start: startPos, current: worldMouse });
                    setDragItem({ type: 'connection', startPos: startPos, currentPos: worldMouse, sourceHandle: startPos, id: nodeId, handleType: type });
                }
            }
            return;
        }
        const nodeHeader = (e.target as HTMLElement).closest('.node-drag-handle');
        if (nodeHeader) return;
        if (e.button === 0) {
            setDragItem({ type: 'viewport', startPos: { x: e.clientX, y: e.clientY }, currentPos: { x: viewport.x, y: viewport.y } });
            setSelectedNodeId(null);
        }
    };

    const onNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
        // Permitir foco em campos de texto
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('[data-handle-type]')) return;

        e.stopPropagation();
        // REMOVI o preventDefault() para não quebrar o foco do input
        setSelectedNodeId(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Calculate offset between mouse and node position for smooth dragging
        const worldMouse = screenToWorld(e.clientX, e.clientY);
        const offset = {
            x: worldMouse.x - node.position.x,
            y: worldMouse.y - node.position.y
        };

        setDragItem({
            type: 'node',
            id: nodeId,
            startPos: { x: e.clientX, y: e.clientY },
            currentPos: node.position,
            sourceHandle: offset // Store offset in sourceHandle
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (session?.user && containerRef.current) {
            const worldPos = screenToWorld(e.clientX, e.clientY);
            broadcastCursor(worldPos.x, worldPos.y);
        }
        if (!dragItem) return;

        if (dragItem.type === 'viewport') {
            const dx = e.clientX - dragItem.startPos.x;
            const dy = e.clientY - dragItem.startPos.y;
            setViewport({ ...viewport, x: dragItem.currentPos.x + dx, y: dragItem.currentPos.y + dy });
        } else if (dragItem.type === 'node' && dragItem.id) {
            // Use offset for smooth, natural dragging
            const worldMouse = screenToWorld(e.clientX, e.clientY);
            const offset = dragItem.sourceHandle || { x: 0, y: 0 };
            const newPos = {
                x: worldMouse.x - offset.x,
                y: worldMouse.y - offset.y
            };

            setNodes(prev => prev.map(n => {
                if (n.id === dragItem.id) {
                    const updated = { ...n, position: newPos };
                    broadcastNodeUpdate(updated); // Use throttled broadcast
                    return updated;
                }
                return n;
            }));
        } else if (dragItem.type === 'connection') {
            const worldMouse = screenToWorld(e.clientX, e.clientY);
            setDraftConnection(prev => prev ? { ...prev, current: worldMouse } : null);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (dragItem?.type === 'connection' && dragItem.id && dragItem.handleType) {
            const target = (e.target as HTMLElement).closest('[data-handle-type]');
            if (target) {
                const targetType = target.getAttribute('data-handle-type'), targetNodeId = target.getAttribute('data-node-id');
                if (targetNodeId && targetNodeId !== dragItem.id) {
                    let sId = '', tId = '';
                    if (dragItem.handleType === 'source' && targetType === 'target') { sId = dragItem.id; tId = targetNodeId; }
                    else if (dragItem.handleType === 'target' && targetType === 'source') { sId = targetNodeId; tId = dragItem.id; }
                    if (sId && tId && !edges.some(edge => edge.source === sId && edge.target === tId)) {
                        const newEdge = { id: crypto.randomUUID(), source: sId, target: tId };
                        setEdges(prev => [...prev, newEdge]);
                        broadcastChange({ type: 'edge-create', payload: newEdge });
                        triggerAutoSave(0); // Immediate save on connection
                    }
                }
            }
        }

        if (dragItem?.type === 'node') {
            triggerAutoSave(0); // Immediate save on node release
        }

        setDragItem(null);
        setDraftConnection(null);
    };

    // --- Touch Event Handlers ---

    const handleTouchStart = (e: React.TouchEvent) => {
        // Prevent default only if we are dragging a node or panning, to allow button clicks etc.
        // But for canvas app, usually we prevent default to stop scrolling.
        const target = e.target as HTMLElement;

        // If touching a button or input, let it be
        if (target.closest('button') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;

        // Check for Node
        const nodeElement = target.closest('[data-node-id]');
        if (nodeElement) {
            const nodeId = nodeElement.getAttribute('data-node-id');
            // Prevent inputs from being dragged
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('[data-handle-type]')) return;

            if (nodeId) {
                e.stopPropagation();
                // e.preventDefault(); // Prevent scrolling when dragging node
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    setSelectedNodeId(nodeId);
                    const worldMouse = screenToWorld(clientX, clientY);
                    const offset = {
                        x: worldMouse.x - node.position.x,
                        y: worldMouse.y - node.position.y
                    };
                    setDragItem({
                        type: 'node',
                        id: nodeId,
                        startPos: { x: clientX, y: clientY },
                        currentPos: node.position,
                        sourceHandle: offset
                    });
                }
                return;
            }
        }

        // Check for Handle (Connection)
        const handle = target.closest('[data-handle-type]');
        if (handle) {
            e.stopPropagation();
            const type = handle.getAttribute('data-handle-type') as 'source' | 'target';
            const nodeId = handle.getAttribute('data-node-id');
            if (nodeId) {
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    const worldMouse = screenToWorld(clientX, clientY);
                    const startPos = type === 'source' ? getNodeCenterRight(nodeId) : getNodeCenterLeft(nodeId);
                    setDraftConnection({ start: startPos, current: worldMouse });
                    setDragItem({ type: 'connection', startPos: startPos, currentPos: worldMouse, sourceHandle: startPos, id: nodeId, handleType: type });
                }
            }
            return;
        }

        // Canvas Pan
        if (!target.closest('.node-drag-handle')) {
            setDragItem({ type: 'viewport', startPos: { x: clientX, y: clientY }, currentPos: { x: viewport.x, y: viewport.y } });
            setSelectedNodeId(null);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!dragItem) return;
        e.preventDefault(); // Prevent scrolling while dragging

        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;

        if (session?.user && containerRef.current) {
            const worldPos = screenToWorld(clientX, clientY);
            broadcastCursor(worldPos.x, worldPos.y);
        }

        if (dragItem.type === 'viewport') {
            const dx = clientX - dragItem.startPos.x;
            const dy = clientY - dragItem.startPos.y;
            setViewport({ ...viewport, x: dragItem.currentPos.x + dx, y: dragItem.currentPos.y + dy });
        } else if (dragItem.type === 'node' && dragItem.id) {
            const worldMouse = screenToWorld(clientX, clientY);
            const offset = dragItem.sourceHandle || { x: 0, y: 0 };
            const newPos = {
                x: worldMouse.x - offset.x,
                y: worldMouse.y - offset.y
            };
            setNodes(prev => prev.map(n => {
                if (n.id === dragItem.id) {
                    const updated = { ...n, position: newPos };
                    broadcastNodeUpdate(updated);
                    return updated;
                }
                return n;
            }));
        } else if (dragItem.type === 'connection') {
            const worldMouse = screenToWorld(clientX, clientY);
            setDraftConnection(prev => prev ? { ...prev, current: worldMouse } : null);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        // For drop logic, we might need changedTouches
        // Use standard logic
        if (dragItem?.type === 'connection' && dragItem.id && dragItem.handleType) {
            // Touch end target detection is tricky because touch end doesn't fire on the element below the finger if it moved.
            // We use document.elementFromPoint
            const touch = e.changedTouches[0];
            const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
            const target = targetElement?.closest('[data-handle-type]');

            if (target) {
                const targetType = target.getAttribute('data-handle-type'), targetNodeId = target.getAttribute('data-node-id');
                if (targetNodeId && targetNodeId !== dragItem.id) {
                    let sId = '', tId = '';
                    if (dragItem.handleType === 'source' && targetType === 'target') { sId = dragItem.id; tId = targetNodeId; }
                    else if (dragItem.handleType === 'target' && targetType === 'source') { sId = targetNodeId; tId = dragItem.id; }
                    if (sId && tId && !edges.some(edge => edge.source === sId && edge.target === tId)) {
                        const newEdge = { id: crypto.randomUUID(), source: sId, target: tId };
                        setEdges(prev => [...prev, newEdge]);
                        broadcastChange({ type: 'edge-create', payload: newEdge });
                        triggerAutoSave(0);
                    }
                }
            }
        }

        if (dragItem?.type === 'node') {
            triggerAutoSave(0);
        }

        setDragItem(null);
        setDraftConnection(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const zoomSensitivity = 0.001;
        const newZoom = Math.min(Math.max(0.1, viewport.zoom - e.deltaY * zoomSensitivity), 5);
        setViewport(prev => ({ ...prev, zoom: newZoom }));
    };

    if (isAuthChecking) return <div className="h-screen w-full flex items-center justify-center bg-background text-slate-500">Loading...</div>;
    if (!session) return <AuthPage onLogin={() => { }} />;
    if (view === 'profile') return <ProfilePage onBack={() => setView('gallery')} userEmail={session?.user?.email} />;
    if (view === 'gallery') return <ProjectGallery onSelectProject={openProject} onCreateNew={createNewProject} onLogout={handleLogout} userEmail={session?.user?.email} onNavigateToProfile={() => setView('profile')} />;

    return (
        <div ref={containerRef} className="w-full h-[100dvh] bg-background relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }} // Critical for preventing browser scroll/zoom on mobile
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}>

            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundPosition: `${viewport.x}px ${viewport.y}px`, backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}px`,
                    backgroundImage: `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`
                }} />

            <div className="absolute inset-0 transform-gpu origin-top-left" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
                <svg className="absolute top-0 left-0 w-[50000px] h-[50000px] pointer-events-none -z-10 overflow-visible">
                    {edges.map(edge => <ConnectionLine key={edge.id} start={getNodeCenterRight(edge.source)} end={getNodeCenterLeft(edge.target)} />)}
                    {draftConnection && <ConnectionLine start={draftConnection.start} end={draftConnection.current} isDraft />}
                </svg>

                {nodes.map(node => (
                    <div key={node.id} data-node-id={node.id} onMouseDown={(e) => userRole !== 'viewer' && onNodeDragStart(e, node.id)}>
                        <NodeComponent
                            node={node}
                            onUpdate={updateNode}
                            onDelete={deleteNode}
                            onGenerate={executeGemini}
                            isSelected={selectedNodeId === node.id}
                            readOnly={userRole === 'viewer'} // Precisamos passar essa prop
                        />
                    </div>
                ))}

                {Object.values(remoteCursors).map((cursor: RemoteCursor) => cursor.id !== instanceId && (
                    <Cursor key={cursor.id} x={cursor.x} y={cursor.y} color={cursor.color} name={cursor.name} />
                ))}
            </div>

            <div className="absolute top-6 left-6 z-50 flex items-start gap-8 pointer-events-none">
                <div className="pointer-events-auto">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-accent drop-shadow-sm flex items-center gap-2">
                        <Grid className="w-6 h-6 text-blue-400" />
                        {currentProjectName}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-500 font-mono">{nodes.length} Nodes • Zoom {(viewport.zoom * 100).toFixed(0)}%</p>
                        <button onClick={fitView} className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Fit View"><Focus className="w-3 h-3" /></button>
                    </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <button onClick={() => setView('gallery')} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-slate-300 transition-colors backdrop-blur-md">
                        <Home className="w-3.5 h-3.5" /> Gallery
                    </button>
                    <button onClick={() => setShowMembersModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg text-xs font-medium text-blue-400 transition-colors backdrop-blur-md">
                        <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                    {userRole === 'owner' && (
                        <button onClick={() => setShowMembersModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-slate-300 transition-colors backdrop-blur-md">
                            <Users className="w-3.5 h-3.5" /> Members
                        </button>
                    )}
                    {userRole !== 'viewer' && !projectExistsInDb && (
                        <button onClick={() => {
                            if (!roomId) {
                                alert("Por favor, crie ou abra um projeto antes de salvar.");
                                return;
                            }
                            setShowSaveModal(true);
                        }} disabled={isSaving} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-xs font-medium text-emerald-400 transition-colors backdrop-blur-md">
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                    {projectExistsInDb && lastSaved && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs font-medium text-emerald-400/70 backdrop-blur-md">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Auto-saved {new Date(lastSaved).toLocaleTimeString()}
                        </div>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 transition-colors backdrop-blur-md">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                </div>
            </div>

            {userRole !== 'viewer' && (
                <Toolbar onAddNode={(type) => addNode(type)} onAutoGenerate={() => setShowAutoPlanModal(true)} />
            )}
            {showMembersModal && roomId && <MemberManagementModal workflowId={roomId} onClose={() => setShowMembersModal(false)} isOwner={userRole === 'owner'} />}

            {showAutoPlanModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-emerald-400" /> Auto-Plan</h2>
                            <button onClick={() => setShowAutoPlanModal(false)} className="text-slate-400 hover:text-white"><MousePointer2 className="w-5 h-5 rotate-45" /></button>
                        </div>
                        <textarea value={autoPlanPrompt} onChange={(e) => setAutoPlanPrompt(e.target.value)} placeholder="Describe your workflow..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none h-32 resize-none mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAutoPlanModal(false)} className="px-4 py-2 text-slate-300 hover:bg-white/5 rounded-lg">Cancel</button>
                            <button onClick={executeAutoPlan} disabled={isPlanning || !autoPlanPrompt.trim()} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50">{isPlanning ? 'Processing...' : 'Generate Plan'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showSaveModal && (
                <SaveProjectModal initialName={currentProjectName} onSave={saveWorkflow} onClose={() => setShowSaveModal(false)} isSaving={isSaving} />
            )}

            {nodes.length === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-50">
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-dashed border-slate-600">
                        <MousePointer2 className="w-12 h-12 text-slate-500 mx-auto mb-4 animate-bounce" />
                        <p className="text-slate-400 text-lg">Click a button below to start</p>
                    </div>
                </div>
            )}
        </div>
    );
}
