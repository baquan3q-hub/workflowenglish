import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showIndicator, setShowIndicator] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setJustConnected(true);
      setShowIndicator(true);

      // Ẩn chỉ báo trực tuyến sau 3 giây
      const timer = setTimeout(() => {
        setShowIndicator(false);
        setJustConnected(false);
      }, 3000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustConnected(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Nếu lúc mount đang offline thì hiển thị luôn
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-500 animate-fade-in border
        ${
          isOnline
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
        }
      `}
      title={isOnline ? 'Kết nối Internet ổn định' : 'Mất kết nối Internet'}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">Đã kết nối</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 animate-bounce" />
          <span>Ngoại tuyến</span>
        </>
      )}
    </div>
  );
}
