import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const VisualLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 flex flex-col font-sans selection:bg-primary/30 selection:text-white relative overflow-x-hidden">
      {/* Cool Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      {/* Padding top increased to md:pt-32 to account for taller navbar */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-10 md:pt-32">
        {children}
      </main>
    </div>
  );
};