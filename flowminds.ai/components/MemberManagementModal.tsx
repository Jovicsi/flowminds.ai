import React, { useEffect, useState } from 'react';
import { X, UserPlus, Shield, UserMinus, Loader2, Mail } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ProjectMember, ProjectRole } from '../types';

interface Props {
    workflowId: string;
    onClose: () => void;
    isOwner: boolean;
}

export const MemberManagementModal: React.FC<Props> = ({ workflowId, onClose, isOwner }) => {
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => { fetchMembers(); }, [workflowId]);

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_members')
                .select('*')
                .eq('workflow_id', workflowId);
            if (error) {
                if (error.code === 'PGRST205') {
                    alert('Erro de Schema: A tabela de membros não foi encontrada. Por favor, execute o script SQL e recarregue o schema no Supabase.');
                }
                throw error;
            }

            // Fetch user metadata for each member
            const membersWithMetadata = await Promise.all((data || []).map(async (member) => {
                if (member.user_id) {
                    const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
                    if (userData?.user) {
                        return {
                            ...member,
                            display_name: userData.user.user_metadata?.display_name || userData.user.user_metadata?.full_name,
                            avatar_url: userData.user.user_metadata?.avatar_url || userData.user.user_metadata?.picture
                        };
                    }
                }
                return member;
            }));

            setMembers(membersWithMetadata);
        } catch (err) { console.error('Error fetching members:', err); }
        finally { setIsLoading(false); }
    };

    const updateRole = async (memberId: string, newRole: ProjectRole) => {
        if (!isOwner) return;
        console.log(`Updating role for member ${memberId} to ${newRole}`);
        try {
            const { error } = await supabase
                .from('project_members')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }

            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        } catch (err: any) {
            console.error('Error updating role:', err);
            alert(`Erro ao atualizar cargo: ${err.message || 'Verifique sua conexão.'}`);
        }
    };

    const removeMember = async (memberId: string) => {
        if (!isOwner) return;

        // Vamos usar um confirm mais robusto ou apenas prosseguir se o usuário insistir
        // Para garantir que não seja bloqueado por popups
        console.log(`Attempting to remove member with ID: ${memberId}`);

        try {
            const { error } = await supabase
                .from('project_members')
                .delete()
                .eq('id', memberId);

            if (error) {
                console.error('Supabase delete error:', error);
                throw error;
            }

            console.log('Member removed successfully from database');
            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (err: any) {
            console.error('Error removing member:', err);
            alert(`Erro ao remover membro: ${err.message || 'Verifique sua conexão.'}`);
        }
    };

    const inviteMember = async () => {
        if (!inviteEmail.trim() || !isOwner) return;
        setIsInviting(true);
        const targetEmail = inviteEmail.trim().toLowerCase();

        try {
            // 1. Verifica se o usuário já é membro
            if (members.some(m => m.user_email === targetEmail)) {
                alert('Este usuário já é membro do projeto.');
                return;
            }

            // 2. Tenta buscar o perfil, mas não bloqueia se não achar
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', targetEmail)
                .maybeSingle();

            // 3. Adiciona o usuário como membro (pelo e-mail)
            const { error: insertError } = await supabase
                .from('project_members')
                .insert({
                    workflow_id: workflowId,
                    user_id: profile?.id || null, // Se tiver ID blz, se não vai só e-mail
                    user_email: targetEmail,
                    role: 'viewer'
                });

            if (insertError) {
                if (insertError.code === '23505') throw new Error('Este usuário já tem acesso a este projeto.');
                if (insertError.code === 'PGRST205') throw new Error('O banco de dados ainda não reconheceu a nova tabela. Por favor, tente recarregar o schema no painel do Supabase.');
                throw insertError;
            }

            setInviteEmail('');
            fetchMembers();
            alert('Usuário adicionado com sucesso!');
        } catch (err: any) {
            console.error('Error adding member:', err);
            alert(`Erro ao adicionar: ${err.message || 'Verifique sua conexão.'}`);
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <div className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Project Access</h2>
                        <p className="text-sm text-slate-400">Add people by email to collaborate</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-6">
                    {/* Invite Section */}
                    {isOwner && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add via email</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        placeholder="user@example.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <button
                                    onClick={inviteMember}
                                    disabled={isInviting || !inviteEmail.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                                >
                                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {/* List Members */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Members</label>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8 text-blue-500"><Loader2 className="animate-spin w-8 h-8" /></div>
                        ) : members.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">No members added yet</div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold uppercase overflow-hidden border-2 border-blue-500/20 flex-shrink-0">
                                                {member.avatar_url ? (
                                                    <img src={member.avatar_url} alt={member.display_name || member.user_email} className="w-full h-full object-cover" />
                                                ) : (
                                                    (member.display_name || member.user_email)?.[0] || 'U'
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {member.display_name || member.user_email?.split('@')[0] || 'User'}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">({member.user_email})</p>
                                            </div>
                                        </div>

                                        {isOwner && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => updateRole(member.id, e.target.value as ProjectRole)}
                                                    className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-1 outline-none"
                                                >
                                                    <option value="editor">Editor</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                                <button
                                                    onClick={() => removeMember(member.id)}
                                                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-all flex items-center gap-1"
                                                    title="Remover membro"
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all">Done</button>
                </div>
            </div>
        </div>
    );
};
