'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-4 rounded-full z-[1000] glass-effect font-medium animate-slide-in">
      {message}
    </div>,
    document.body
  );
}