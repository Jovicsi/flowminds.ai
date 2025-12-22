import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { LayoutGrid, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

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

    const signInWithGoogle = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'https://flowminds-ai.vercel.app'
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
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

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[32px] shadow-2xl space-y-6">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">{error}</div>}

                    {/* Google Sign-In Button */}
                    <button
                        onClick={signInWithGoogle}
                        disabled={isLoading}
                        type="button"
                        className="w-full bg-white hover:bg-gray-50 py-4 rounded-2xl text-gray-800 font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="animate-spin text-gray-800" /> : (
                            <>
                                <GoogleIcon />
                                Continue with Google
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700/50"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-slate-900/50 px-4 text-slate-500">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleAuth} className="space-y-4">
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

                        <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </button>

                        <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors">
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
