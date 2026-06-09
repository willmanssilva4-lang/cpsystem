'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthorizationModalProps {
  onClose: () => void;
  onAuthorize: (password: string) => void;
  title?: string;
  message?: string;
}

export function AuthorizationModal({ onClose, onAuthorize, title = 'Ação Requer Autorização', message = 'Digite a senha do supervisor para continuar.' }: AuthorizationModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef('');

  // Keep ref in sync with state to avoid stale closure issues in the global listener
  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  // Force focus and select content on mount, and pull focus back if clicked inside
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 150);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleAuthorize = () => {
    const currentPassword = passwordRef.current;
    if (!currentPassword.trim()) {
      setError('Informe a senha do supervisor.');
      inputRef.current?.focus();
      return;
    }
    onAuthorize(currentPassword);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAuthorize();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Setup global event listener for Enter/Escape keys to guarantee input confirmation at any time
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // If user typing in this password input, standard onKeyDown takes pre-eminence, so avoid duplicate execution
      if (activeEl === inputRef.current) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleAuthorize();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-rose-600 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="text-lg font-black italic uppercase flex items-center gap-2">
            <ShieldCheck size={20} /> {title}
          </h3>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="size-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
              <ShieldCheck size={32} />
            </div>
            <p className="text-sm font-bold text-brand-text-main/60">{message}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-text-main uppercase tracking-widest">Senha do Supervisor</label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-3 text-xl font-black text-brand-text-main focus:border-rose-600 outline-none transition-all text-center tracking-widest"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 hover:text-brand-text-main transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white border-2 border-brand-border text-brand-text-main font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancelar (Esc)
            </button>
            <button
              onClick={handleAuthorize}
              className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-600/20"
            >
              Autorizar (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
