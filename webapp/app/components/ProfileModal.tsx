'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/app/providers/UIProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { backend } from '@/lib/api';
import { FollowingStat } from '@/lib/types';
import { X, CreditCard, Shield, LogOut, Check, Zap, ChevronRight, User as UserIcon, Settings, Download, ArrowLeft, Eye, EyeOff, Bell } from 'lucide-react';
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
    const [updating, setUpdating] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        bio: user?.bio || ''
    });

    const [notificationSettings, setNotificationSettings] = useState(() => {
        if (user?.notificationSettings) {
            try {
                return typeof user.notificationSettings === 'string' 
                    ? JSON.parse(user.notificationSettings) 
                    : user.notificationSettings;
            } catch (e) {
                return { email: true, push: false };
            }
        }
        return { email: true, push: false };
    });

    const displayName = user ? (user.name || user.email?.split('@')[0]) : '';

    const handleToggleNotification = async (key: string) => {
        if (!token || updating) return;
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
        try {
            const res = await backend.createCheckoutSession('pro', token);
            if (res.url) {
                window.location.href = res.url;
            } else {
                alert("Subscription started (Development Mode).");
                // For dev: just update the role if possible, or tell user
            }
        } catch (e) {
            console.error("Upgrade failed:", e);
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
        if (passwordData.new !== passwordData.confirm) {
            alert("New passwords do not match!");
            return;
        }
        // In a real app, call backend here
        alert("Password update simulated successfully.");
        setSettingsView('menu');
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || updating) return;
        setUpdating(true);
        try {
            const updatedUser = await backend.updateUser({ 
                name: profileData.name, 
                bio: profileData.bio 
            }, token);
            updateUser(updatedUser.user || updatedUser);
            alert("Profile updated successfully!");
            setSettingsView('menu');
        } catch (e) {
            console.error("Profile update failed:", e);
            alert("Failed to update profile.");
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
                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${displayName}`} alt="User" className="w-full h-full rounded-full object-cover" />
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
                                                    <div className="text-[10px] text-gray-500">
                                                        Trend: <span className={stat.trend === 'up' ? 'text-green-400' : 'text-gray-400'}>{stat.trend.toUpperCase()}</span>
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
                                        <div className="text-center py-8 text-gray-500 text-sm">
                                            You aren't following anyone yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="space-y-6 animate-fade-in pb-10 md:pb-0">
                            {!showHistory ? (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-4">Plan Management</h3>
                                    <div className="p-6 bg-gradient-to-br from-surface to-black border border-white/10 rounded-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <Zap size={100} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">Current Plan</div>
                                            <div className="text-3xl font-extrabold text-white mb-4">
                                                {user.plan === 'pro' ? 'Insider Pro' : 'Observer Free'}
                                            </div>
                                            {user.plan !== 'pro' ? (
                                                <Button 
                                                    className="w-full font-bold" 
                                                    onClick={handleUpgrade}
                                                    disabled={updating}
                                                >
                                                    {updating ? 'Processing...' : 'Upgrade to Pro - $9/mo'}
                                                </Button>
                                            ) : (
                                                <div className="text-green-400 text-sm font-bold flex items-center gap-2">
                                                    <Check size={16} /> Active subscription
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {user.plan === 'pro' && (
                                        <Button variant="outline" className="w-full gap-2 border-white/10 hover:bg-white/5" onClick={() => setShowHistory(true)}>
                                            <FileTextIcon size={14} /> History
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className="animate-fade-in">
                                    <Button size="sm" variant="ghost" onClick={() => setShowHistory(false)} className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
                                        <ArrowLeft size={14} /> Back
                                    </Button>
                                    <div className="mt-4 bg-surface/30 border border-white/5 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm text-left text-gray-400">
                                            <thead className="text-xs text-gray-500 uppercase bg-black/20">
                                                <tr>
                                                    <th className="px-4 py-3">Date</th>
                                                    <th className="px-4 py-3">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {MOCK_HISTORY.map((txn) => (
                                                    <tr key={txn.id} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="px-4 py-3 text-white">{txn.date}</td>
                                                        <td className="px-4 py-3">{txn.amount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <a href={generateCSV()} download="history.csv" className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <Download size={12} /> Download CSV
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className={`animate-fade-in flex flex-col h-full overflow-hidden`}>
                            {settingsView === 'menu' ? (
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="flex-1 overflow-y-auto space-y-8 pr-1 pb-4 scrollbar-hide">
                                        <div>
                                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                <Bell size={18} className="text-gray-400" /> Notifications
                                            </h3>
                                            <div className="space-y-1 bg-surface/30 rounded-xl border border-white/5 overflow-hidden">
                                                <div className="flex items-center justify-between p-4 border-b border-white/5">
                                                    <div>
                                                        <div className="text-xs font-bold text-white">Email Updates</div>
                                                        <div className="text-[11px] text-gray-500">Get major scoops via email.</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleToggleNotification('email')}
                                                        disabled={updating}
                                                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${notificationSettings.email ? 'bg-primary' : 'bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${notificationSettings.email ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between p-4">
                                                    <div>
                                                        <div className="text-xs font-bold text-white">Push Notifications</div>
                                                        <div className="text-[11px] text-gray-500">Live alerts on your device.</div>
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
                                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                <Shield size={18} className="text-gray-400" /> Security & Privacy
                                            </h3>
                                            <div className="space-y-3">
                                                <button 
                                                    onClick={() => setSettingsView('profile')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-300">Edit Public Profile</span>
                                                    <ChevronRight size={16} className="text-gray-500" />
                                                </button>
                                                <button 
                                                    onClick={() => setSettingsView('password')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-300">Change Password</span>
                                                    <ChevronRight size={16} className="text-gray-500" />
                                                </button>
                                                <button 
                                                    onClick={() => setSettingsView('privacy')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-300">Privacy Policy</span>
                                                    <ChevronRight size={16} className="text-gray-500" />
                                                </button>
                                                <button 
                                                    onClick={() => setSettingsView('terms')}
                                                    className="w-full flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-lg hover:bg-surface/50 text-left transition-colors"
                                                >
                                                    <span className="text-xs text-gray-300">Terms & Conditions</span>
                                                    <ChevronRight size={16} className="text-gray-500" />
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
                                            className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary transition-colors mb-2"
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
                                        <form className="space-y-5 flex-1 overflow-y-auto pr-1 scrollbar-hide pb-20 md:pb-10" onSubmit={handleProfileUpdate}>
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">Broadcast Name</label>
                                                    <input 
                                                        type="text" 
                                                        required
                                                        value={profileData.name}
                                                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="Your public name"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">Public Bio</label>
                                                    <textarea 
                                                        value={profileData.bio}
                                                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all min-h-[100px] resize-none" 
                                                        placeholder="Tell the community about yourself..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <Button type="submit" disabled={updating} className="w-full font-bold py-6 rounded-xl shadow-lg shadow-primary/20">
                                                    {updating ? 'Updating Broadcast...' : 'Update Public Profile'}
                                                </Button>
                                            </div>
                                        </form>
                                    ) : settingsView === 'password' ? (
                                        <form className="space-y-5 flex-1 overflow-y-auto pr-1 scrollbar-hide pb-20 md:pb-10" onSubmit={handlePasswordUpdate}>
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">Current Password</label>
                                                    <input 
                                                        type="password" 
                                                        required
                                                        value={passwordData.current}
                                                        onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                
                                                <div className="h-px bg-white/5 my-2" />

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                                                    <input 
                                                        type="password" 
                                                        required
                                                        value={passwordData.new}
                                                        onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="Minimum 8 characters"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">Confirm New Password</label>
                                                    <input 
                                                        type="password" 
                                                        required
                                                        value={passwordData.confirm}
                                                        onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all" 
                                                        placeholder="Repeat new password"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <Button type="submit" className="w-full font-bold py-6 rounded-xl shadow-lg shadow-primary/20">
                                                    Update Security Credentials
                                                </Button>
                                                <p className="text-[9px] text-center text-gray-500 mt-4 leading-relaxed">
                                                    Changing your password will require you to log back in on all other devices.
                                                </p>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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