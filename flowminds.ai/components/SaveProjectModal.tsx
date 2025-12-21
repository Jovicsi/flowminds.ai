import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface Props { initialName?: string; onSave: (name: string) => void; onClose: () => void; isSaving: boolean; }

export const SaveProjectModal: React.FC<Props> = ({ initialName = '', onSave, onClose, isSaving }) => {
    const [name, setName] = useState(initialName);
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-surface border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Save Project</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-400 mb-1.5">Project Name</label>
                        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Workflow" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none" onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name)} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-slate-300">Cancel</button>
                        <button disabled={!name.trim() || isSaving} onClick={() => onSave(name)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold transition-all">
                            {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Project</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
