import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { LayoutGrid, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export const AuthPage: React.FC<{ onLogin: () => void }> = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { error } = isLogin
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#0d1117] relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md m-auto px-6 z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center m-auto mb-6 border border-blue-500/20">
                        <LayoutGrid className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">FlowMinds AI</h1>
                    <p className="text-slate-400">Design your intelligence, visually.</p>
                </div>

                <form onSubmit={handleAuth} className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[32px] shadow-2xl space-y-6">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">{error}</div>}

                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:border-blue-500/50 outline-none transition-all" />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:border-blue-500/50 outline-none transition-all" />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">
                        {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                        {!isLoading && <ArrowRight className="w-5 h-5" />}
                    </button>

                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors">
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};
