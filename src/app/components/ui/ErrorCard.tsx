'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorCardProps {
  message: string;
}

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-5 rounded-2xl my-5 text-center font-medium backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <AlertCircle className="w-5 h-5" strokeWidth={1} />
        <span className="font-semibold">Error</span>
      </div>
      <div className="text-sm opacity-90">{message}</div>
    </div>
  );
}