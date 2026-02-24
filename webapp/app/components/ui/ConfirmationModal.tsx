'use client';

import React from 'react';
import { useUI } from '@/app/providers/UIProvider';
import { Button } from './Button';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmationModal: React.FC = () => {
  const { isConfirmModalOpen, closeConfirmModal, confirmConfig } = useUI();

  if (!isConfirmModalOpen) return null;

  const { title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' } = confirmConfig;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" 
        onClick={closeConfirmModal} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-6 animate-zoom-in">
        
        {/* Close Button */}
        <button 
            onClick={closeConfirmModal} 
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
            <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
            <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                <AlertTriangle size={24} />
            </div>
            
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                    {message}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full pt-4">
                <Button 
                    variant="outline" 
                    onClick={closeConfirmModal}
                    className="w-full"
                >
                    {cancelText}
                </Button>
                <Button 
                    variant={variant === 'danger' ? 'primary' : 'secondary'} 
                    onClick={() => {
                        onConfirm();
                        closeConfirmModal();
                    }}
                    className={`w-full ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white border-none' : ''}`}
                >
                    {confirmText}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
