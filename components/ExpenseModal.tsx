import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, AlertCircle, Trash2, Plus, Calendar, Tag, CreditCard, 
  DollarSign, FileText, Paperclip, Receipt, RefreshCw, HelpCircle, 
  Layers, Check, Clock, TrendingUp, Info
} from 'lucide-react';
import { useERP } from '@/lib/context';
import { Expense } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ExpenseModalProps {
  onClose: () => void;
  expenseToEdit?: Expense;
}

export function ExpenseModal({ onClose, expenseToEdit }: ExpenseModalProps) {
  const { 
    addExpense, 
    updateExpense, 
    deleteExpense, 
    addExpenseCategory, 
    expenseCategories, 
    suppliers, 
    user 
  } = useERP();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'dados' | 'parcelas'>('dados');

  // Attachment local state
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    type: 'Fixa',
    description: '',
    category: '',
    supplier: '',
    supplierId: '',
    amount: '',
    interest: '0',
    discount: '0',
    documentNumber: '',
    paymentType: 'À vista' as 'À vista' | 'A prazo',
    issueDate: getTodayDate(),
    dueDate: getTodayDate(),
    observation: '',
    status: 'Pendente' as 'Pago' | 'Pendente' | 'Vencido',
    paymentMethod: 'Dinheiro',
    financialAccount: 'Caixa',
    installmentsEnabled: false,
    installmentsCount: 3,
    installmentsFrequency: 'Mensal' as 'Mensal' | 'Semanal',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load existing expense if edit mode
  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        type: expenseToEdit.type || 'Fixa',
        description: expenseToEdit.description,
        category: expenseToEdit.category,
        supplier: expenseToEdit.supplier ? (expenseToEdit.supplier.includes(' | ') ? expenseToEdit.supplier.split(' | ')[1] : expenseToEdit.supplier) : '',
        supplierId: expenseToEdit.supplierId || '',
        amount: expenseToEdit.amount.toString(),
        interest: (expenseToEdit.interest || 0).toString(),
        discount: (expenseToEdit.discount || 0).toString(),
        documentNumber: '', // Try to parse if stored in observation
        paymentType: expenseToEdit.paymentType || (expenseToEdit.status === 'Pago' ? 'À vista' : 'A prazo'),
        issueDate: expenseToEdit.issueDate ? expenseToEdit.issueDate.split('T')[0] : getTodayDate(),
        dueDate: expenseToEdit.dueDate ? expenseToEdit.dueDate.split('T')[0] : getTodayDate(),
        observation: expenseToEdit.observation || '',
        status: expenseToEdit.status,
        paymentMethod: expenseToEdit.paymentMethod || 'Dinheiro',
        financialAccount: expenseToEdit.financialAccount || 'Caixa',
        installmentsEnabled: false,
        installmentsCount: 3,
        installmentsFrequency: 'Mensal',
      });

      // Try to parse document reference from description or observation if pattern matches [NF-e: XXX]
      const nfMatch = expenseToEdit.description.match(/\[NF: ([^\]]+)\]/);
      if (nfMatch && nfMatch[1]) {
        setFormData(prev => ({
          ...prev,
          documentNumber: nfMatch[1],
          description: expenseToEdit.description.replace(/\[NF: [^\]]+\]\s*/, ''),
        }));
      }
    }
  }, [expenseToEdit]);

  // Helper to calculate sequential due dates
  const getNextDueDate = (baseDateStr: string, index: number, frequency: 'Mensal' | 'Semanal') => {
    const parts = baseDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day, 12, 0, 0); // avoid timezone shifts

    if (frequency === 'Mensal') {
      date.setMonth(date.getMonth() + index);
    } else if (frequency === 'Semanal') {
      date.setDate(date.getDate() + index * 7);
    }
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Live accounting summary calculations
  const rawAmount = parseFloat(formData.amount) || 0;
  const rawInterest = parseFloat(formData.interest) || 0;
  const rawDiscount = parseFloat(formData.discount) || 0;
  const calculatedNetTotal = Math.max(0, rawAmount + rawInterest - rawDiscount);

  // Live installments breakout simulation
  const computedInstallments = useMemo(() => {
    if (!formData.installmentsEnabled || formData.installmentsCount < 2 || formData.paymentType !== 'A prazo') {
      return [];
    }
    const count = Math.min(24, Math.max(2, formData.installmentsCount));
    const list = [];
    const itemAmount = parseFloat((calculatedNetTotal / count).toFixed(2));
    
    // adjust remainder to prevent cents discrepancies on last installment
    const totalRepresented = parseFloat((itemAmount * count).toFixed(2));
    const diff = parseFloat((calculatedNetTotal - totalRepresented).toFixed(2));

    for (let i = 1; i <= count; i++) {
      const dueDate = getNextDueDate(formData.dueDate, i - 1, formData.installmentsFrequency);
      const isLast = i === count;
      const amt = isLast ? parseFloat((itemAmount + diff).toFixed(2)) : itemAmount;
      list.push({
        num: i,
        date: dueDate,
        amount: amt
      });
    }
    return list;
  }, [formData.installmentsEnabled, formData.installmentsCount, formData.installmentsFrequency, formData.dueDate, calculatedNetTotal, formData.paymentType]);

  const handleDelete = async () => {
    if (!expenseToEdit) return;
    setIsDeleting(true);
    try {
      await deleteExpense(expenseToEdit.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir lançamento.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Mock Receipt Attachment Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      setTimeout(() => {
        setAttachedFile({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`
        });
        setIsUploading(false);
      }, 800);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.description.trim()) {
        throw new Error('Preencha a descrição da conta.');
      }
      if (!formData.category) {
        throw new Error('Selecione uma categoria para classificação contábil.');
      }
      if (rawAmount <= 0) {
        throw new Error('Por favor, defina um valor principal maior que zero.');
      }

      const isPaid = formData.paymentType === 'À vista';
      
      // Document prefix formulation
      let finalDescription = formData.description.trim().toUpperCase();
      if (formData.documentNumber.trim()) {
        finalDescription = `[NF: ${formData.documentNumber.trim().toUpperCase()}] ${finalDescription}`;
      }

      // Appending attachment meta context to observations
      let finalObservation = formData.observation.trim().toUpperCase();
      if (attachedFile) {
        const attachStr = `[ANEXADO: ${attachedFile.name} (${attachedFile.size})]`;
        finalObservation = finalObservation 
          ? `${attachStr}\n${finalObservation}`
          : attachStr;
      }

      // Base shared properties
      const baseExpense = {
        companyId: user?.companyId || '',
        type: formData.type,
        category: formData.category,
        supplier: formData.supplier || 'DIVERSOS',
        supplierId: formData.supplierId || undefined,
        issueDate: formData.issueDate,
        paymentType: formData.paymentType,
        observation: finalObservation,
        interest: rawInterest,
        discount: rawDiscount,
        date: formData.issueDate, // added for filter matching compatibility
      };

      // Scenario A: MULTI-INSTALLMENT GENERATION (Only in CREATE mode when enabled)
      if (!expenseToEdit && formData.paymentType === 'A prazo' && formData.installmentsEnabled && computedInstallments.length > 0) {
        
        for (const inst of computedInstallments) {
          const instExpense = {
            ...baseExpense,
            description: `${finalDescription} (PARCELA ${inst.num}/${computedInstallments.length})`,
            amount: inst.amount,
            dueDate: inst.date,
            status: 'Pendente' as const,
            origin: 'Parcelamento Automático',
          };
          await addExpense(instExpense as any);
        }

      } else {
        // Scenario B: SINGLE NORMAL EXPENSE (Create or Edit)
        const expenseData = {
          ...baseExpense,
          description: finalDescription,
          amount: calculatedNetTotal, // save the net balanced amount
          dueDate: isPaid ? formData.issueDate : formData.dueDate,
          status: isPaid ? 'Pago' : (formData.status as any),
          paymentDate: isPaid ? formData.issueDate : undefined,
          paymentMethod: isPaid ? formData.paymentMethod : undefined,
          financialAccount: isPaid ? formData.financialAccount : undefined,
          origin: isPaid ? 'Lançamento Manual' : 'Conta a Pagar',
        };

        if (expenseToEdit) {
          await updateExpense({ ...expenseData, id: expenseToEdit.id } as any);
        } else {
          await addExpense(expenseData as any);
        }
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar lançamento financeiro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-7xl h-[92vh] md:h-[95vh] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col my-4"
      >
        
        {/* Modern Interactive Header Block */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500" />
          
          <div className="flex flex-col gap-1 z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10">
                PRO FINANCEIRO
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Modulo de Liquidação e Fluxo de Caixa</p>
            </div>
            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 mt-0.5">
              <Receipt className="text-rose-500 shrink-0" size={24} />
              {expenseToEdit ? 'Ficha de Alteração de Despesa' : 'Novo Lançamento Dedutível'}
            </h2>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-150 dark:hover:border-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Real-Time Live Accounting Summary Ledger */}
        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 md:px-8 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 select-none shrink-0 text-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Demostrativo Interno</p>
              <h4 className="text-xs font-bold text-slate-300 mt-1">Cálculo Líquido Contábil</h4>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex items-center gap-4 md:gap-8 grow justify-end">
            <div className="text-right">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Principal</p>
              <p className="text-xs font-black text-slate-300">
                R$ {rawAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Juros (+)</p>
              <p className="text-xs font-black text-amber-400">
                + R$ {rawInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Descontos (-)</p>
              <p className="text-xs font-black text-emerald-400">
                - R$ {rawDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right border-l border-slate-800 pl-4 md:pl-8 col-span-2 md:col-span-1">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Líquido Consolidado</p>
              <p className="text-lg md:text-xl font-black text-rose-500 leading-none mt-1">
                R$ {calculatedNetTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation inside the modal for high density layout */}
        {formData.paymentType === 'A prazo' && !expenseToEdit && (
          <div className="px-6 md:px-8 pt-3 bg-slate-50/20 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('dados')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
                activeTab === 'dados' 
                  ? "border-rose-500 text-rose-600 dark:text-rose-400" 
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <Tag size={13} />
              Identificação & Valores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('parcelas')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 relative",
                activeTab === 'parcelas' 
                  ? "border-rose-500 text-rose-600 dark:text-rose-400" 
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <Layers size={13} />
              Plano de Parcelamento ({formData.installmentsEnabled ? `${formData.installmentsCount}x` : 'Desativado'})
              {formData.installmentsEnabled && (
                <span className="size-1.5 bg-emerald-500 rounded-full animate-ping absolute top-1 right-2" />
              )}
            </button>
          </div>
        )}

        {/* Form Body - Dual Column Grid */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/40 dark:border-rose-950/40 rounded-2xl text-xs font-bold flex items-center gap-3"
            >
              <AlertCircle size={18} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </motion.div>
          )}

          {activeTab === 'dados' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              
              {/* LEFT COLUMN: IDENTIFICAÇÃO E CLASSIFICAÇÃO */}
              <div className="space-y-5">
                <div className="border-l-2 border-rose-500 pl-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    SESSÃO A: Identificação & Centro
                  </h3>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Definição fiscal e classificatória</p>
                </div>

                {/* Descrição */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Descrição da Despesa *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all font-mono"
                    placeholder="EX: PAGAMENTO DA FATURA DE ENERGIA ELÉTRICA - MAIO"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Tipo de Despesa */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      Enquadramento
                    </label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/10 transition-all cursor-pointer"
                    >
                      <option value="Fixa">FIXA (MENSAL)</option>
                      <option value="Variável">VARIÁVEL (CONSUMO)</option>
                      <option value="Insumo">INSUMO (OPERAÇÃO)</option>
                      <option value="Pessoal">PESSOAL (FOPAG)</option>
                      <option value="Outros">OUTROS GASTOS</option>
                    </select>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categoria *</label>
                    <div className="flex gap-1">
                      <select
                        value={formData.category}
                        required
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="flex-1 h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/10 transition-all cursor-pointer"
                      >
                        <option value="">FILICIAÇÃO...</option>
                        {expenseCategories.map(cat => (
                          <option key={cat.id} value={cat.nome}>{cat.nome.toUpperCase()}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingCategory(true)} 
                        className="h-11 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl transition-all font-black text-sm cursor-pointer"
                        title="Nova Categoria"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Fornecedor */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fornecedor / Sócio</label>
                    <input
                      type="text"
                      list="supplier-options"
                      value={formData.supplier}
                      onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all"
                      placeholder="Busque ou escreva"
                    />
                    <datalist id="supplier-options">
                      {suppliers.map(sup => {
                        const tradeName = sup.name.includes(" | ") ? sup.name.split(" | ")[1] : sup.name;
                        return <option key={sup.id} value={tradeName} />;
                      })}
                    </datalist>
                  </div>

                  {/* Número Nota Fiscal / Documento */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      Nº Documento / Nota
                      <span className="text-[8px] text-slate-350 tracking-normal lowercase">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.documentNumber}
                      onChange={e => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                      className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all font-mono"
                      placeholder="EX: NFE-4859"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2 space-y-4">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-black tracking-widest bg-slate-50 dark:bg-slate-950/40 px-3 py-1.5 rounded-lg w-fit">
                    <DollarSign size={13} className="text-slate-400" />
                    <span>Lançamento Contábil de Valores</span>
                  </div>

                  {/* Valor Principal */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor de Compra / Subtotal *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-500 bg-slate-100 dark:bg-slate-800/60 size-5 flex items-center justify-center rounded-md">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.amount}
                        onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full h-11 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/10 focus:outline-none transition-all font-mono text-base"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Juros/Multa */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Encargos / Juros (+)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-amber-500">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.interest}
                          onChange={e => setFormData(prev => ({ ...prev, interest: e.target.value }))}
                          className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/10 focus:outline-none transition-all font-mono"
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    {/* Desconto */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Desconto Obtido (-)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-emerald-500">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.discount}
                          onChange={e => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                          className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/10 focus:outline-none transition-all font-mono"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: REGIME DE PAGAMENTO, LIQUIDAÇÃO E RECORRÊNCIA */}
              <div className="space-y-5">
                <div className="border-l-2 border-rose-500 pl-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    SESSÃO B: Liquidação & Prazo
                  </h3>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Regime pecuniário e competências</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Regime / Lançamento (À vista vs A prazo) */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Regime Pecuniário</label>
                    <select
                      value={formData.paymentType}
                      onChange={e => setFormData(prev => ({ 
                        ...prev, 
                        paymentType: e.target.value as any,
                        // reset installments if switching to à vista
                        installmentsEnabled: e.target.value === 'A prazo' ? prev.installmentsEnabled : false
                      }))}
                      className={cn(
                        "w-full h-11 px-4 border rounded-xl text-xs font-black transition-all outline-none cursor-pointer",
                        formData.paymentType === 'À vista' 
                          ? "bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/12" 
                          : "bg-amber-500/5 dark:bg-amber-950/10 border-amber-500/20 text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/12"
                      )}
                    >
                      <option value="À vista">🟢 À VISTA (BAIXA E CAIXA AUTOMÁTICO)</option>
                      <option value="A prazo">🟡 A PRAZO (PREVISÃO E CONTAS A PAGAR)</option>
                    </select>
                  </div>
                </div>

                {/* If À Vista, show Bank/Cash sources immediately */}
                {formData.paymentType === 'À vista' ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-55/60 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/85 rounded-2xl space-y-0"
                  >
                    {/* Meio de Pagamento */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Meio de Liquidação</label>
                      <select
                        value={formData.paymentMethod}
                        onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-rose-500/20 cursor-pointer text-slate-700"
                      >
                        <option value="Dinheiro">DINHEIRO</option>
                        <option value="Pix">PIX AUTOMÁTICO</option>
                        <option value="Cartão">CARTÃO CRÉDITO/DÉBITO</option>
                        <option value="Boleto">BOLETO COMPENSADO</option>
                        <option value="Outro">OUTRO PROCEDIMENTO</option>
                      </select>
                    </div>

                    {/* Conta Origem */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Caixa / Conta Portadora</label>
                      <select
                        value={formData.financialAccount}
                        onChange={e => setFormData(prev => ({ ...prev, financialAccount: e.target.value }))}
                        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-rose-500/20 cursor-pointer text-slate-700"
                      >
                        <option value="Caixa">CAIXA OPERACIONAL</option>
                        <option value="Conta Bancária">SICOOB / ITAÚ PRINCIPAL</option>
                        <option value="Conta PIX">CONTA INTER PIX</option>
                        <option value="Mercado Pago">SANTANDER / MERCADO PAGO</option>
                      </select>
                    </div>
                  </motion.div>
                ) : (
                  // If A Prazo, show custom default Status (Pendente/Vencido) and installments enable toggle
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-slate-55/65 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {/* Status */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status Inicial</label>
                        <select
                          value={formData.status}
                          onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full h-11 px-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-250 outline-none cursor-pointer"
                        >
                          <option value="Pendente">🟡 EM ABERTO (A VENCER)</option>
                          <option value="Vencido">🔴 VENCIDO (EXIGÍVEL)</option>
                        </select>
                      </div>

                      {/* Chronogram Dates: Vencimento */}
                      <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Prazo de Vencimento *</label>
                        <input
                          type="date"
                          value={formData.dueDate}
                          onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    {/* Enable multi installments toggle */}
                    {!expenseToEdit && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <Layers size={15} className="text-rose-500" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                              Parcelar Despesa?
                            </span>
                            <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wide">Multiplicar pagamentos no tempo</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.installmentsEnabled}
                          onChange={e => setFormData(prev => ({ ...prev, installmentsEnabled: e.target.checked }))}
                          className="size-5 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Calendar Data Competência */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Competência / Emissão *</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={e => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                  />
                </div>

                {/* Simulated Receipts Drag Zone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Paperclip size={12} className="text-slate-400" />
                    Comprovante / Recibo Digital
                  </label>
                  
                  {attachedFile ? (
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate leading-none uppercase tracking-wider">{attachedFile.name}</p>
                          <p className="text-[8px] font-mono text-slate-450 mt-1 uppercase">Tamanho: {attachedFile.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="h-20 border-2 border-dashed border-slate-150 dark:border-slate-850 hover:border-rose-500/40 dark:hover:border-rose-500/30 rounded-[1.2rem] flex flex-col items-center justify-center p-3 cursor-pointer group transition-all bg-slate-50/20 dark:bg-slate-950/20">
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                      />
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <RefreshCw size={18} className="text-rose-500 animate-spin" />
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest animate-pulse">Lendo Comprovante...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Paperclip size={18} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                          <p className="text-[8px] font-black uppercase text-slate-450 tracking-wider text-center">Clique para ler documento, NF-e ou JPEG</p>
                          <p className="text-[7px] text-slate-400 uppercase font-bold">Limite máximo: 10 MB por arquivo</p>
                        </div>
                      )}
                    </label>
                  )}
                </div>

                {/* Observation / Record Annotations */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Anotações Suplementares
                  </label>
                  <textarea
                    value={formData.observation}
                    onChange={e => setFormData(prev => ({ ...prev, observation: e.target.value }))}
                    className="w-full h-16 px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all resize-none shadow-inner"
                    placeholder="DIGITE INFORMAÇÕES AUXILIARES, NOTAS FISCAIS OU HISTÓRICO RELEVANTE..."
                  />
                </div>

              </div>

            </div>
          ) : (
            // INSTALLMENTS TAB PANEL VISUAL PREVIEW
            <motion.div 
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="p-5 bg-slate-55/65 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-orange-500/10 border border-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
                      <Layers size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Configurações Gerais de Cronograma
                      </h4>
                      <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Sintonize os tempos e números de divisões</p>
                    </div>
                  </div>
                  
                  {/* Enable check */}
                  <div className="flex items-center gap-2 h-11 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl shadow-sm self-start sm:self-auto">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                      Modo Ativo
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.installmentsEnabled}
                      onChange={e => setFormData(prev => ({ ...prev, installmentsEnabled: e.target.checked }))}
                      className="size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>
                </div>

                {formData.installmentsEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-850/80 animate-in fade-in duration-150">
                    {/* Número de parcelas */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Divisões (Número de Parcelas)</label>
                      <select
                        value={formData.installmentsCount}
                        onChange={e => setFormData(prev => ({ ...prev, installmentsCount: parseInt(e.target.value) }))}
                        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 border-slate-100 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                      >
                        {[2,3,4,5,6,7,8,9,10,12,18,24].map(num => (
                          <option key={num} value={num}>{num} PARCELAS CONSECUTIVAS</option>
                        ))}
                      </select>
                    </div>

                    {/* Frequência */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Frequência / Intervalos</label>
                      <select
                        value={formData.installmentsFrequency}
                        onChange={e => setFormData(prev => ({ ...prev, installmentsFrequency: e.target.value as any }))}
                        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 border-slate-100 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                      >
                        <option value="Mensal">📆 MENSAL (CADA 30 DIAS)</option>
                        <option value="Semanal">📆 SEMANAL (CADA 7 DIAS)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {formData.installmentsEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={12} className="text-slate-400" />
                    <span>Lançamentos Futuros que Serão Criados</span>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-850 rounded-[1.8rem] overflow-hidden bg-white dark:bg-slate-900 grid grid-cols-1 divide-y divide-slate-50 dark:divide-slate-850 max-h-[12rem] overflow-y-auto">
                    {computedInstallments.map((inst, idx) => {
                      const dateObj = new Date(inst.date + 'T12:00:00');
                      const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      
                      return (
                        <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all font-mono text-xs">
                          <div className="flex items-center gap-3">
                            <span className="size-5 rounded-md bg-rose-500/10 border border-rose-500/10 text-[9px] font-bold text-rose-500 flex items-center justify-center shrink-0">
                              {inst.num}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-350">
                              Parcela {inst.num} / {computedInstallments.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Vencimento</p>
                              <span className="font-semibold text-slate-500 dark:text-slate-400 mt-0.5 inline-block">{formattedDate}</span>
                            </div>
                            <div className="border-l border-slate-50 dark:border-slate-850 pl-5 min-w-[5.5rem]">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Valor Bruto</p>
                              <span className="font-black text-slate-750 dark:text-rose-400 mt-0.5 inline-block">
                                R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start gap-3">
                    <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">Atenção ao Confirmar</p>
                      <p className="text-[8.5px] text-slate-500 dark:text-slate-400 uppercase font-black mt-1.5 leading-relaxed">
                        Ao clicar em "Salvar", o sistema simulará um loop e gerará <strong className="text-amber-600 dark:text-amber-400">{computedInstallments.length} faturas</strong> separadas e encadeadas consecutivamente na sua aba "Contas a Pagar". Isso permitirá a baixa individual e controle de liquidação preciso em cada mês correspondente.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50/20 dark:bg-slate-950/20 border-2 border-dashed border-slate-150 dark:border-slate-850 rounded-[1.8rem] p-6 text-center">
                  <Layers size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-xs font-black uppercase text-slate-450 tracking-wider">Módulo Desativado</p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold max-w-sm mt-1 leading-normal">
                    Habilite a chave de parcelamento acima para gerar faturas sequenciais encadeadas no tempo com juros ou descontos calculados automaticamente.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Form Actions footer bar */}
          <div className="pt-6 flex gap-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            
            {/* Delete button (only edit mode) */}
            {expenseToEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isSubmitting}
                className="h-12 w-12 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border border-slate-150/15 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/65 transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-55"
                title="Excluir Lançamento"
              >
                <Trash2 size={18} />
              </button>
            )}

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 bg-slate-100/60 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-750 text-slate-600 dark:text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              Cancelar
            </button>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1.5 h-12 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-55 shadow-lg shadow-rose-500/25 cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{expenseToEdit ? 'ATUALIZAR FICHA' : formData.installmentsEnabled ? `GERAR ${formData.installmentsCount} PARCELAS` : 'CONFIRMAR LANÇAMENTO'}</span>
                </>
              )}
            </button>

          </div>
        </form>
      </motion.div>

      {/* Delete/Apagar Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-2xl w-full max-w-sm p-8 border border-slate-150 dark:border-slate-800 animate-in fade-in duration-150"
          >
            <h3 className="text-xl font-black text-slate-850 dark:text-white tracking-tight uppercase italic mb-2">Excluir Registro</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mb-6">
              Tem certeza que deseja apagar permanentemente este registro financeiro? Esta ação é irreversível e alterará imediatamente relatórios de DRE e balanços de fluxo de caixa.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                {isDeleting ? 'EXCLUINDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Add Custom Category Dialog */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] w-full max-w-xs shadow-2xl border border-slate-150 dark:border-slate-800 animate-in fade-in duration-150"
          >
            <h3 className="text-base font-black uppercase italic tracking-tight text-slate-800 dark:text-white mb-4">Nova Categoria</h3>
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="w-full h-11 px-4 bg-slate-55 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl text-xs font-bold mb-4 outline-none focus:ring-2 focus:ring-rose-500/10 text-slate-700 dark:text-slate-200"
              placeholder="EX: ALUGUEL / ENERGIA / SUPORTE"
            />
            <div className="flex gap-2.5">
              <button 
                type="button"
                onClick={() => {
                  setNewCategoryName('');
                  setIsAddingCategory(false);
                }}
                className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-250 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  if (newCategoryName.trim()) {
                    await addExpenseCategory({ nome: newCategoryName.trim().toUpperCase() });
                    setFormData(prev => ({ ...prev, category: newCategoryName.trim().toUpperCase() }));
                    setNewCategoryName('');
                    setIsAddingCategory(false);
                  }
                }}
                className="flex-1 h-11 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-rose-500/10"
              >
                Salvar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
