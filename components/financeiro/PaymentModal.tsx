'use client';

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Expense } from '@/lib/types';
import { useERP } from '@/lib/context';
import { getLocalDateString } from '@/lib/utils';

interface PaymentModalProps {
  onClose: () => void;
  expense: Expense;
}

export function PaymentModal({ onClose, expense }: PaymentModalProps) {
  const { updateExpense } = useERP();
  const [formData, setFormData] = useState({
    amountPaid: expense.amount.toString(),
    paymentMethod: expense.paymentMethod || '',
    financialAccount: expense.financialAccount || '',
    paymentDate: getLocalDateString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se a data selecionada for hoje, usamos o ISO completo para ter o horário
    const todayStr = getLocalDateString();
    const finalPaymentDate = formData.paymentDate === todayStr 
      ? new Date().toISOString() 
      : formData.paymentDate;

    const amount = parseFloat(formData.amountPaid);
    if (isNaN(amount) || amount <= 0) {
      alert('O valor do pagamento deve ser maior que zero.');
      return;
    }

    await updateExpense({
      ...expense,
      amount: amount,
      status: 'Pago',
      paymentDate: finalPaymentDate,
      paymentMethod: formData.paymentMethod,
      financialAccount: formData.financialAccount
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Pagar Conta</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Pago (R$)</label>
            <input type="number" required value={formData.amountPaid} onChange={e => setFormData(prev => ({ ...prev, amountPaid: e.target.value }))} className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
            <select value={formData.paymentMethod} onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))} className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-sm">
              <option value="">Selecione...</option>
              <option value="Boleto">Boleto</option>
              <option value="Pix">Pix</option>
              <option value="Cartão">Cartão</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conta Financeira</label>
            <select value={formData.financialAccount} onChange={e => setFormData(prev => ({ ...prev, financialAccount: e.target.value }))} className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-sm">
              <option value="">Selecione...</option>
              <option value="Caixa">Caixa</option>
              <option value="Conta Bancária">Conta Bancária</option>
              <option value="Conta PIX">Conta PIX</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Pagamento</label>
            <input type="date" required value={formData.paymentDate} onChange={e => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))} className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-sm" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest">Cancelar</button>
            <button type="submit" className="flex-1 h-11 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Save size={16} /> Pagar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
