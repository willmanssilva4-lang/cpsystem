'use client';

import React, { useState } from 'react';
import { X, Save, AlertCircle, Calendar, CreditCard, DollarSign, Tag, Info, CheckCircle2 } from 'lucide-react';
import { Expense } from '@/lib/types';
import { useERP } from '@/lib/context';
import { getLocalDateString, cn } from '@/lib/utils';

interface PaymentModalProps {
  onClose: () => void;
  expense: Expense;
}

export function PaymentModal({ onClose, expense }: PaymentModalProps) {
  const { updateExpense, setCustomAlert } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

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
  const finalValue = Math.max(0, amount + interest - discount);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (amount <= 0) {
        throw new Error('O valor nominal deve ser maior que zero.');
      }

      const todayStr = getLocalDateString();
      const finalPaymentDate = formData.paymentDate === todayStr 
        ? new Date().toISOString() 
        : formData.paymentDate;

      await updateExpense({
        ...expense,
        supplier: formData.supplier.toUpperCase(),
        description: formData.description.toUpperCase(),
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

      if (setCustomAlert) {
        setCustomAlert({ message: 'Conta atualizada com sucesso!', type: 'success' });
      }
      onClose();
    } catch (err: any) {
      if (setCustomAlert) {
        setCustomAlert({ message: err.message || 'Erro ao salvar alterações.', type: 'danger' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsMarkingPaid(true);
    try {
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

      if (setCustomAlert) {
        setCustomAlert({ message: 'Fatura quitada e arquivada!', type: 'success' });
      }
      onClose();
    } catch (err: any) {
      if (setCustomAlert) {
        setCustomAlert({ message: err.message || 'Erro ao registrar pagamento.', type: 'danger' });
      }
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const isPaid = formData.status === 'Pago';

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="text-brand-blue shrink-0 animate-pulse" size={20} />
              Quitação de Conta a Pagar
            </h2>
            <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Gestão de passivos e contas contratadas</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* SEÇÃO 1 — INFORMAÇÕES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 leading-none">
              <Tag size={12} className="text-slate-400" />
              <span>Seção 1 — Identificação do Débito</span>
            </h3>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Fornecedor / Credor</label>
              <input
                type="text"
                required
                value={formData.supplier}
                onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value.toUpperCase() }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all shadow-inner"
                placeholder="EX: CELESC DISTRIBUIÇÃO S.A."
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Descrição da Conta</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value.toUpperCase() }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all shadow-inner"
                placeholder="EX: FATURA DE ENERGIA ELÉTRICA REF. MAIO"
              />
            </div>
          </div>

          {/* SEÇÃO 2 — VALORES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 leading-none">
              <DollarSign size={12} className="text-slate-400" />
              <span>Seção 2 — Valores & Ajustes Financeiros</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Valor Nominal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isPaid}
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-blue/20 hover:border-slate-200 transition-all disabled:opacity-55 shadow-inner"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Multa / Juros</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest}
                    onChange={e => setFormData(prev => ({ ...prev, interest: e.target.value }))}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black text-rose-500 outline-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/40 transition-all shadow-inner"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Desconto Obtido</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={e => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black text-emerald-550 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-950/40 transition-all shadow-inner"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Total display with custom layout */}
              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Total Líquido</label>
                <div className="w-full h-11 px-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center shadow-inner tracking-tight">
                  {formatCurrency(finalValue)}
                </div>
              </div>

            </div>
          </div>

          {/* SEÇÃO 3 — DATAS */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 leading-none">
              <Calendar size={12} className="text-slate-400" />
              <span>Seção 3 — Calendário & Prazos</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Vencimento Original</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                />
              </div>

              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Competência Pagamento</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={e => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                />
              </div>

            </div>
          </div>

          {/* SEÇÃO 4 — STATUS */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 leading-none">
              <Info size={12} className="text-slate-400" />
              <span>Seção 4 — Situação</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Status da Fatura</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className={cn(
                  "w-full h-11 px-4 border rounded-xl text-xs font-black transition-all outline-none cursor-pointer",
                  formData.status === 'Pago' 
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-250 text-emerald-600 dark:text-emerald-400" 
                    : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-250 text-amber-600 dark:text-amber-400"
                )}
              >
                <option value="Pendente">🟡 EM ABERTO (PENDENTE)</option>
                <option value="Pago">🟢 QUITADA E PAGA</option>
              </select>
            </div>
          </div>

          {/* SEÇÃO 5 — FINANCEIRO */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 leading-none">
              <CreditCard size={12} className="text-slate-400" />
              <span>Seção 5 — Parâmetros de Liquidação</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Meio de Liquidação</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-750 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
                >
                  <option value="Dinheiro">DINHEIRO</option>
                  <option value="Pix">PIX</option>
                  <option value="Cartão">CARTÃO</option>
                  <option value="Boleto">BOLETO</option>
                  <option value="Outro">OUTRO (TRANSFERÊNCIA)</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col col-span-2 sm:col-span-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Origem de Caixa</label>
                <select
                  value={formData.financialAccount}
                  onChange={e => setFormData(prev => ({ ...prev, financialAccount: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-755 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
                >
                  <option value="Caixa">CAIXA OPERACIONAL</option>
                  <option value="Conta Bancária">CONTA BANCÁRIA PRINCIPAL</option>
                  <option value="Conta PIX">CONTA COBRANÇA PIX</option>
                </select>
              </div>

            </div>
          </div>

          {/* Actions Footer Container */}
          <div className="pt-6 flex flex-col gap-3 border-t border-slate-50 dark:border-slate-850">
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 bg-slate-105 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || isMarkingPaid}
                className="flex-1.5 h-12 bg-brand-blue text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-2 disabled:opacity-55 shadow-lg shadow-brand-blue/20 active:scale-95 cursor-pointer"
              >
                <Save size={16} />
                <span>{isSubmitting ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</span>
              </button>
            </div>

            {/* Direct Instant payment confirmation */}
            {!isPaid && (
              <button
                type="button"
                disabled={isSubmitting || isMarkingPaid}
                onClick={handleMarkAsPaid}
                className="w-full h-12 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer disabled:opacity-55"
              >
                💰 {isMarkingPaid ? 'PROCESSANDO QUITAÇÃO...' : 'QUITAR TOTAL DA CONTA AGORA'}
              </button>
            )}

          </div>
        </form>
      </div>
    </div>
  );
}
