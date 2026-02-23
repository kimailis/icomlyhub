'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUI } from '@/app/providers/UIProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { backend } from '@/lib/api';
import { X, Mail, Lock, Loader2, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '@/lib/legal';

type AuthView = 'login' | 'register' | 'forgot' | 'terms' | 'privacy' | 'contact';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authView } = useUI();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<AuthView>('login');
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Password Validation State (Register Only)
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasSpecial;

  // Sync view with provider when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setView(authView);
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isAuthModalOpen, authView]);

  // Reset error when view changes or modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
        setError(null);
    }
  }, [isAuthModalOpen, view]);

  if (!isAuthModalOpen) return null;

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
    } catch (err: any) {
        setError(err.message || "Authentication failed");
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    // Simulate google login
    setTimeout(() => {
        setError("Google authentication is currently in sandbox mode.");
        setLoading(false);
    }, 1000);
  };

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
                    <h3 className="text-xl font-bold text-white mt-2">
                        {view === 'privacy' ? 'Privacy Policy' : view === 'terms' ? 'Terms & Conditions' : 'Contact Us'}
                    </h3>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto bg-surface/30 rounded-xl p-4 border border-white/5 text-sm text-gray-300 space-y-4 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-white/10">
                     {view === 'privacy' ? PRIVACY_POLICY : view === 'terms' ? TERMS_AND_CONDITIONS : (
                         <div className="text-center py-8 space-y-4">
                             <p>Have a scoop or need support?</p>
                             <div className="text-xl font-bold text-primary select-all">
                                 contact@juicihyb.net
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
                    <p className="text-gray-400 text-xs">Enter your email to receive a reset link.</p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 animate-fade-in">
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); setError("Feature coming soon"); }} className="space-y-4">
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
                    <Button type="submit" className="w-full py-2.5">
                        Send Reset Link
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

                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full py-2.5 text-sm flex items-center justify-center gap-2 border-white/10 hover:bg-white/5"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                </Button>

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
