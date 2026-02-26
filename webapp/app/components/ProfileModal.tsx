'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/app/providers/UIProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { backend } from '@/lib/api';
import { FollowingStat } from '@/lib/types';
import { X, CreditCard, Shield, LogOut, Check, Zap, ChevronRight, User as UserIcon, Settings, Download, ArrowLeft, Eye, EyeOff, Bell, Camera } from 'lucide-react';
import { Button } from './ui/Button';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '@/lib/legal';

// Mock Payment History Data
const MOCK_HISTORY = [
    { id: 'txn_39284', date: '2023-10-24', plan: 'Insider Pro', amount: '$9.00', status: 'Paid' },
    { id: 'txn_22910', date: '2023-09-24', plan: 'Insider Pro', amount: '$9.00', status: 'Paid' },
];

export const ProfileModal: React.FC = () => {
    const router = useRouter();
    const { isProfileModalOpen, closeProfileModal, profileTab } = useUI();
    const { user, token, logout, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'settings'>('overview');
    
    // Sync active tab when modal opens
    useEffect(() => {
        if (isProfileModalOpen) {
            document.body.style.overflow = 'hidden';
            let tab = (profileTab === 'profile' ? 'overview' : profileTab) as any;
            if (!['overview', 'subscription', 'settings'].includes(tab)) {
                tab = 'overview';
            }
            setActiveTab(tab);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isProfileModalOpen, profileTab]);

    const [settingsView, setSettingsView] = useState<'menu' | 'password' | 'terms' | 'privacy' | 'profile'>('menu');
    const [followingStats, setFollowingStats] = useState<FollowingStat[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        profilePath: user?.profilePath || '',
        profileFolder: user?.profileFolder || ''
    });

    // Sync profileData when user object changes or when entering profile view
    useEffect(() => {
        if (user && settingsView === 'profile' && !updating && !updateSuccess) {
            // Check if we have unsaved upload (different path than current user path)
            const hasUnsavedUpload = profileData.profilePath !== user.profilePath && profileData.profilePath !== '';
            
            if (!hasUnsavedUpload) {
                setProfileData({
                    name: user.name || '',
                    bio: user.bio || '',
                    profilePath: user.profilePath || '',
                    profileFolder: user.profileFolder || ''
                });
            }
        }
        // Only reset if we're not currently showing success/error that we just set
        if (!updating && !updateSuccess && !updateError) {
            setUpdateSuccess(false);
            setUpdateError(null);
        }
    }, [user, settingsView, updating, updateSuccess, updateError, profileData.profilePath]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        setUpdating(true);
        setUpdateError(null);
        setUpdateSuccess(false);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });
            const data = await res.json();
            if (data.url) {
                setProfileData({ 
                    ...profileData, 
                    profilePath: data.url,
                    profileFolder: data.folder
                });
                // Optional: show success for upload too
            } else {
                setUpdateError("Upload failed: " + (data.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUpdateError("Failed to upload image.");
        } finally {
            setUpdating(false);
        }
    };

    const [notificationSettings, setNotificationSettings] = useState(() => {
        if (user?.notificationSettings) {
            try {
                const settings = typeof user.notificationSettings === 'string' 
                    ? JSON.parse(user.notificationSettings) 
                    : user.notificationSettings;
                return { email: false, push: false, weeklyDigest: false, ...settings };
            } catch (e) {
                return { email: false, push: false, weeklyDigest: false };
            }
        }
        return { email: false, push: false, weeklyDigest: false };
    });

    // Sync notification settings when user changes
    useEffect(() => {
        if (user?.notificationSettings) {
            try {
                const settings = typeof user.notificationSettings === 'string' 
                    ? JSON.parse(user.notificationSettings) 
                    : user.notificationSettings;
                setNotificationSettings({ 
                    email: false, 
                    push: false, 
                    weeklyDigest: false, 
                    ...settings 
                });
            } catch (e) {
                console.error("Failed to sync notification settings:", e);
            }
        }
    }, [user]);

    const displayName = user ? (user.name || user.email?.split('@')[0]) : '';

    const handleToggleNotification = async (key: string) => {
        if (!token || updating) return;
        
        // Restriction for non-pro users
        if (user?.plan !== 'pro' && (key === 'email' || key === 'weeklyDigest')) {
            setShowUpgradeModal(true);
            return;
        }

        setUpdating(true);
        const newSettings = { ...notificationSettings, [key]: !notificationSettings[key] };
        try {
            const updatedUser = await backend.updateUser({ notificationSettings: JSON.stringify(newSettings) }, token);
            setNotificationSettings(newSettings);
            updateUser(updatedUser.user || updatedUser);
        } catch (e) {
            console.error("Failed to update notification settings:", e);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpgrade = async () => {
        if (!token || updating) return;
        setUpdating(true);
        setUpdateError(null);
        try {
            // Free for now: directly update the role
            const updatedUser = await backend.updateUser({ role: 'pro' }, token);
            updateUser(updatedUser.user || updatedUser);
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 3000);
        } catch (e) {
            console.error("Upgrade failed:", e);
            setUpdateError("Failed to initiate upgrade. Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    const handleUnsubscribe = async () => {
        if (!token || updating) return;
        setUpdating(true);
        try {
            const updatedUser = await backend.updateUser({ role: 'free' }, token);
            updateUser(updatedUser.user || updatedUser);
        } catch (e) {
            console.error("Unsubscribe failed:", e);
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => {
        if (isProfileModalOpen && activeTab === 'overview' && user && token) {
            const loadStats = async () => {
                setLoadingStats(true);
                try {
                    // Re-using the following list to get stats
                    const stats = await backend.getFollowingStats(token);
                    setFollowingStats(stats);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoadingStats(false);
                }
            };
            loadStats();
        }
    }, [isProfileModalOpen, activeTab, user, token]);

    if (!isProfileModalOpen || !user) return null;

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateError(null);
        setUpdateSuccess(false);

        if (passwordData.new !== passwordData.confirm) {
            setUpdateError("New passwords do not match!");
            return;
        }
        
        setUpdating(true);
        // In a real app, call backend here
        // Simulating delay
        setTimeout(() => {
            setUpdateSuccess(true);
            setUpdating(false);
            setPasswordData({ current: '', new: '', confirm: '' });
            
            setTimeout(() => {
                setSettingsView('menu');
                setUpdateSuccess(false);
            }, 3000);
        }, 1000);
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting profile update with data:", profileData);
        if (!token || updating) return;
        setUpdating(true);
        setUpdateSuccess(false);
        setUpdateError(null);
        try {
            const updatedUser = await backend.updateUser({ 
                name: profileData.name, 
                bio: profileData.bio,
                profilePath: profileData.profilePath,
                profileFolder: profileData.profileFolder
            }, token);
            updateUser(updatedUser.user || updatedUser);
            // Success!
            setUpdateSuccess(true);
            // Stay on the screen for a bit to show the success message, then return to menu
            setTimeout(() => {
                setSettingsView('menu');
                setUpdateSuccess(false);
            }, 3000);
        } catch (e) {
            console.error("Profile update failed:", e);
            setUpdateError("Failed to update profile. Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    const generateCSV = () => {
        const header = "Transaction ID,Date,Plan,Amount,Status\n";
        const rows = MOCK_HISTORY.map(row => `${row.id},${row.date},${row.plan},${row.amount},${row.status}`).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        return URL.createObjectURL(blob);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={closeProfileModal} />

            <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-[#121214] border-0 md:border md:border-white/10 md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fade-in">
                {/* Close Button */}
                <button 
                    onClick={closeProfileModal} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-50 p-1 rounded-full hover:bg-white/5"
                >
                    <X size={20} />
                </button>

                {/* Sidebar */}
                <div className={`w-full md:w-64 bg-surface/30 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col shrink-0 pt-16 md:pt-6 ${activeTab === 'settings' && settingsView !== 'menu' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex md:flex-col items-center gap-4 md:gap-0 mb-6 md:mb-8 text-left md:text-center">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-primary p-1 md:mb-3 shrink-0">
                            <img src={user.profilePath || user.avatarUrl || `https://ui-avatars.com/api/?name=${displayName}`} alt="User" className="w-full h-full rounded-full object-cover" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white mb-1">{displayName}</h2>
                            <div className="flex md:justify-center items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.plan === 'pro' ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'bg-gray-800 text-gray-400'}`}>
                                    {user.plan === 'pro' ? 'INSIDER' : 'OBSERVER'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 space-y-2">
                        <button 
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] uppercase tracking-widest font-black h-9 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            onClick={() => {
                                closeProfileModal();
                                router.push(`/user/${user.id}`);
                            }}
                        >
                            <Eye size={14} /> View Public Profile
                        </button>
                    </div>

                    <nav className="grid grid-cols-3 md:flex md:flex-col gap-1 md:space-y-1 md:flex-1">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl text-[10px] md:text-sm transition-colors ${activeTab === 'overview' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <UserIcon size={18} /> <span>Overview</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('subscription')}
                            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl text-[10px] md:text-sm transition-colors ${activeTab === 'subscription' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <CreditCard size={18} /> <span>Subscription</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl text-[10px] md:text-sm transition-colors ${activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Settings size={18} /> <span>Settings</span>
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className={`flex-1 p-6 md:p-8 relative bg-[#09090b] ${activeTab === 'settings' && settingsView !== 'menu' ? 'h-full overflow-hidden' : 'overflow-y-auto'}`}>

                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in pb-10 md:pb-0">
                            <h3 className="text-xl font-bold text-white mb-4">Following Feed</h3>
                            {loadingStats ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 bg-surface/50 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {followingStats.map(stat => (
                                        <div 
                                            key={stat.id} 
                                            onClick={() => {
                                                closeProfileModal();
                                                router.push(`/celebrity/${stat.id}`);
                                            }}
                                            className="flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-xl hover:border-primary/30 hover:bg-surface/50 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <img src={stat.imageUrl} className="w-10 h-10 rounded-full bg-gray-800 object-cover" />
                                                <div>
                                                    <div className="font-bold text-white text-sm group-hover:text-primary transition-colors">{stat.name}</div>
                                                    <div className="text-[10px] text-gray-400">
                                                        Trend: <span className={stat.trend === 'up' ? 'text-green-400' : 'text-gray-300'}>{stat.trend.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {stat.newItems > 0 && (
                                                <div className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-md">
                                                    +{stat.newItems} New
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {followingStats.length === 0 && (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            You aren't following anyone yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="space-y-4 animate-fade-in pb-10 md:pb-0">
                            <h3 className="text-lg font-bold text-white mb-1">Plan Management</h3>
                            
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs text-gray-400">Current Plan:</span>
                                <span className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-[10px] font-bold text-white">
                                    {user.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                                </span>
                            </div>

                            <div className="p-5 bg-[#18181b] border border-white/10 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Zap size={80} className="text-primary" />
                                </div>
                                
                                <div className="relative z-10">
                                    <h4 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Pro Plan</h4>
                                    
                                    <ul className="space-y-2 mb-6">
                                        {[
                                            'get newest updates',
                                            'get weekly digest',
                                            'view more detailed info'
                                        ].map((bullet, i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-xs">
                                                <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                                    <Check size={10} className="text-green-400" />
                                                </div>
                                                <span className="text-gray-400 group-hover:text-[#a3b18a] transition-colors">{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {updateError && (
                                        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-bold flex items-center gap-2">
                                            <X size={12} /> {updateError}
                                        </div>
                                    )}

                                    <Button 
                                        className={`w-full py-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                                            user.plan === 'pro' 
                                            ? 'bg-white/5 border border-white/10 text-white hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400' 
                                            : 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20'
                                        }`} 
                                        onClick={user.plan === 'pro' ? handleUnsubscribe : handleUpgrade}
                                        disabled={updating}
                                    >
                                        {updating ? 'Processing...' : user.plan === 'pro' ? 'Unsubscribe' : 'Upgrade - Free for now'}
                                    </Button>

                                    {updateSuccess && (
                                        <div className="mt-3 text-center text-green-400 text-[10px] font-bold animate-fade-in flex items-center justify-center gap-2">
                                            <Check size={12} /> Subscription Updated!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className={`animate-fade-in flex flex-col h-full overflow-hidden`}>
                            {settingsView === 'menu' ? (
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="flex-1 overflow-y-auto space-y-8 pr-1 pb-4 scrollbar-hide">
                                        <div>
                                            <h3 className="w-4/5 mx-auto md:w-full text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                <Bell size={18} className="text-gray-400" /> Notifications
                                            </h3>
                                            <div className="w-4/5 mx-auto md:w-full space-y-1 bg-surface/30 rounded-xl border border-white/5 overflow-hidden">
                                                <div className="flex items-center justify-between p-4 border-b border-white/5">
                                                    <div>
                                                        <div className="text-xs font-bold text-white">Email Updates</div>
                                                        <div className="text-[11px] text-gray-400">Get major scoops via email.</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleToggleNotification('email')}
                                                        disabled={updating}
                                                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${notificationSettings.email && user.plan === 'pro' ? 'bg-primary' : 'bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${notificationSettings.email && user.plan === 'pro' ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between p-4 border-b border-white/5">
                                                    <div>
                                                        <div className="text-xs font-bold text-white">Weekly Digest</div>
                                                        <div className="text-[11px] text-gray-400">Weekly wrap-up of all celebs.</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleToggleNotification('weeklyDigest')}
                                                        disabled={updating}
                                                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${notificationSettings.weeklyDigest && user.plan === 'pro' ? 'bg-primary' : 'bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${notificationSettings.weeklyDigest && user.plan === 'pro' ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between p-4">
                                                    <div>
                                                        <div className="text-xs font-bold text-white">Push Notifications</div>
                                                        <div className="text-[11px] text-gray-400">Live alerts on your device.</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleToggleNotification('push')}
                                                        disabled={updating}
                                                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${notificationSettings.push ? 'bg-primary' : 'bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${notificationSettings.push ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="w-4/5 mx-auto md:w-full text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                <Shield size={18} className="text-gray-400" /> Security & Privacy
                                            </h3>
                                            <div className="w-4/5 mx-auto md:w-full space-y-3">
                                                <button 
                                                    onClick={() => setSettingsView('profile')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-200">Edit Public Profile</span>
                                                    <ChevronRight size={16} className="text-gray-400" />
                                                </button>
                                                <button 
                                                    onClick={() => setSettingsView('password')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-200">Change Password</span>
                                                    <ChevronRight size={16} className="text-gray-400" />
                                                </button>
                                                <button 
                                                    onClick={() => setSettingsView('privacy')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-200">Privacy Policy</span>
                                                    <ChevronRight size={16} className="text-gray-400" />
                                                </button>
                                                <button 
                                                    onClick={() => setSettingsView('terms')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-200">Terms & Conditions</span>
                                                    <ChevronRight size={16} className="text-gray-400" />
                                                </button>

                                                <div className="pt-4 border-t border-white/5 mt-4">
                                                    <button 
                                                        onClick={() => { logout(); closeProfileModal(); }}
                                                        className="w-full flex items-center justify-between p-3 bg-[#3a0b0b] border border-red-900/30 rounded-lg hover:bg-[#4a0d0d] text-left transition-colors font-bold group"
                                                    >
                                                        <span className="text-xs text-red-400">Log Out</span>
                                                        <LogOut size={16} className="text-red-400 group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-fade-in flex flex-col h-full overflow-hidden md:max-h-none">
                                    <div className="mb-4 shrink-0">
                                        <button 
                                            onClick={() => setSettingsView('menu')}
                                            className="flex items-center gap-2 text-xs text-gray-400 hover:text-primary transition-colors mb-2"
                                        >
                                            <ArrowLeft size={14} /> Back to Settings
                                        </button>
                                        <h3 className="text-base font-bold text-white">
                                            {settingsView === 'password' ? 'Change Password' : 
                                             settingsView === 'profile' ? 'Edit Public Profile' :
                                             settingsView === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
                                        </h3>
                                    </div>

                                    {settingsView === 'profile' ? (
                                        <form className="space-y-5 flex-1 overflow-y-auto pr-1 scrollbar-hide pb-20 md:pb-10 w-4/5 mx-auto md:w-full" onSubmit={handleProfileUpdate}>
                                            <div className="space-y-4">
                                                <div className="flex flex-col items-center gap-4 mb-4">
                                                    <div className="relative w-24 h-24 group">
                                                        <img 
                                                            src={profileData.profilePath || user.avatarUrl || `https://ui-avatars.com/api/?name=${displayName}`} 
                                                            alt="Preview" 
                                                            className="w-full h-full rounded-full object-cover border-2 border-primary/50"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Camera size={24} className="text-white" />
                                                        </button>
                                                    </div>
                                                    <input 
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileUpload}
                                                        accept="image/*"
                                                        className="hidden"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="text-xs text-primary font-bold hover:underline"
                                                    >
                                                        {updating ? 'Uploading...' : 'Change Profile Picture'}
                                                    </button>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider ml-1">Broadcast Name</label>
                                                    <input 
                                                        type="text" 
                                                        required
                                                        value={profileData.name}
                                                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                                        className="w-full block bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="Your public name"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider ml-1">Public Bio</label>
                                                    <textarea 
                                                        value={profileData.bio}
                                                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                                        className="w-full block bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all min-h-[100px] resize-none" 
                                                        placeholder="Tell the community about yourself..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                {updateError && (
                                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
                                                        <X size={14} /> {updateError}
                                                    </div>
                                                )}
                                                
                                                <Button 
                                                    type="submit" 
                                                    disabled={updating || updateSuccess} 
                                                    className={`w-full flex font-bold py-6 rounded-xl shadow-lg transition-all duration-300 ${updateSuccess ? 'bg-green-600 hover:bg-green-600 shadow-green-600/20' : 'shadow-primary/20'}`}
                                                >
                                                    {updating ? 'Updating Broadcast...' : updateSuccess ? (
                                                        <span className="flex items-center gap-2"><Check size={18} /> profile updated</span>
                                                    ) : 'Update Public Profile'}
                                                </Button>
                                            </div>
                                        </form>
                                    ) : settingsView === 'password' ? (
                                        <form className="space-y-5 flex-1 overflow-y-auto pr-1 scrollbar-hide pb-20 md:pb-10 w-4/5 mx-auto md:w-full" onSubmit={handlePasswordUpdate}>
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider ml-1">Current Password</label>
                                                    <input 
                                                        type="password" 
                                                        required
                                                        value={passwordData.current}
                                                        onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                                        className="w-full block bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                
                                                <div className="h-px bg-white/5 my-2" />

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider ml-1">New Password</label>
                                                    <input 
                                                        type="password" 
                                                        required
                                                        value={passwordData.new}
                                                        onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                                        className="w-full block bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="Minimum 8 characters"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider ml-1">Confirm New Password</label>
                                                    <input 
                                                        type="password" 
                                                        required
                                                        value={passwordData.confirm}
                                                        onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                                        className="w-full block bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="Repeat new password"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                {updateError && (
                                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
                                                        <X size={14} /> {updateError}
                                                    </div>
                                                )}
                                                
                                                <Button 
                                                    type="submit" 
                                                    disabled={updating || updateSuccess} 
                                                    className={`w-full flex font-bold py-6 rounded-xl shadow-lg transition-all duration-300 ${updateSuccess ? 'bg-green-600 hover:bg-green-600 shadow-green-600/20' : 'shadow-primary/20'}`}
                                                >
                                                    {updating ? 'Verifying...' : updateSuccess ? (
                                                        <span className="flex items-center gap-2"><Check size={18} /> credentials updated</span>
                                                    ) : 'Update Security Credentials'}
                                                </Button>
                                                
                                                <p className="text-[9px] text-center text-gray-500 mt-4 leading-relaxed">
                                                    Changing your password will require you to log back in on all other devices.
                                                </p>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-4/5 mx-auto md:w-full">
                                            <div className="flex-1 bg-surface/30 rounded-xl p-4 border border-white/5 text-[10px] md:text-xs text-gray-300 whitespace-pre-wrap overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 min-h-[85%] md:min-h-0 md:max-h-[400px]">
                                                {settingsView === 'privacy' ? PRIVACY_POLICY : TERMS_AND_CONDITIONS}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Upgrade Modal Backdrop */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowUpgradeModal(false)} />
                    <div className="relative bg-[#18181b] border border-white/10 rounded-2xl p-5 max-w-[280px] w-full shadow-2xl space-y-4 text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <Zap size={24} className="text-primary" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Pro Feature</h4>
                            <p className="text-gray-400 text-xs px-2">Upgrade to pro for this feature and get exclusive updates.</p>
                        </div>
                        <div className="space-y-2 pt-1">
                            <Button 
                                className="w-full text-xs font-bold py-3 rounded-xl"
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    setActiveTab('subscription');
                                }}
                            >
                                View Pro Plan
                            </Button>
                            <button 
                                onClick={() => setShowUpgradeModal(false)}
                                className="text-[10px] text-gray-500 font-bold hover:text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FileTextIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);