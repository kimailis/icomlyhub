'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUI } from '@/app/providers/UIProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { backend } from '@/lib/api';
import { X, Mail, Lock, Loader2, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '@/lib/legal';

type AuthView = 'login' | 'register' | 'forgot' | 'reset' | 'terms' | 'privacy' | 'contact';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authView } = useUI();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<AuthView>('login');
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Password Validation State (Register & Reset Only)
  const isResetOrRegister = view === 'register' || view === 'reset';
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasSpecial;

  const handleGoogleCredentialResponse = useCallback(async (response: { credential: string }) => {
    setLoading(true);
    setError(null);
    try {
        const { user, token } = await backend.googleLogin(response.credential);
        login(user, token);
        closeAuthModal();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Google authentication failed";
        setError(message);
    } finally {
        setLoading(false);
    }
  }, [login, closeAuthModal]);

  // Sync view with provider when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
      setView(authView);
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthModalOpen, authView]);

  useEffect(() => {
    const win = window as any;
    if (isAuthModalOpen && typeof window !== 'undefined' && win.google) {
        const google = win.google;
        google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            ux_mode: "popup",
            auto_select: false,
        });
        
        const renderGoogleButton = () => {
            const container = document.getElementById("google-signin-button");
            if (container) {
                const width = Math.floor(container.clientWidth);
                if (width > 0) {
                    google.accounts.id.renderButton(
                        container,
                        { 
                            theme: "filled_black", 
                            size: "large", 
                            width: width, 
                            text: "continue_with", 
                            shape: "rectangular" 
                        }
                    );
                }
            }
        };

        // Render after a short delay to ensure layout is stable
        const timer = setTimeout(renderGoogleButton, 150);
        
        // Also render on window resize
        window.addEventListener('resize', renderGoogleButton);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', renderGoogleButton);
        };
    }
  }, [isAuthModalOpen, view, handleGoogleCredentialResponse]);

  // Reset error when view changes or modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
        setError(null);
        setSuccessMessage(null);
    }
  }, [isAuthModalOpen, view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
        setError("Please enter a valid email address.");
        return;
    }

    if (!password) {
        setError("Password is required.");
        return;
    }
    
    if (view === 'register') {
        if (!agreed) {
            setError("Please agree to the Terms & Privacy Policy.");
            return;
        }
        if (!isPasswordValid) {
            setError("Password does not meet requirements.");
            return; 
        }
    }

    setLoading(true);
    
    try {
        if (view === 'login') {
            const { user, token } = await backend.login(email, password);
            login(user, token);
        } else {
            const { user, token } = await backend.register({ 
                email, 
                password, 
                name: email.split('@')[0] 
            });
            login(user, token);
        }
        closeAuthModal();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        setError(message);
    } finally {
        setLoading(false);
    }
  };

  if (!isAuthModalOpen) return null;

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
      <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${met ? 'text-green-400' : 'text-gray-500'}`}>
          <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${met ? 'border-green-400 bg-green-400/10' : 'border-gray-600'}`}>
              {met && <Check size={8} />}
          </div>
          <span>{text}</span>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={closeAuthModal} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-6 animate-zoom-in flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Close Button */}
        <button 
            onClick={closeAuthModal} 
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-50 rounded-full p-1"
        >
            <X size={18} />
        </button>

        {/* --- VIEW: LEGAL / CONTACT --- */}
        {(view === 'terms' || view === 'privacy' || view === 'contact') ? (
             <div className="flex flex-col flex-1 min-h-0 animate-fade-in">
                 <div className="mb-4 shrink-0">
                    <button onClick={() => setView('login')} className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary transition-colors">
                         <ArrowLeft size={14} /> Back
                    </button>
                    <h3 className="text-base font-bold text-white mt-2">
                        {view === 'privacy' ? 'Privacy Policy' : view === 'terms' ? 'Terms & Conditions' : 'Contact Us'}
                    </h3>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto bg-surface/30 rounded-xl p-4 border border-white/5 text-xs text-gray-300 space-y-4 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-white/10">
                     {view === 'privacy' ? PRIVACY_POLICY : view === 'terms' ? TERMS_AND_CONDITIONS : (
                         <div className="text-center py-8 space-y-4">
                             <p>Have a scoop or need support?</p>
                             <div className="text-xl font-bold text-primary select-all">
                                 contact@icomly.com
                             </div>
                             <p className="text-xs text-gray-500">Our team typically responds within 24 hours.</p>
                         </div>
                     )}
                 </div>
             </div>
        ) : view === 'forgot' ? (
            /* --- VIEW: FORGOT PASSWORD --- */
            <>
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Reset Password</h2>
                    <p className="text-gray-400 text-xs">Enter your email to receive a 6-digit reset code.</p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 animate-fade-in">
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={async (e) => { 
                    e.preventDefault(); 
                    setLoading(true);
                    setError(null);
                    try {
                        await backend.forgotPassword(email);
                        setView('reset');
                    } catch (err: any) {
                        setError(err.message || "Failed to send reset code");
                    } finally {
                        setLoading(false);
                    }
                }} className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input 
                                ref={firstInputRef}
                                type="email" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-600"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full py-2.5" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Send Reset Code"}
                    </Button>
                    <button 
                        type="button"
                        onClick={() => setView('login')}
                        className="w-full text-xs text-gray-500 hover:text-white flex items-center justify-center gap-1"
                    >
                        <ArrowLeft size={12} /> Back to Login
                    </button>
                </form>
            </>
        ) : view === 'reset' ? (
            /* --- VIEW: RESET PASSWORD (CODE + NEW PASSWORD) --- */
            <>
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Enter Reset Code</h2>
                    <p className="text-gray-400 text-xs">Check your email for the 6-digit code.</p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 animate-fade-in">
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={async (e) => { 
                    e.preventDefault(); 
                    if (!isPasswordValid) {
                        setError("Password does not meet requirements.");
                        return;
                    }
                    setLoading(true);
                    setError(null);
                    try {
                        await backend.resetPassword({ email, code: resetCode, password });
                        setSuccessMessage("Password reset successfully! Please log in.");
                        setView('login');
                        setPassword('');
                        setResetCode('');
                    } catch (err: any) {
                        setError(err.message || "Failed to reset password");
                    } finally {
                        setLoading(false);
                    }
                }} className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">6-Digit Code</label>
                        <input 
                            ref={firstInputRef}
                            type="text" 
                            required 
                            maxLength={6}
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-center text-xl font-bold tracking-[0.5em] text-white focus:outline-none focus:border-primary transition-all"
                            placeholder="000000"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-600"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="pt-2 px-3 pb-3 bg-white/5 rounded-lg border border-white/5 mt-2 animate-fade-in">
                            <div className="text-[10px] text-gray-400 uppercase font-mono mb-2">Requirements</div>
                            <div className="space-y-1.5">
                                <RequirementItem met={hasMinLength} text="8+ characters" />
                                <RequirementItem met={hasNumber} text="One number" />
                                <RequirementItem met={hasSpecial} text="One symbol (!@#$)" />
                            </div>
                        </div>
                    </div>

                    <Button type="submit" className="w-full py-2.5" disabled={loading || !isPasswordValid || resetCode.length !== 6}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Reset Password"}
                    </Button>
                    <button 
                        type="button"
                        onClick={() => setView('forgot')}
                        className="w-full text-xs text-gray-500 hover:text-white flex items-center justify-center gap-1"
                    >
                        <ArrowLeft size={12} /> Back
                    </button>
                </form>
            </>
        ) : (
            /* --- VIEW: LOGIN / REGISTER --- */
            <>
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">
                        {view === 'login' ? 'Welcome Back' : 'Join iComly'}
                    </h2>
                    <p className="text-gray-400 text-xs">
                        {view === 'login' ? 'Access your tracking feed.' : 'Start tracking celebrity news.'}
                    </p>
                </div>

                {successMessage && (
                    <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 p-3 rounded-lg border border-green-500/20 mb-4 animate-fade-in">
                        <Check size={14} className="shrink-0" />
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 animate-fade-in">
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-gray-500 uppercase">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input 
                                ref={firstInputRef}
                                type="email" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-600"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                             <label className="text-[10px] font-mono text-gray-500 uppercase">Password</label>
                             {view === 'login' && (
                                 <button type="button" onClick={() => setView('forgot')} className="text-[10px] text-primary hover:underline">Forgot?</button>
                             )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-600"
                                placeholder="••••••••"
                            />
                        </div>
                        
                        {view === 'register' && (
                            <div className="pt-2 px-3 pb-3 bg-white/5 rounded-lg border border-white/5 mt-2 animate-fade-in">
                                <div className="text-[10px] text-gray-400 uppercase font-mono mb-2">Requirements</div>
                                <div className="space-y-1.5">
                                    <RequirementItem met={hasMinLength} text="8+ characters" />
                                    <RequirementItem met={hasNumber} text="One number" />
                                    <RequirementItem met={hasSpecial} text="One symbol (!@#$)" />
                                </div>
                            </div>
                        )}
                    </div>

                    {view === 'register' && (
                        <div className="flex items-end gap-2 pt-1 animate-fade-in">
                            <input 
                                type="checkbox" 
                                id="terms"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mb-[1px] rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50 cursor-pointer shrink-0"
                            />
                            <div className="text-[10px] text-gray-400 leading-tight">
                                <label htmlFor="terms" className="cursor-pointer">I agree to the </label>
                                <button type="button" onClick={() => setView('terms')} className="text-primary hover:underline">Terms & Conditions</button> 
                                {" "}and{" "}
                                <button type="button" onClick={() => setView('privacy')} className="text-primary hover:underline">Privacy Policy</button>.
                            </div>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        className={`w-full py-2.5 mt-2 text-sm ${view === 'register' && (!isPasswordValid || !agreed) ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        disabled={loading || (view === 'register' && (!isPasswordValid || !agreed))}
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                            <span className="flex items-center justify-center gap-2">
                                {view === 'login' ? 'Log In' : 'Create Account'} <ArrowRight size={14} />
                            </span>
                        )}
                    </Button>
                </form>

                <div className="flex items-center gap-3 my-4">
                    <div className="h-px bg-white/10 flex-1" />
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Or continue with</span>
                    <div className="h-px bg-white/10 flex-1" />
                </div>

                <div className="flex justify-center">
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden transition-all h-[40px]">
                        <div id="google-signin-button" className="w-full" />
                    </div>
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                    {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={() => setView(view === 'login' ? 'register' : 'login')} 
                        className="ml-2 text-primary hover:text-primary/80 font-medium hover:underline"
                    >
                        {view === 'login' ? 'Register' : 'Login'}
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
