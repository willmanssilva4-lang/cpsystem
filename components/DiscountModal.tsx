'use client';

import React, { useState, useEffect } from 'react';
import { X, Percent, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscountModalProps {
  currentTotal: number;
  onClose: () => void;
  onConfirm: (data: {
    type: 'percentage' | 'value';
    amount: number;
    reason: string;
    discountValue: number;
  }) => void;
  title?: string;
  defaultType?: 'percentage' | 'value';
}

export function DiscountModal({ currentTotal, onClose, onConfirm, title = 'Aplicar Desconto', defaultType = 'percentage' }: DiscountModalProps) {
  const [type, setType] = useState<'percentage' | 'value'>(defaultType);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reasonInputRef = React.useRef<HTMLTextAreaElement>(null);

  const discountValue = type === 'percentage' 
    ? (currentTotal * amount) / 100 
    : amount;

  const newTotal = Math.max(0, currentTotal - discountValue);

  const handleConfirm = () => {
    if (amount <= 0) {
      setError('Informe um valor de desconto válido.');
      return;
    }
    if (discountValue > currentTotal) {
      setError('O desconto não pode ser maior que o valor total.');
      return;
    }
    if (!reason.trim()) {
      setError('Informe o motivo do desconto.');
      return;
    }

    onConfirm({
      type,
      amount,
      reason,
      discountValue
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      reasonInputRef.current?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setType(defaultType === 'value' ? 'value' : 'percentage');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setType(defaultType === 'value' ? 'percentage' : 'value');
    }
  };

  const handleReasonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-brand-text-main px-6 py-4 flex justify-between items-center text-white">
          <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
            <Percent size={24} /> {title}
          </h3>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Type Selector */}
          <div className="flex gap-2">
            {defaultType === 'value' ? (
              <>
                <button
                  onClick={() => setType('value')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all",
                    type === 'value' 
                      ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                      : "bg-white border-brand-border text-brand-text-main hover:bg-slate-50"
                  )}
                >
                  <DollarSign size={18} /> Valor (R$)
                </button>
                <button
                  onClick={() => setType('percentage')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all",
                    type === 'percentage' 
                      ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                      : "bg-white border-brand-border text-brand-text-main hover:bg-slate-50"
                  )}
                >
                  <Percent size={18} /> Percentual
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setType('percentage')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all",
                    type === 'percentage' 
                      ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                      : "bg-white border-brand-border text-brand-text-main hover:bg-slate-50"
                  )}
                >
                  <Percent size={18} /> Percentual
                </button>
                <button
                  onClick={() => setType('value')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all",
                    type === 'value' 
                      ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                      : "bg-white border-brand-border text-brand-text-main hover:bg-slate-50"
                  )}
                >
                  <DollarSign size={18} /> Valor (R$)
                </button>
              </>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-brand-text-main uppercase tracking-wider">
              {type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
            </label>
            <div className="relative">
              <input
                type="number"
                autoFocus
                value={amount || ''}
                onChange={(e) => {
                  setAmount(Number(e.target.value));
                  setError(null);
                }}
                onKeyDown={handleAmountKeyDown}
                className="w-full bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-3 text-2xl font-black text-brand-text-main focus:border-brand-blue outline-none transition-all"
                placeholder="0.00"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 font-black text-xl">
                {type === 'percentage' ? '%' : 'R$'}
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-brand-text-main uppercase tracking-wider">Motivo</label>
            <textarea
              ref={reasonInputRef}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              onKeyDown={handleReasonKeyDown}
              className="w-full bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-2 text-sm font-bold text-brand-text-main focus:border-brand-blue outline-none transition-all resize-none h-20"
              placeholder="Ex: Cliente antigo, promoção especial..."
            />
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-brand-border">
            <div className="flex justify-between text-sm font-bold text-brand-text-main/60">
              <span>Valor Atual:</span>
              <span>{formatCurrency(currentTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-rose-600">
              <span>Desconto:</span>
              <span>- {formatCurrency(discountValue)}</span>
            </div>
            <div className="pt-2 border-t border-brand-border flex justify-between items-center">
              <span className="text-sm font-black uppercase text-brand-text-main">Novo Total:</span>
              <span className="text-2xl font-black text-brand-blue">{formatCurrency(newTotal)}</span>
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
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-brand-text-main text-white font-bold rounded-xl hover:bg-brand-text-main/90 transition-all active:scale-95 shadow-lg shadow-brand-text-main/20"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
