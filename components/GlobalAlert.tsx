'use client';

import React, { useEffect } from 'react';
import { useERP } from '@/lib/context';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function GlobalAlert() {
  const { customAlert, setCustomAlert } = useERP();

  useEffect(() => {
    if (customAlert) {
      const timer = setTimeout(() => {
        setCustomAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [customAlert, setCustomAlert]);

  if (!customAlert) return null;

  const icons = {
    success: <CheckCircle className="text-green-500" size={24} />,
    error: <AlertCircle className="text-red-500" size={24} />,
    warning: <AlertTriangle className="text-yellow-500" size={24} />,
    info: <Info className="text-blue-500" size={24} />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`max-w-md w-full p-8 rounded-2xl shadow-2xl border ${bgColors[customAlert.type]} flex flex-col items-center text-center gap-6 z-[9999]`}
        >
          <div className="p-4 rounded-full bg-white shadow-md">
            {icons[customAlert.type]}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
              Aviso do Sistema
            </h3>
            <p className="text-lg font-medium text-slate-700 leading-relaxed">
              {customAlert.message}
            </p>
          </div>
          <button
            onClick={() => setCustomAlert(null)}
            className="w-full sm:w-auto px-10 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border-2 border-slate-200 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            ENTENDI
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
