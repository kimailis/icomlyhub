'use client';

import React, { createContext, useContext, useState } from 'react';

interface UIContextType {
  isAuthModalOpen: boolean;
  openAuthModal: (view?: 'login' | 'register' | 'forgot' | 'terms' | 'privacy' | 'contact') => void;
  closeAuthModal: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: (tab?: string) => void;
  closeProfileModal: () => void;
  isConfirmModalOpen: boolean;
  confirmConfig: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
  };
  openConfirmModal: (config: UIContextType['confirmConfig']) => void;
  closeConfirmModal: () => void;
  authView: 'login' | 'register' | 'forgot' | 'terms' | 'privacy' | 'contact';
  profileTab: string;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<UIContextType['confirmConfig']>({
    title: 'Are you sure?',
    message: 'This action cannot be undone.',
    onConfirm: () => {},
  });
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'terms' | 'privacy' | 'contact'>('login');
  const [profileTab, setProfileTab] = useState('overview');

  return (
    <UIContext.Provider value={{
      isAuthModalOpen,
      openAuthModal: (view = 'login') => {
        setAuthView(view);
        setIsAuthModalOpen(true);
      },
      closeAuthModal: () => setIsAuthModalOpen(false),
      isProfileModalOpen,
      openProfileModal: (tab = 'overview') => {
        setProfileTab(tab);
        setIsProfileModalOpen(true);
      },
      closeProfileModal: () => setIsProfileModalOpen(false),
      isConfirmModalOpen,
      confirmConfig,
      openConfirmModal: (config) => {
        setConfirmConfig(config);
        setIsConfirmModalOpen(true);
      },
      closeConfirmModal: () => setIsConfirmModalOpen(false),
      authView,
      profileTab
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}