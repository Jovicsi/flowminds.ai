import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Plus, LayoutGrid, Clock, ChevronRight, Search, Loader2, LogOut, User } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    updated_at: string;
    nodes_count?: number;
    isOwner: boolean;
}

interface ProjectGalleryProps {
    onSelectProject: (id: string, isOwner: boolean) => void;
    onCreateNew: () => void;
    onLogout: () => void;
    onNavigateToProfile: () => void;
    userEmail?: string;
}

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({ onSelectProject, onCreateNew, onLogout, onNavigateToProfile, userEmail }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Meus projetos (Dono) - Sempre tentamos carregar primeiro
            const { data: owned, error: ownedError } = await supabase
                .from('workflows')
                .select('*')
                .eq('user_id', user.id);

            if (ownedError) {
                console.error("Owned projects fetch error:", ownedError);
            }

            const ownedProjects = (owned || []).map(d => ({
                id: d.id,
                name: d.name || 'Untitled Project',
                updated_at: d.updated_at,
                nodes_count: Array.isArray(d.nodes) ? d.nodes.length : 0,
                isOwner: true
            }));

            // 2. Projetos compartilhados comigo - Erro aqui não deve quebrar a galeria inteira
            let sharedProjects: any[] = [];
            try {
                const { data: shared, error: sharedError } = await supabase
                    .from('project_members')
                    .select('workflows(*)')
                    .or(`user_id.eq.${user.id},user_email.eq.${user.email}`);

                if (!sharedError && shared) {
                    sharedProjects = shared
                        .filter(s => s.workflows)
                        .map(s => {
                            const d = Array.isArray(s.workflows) ? s.workflows[0] : s.workflows;
                            return {
                                id: d.id,
                                name: d.name || 'Untitled Project',
                                updated_at: d.updated_at,
                                nodes_count: Array.isArray(d.nodes) ? d.nodes.length : 0,
                                isOwner: false
                            };
                        });
                } else if (sharedError) {
                    console.error("Shared projects fetch error:", sharedError);
                }
            } catch (e) {
                console.error("Critical error fetching shared projects:", e);
            }

            // Unificar e remover duplicatas por ID
            const all = [...ownedProjects, ...sharedProjects];
            const unique = Array.from(new Map(all.map(p => [p.id, p])).values());

            setProjects(unique.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        } catch (err) {
            console.error('General error in fetchProjects:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        loadUser();
    }, []);

    const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || userEmail?.split('@')[0] || 'User';
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

    return (
        <div className="min-h-screen bg-background text-white p-4 md:p-8 animate-in">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-6">
                    <div><h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-accent">My Projects</h1></div>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center justify-between md:justify-start gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 w-full md:w-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold uppercase overflow-hidden border-2 border-blue-500/20">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        displayName[0]
                                    )}
                                </div>
                                <span className="text-sm font-medium text-slate-300 truncate max-w-[100px] md:max-w-none">{displayName}</span>
                            </div>
                            <div className="flex items-center">
                                <button onClick={onNavigateToProfile} className="ml-2 p-1.5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all" title="Profile">
                                    <User className="w-4 h-4" />
                                </button>
                                <button onClick={onLogout} className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all" title="Sign Out">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <button onClick={onCreateNew} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95 w-full md:w-auto">
                            <Plus className="w-5 h-5" /> <span className="md:hidden">New</span><span className="hidden md:inline">Create Project</span>
                        </button>
                    </div>
                </div>
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white outline-none" />
                </div>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((project) => (
                            <div key={project.id} onClick={() => onSelectProject(project.id, project.isOwner)} className="group bg-surface hover:bg-slate-800 border border-white/5 rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1">
                                <div className="flex justify-between mb-4"><div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center"><LayoutGrid className="w-6 h-6 text-blue-400" /></div><ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-all" /></div>
                                <h3 className="text-lg font-bold mb-1 truncate">{project.name}</h3>
                                <div className="flex items-center gap-3 text-slate-500 text-xs"><span><Clock className="w-3 h-3 inline mr-1" />{new Date(project.updated_at).toLocaleDateString()}</span><span>•</span><span>{project.nodes_count} Nodes</span></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
