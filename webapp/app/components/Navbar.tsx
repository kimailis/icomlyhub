'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Radar, User as UserIcon, Map, Search, LogIn, Bell } from 'lucide-react';
import { Button } from '@/app/components/ui/Button'; // Assuming we migrate UI components
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { NotificationDropdown } from './ui/NotificationDropdown';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { openAuthModal, openProfileModal } = useUI();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
    }
  };

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
          isActive ? 'text-primary' : 'text-gray-400 hover:text-white'
        }`}
      >
        <Icon size={18} />
        <span className="text-[10px] font-medium leading-tight">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-t border-white/10 md:top-0 md:bottom-auto md:h-24 md:border-t-0 md:border-b shadow-2xl pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        
        {/* Logo (Desktop) */}
        <Link href="/" className="hidden md:flex items-center gap-2 text-2xl font-bold tracking-tight text-white cursor-pointer hover:opacity-80 transition-opacity">
          <Radar className="text-primary w-8 h-8" />
          <span><span className="text-primary">i</span>Comly</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[250px] mx-auto relative hidden md:flex items-center group">
           <Search className="absolute left-3 z-10 text-gray-500 h-4 w-4 group-focus-within:text-primary transition-colors" />
           <input 
              type="text" 
              placeholder="Search..." 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full bg-surface/50 border border-white/10 rounded-2xl py-1.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:bg-surface transition-all placeholder:text-gray-600"
           />
        </form>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1 mr-2">
             <Link href="/">
               <Button variant="ghost" className={`gap-2 ${pathname === '/' ? 'text-primary bg-primary/10' : 'text-gray-400'}`}>
                  <Radar size={18}/> Feed
               </Button>
             </Link>
             <Link href="/sightings">
               <Button variant="ghost" className={`gap-2 ${pathname === '/sightings' ? 'text-primary bg-primary/10' : 'text-gray-400'}`}>
                  <Map size={18}/> Map
               </Button>
             </Link>
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2" />

          {user ? (
              <div className="flex items-center gap-4">
                  <NotificationDropdown />
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 group"
                    onClick={() => openProfileModal()}
                  >
                      <div className="text-right hidden lg:block group-hover:text-primary transition-colors">
                          <div className="text-sm font-bold text-white">{user.name}</div>
                          <div className="text-xs text-green-400">Online</div>
                      </div>
                      <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=18181b&color=fff`} alt="User" className="w-10 h-10 rounded-full border border-white/20 group-hover:border-primary transition-colors" />
                  </div>
              </div>
          ) : (
              <Button onClick={() => openAuthModal()} size="sm" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                  <LogIn size={16} /> Login
              </Button>
          )}
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden w-full justify-around items-center py-2">
          <NavItem href="/" icon={Radar} label="Feed" />
          <NavItem href="/sightings" icon={Map} label="Map" />
          {user && <NotificationDropdown />}
          <div className="flex flex-col items-center gap-0.5 p-1.5 text-gray-400" onClick={() => user ? openProfileModal() : openAuthModal()}>
             {user ? <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=18181b&color=fff`} className="w-5 h-5 rounded-full" /> : <UserIcon size={18} />}
             <span className="text-[10px] font-medium leading-tight">{user ? 'Me' : 'Login'}</span>
          </div>
        </div>

      </div>
    </nav>
  );
};