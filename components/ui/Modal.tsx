"use client";

import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative z-10 bg-[#16213e] border border-[#0f3460] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-xl leading-none"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
