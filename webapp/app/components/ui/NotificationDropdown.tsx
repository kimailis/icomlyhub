'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Bell, Check, Trash2, ExternalLink, Heart, MessageSquare, UserPlus, ShieldCheck, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'VERIFICATION';
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      
      // Real-time SSE Stream
      const streamUrl = `/api/notifications/stream?token=${token}`; // Token in query for SSE
      const eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const newNotification = JSON.parse(event.data);
          setNotifications(prev => [newNotification, ...prev]);
          
          // Only show browser notification if user has push enabled in settings
          if (user?.notificationSettings?.push && Notification.permission === 'granted') {
             new Notification('Icomly Alert', { body: newNotification.message });
          }
        } catch (err) {
          console.error('Failed to parse stream message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        eventSource.close();
        // Fallback to polling on error
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
      };

      return () => eventSource.close();
    }
  }, [user, token]);

  // Request notification permission on mount if enabled in settings
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && user?.notificationSettings?.push) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [user?.notificationSettings?.push]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close via click outside on desktop
        if (window.innerWidth >= 768) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const markAsRead = async (id?: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ ids: id ? [id] : undefined })
      });
      if (res.ok) {
        if (id) {
          setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        } else {
          setNotifications(notifications.map(n => ({ ...n, read: true })));
        }
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!token) return;
    try {
      // First mark as read locally to update unread count immediately
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const deleteAll = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return <Heart className="text-red-500" size={12} />;
      case 'COMMENT': return <MessageSquare className="text-primary" size={12} />;
      case 'FOLLOW': return <UserPlus className="text-blue-500" size={12} />;
      case 'VERIFICATION': return <ShieldCheck className="text-green-500" size={12} />;
      default: return <Bell size={12} />;
    }
  };

  if (!user) return null;

  const NotificationContent = (isMobile: boolean) => (
    <div 
      className={`${isMobile ? 'fixed inset-x-[5%] top-[20%] bottom-[20%] z-[9999]' : 'absolute top-14 right-0 w-[300px] max-h-[480px]'} bg-surface border border-white/10 rounded-3xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 md:slide-in-from-top-2 duration-300`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 md:p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
        <h3 className="text-xs md:text-[10px] font-bold text-white uppercase tracking-widest">Notifications</h3>
        <div className="flex items-center gap-4">
          {notifications.length > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                deleteAll();
              }}
              className="text-[10px] md:text-[9px] font-bold text-red-500 hover:underline uppercase tracking-tighter"
            >
              Delete all
            </button>
          )}
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 -mr-1 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar px-1">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center text-[10px] font-mono text-gray-500 animate-pulse uppercase tracking-widest">
            Fetching...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/5">
              <Bell className="text-gray-800" size={24} />
            </div>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">No activity.</p>
          </div>
        ) : (
          <>
            {notifications.slice(0, displayCount).map((notification) => (
              <div 
                key={notification.id}
                className={`m-1 p-2.5 rounded-2xl border border-white/5 flex gap-3 group hover:bg-white/[0.04] transition-all relative ${!notification.read ? 'bg-primary/5 border-primary/10' : 'bg-white/[0.02]'}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${!notification.read ? 'bg-primary/20 border-primary/20' : 'bg-white/5 border-white/5'}`}>
                    {getIcon(notification.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${notification.read ? 'text-gray-400' : 'text-white font-medium'}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">
                      {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {notification.link && (
                      <a 
                        href={notification.link}
                        className="inline-flex items-center gap-1 text-[9px] font-black text-primary hover:underline uppercase tracking-widest"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                      >
                        View <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all bg-white/5"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {displayCount < notifications.length && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDisplayCount(prev => prev + 10);
                }}
                className="w-full py-3 text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest border-t border-white/5 transition-colors"
              >
                Load More
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex flex-col md:block items-center gap-0.5 p-1.5 md:p-2.5 rounded-lg md:rounded-xl bg-transparent md:bg-white/5 border border-transparent md:border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all relative"
      >
        <Bell size={20} className="md:size-[20px] size-[18px]" />
        <span className="text-[10px] font-medium leading-tight md:hidden">Alerts</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-1 md:top-2 md:right-2 w-4 h-4 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && mounted && (
        <>
          {/* Mobile Portal View */}
          <div className="md:hidden">
            {createPortal(
              <>
                <div 
                  className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9998]" 
                  onClick={() => setIsOpen(false)}
                />
                {NotificationContent(true)}
              </>,
              document.body
            )}
          </div>
          
          {/* Desktop Dropdown View */}
          <div className="hidden md:block">
            {NotificationContent(false)}
          </div>
        </>
      )}
    </div>
  );
}
