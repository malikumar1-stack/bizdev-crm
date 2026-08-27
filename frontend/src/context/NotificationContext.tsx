import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { INotification } from '../types';

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  permission: NotificationPermission;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestBrowserPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const knownNotificationIds = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await api.getNotifications();
      const newNotifs: INotification[] = data.notifications || [];

      if (hasInitialized.current) {
        const freshItems = newNotifs.filter(n => !n.read && !knownNotificationIds.current.has(n.id));
        if (freshItems.length > 0) {
          playNotificationChime();

          if ('Notification' in window && Notification.permission === 'granted') {
            freshItems.slice(0, 2).forEach(item => {
              new Notification('🔔 ' + item.title, {
                body: item.message,
                icon: '/favicon.ico'
              });
            });
          }
        }
      }

      newNotifs.forEach(n => knownNotificationIds.current.add(n.id));
      hasInitialized.current = true;

      setNotifications(newNotifs);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        playNotificationChime();
        new Notification('🔔 Meeting Reminders Activated', {
          body: 'BizDev CRM will alert you on screen before every meeting!',
          icon: '/favicon.ico'
        });
      }
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      permission,
      refresh: fetchNotifications,
      markAsRead,
      markAllAsRead,
      requestBrowserPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};


export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
