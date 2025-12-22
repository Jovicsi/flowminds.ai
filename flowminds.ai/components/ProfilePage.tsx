import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, User, Mail, Lock, Camera, Save, Loader2, CheckCircle2, Crown, Upload } from 'lucide-react';

interface ProfilePageProps {
    onBack: () => void;
    userEmail?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, userEmail }) => {
    const [user, setUser] = useState<any>(null);
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            setDisplayName(user.user_metadata?.display_name || user.user_metadata?.full_name || '');
            setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || '');
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showMessage('error', 'Image must be less than 2MB');
                return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const uploadAvatar = async () => {
        if (!avatarFile || !user) return;

        setIsLoading(true);
        try {
            // Upload to Supabase Storage
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update user metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            setAvatarPreview(null);
            setAvatarFile(null);
            showMessage('success', 'Avatar updated successfully!');
        } catch (error: any) {
            showMessage('error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const updateDisplayName = async () => {
        if (!displayName.trim()) {
            showMessage('error', 'Display name cannot be empty');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { display_name: displayName }
            });

            if (error) throw error;
            showMessage('success', 'Display name updated!');
        } catch (error: any) {
            showMessage('error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const changePassword = async () => {
        if (newPassword.length < 6) {
            showMessage('error', 'Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('error', 'Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            setNewPassword('');
            setConfirmPassword('');
            showMessage('success', 'Password changed successfully!');
        } catch (error: any) {
            showMessage('error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const subscriptionPlan = user?.user_metadata?.subscription_plan || 'free';

    return (
        <div className="min-h-screen bg-background text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Gallery
                </button>

                {/* Success/Error Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                        {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}

                {/* Profile Header */}
                <div className="bg-surface border border-white/5 rounded-3xl p-8 mb-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden border-4 border-blue-500/20">
                                {(avatarPreview || avatarUrl) ? (
                                    <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-12 h-12 text-blue-400" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                                <Camera className="w-4 h-4" />
                                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            </label>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{displayName || 'User'}</h1>
                            <p className="text-slate-400 flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4" />
                                {userEmail || user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Account Settings */}
                    <div className="bg-surface border border-white/5 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-400" />
                            Account Settings
                        </h2>

                        {/* Display Name */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Display Name</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500/50 transition-all"
                                    placeholder="Your name"
                                />
                                <button
                                    onClick={updateDisplayName}
                                    disabled={isLoading}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Avatar Upload */}
                        {avatarFile && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Upload Avatar</label>
                                <button
                                    onClick={uploadAvatar}
                                    disabled={isLoading}
                                    className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    Upload New Avatar
                                </button>
                            </div>
                        )}

                        {/* Email (read-only) */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                            <input
                                type="email"
                                value={userEmail || user?.email || ''}
                                disabled
                                className="w-full bg-slate-950/30 border border-slate-700/30 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-surface border border-white/5 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-400" />
                            Security
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500/50 transition-all"
                                    placeholder="Enter new password"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500/50 transition-all"
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <button
                                onClick={changePassword}
                                disabled={isLoading || !newPassword || !confirmPassword}
                                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                {/* Subscription Section */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-6 mt-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-400" />
                        Subscription
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Current Plan</p>
                            <p className="text-2xl font-bold capitalize">{subscriptionPlan}</p>
                        </div>

                        <button
                            disabled
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Crown className="w-5 h-5" />
                            Upgrade to Pro
                        </button>
                    </div>

                    <p className="text-slate-500 text-xs mt-4">
                        * Subscription management coming soon
                    </p>
                </div>
            </div>
        </div>
    );
};
