'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '@/lib/context';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Lock,
  History,
  Calculator,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CashRegisterManager({ 
  initialMode,
  onClose,
  onSuccess
}: { 
  initialMode?: 'sangria' | 'suprimento' | 'fechamento',
  onClose?: () => void,
  onSuccess?: () => void
}) {
  const { 
    activeRegister, 
    openCashRegister, 
    closeCashRegister, 
    addCashMovement,
    sales,
    cashMovements,
    user
  } = useERP();

  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(initialMode === 'fechamento');
  const [isTransaction, setIsTransaction] = useState(initialMode === 'sangria' || initialMode === 'suprimento');
  const [openingBalance, setOpeningBalance] = useState(0);
  
  // Closing state
  const [informedValues, setInformedValues] = useState<Record<string, number>>({
    'Dinheiro': 0,
    'Pix': 0,
    'Crédito': 0,
    'Débito': 0,
    'Voucher': 0,
    'Fiado': 0
  });
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [supervisorCode, setSupervisorCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Transaction state (Sangria/Suprimento)
  const [transType, setTransType] = useState<'Sangria' | 'Suprimento'>(
    initialMode === 'suprimento' ? 'Suprimento' : 'Sangria'
  );
  const [transAmount, setTransAmount] = useState(0);
  const [transReason, setTransReason] = useState('');
  const openingInputRef = React.useRef<HTMLInputElement>(null);
  const transAmountRef = React.useRef<HTMLInputElement>(null);
  const supervisorRef = React.useRef<HTMLInputElement>(null);
  const confirmCloseButtonRef = React.useRef<HTMLButtonElement>(null);
  const informedInputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
  const justificationRefs = React.useRef<(HTMLTextAreaElement | null)[]>([]);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Focus opening balance when no active register
  React.useEffect(() => {
    if (!activeRegister && !showSuccessMessage) {
      setTimeout(() => openingInputRef.current?.focus(), 100);
    }
  }, [activeRegister, showSuccessMessage]);

  // Focus transaction amount when modal opens
  React.useEffect(() => {
    if (isTransaction) {
      setTimeout(() => transAmountRef.current?.focus(), 100);
    }
  }, [isTransaction]);

  // Calculate system totals for the active register
  const systemTotals = useMemo(() => {
    if (!activeRegister) return {};
    
    const registerSales = sales.filter(s => s.cashRegisterId === activeRegister.id);
    const totals: Record<string, number> = {
      'Dinheiro': 0,
      'Pix': 0,
      'Crédito': 0,
      'Débito': 0,
      'Voucher': 0,
      'Fiado': 0
    };

    registerSales.forEach(sale => {
      if (totals[sale.paymentMethod] !== undefined) {
        totals[sale.paymentMethod] += sale.total;
      }
    });

    // Add opening balance to Cash (Dinheiro)
    totals['Dinheiro'] += activeRegister.openingBalance;

    // Add movements (Sangria/Suprimento)
    const registerMovements = cashMovements.filter(m => m.cashRegisterId === activeRegister.id);
    registerMovements.forEach(m => {
      if (m.type === 'suprimento') {
        totals['Dinheiro'] += m.amount;
      } else if (m.type === 'sangria') {
        totals['Dinheiro'] -= m.amount;
      }
    });

    return totals;
  }, [activeRegister, sales, cashMovements]);

  const handleOpen = async () => {
    await openCashRegister(openingBalance);
    setIsOpening(false);
    setOpeningBalance(0);
  };

  const handleTransaction = async () => {
    if (!activeRegister) return;
    await addCashMovement({
      cashRegisterId: activeRegister.id,
      type: transType.toLowerCase() as 'sangria' | 'suprimento',
      amount: transAmount,
      reason: transReason
    });
    setIsTransaction(false);
    setTransAmount(0);
    setTransReason('');
    onClose?.();
  };

  const handleClose = async () => {
    if (!activeRegister) return;

    const informedTotals = Object.entries(informedValues).map(([method, informed]) => ({
      method,
      informed,
      system: systemTotals[method] || 0
    }));

    await closeCashRegister(informedTotals, Object.values(justifications).join(' | '));
    setIsClosing(false);
    setIsAuthorized(false);
    setSupervisorCode('');
    setShowSuccessMessage(true);
    
    // Wait for 3 seconds before closing and redirecting
    setTimeout(() => {
      onSuccess?.();
      onClose?.();
    }, 3000);
  };

  const checkAuthorization = () => {
    // Simple mock authorization
    if (supervisorCode === '1234') {
      setIsAuthorized(true);
      setTimeout(() => confirmCloseButtonRef.current?.focus(), 100);
    } else {
      alert('Código de supervisor inválido');
    }
  };

  const hasLargeDifference = useMemo(() => {
    return Object.entries(informedValues).some(([method, informed]) => {
      const system = systemTotals[method] || 0;
      const diff = Math.abs(informed - system);
      return diff > 50; // Threshold for supervisor approval
    });
  }, [informedValues, systemTotals]);

  const hasSmallDifference = useMemo(() => {
    return Object.entries(informedValues).some(([method, informed]) => {
      const system = systemTotals[method] || 0;
      const diff = Math.abs(informed - system);
      return diff > 0 && diff <= 50;
    });
  }, [informedValues, systemTotals]);

  // Focus supervisor code when needed
  React.useEffect(() => {
    if (hasLargeDifference && !isAuthorized && isClosing) {
      setTimeout(() => supervisorRef.current?.focus(), 100);
    }
  }, [hasLargeDifference, isAuthorized, isClosing]);

  // Focus first input in closing modal
  React.useEffect(() => {
    if (isClosing) {
      setTimeout(() => informedInputsRef.current[0]?.focus(), 100);
    }
  }, [isClosing]);

  if (!activeRegister) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-brand-blue" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Abertura de Caixa</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Informe o saldo inicial para começar</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
              Fundo de Troco (R$)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
              <input 
                ref={openingInputRef}
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOpen();
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none text-2xl font-black transition-all"
                placeholder="0,00"
                autoFocus
              />
            </div>
          </div>

          <button 
            onClick={handleOpen}
            className="w-full py-5 bg-brand-blue text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-brand-blue-hover transition-all active:scale-[0.98] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3"
          >
            <CheckCircle2 className="w-6 h-6" />
            Confirmar Abertura
          </button>
          
          <p className="text-[10px] text-center text-slate-400 uppercase font-bold tracking-tighter">
            O sistema registrará o horário e o usuário responsável pela abertura.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Caixa Aberto</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Iniciado em {new Date(activeRegister.openedAt).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Saldo Atual</p>
            <p className="text-2xl font-bold text-brand-blue">
              R$ {Object.values(systemTotals).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => { setTransType('Suprimento'); setIsTransaction(true); }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-100 transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Suprimento
          </button>
          <button 
            onClick={() => { setTransType('Sangria'); setIsTransaction(true); }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-100 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            Sangria
          </button>
        </div>

        <button 
          onClick={() => setIsClosing(true)}
          className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          Fechar Caixa
        </button>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isTransaction && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{transType} de Caixa</h3>
                <button onClick={() => { setIsTransaction(false); onClose?.(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                  <input 
                    ref={transAmountRef}
                    type="number"
                    value={transAmount}
                    onChange={(e) => setTransAmount(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTransaction();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    autoFocus
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Motivo / Justificativa</label>
                  <textarea 
                    value={transReason}
                    onChange={(e) => setTransReason(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-blue outline-none h-24 resize-none"
                    placeholder="Ex: Troco inicial extra, Retirada para depósito..."
                  />
                </div>
                <button 
                  onClick={handleTransaction}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${transType === 'Sangria' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  Confirmar {transType}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Closing Modal (The "Black Box") */}
      <AnimatePresence>
        {isClosing && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-4xl border border-slate-200 dark:border-slate-800 shadow-2xl my-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fechamento de Caixa</h2>
                  <p className="text-slate-500 dark:text-slate-400">Conferência física obrigatória (Sem TEF)</p>
                </div>
                <button onClick={() => { setIsClosing(false); onClose?.(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Forma</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Sistema</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Informado</th>
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Diferença</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                         {Object.keys(informedValues).map((method, idx) => {
                          const system = systemTotals[method] || 0;
                          const informed = informedValues[method] || 0;
                          const diff = informed - system;
                          
                          return (
                            <tr key={method} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="p-4 font-medium text-slate-900 dark:text-white">{method}</td>
                              <td className="p-4 text-slate-600 dark:text-slate-400">R$ {system.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                               <td className="p-4">
                                <input 
                                  ref={(el) => { informedInputsRef.current[idx] = el; }}
                                  type="number"
                                  value={informed}
                                  onChange={(e) => setInformedValues(prev => ({ ...prev, [method]: Number(e.target.value) }))}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextInput = informedInputsRef.current[idx + 1];
                                      if (nextInput) {
                                        nextInput.focus();
                                      } else {
                                        // Last informed value, decide where to go next
                                        // We use a small delay to ensure any conditional sections (justifications/supervisor) have rendered
                                        setTimeout(() => {
                                          const firstJustification = justificationRefs.current.find(ref => ref && document.body.contains(ref));
                                          if (firstJustification) {
                                            firstJustification.focus();
                                          } else if (supervisorRef.current && document.body.contains(supervisorRef.current)) {
                                            supervisorRef.current.focus();
                                          } else {
                                            confirmCloseButtonRef.current?.focus();
                                          }
                                        }, 100);
                                      }
                                    }
                                  }}
                                  className="w-32 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-blue outline-none text-right"
                                />
                              </td>
                              <td className={`p-4 font-bold text-right ${diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                {diff > 0 ? '+' : ''}{diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Justifications Section */}
                  {(hasSmallDifference || hasLargeDifference) && (
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30">
                      <div className="flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-5 h-5" />
                        <h4 className="font-bold">Divergências Detectadas</h4>
                      </div>
                      <div className="space-y-4">
                        {Object.entries(informedValues).filter(([m, v]) => v !== (systemTotals[m] || 0)).map(([method, informed], jIdx) => {
                          const system = systemTotals[method] || 0;
                          return (
                            <div key={method}>
                              <label className="block text-xs font-bold uppercase text-amber-700 dark:text-amber-500 mb-1">
                                Justificativa para {method}
                              </label>
                              <textarea 
                                ref={(el) => { justificationRefs.current[jIdx] = el; }}
                                value={justifications[method] || ''}
                                onChange={(e) => setJustifications(prev => ({ ...prev, [method]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    const nextJustification = justificationRefs.current[jIdx + 1];
                                    if (nextJustification && document.body.contains(nextJustification)) {
                                      nextJustification.focus();
                                    } else if (supervisorRef.current && document.body.contains(supervisorRef.current)) {
                                      supervisorRef.current.focus();
                                    } else {
                                      confirmCloseButtonRef.current?.focus();
                                    }
                                  }
                                }}
                                className="w-full p-3 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none h-20 resize-none text-sm"
                                placeholder="Explique o motivo da diferença..."
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Resumo do Fechamento</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Total Sistema:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          R$ {Object.values(systemTotals).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Total Informado:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          R$ {Object.values(informedValues).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="pt-3 border-top border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white">Diferença Total:</span>
                        <span className={`text-lg font-black ${
                          Object.values(informedValues).reduce((acc, val) => acc + val, 0) - Object.values(systemTotals).reduce((acc, val) => acc + val, 0) === 0 
                          ? 'text-emerald-500' 
                          : 'text-rose-500'
                        }`}>
                          R$ {(Object.values(informedValues).reduce((acc, val) => acc + val, 0) - Object.values(systemTotals).reduce((acc, val) => acc + val, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Supervisor Approval */}
                  {hasLargeDifference && !isAuthorized && (
                    <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-900/30">
                      <div className="flex items-center gap-2 mb-4 text-rose-700 dark:text-rose-400">
                        <ShieldCheck className="w-5 h-5" />
                        <h4 className="font-bold">Autorização Necessária</h4>
                      </div>
                      <p className="text-xs text-rose-600 dark:text-rose-500 mb-4">Diferença acima do limite permitido. Solicite a senha do supervisor.</p>
                      <div className="space-y-3">
                        <input 
                          ref={supervisorRef}
                          type="password"
                          value={supervisorCode}
                          onChange={(e) => setSupervisorCode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              checkAuthorization();
                            }
                          }}
                          className="w-full p-3 rounded-xl border border-rose-200 dark:border-rose-900/30 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-rose-500 outline-none text-center tracking-widest"
                          placeholder="CÓDIGO"
                        />
                        <button 
                          onClick={checkAuthorization}
                          className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
                        >
                          Autorizar
                        </button>
                      </div>
                    </div>
                  )}

                  {hasLargeDifference && isAuthorized && (
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="text-sm font-bold">Autorizado por Supervisor</span>
                    </div>
                  )}

                  <button 
                    ref={confirmCloseButtonRef}
                    onClick={handleClose}
                    disabled={hasLargeDifference && !isAuthorized}
                    className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-lg shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Confirmar Fechamento
                  </button>
                  <p className="text-[10px] text-center text-slate-400 uppercase tracking-tighter">
                    Ao confirmar, o caixa será bloqueado e os dados enviados para auditoria.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Success Message Overlay */}
      <AnimatePresence>
        {showSuccessMessage && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-brand-blue/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="text-center space-y-6"
            >
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <CheckCircle2 className="w-14 h-14 text-brand-blue" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                  Caixa Fechado com Sucesso!
                </h2>
                <p className="text-white/80 text-xl font-bold uppercase tracking-widest">
                  O PDV será encerrado.
                </p>
              </div>
              <div className="pt-8">
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 3, ease: "linear" }}
                    className="w-full h-full bg-white"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
