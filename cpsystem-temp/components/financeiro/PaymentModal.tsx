'use client';

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Expense } from '@/lib/types';
import { useERP } from '@/lib/context';
import { getLocalDateString, cn } from '@/lib/utils';

interface PaymentModalProps {
  onClose: () => void;
  expense: Expense;
}

export function PaymentModal({ onClose, expense }: PaymentModalProps) {
  const { updateExpense } = useERP();
  const [formData, setFormData] = useState({
    supplier: expense.supplier || '',
    description: expense.description || '',
    amount: expense.amount.toString(),
    interest: (expense.interest || 0).toString(),
    discount: (expense.discount || 0).toString(),
    dueDate: expense.dueDate || getLocalDateString(),
    paymentDate: getLocalDateString(),
    status: expense.status as 'Pago' | 'Pendente',
    paymentMethod: expense.paymentMethod || 'Dinheiro',
    financialAccount: expense.financialAccount || 'Caixa'
  });

  const amount = parseFloat(formData.amount) || 0;
  const interest = parseFloat(formData.interest) || 0;
  const discount = parseFloat(formData.discount) || 0;
  const finalValue = amount + interest - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const todayStr = getLocalDateString();
    const finalPaymentDate = formData.paymentDate === todayStr 
      ? new Date().toISOString() 
      : formData.paymentDate;

    await updateExpense({
      ...expense,
      supplier: formData.supplier,
      description: formData.description,
      amount: amount,
      interest: interest,
      discount: discount,
      status: formData.status,
      origin: expense.origin || 'Conta a Pagar',
      dueDate: formData.dueDate,
      paymentDate: formData.status === 'Pago' ? finalPaymentDate : undefined,
      paymentMethod: formData.paymentMethod,
      financialAccount: formData.financialAccount
    } as any);
    onClose();
  };

  const handleMarkAsPaid = async () => {
    const todayStr = getLocalDateString();
    const finalPaymentDate = new Date().toISOString();

    await updateExpense({
      ...expense,
      amount: amount,
      interest: interest,
      discount: discount,
      status: 'Pago',
      origin: expense.origin || 'Conta a Pagar',
      paymentDate: finalPaymentDate,
      paymentMethod: formData.paymentMethod,
      financialAccount: formData.financialAccount
    } as any);
    onClose();
  };

  const isPaid = formData.status === 'Pago';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Save className="text-brand-blue" size={24} />
            Conta a Pagar
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* SEÇÃO 1 — INFORMAÇÕES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 1 — Informações</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>

          {/* SEÇÃO 2 — VALORES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 2 — Valores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={isPaid}
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Multa/Juros</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interest}
                  onChange={e => setFormData(prev => ({ ...prev, interest: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desconto</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount}
                  onChange={e => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Final</label>
                <div className="w-full h-11 px-4 bg-brand-blue/5 border border-brand-blue/20 rounded-xl text-sm font-black text-brand-blue flex items-center">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalValue)}
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3 — DATAS */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 3 — Datas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Vencimento</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Pagamento</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={e => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4 — STATUS */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 4 — Status</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className={cn(
                  "w-full h-11 px-4 border rounded-xl text-sm font-bold outline-none transition-all",
                  formData.status === 'Pago' ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-amber-50 border-amber-200 text-amber-600"
                )}
              >
                <option value="Pendente">🟡 Pendente</option>
                <option value="Pago">🟢 Pago</option>
              </select>
            </div>
          </div>

          {/* SEÇÃO 5 — PAGAMENTO */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 5 — Pagamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Boleto">Boleto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conta Financeira</label>
                <select
                  value={formData.financialAccount}
                  onChange={e => setFormData(prev => ({ ...prev, financialAccount: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="Caixa">Caixa</option>
                  <option value="Conta Bancária">Conta Bancária</option>
                  <option value="Conta PIX">Conta PIX</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 h-12 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Salvar Alterações
              </button>
            </div>
            {!isPaid && (
              <button
                type="button"
                onClick={handleMarkAsPaid}
                className="w-full h-12 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                💰 Marcar como Pago
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
