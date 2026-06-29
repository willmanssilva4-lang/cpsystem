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
  ShieldCheck,
  Printer,
  Zap
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
    user,
    paymentMethods
  } = useERP();

  const isCancelledSale = (sale: any): boolean => {
    if (!sale) return false;
    const rawStatus = (sale.status || '').toLowerCase();
    const sType = (sale.type || '').toLowerCase();
    const cancelledStatuses = [
      'cancelada', 'estornada', 'cancelado', 'reversão', 'reversao', 
      'estorno', 'cancelar', 'reverter', 'devolução', 'devolucao', 
      'devolvida', 'excluída', 'excluida', 'excluido', 'excluído'
    ];
    return (
      cancelledStatuses.some(status => rawStatus.includes(status)) ||
      cancelledStatuses.some(type => sType.includes(type))
    );
  };

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDivergences, setShowDivergences] = useState(true);
  const [showAutoConfirmModal, setShowAutoConfirmModal] = useState(false);

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
  const [finalReportData, setFinalReportData] = useState<{
    registerId: string;
    openedAt: string;
    closedAt: string;
    operatorName: string;
    openingBalance: number;
    systemTotals: Record<string, number>;
    informedValues: Record<string, number>;
    justifications: Record<string, string>;
    movements: any[];
    salesCount: number;
    salesTotal: number;
  } | null>(null);

  // Focus opening balance when no active register
  React.useEffect(() => {
    if (!activeRegister && !showSuccessMessage) {
      setTimeout(() => openingInputRef.current?.focus(), 100);
    }
  }, [activeRegister, showSuccessMessage]);

  // Keyboard shortcut to quickly open the register / start selling
  React.useEffect(() => {
    if (!activeRegister && !showSuccessMessage) {
      const handleShortcut = (e: KeyboardEvent) => {
        if (e.key === 'F10') {
          e.preventDefault();
          handleOpen();
        } else if (e.key === 'Enter') {
          const isOtherInputFocused = document.activeElement instanceof HTMLInputElement && document.activeElement !== openingInputRef.current;
          if (!isOtherInputFocused) {
            e.preventDefault();
            handleOpen();
          }
        }
      };
      window.addEventListener('keydown', handleShortcut);
      return () => window.removeEventListener('keydown', handleShortcut);
    }
  }, [activeRegister, showSuccessMessage, openingBalance]);

  // Focus transaction amount when modal opens
  React.useEffect(() => {
    if (isTransaction) {
      setTimeout(() => transAmountRef.current?.focus(), 100);
    }
  }, [isTransaction]);

  // Calculate system totals for the active register
  const systemTotals = useMemo(() => {
    if (!activeRegister) return {};
    
    // Normalization helper for accurate string matching
    const normalizeStr = (str?: string) => {
      return (str || '')
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    };

    const getClosureCategory = (methodName?: string, methodType?: string): string => {
      const normName = normalizeStr(methodName);
      const normType = normalizeStr(methodType);

      // Direct match on normalized name first
      if (normName === 'dinheiro' || normName === 'especie' || normName === 'dinheiro em especie' || normName === 'cash' || normName === 'money') return 'Dinheiro';
      if (normName === 'pix') return 'Pix';
      if (normName === 'credito' || normName === 'cartao de credito' || normName === 'credit' || normName === 'card' || normName === 'cartao') return 'Crédito';
      if (normName === 'debito' || normName === 'cartao de debito' || normName === 'debit') return 'Débito';
      if (normName === 'voucher' || normName === 'vale' || normName === 'vale credito' || normName === 'vale-credito' || normName === 'cupom') return 'Voucher';
      if (normName === 'fiado' || normName === 'prazo' || normName === 'conta assinada' || normName === 'caderneta' || normName === 'crediario' || normName === 'crediário') return 'Fiado';

      // Fallback check on normalized type
      if (normType === 'dinheiro') return 'Dinheiro';
      if (normType === 'pix') return 'Pix';
      if (normType === 'credito') return 'Crédito';
      if (normType === 'debito') return 'Débito';
      if (normType === 'voucher' || normType === 'vale_credito' || normType === 'vale-credito') return 'Voucher';
      if (normType === 'fiado' || normType === 'prazo') return 'Fiado';

      // Substring searches
      if (normName.includes('dinheiro') || normName.includes('especie') || normName.includes('money') || normName.includes('cash')) return 'Dinheiro';
      if (normName.includes('pix')) return 'Pix';
      if (normName.includes('credito') || normName.includes('credit')) return 'Crédito';
      if (normName.includes('debito') || normName.includes('debit')) return 'Débito';
      if (normName.includes('voucher') || normName.includes('vale') || normName.includes('cupom')) return 'Voucher';
      if (normName.includes('fiado') || normName.includes('prazo') || normName.includes('conta ass') || normName.includes('caderneta') || normName.includes('assina') || normName.includes('crediar')) return 'Fiado';

      return 'Dinheiro'; // Standard fallback
    };

    // Filter active (non-cancelled/non-returned) sales linked to the current cash session
    const registerSales = sales.filter(s => s.cashRegisterId === activeRegister.id && !isCancelledSale(s));
    
    const totals: Record<string, number> = {
      'Dinheiro': 0,
      'Pix': 0,
      'Crédito': 0,
      'Débito': 0,
      'Voucher': 0,
      'Fiado': 0
    };

    const safePaymentMethods = paymentMethods || [];

    registerSales.forEach(sale => {
      // Check if the sale has a detailed payments array split
      if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
        sale.payments.forEach((payment: any) => {
          const pmObj = safePaymentMethods.find(m => m.id === payment.method || normalizeStr(m.name) === normalizeStr(payment.method));
          const category = getClosureCategory(payment.method, pmObj?.type);
          if (totals[category] !== undefined) {
            totals[category] += Number(payment.amount) || 0;
          }
        });
      } else {
        // Single payment or simple/legacy sale fallback
        const pmObj = safePaymentMethods.find(m => m.id === sale.paymentMethod || normalizeStr(m.name) === normalizeStr(sale.paymentMethod));
        const category = getClosureCategory(sale.paymentMethod, pmObj?.type);
        if (totals[category] !== undefined) {
          totals[category] += Number(sale.total) || 0;
        }
      }
    });

    // Add opening balance to Cash (Dinheiro)
    totals['Dinheiro'] += Number(activeRegister.openingBalance) || 0;

    // Add movements (Sangria/Suprimento)
    const registerMovements = cashMovements.filter(m => m.cashRegisterId === activeRegister.id);
    registerMovements.forEach(m => {
      if (m.type === 'suprimento') {
        totals['Dinheiro'] += Number(m.amount) || 0;
      } else if (m.type === 'sangria') {
        totals['Dinheiro'] -= Number(m.amount) || 0;
      }
    });

    return totals;
  }, [activeRegister, sales, cashMovements, paymentMethods]);

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
    setErrorMsg(null);

    // Capture snapshot of cash movements and sales before the activeRegister is closed/fetchData is called
    const snapshotMovements = cashMovements.filter(m => m.cashRegisterId === activeRegister.id);
    const snapshotSales = sales.filter(s => s.cashRegisterId === activeRegister.id && !isCancelledSale(s));

    const reportSnapshot = {
      registerId: activeRegister.id,
      openedAt: activeRegister.openedAt,
      closedAt: new Date().toISOString(),
      operatorName: user?.name || 'Operador',
      openingBalance: Number(activeRegister.openingBalance) || 0,
      systemTotals: { ...systemTotals },
      informedValues: { ...informedValues },
      justifications: { ...justifications },
      movements: snapshotMovements,
      salesCount: snapshotSales.length,
      salesTotal: snapshotSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
    };

    const informedTotals = Object.entries(informedValues).map(([method, informed]) => ({
      method,
      informed,
      system: systemTotals[method] || 0
    }));

    const result = await closeCashRegister(informedTotals, Object.values(justifications).join(' | '));
    if (result) {
      setFinalReportData(reportSnapshot);
      setIsClosing(false);
      setIsAuthorized(false);
      setSupervisorCode('');
      setShowSuccessMessage(true);
    } else {
      setErrorMsg('Erro ao salvar o fechamento do caixa no banco de dados. Verifique a conexão com o servidor ou tente fechar novamente.');
    }
  };

  const handleAutomaticClose = async () => {
    if (!activeRegister) return;
    setErrorMsg(null);

    const snapshotMovements = cashMovements.filter(m => m.cashRegisterId === activeRegister.id);
    const snapshotSales = sales.filter(s => s.cashRegisterId === activeRegister.id && !isCancelledSale(s));

    const autoInformedValues = { ...systemTotals };

    const reportSnapshot = {
      registerId: activeRegister.id,
      openedAt: activeRegister.openedAt,
      closedAt: new Date().toISOString(),
      operatorName: user?.name || 'Operador',
      openingBalance: Number(activeRegister.openingBalance) || 0,
      systemTotals: { ...systemTotals },
      informedValues: autoInformedValues,
      justifications: { 'Geral': 'Fechamento automático concluído sem divergências físicas.' },
      movements: snapshotMovements,
      salesCount: snapshotSales.length,
      salesTotal: snapshotSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
    };

    const informedTotals = Object.entries(systemTotals).map(([method, systemValue]) => ({
      method,
      informed: systemValue,
      system: systemValue
    }));

    const result = await closeCashRegister(informedTotals, 'Fechamento automático concluído sem divergências físicas.');
    if (result) {
      setFinalReportData(reportSnapshot);
      setShowAutoConfirmModal(false);
      setIsClosing(false);
      setIsAuthorized(false);
      setSupervisorCode('');
      setShowSuccessMessage(true);
    } else {
      setErrorMsg('Erro ao salvar o fechamento do caixa automático no banco de dados.');
    }
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
    if (showSuccessMessage && finalReportData) {
      return (
        <div className="relative w-full max-w-xl mx-auto">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-closing-report, #printable-closing-report * {
                visibility: visible;
              }
              #printable-closing-report {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: auto;
                background: white !important;
                color: black !important;
                padding: 10px 0;
                margin: 0;
                overflow: visible;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .print-hidden {
                display: none !important;
              }
            }
          `}} />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            id="printable-closing-report"
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white max-w-xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:border-none print:rounded-none"
          >
            {/* Report Header */}
            <div className="text-center space-y-2 pb-4 border-b border-dashed border-slate-300 dark:border-slate-800 print:border-black">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto print:hidden">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-wider text-slate-900 dark:text-white print:text-black pt-1">
                Fechamento de Caixa
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                Comprovante Fiscal PDV
              </p>
              <div className="text-xs font-mono text-slate-500 space-y-0.5 pt-1">
                <div>ID Caixa: <span className="font-bold">{finalReportData.registerId}</span></div>
                <div>Operador: <span className="font-bold uppercase">{finalReportData.operatorName}</span></div>
              </div>
            </div>

            {/* Period Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono py-2.5 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 print:bg-slate-100 print:text-black print:border-black">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Abertura:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                  {new Date(finalReportData.openedAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Fechamento:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                  {new Date(finalReportData.closedAt).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Cash Movement Stream */}
            <div className="space-y-2 border-b border-dashed border-slate-300 dark:border-slate-800 pb-4 print:border-black">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Resumo das Movimentações
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 dark:bg-slate-800/20 p-2 text-center rounded-xl border border-slate-100 dark:border-slate-800/50 print:bg-slate-100 print:text-black">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Fundo Inicial</span>
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 print:text-black mt-0.5">
                    R$ {finalReportData.openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2 text-center rounded-xl border border-emerald-100/20 print:bg-slate-100 print:text-black">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 print:text-slate-500">Suprimentos</span>
                  <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 print:text-black mt-0.5">
                    R$ {finalReportData.movements.filter(m => m.type === 'suprimento').reduce((acc, m) => acc + Number(m.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-500/10 p-2 text-center rounded-xl border border-rose-100/20 print:bg-slate-100 print:text-black">
                  <span className="text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400 print:text-slate-500">Sangrias</span>
                  <div className="text-xs font-black text-rose-700 dark:text-rose-400 print:text-black mt-0.5">
                    R$ {finalReportData.movements.filter(m => m.type === 'sangria').reduce((acc, m) => acc + Number(m.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Payments Break down Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Conferência por Forma de Pagamento
              </h4>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 print:border-black">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 print:bg-slate-100 print:text-black print:border-black">
                      <th className="p-2 font-bold uppercase tracking-wider text-slate-500">Forma</th>
                      <th className="p-2 font-bold uppercase tracking-wider text-slate-500 text-right">Esperado</th>
                      <th className="p-2 font-bold uppercase tracking-wider text-slate-500 text-right">Informado</th>
                      <th className="p-2 font-bold uppercase tracking-wider text-slate-500 text-right">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-black">
                    {Object.keys(finalReportData.informedValues).map(method => {
                      const system = finalReportData.systemTotals[method] || 0;
                      const informed = finalReportData.informedValues[method] || 0;
                      const diff = informed - system;
                      return (
                        <tr key={method} className="hover:bg-slate-50/50 print:text-black">
                          <td className="p-2 font-semibold text-slate-900 dark:text-white print:text-black">{method}</td>
                          <td className="p-2 text-right text-slate-500 dark:text-slate-400 print:text-black">
                            R$ {system.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-700 dark:text-slate-300 print:text-black">
                            R$ {informed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-2 text-right font-black ${
                            diff === 0 
                              ? 'text-emerald-500' 
                              : diff > 0 
                                ? 'text-blue-500' 
                                : 'text-rose-500'
                          } print:text-black`}>
                            {diff > 0 ? '+' : ''} R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 print:bg-white print:text-black print:border-black space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 uppercase font-bold">Total Sistema (Vendas + Fundo):</span>
                <span className="font-bold font-mono">
                  R$ {Object.values(finalReportData.systemTotals).reduce((acc, val) => acc + Number(val), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 uppercase font-bold">Total Informado (Físico):</span>
                <span className="font-bold font-mono text-brand-blue print:text-black">
                  R$ {Object.values(finalReportData.informedValues).reduce((acc, val) => acc + Number(val), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200 dark:border-slate-850 print:border-black font-black">
                <span>Diferença Consolidada:</span>
                <span className={
                  Object.values(finalReportData.informedValues).reduce((acc, val) => acc + Number(val), 0) - Object.values(finalReportData.systemTotals).reduce((acc, val) => acc + Number(val), 0) === 0 
                    ? 'text-emerald-500' 
                    : 'text-rose-500'
                }>
                  R$ {(Object.values(finalReportData.informedValues).reduce((acc, val) => acc + Number(val), 0) - Object.values(finalReportData.systemTotals).reduce((acc, val) => acc + Number(val), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Audit justifications / notes */}
            {Object.keys(finalReportData.justifications).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Observações e Justificativas
                </h4>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 font-mono print:text-black print:border-black space-y-1">
                  {Object.entries(finalReportData.justifications).map(([key, value]) => value && (
                    <div key={key}>
                      <span className="font-bold">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature block helper for print spool */}
            <div className="hidden print:block pt-12 space-y-8">
              <div className="flex justify-between gap-8 text-center text-xs font-mono">
                <div className="flex-1 border-t border-slate-900 pt-2 shrink-0">
                  <p className="font-bold uppercase leading-none">{finalReportData.operatorName}</p>
                  <p className="text-[10px] text-slate-500 pt-1">Assinatura do Operador</p>
                </div>
                <div className="flex-1 border-t border-slate-900 pt-2 shrink-0">
                  <p className="font-bold uppercase leading-none">Supervisor autorizado</p>
                  <p className="text-[10px] text-slate-500 pt-1">Assinatura de Auditoria</p>
                </div>
              </div>
            </div>

            {/* UI CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 px-5 bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95"
              >
                <Printer size={18} />
                Imprimir Relatório
              </button>
              <button 
                onClick={() => {
                  onSuccess?.();
                  onClose?.();
                }}
                className="flex-1 py-3 px-5 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 active:scale-95"
              >
                Concluir e Voltar ao Início
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

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
            Confirmar Abertura (F10 / Enter)
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            type="button"
            onClick={() => setIsClosing(true)}
            className="py-3 bg-slate-950 dark:bg-slate-800 text-white dark:text-slate-200 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 border border-slate-800 dark:border-slate-700"
          >
            <Calculator className="w-4 h-4" />
            Conferência Manual
          </button>
          <button 
            type="button"
            onClick={() => setShowAutoConfirmModal(true)}
            className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Zap className="w-4 h-4 text-emerald-200 animate-pulse" />
            Fechamento Rápido
          </button>
        </div>
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
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 15 }}
               className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 w-full max-w-3xl border border-slate-200 dark:border-slate-800 shadow-2xl my-4"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fechamento de Caixa</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap sm:flex-nowrap">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium select-none">
                      <Lock className="w-3 h-3 text-brand-blue" />
                      <span>{showDivergences ? 'Visualizando divergências/diferenças em tempo real' : 'Escondendo divergências (Modo Cego)'}</span>
                    </p>
                    <button 
                      type="button"
                      onClick={() => setShowDivergences(prev => !prev)}
                      className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    >
                      {showDivergences ? 'Ativar Modo Cego' : 'Exibir Diferenças (Auditoria)'}
                    </button>
                  </div>
                </div>
                <button onClick={() => { setIsClosing(false); onClose?.(); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center p-3 bg-brand-blue/5 dark:bg-slate-800/40 rounded-xl border border-brand-blue/10 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Copiar valores esperados do sistema?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInformedValues({ ...systemTotals });
                        setJustifications(prev => ({
                          ...prev,
                          'Geral': 'Preenchimento automático efetuado com base nos valores previstos pelo sistema.'
                        }));
                      }}
                      className="px-3 py-1.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-[11px] font-black uppercase rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Zap className="w-3 h-3 text-emerald-200 animate-pulse" />
                      Auto-Preencher
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Forma</th>
                          {(showDivergences || isAuthorized) && (
                            <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Esperado</th>
                          )}
                          <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Informado</th>
                          {(showDivergences || isAuthorized) && (
                            <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Diferença</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                         {Object.keys(informedValues).map((method, idx) => {
                          const system = systemTotals[method] || 0;
                          const informed = informedValues[method] || 0;
                          const diff = informed - system;
                          
                          return (
                            <tr key={method} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="p-2.5 text-sm font-semibold text-slate-900 dark:text-white">{method}</td>
                              {(showDivergences || isAuthorized) && (
                                <td className="p-2.5 text-sm font-bold text-right text-slate-500 dark:text-slate-400">
                                  R$ {system.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              )}
                               <td className="p-2.5">
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
                                  className="w-28 p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-blue outline-none text-right text-sm"
                                />
                              </td>
                              {(showDivergences || isAuthorized) && (
                                <td className={`p-2.5 text-sm font-bold text-right ${diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                  {diff > 0 ? '+ R$ ' : diff < 0 ? '- R$ ' : 'R$ '}{Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Operator Observations (Always available during blind period) */}
                  {!(showDivergences || isAuthorized) && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Observações / Justificativas do Operador
                      </label>
                      <textarea 
                        value={justifications['Geral'] || ''}
                        onChange={(e) => setJustifications(prev => ({ ...prev, 'Geral': e.target.value }))}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-blue outline-none h-16 resize-none text-xs"
                        placeholder="Insira observações gerais sobre a conferência física se desejar..."
                      />
                    </div>
                  )}

                  {/* Justifications Section (Detailed breakdown revealed only after supervisor authorization) */}
                  {(showDivergences || isAuthorized) && (hasSmallDifference || hasLargeDifference) && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/30">
                      <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-5 h-5" />
                        <h4 className="font-bold">Divergências Detectadas (Modo Auditoria)</h4>
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

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Resumo do Fechamento</h4>
                    <div className="space-y-2">
                      {(showDivergences || isAuthorized) && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400">Total Sistema:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            R$ {Object.values(systemTotals).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Total Informado:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          R$ {Object.values(informedValues).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {(showDivergences || isAuthorized) && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center animate-pulse-subtle">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">Diferença Total:</span>
                          <span className={`text-md font-black ${
                            Object.values(informedValues).reduce((acc, val) => acc + val, 0) - Object.values(systemTotals).reduce((acc, val) => acc + val, 0) === 0 
                            ? 'text-emerald-500' 
                            : 'text-rose-500'
                          }`}>
                            R$ {(Object.values(informedValues).reduce((acc, val) => acc + val, 0) - Object.values(systemTotals).reduce((acc, val) => acc + val, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supervisor Approval */}
                  {hasLargeDifference && !isAuthorized && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-900/30">
                      <div className="flex items-center gap-2 mb-2 text-rose-700 dark:text-rose-400">
                        <ShieldCheck className="w-4 h-4" />
                        <h4 className="font-bold text-xs">Autorização Necessária</h4>
                      </div>
                      <p className="text-[11px] text-rose-600 dark:text-rose-500 mb-3">Diferença acima do limite permitido. Solicite a senha do supervisor.</p>
                      <div className="space-y-2">
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
                          className="w-full p-2 text-sm rounded-lg border border-rose-200 dark:border-rose-900/30 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-rose-500 outline-none text-center tracking-widest"
                          placeholder="CÓDIGO"
                        />
                        <button 
                          onClick={checkAuthorization}
                          className="w-full py-2 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700 transition-colors"
                        >
                          Autorizar
                        </button>
                      </div>
                    </div>
                  )}

                  {hasLargeDifference && isAuthorized && (
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-xs font-bold">Autorizado por Supervisor</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">{errorMsg}</span>
                    </div>
                  )}

                  <button 
                    ref={confirmCloseButtonRef}
                    onClick={handleClose}
                    disabled={hasLargeDifference && !isAuthorized}
                    className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold text-md shadow-md shadow-brand-blue/10 hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Confirmar Fechamento
                  </button>
                  <p className="text-[9px] text-center text-slate-400 uppercase tracking-tighter">
                    Ao confirmar, o caixa será bloqueado e os dados enviados para auditoria.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Success Message Overlay with Printable Closing Report */}
      <AnimatePresence>
        {showSuccessMessage && finalReportData && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:bg-white print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-closing-report, #printable-closing-report * {
                  visibility: visible;
                }
                #printable-closing-report {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: auto;
                  background: white !important;
                  color: black !important;
                  padding: 10px 0;
                  margin: 0;
                  overflow: visible;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                }
                .print-hidden {
                  display: none !important;
                }
              }
            `}} />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              id="printable-closing-report"
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white max-w-xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:border-none print:rounded-none"
            >
              {/* Report Header */}
              <div className="text-center space-y-2 pb-4 border-b border-dashed border-slate-300 dark:border-slate-800 print:border-black">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto print:hidden">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-wider text-slate-900 dark:text-white print:text-black pt-1">
                  Fechamento de Caixa
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  Comprovante Fiscal PDV
                </p>
                <div className="text-xs font-mono text-slate-500 space-y-0.5 pt-1">
                  <div>ID Caixa: <span className="font-bold">{finalReportData.registerId}</span></div>
                  <div>Operador: <span className="font-bold uppercase">{finalReportData.operatorName}</span></div>
                </div>
              </div>

              {/* Period Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono py-2.5 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 print:bg-slate-100 print:text-black print:border-black">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Abertura:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                    {new Date(finalReportData.openedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Fechamento:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                    {new Date(finalReportData.closedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Cash Movement Stream */}
              <div className="space-y-2 border-b border-dashed border-slate-300 dark:border-slate-800 pb-4 print:border-black">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Resumo das Movimentações
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800/20 p-2 text-center rounded-xl border border-slate-100 dark:border-slate-800/50 print:bg-slate-100 print:text-black">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Fundo Inicial</span>
                    <div className="text-xs font-black text-slate-700 dark:text-slate-300 print:text-black mt-0.5">
                      R$ {finalReportData.openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2 text-center rounded-xl border border-emerald-100/20 print:bg-slate-100 print:text-black">
                    <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 print:text-slate-500">Suprimentos</span>
                    <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 print:text-black mt-0.5">
                      R$ {finalReportData.movements.filter(m => m.type === 'suprimento').reduce((acc, m) => acc + Number(m.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-500/10 p-2 text-center rounded-xl border border-rose-100/20 print:bg-slate-100 print:text-black">
                    <span className="text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400 print:text-slate-500">Sangrias</span>
                    <div className="text-xs font-black text-rose-700 dark:text-rose-400 print:text-black mt-0.5">
                      R$ {finalReportData.movements.filter(m => m.type === 'sangria').reduce((acc, m) => acc + Number(m.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payments Break down Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Conferência por Forma de Pagamento
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 print:border-black">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 print:bg-slate-100 print:text-black print:border-black">
                        <th className="p-2 font-bold uppercase tracking-wider text-slate-500">Forma</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-slate-500 text-right">Esperado</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-slate-500 text-right">Informado</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-slate-500 text-right">Diferença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-black">
                      {Object.keys(finalReportData.informedValues).map(method => {
                        const system = finalReportData.systemTotals[method] || 0;
                        const informed = finalReportData.informedValues[method] || 0;
                        const diff = informed - system;
                        return (
                          <tr key={method} className="hover:bg-slate-50/50 print:text-black">
                            <td className="p-2 font-semibold text-slate-900 dark:text-white print:text-black">{method}</td>
                            <td className="p-2 text-right text-slate-500 dark:text-slate-400 print:text-black">
                              R$ {system.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-right font-bold text-slate-700 dark:text-slate-300 print:text-black">
                              R$ {informed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`p-2 text-right font-black ${
                              diff === 0 
                                ? 'text-emerald-500' 
                                : diff > 0 
                                  ? 'text-blue-500' 
                                  : 'text-rose-500'
                            } print:text-black`}>
                              {diff > 0 ? '+' : ''} R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 print:bg-white print:text-black print:border-black space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase font-bold">Total Sistema (Vendas + Fundo):</span>
                  <span className="font-bold font-mono">
                    R$ {Object.values(finalReportData.systemTotals).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase font-bold">Total Informado (Físico):</span>
                  <span className="font-bold font-mono text-brand-blue print:text-black">
                    R$ {Object.values(finalReportData.informedValues).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200 dark:border-slate-850 print:border-black font-black">
                  <span>Diferença Consolidada:</span>
                  <span className={
                    Object.values(finalReportData.informedValues).reduce((acc, val) => acc + val, 0) - Object.values(finalReportData.systemTotals).reduce((acc, val) => acc + val, 0) === 0 
                      ? 'text-emerald-500' 
                      : 'text-rose-500'
                  }>
                    R$ {(Object.values(finalReportData.informedValues).reduce((acc, val) => acc + val, 0) - Object.values(finalReportData.systemTotals).reduce((acc, val) => acc + val, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Audit justifications / notes */}
              {Object.keys(finalReportData.justifications).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Observações e Justificativas
                  </h4>
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 font-mono print:text-black print:border-black space-y-1">
                    {Object.entries(finalReportData.justifications).map(([key, value]) => value && (
                      <div key={key}>
                        <span className="font-bold">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature block helper for print spool */}
              <div className="hidden print:block pt-12 space-y-8">
                <div className="flex justify-between gap-8 text-center text-xs font-mono">
                  <div className="flex-1 border-t border-slate-900 pt-2 shrink-0">
                    <p className="font-bold uppercase leading-none">{finalReportData.operatorName}</p>
                    <p className="text-[10px] text-slate-500 pt-1">Assinatura do Operador</p>
                  </div>
                  <div className="flex-1 border-t border-slate-900 pt-2 shrink-0">
                    <p className="font-bold uppercase leading-none">Supervisor autorizado</p>
                    <p className="text-[10px] text-slate-500 pt-1">Assinatura de Auditoria</p>
                  </div>
                </div>
              </div>

              {/* UI CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-5 bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95"
                >
                  <Printer size={18} />
                  Imprimir Relatório
                </button>
                <button 
                  onClick={() => {
                    onSuccess?.();
                    onClose?.();
                  }}
                  className="flex-1 py-3 px-5 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 active:scale-95"
                >
                  Concluir e Voltar ao Início
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Automatic Closing Confirmation Modal */}
      <AnimatePresence>
        {showAutoConfirmModal && (
          <div className="fixed inset-0 z-[610] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl relative"
            >
              <button 
                type="button"
                onClick={() => setShowAutoConfirmModal(false)} 
                className="absolute right-4 top-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>

              <div className="text-center space-y-3 mb-6 pt-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Zap className="w-7 h-7 text-emerald-500 animate-bounce" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white italic">
                  Fechamento Rápido
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Confirma o encerramento do caixa batendo os valores físicos 100% idênticos ao esperado pelo sistema?
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2 mb-6">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">Saldo Consolidado:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm font-mono">
                    R$ {Object.values(systemTotals).reduce((acc, val) => acc + val, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700/50 pt-2 space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {Object.entries(systemTotals).map(([method, val]) => (
                    <div key={method} className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-mono">
                      <span>{method}:</span>
                      <span className="font-bold">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAutoConfirmModal(false)}
                  className="flex-1 py-3 border border-slate-205 dark:border-slate-705/50 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleAutomaticClose}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/10"
                >
                  Confirmar e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
