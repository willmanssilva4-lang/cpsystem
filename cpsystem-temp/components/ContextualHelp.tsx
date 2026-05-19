'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Lightbulb } from 'lucide-react';
import { CONTEXTUAL_TIPS } from '@/lib/helpData';

export function ContextualHelp() {
  const pathname = usePathname();
  const tip = CONTEXTUAL_TIPS[pathname];
  const [isVisible, setIsVisible] = useState(!!tip);

  useEffect(() => {
    if (!tip) return;

    // Auto-hide after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [tip]);

  return (
    <AnimatePresence>
      {isVisible && tip && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
        >
          <div className="bg-white border-2 border-brand-blue rounded-2xl p-4 shadow-xl flex items-start gap-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-10 h-10 bg-brand-blue/10 text-brand-blue rounded-xl flex items-center justify-center shrink-0">
              <Lightbulb size={20} />
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-text-main leading-relaxed">
                {tip}
              </p>
            </div>

            <button 
              onClick={() => setIsVisible(false)}
              className="text-brand-text-sec hover:text-brand-blue transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
