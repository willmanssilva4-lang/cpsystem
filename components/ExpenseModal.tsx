import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Trash2, Plus } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Expense } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ExpenseModalProps {
  onClose: () => void;
  expenseToEdit?: Expense;
}

export function ExpenseModal({ onClose, expenseToEdit }: ExpenseModalProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { addExpense, updateExpense, deleteExpense, addExpenseCategory, expenseCategories, user } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

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
    amount: '',
    paymentType: 'À vista' as 'À vista' | 'A prazo',
    issueDate: getTodayDate(),
    dueDate: getTodayDate(),
    observation: '',
    status: 'Pendente' as 'Pago' | 'Pendente' | 'Vencido',
    paymentMethod: 'Dinheiro',
    financialAccount: 'Caixa'
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        type: expenseToEdit.type || 'Fixa',
        description: expenseToEdit.description,
        category: expenseToEdit.category,
        supplier: expenseToEdit.supplier || '',
        amount: expenseToEdit.amount.toString(),
        paymentType: expenseToEdit.paymentType || (expenseToEdit.status === 'Pago' ? 'À vista' : 'A prazo'),
        issueDate: expenseToEdit.issueDate || getTodayDate(),
        dueDate: expenseToEdit.dueDate || getTodayDate(),
        observation: expenseToEdit.observation || '',
        status: expenseToEdit.status,
        paymentMethod: expenseToEdit.paymentMethod || 'Dinheiro',
        financialAccount: expenseToEdit.financialAccount || 'Caixa'
      });
    }
  }, [expenseToEdit]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const amountNum = formData.amount ? parseFloat(formData.amount) : 0;
      if (formData.amount && (isNaN(amountNum) || amountNum < 0)) {
        throw new Error('Valor inválido.');
      }

      const isPaid = formData.paymentType === 'À vista';

      const expenseData = {
        companyId: user?.companyId || '',
        description: formData.description,
        type: formData.type,
        category: formData.category,
        supplier: formData.supplier,
        amount: amountNum,
        issueDate: formData.issueDate,
        dueDate: isPaid ? formData.issueDate : formData.dueDate,
        paymentType: formData.paymentType,
        status: isPaid ? 'Pago' : 'Pendente' as any,
        paymentDate: isPaid ? formData.issueDate : undefined,
        paymentMethod: isPaid ? formData.paymentMethod : undefined,
        financialAccount: isPaid ? formData.financialAccount : undefined,
        observation: formData.observation,
        origin: isPaid ? 'Lançamento Manual' : 'Conta a Pagar'
      };

      if (expenseToEdit) {
        await updateExpense({ ...expenseData, id: expenseToEdit.id } as any);
      } else {
        await addExpense(expenseData as any);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="text-brand-blue" size={24} />
            Cadastrar Despesa
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* SEÇÃO 1 — INFORMAÇÕES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 1 — Informações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Despesa</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                >
                  <option value="Fixa">Fixa</option>
                  <option value="Variável">Variável</option>
                  <option value="Insumo">Insumo</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="flex-1 h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setIsAddingCategory(true)} className="h-11 px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200">+</button>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value.toUpperCase() }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                placeholder="Ex: Pagamento fornecedor Skol"
              />
            </div>
          </div>

          {/* SEÇÃO 2 — VALORES */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 2 — Valores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-rose-600 focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
                <select
                  value={formData.paymentType}
                  onChange={e => setFormData(prev => ({ ...prev, paymentType: e.target.value as any }))}
                  className={cn(
                    "w-full h-11 px-4 border rounded-xl text-sm font-bold outline-none transition-all",
                    formData.paymentType === 'À vista' ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-amber-50 border-amber-200 text-amber-600"
                  )}
                >
                  <option value="À vista">🟢 À vista (Já Pago)</option>
                  <option value="A prazo">🟡 A prazo (Conta a Pagar)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3 — DATAS */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 3 — Datas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data da Despesa</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={e => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                />
              </div>
              {formData.paymentType === 'A prazo' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Vencimento</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full h-11 px-4 bg-amber-50/30 border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 4 — FORNECEDOR */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 4 — Fornecedor</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Fornecedor (Opcional)</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value.toUpperCase() }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                placeholder="Ex: Skol / Ambev"
              />
            </div>
          </div>

          {/* SEÇÃO 5 — OBSERVAÇÃO */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-1">Seção 5 — Observação</h3>
            <textarea
              value={formData.observation}
              onChange={e => setFormData(prev => ({ ...prev, observation: e.target.value.toUpperCase() }))}
              className="w-full h-24 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all resize-none"
              placeholder="Alguma observação importante sobre esta despesa..."
            />
          </div>

          <div className="pt-6 flex gap-3 border-t border-slate-100 dark:border-slate-800">
            {expenseToEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isSubmitting}
                className="h-12 px-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-2 h-12 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-blue/20"
            >
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Lançamento</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black uppercase italic tracking-tight mb-4">Nova Categoria</h3>
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value.toUpperCase())}
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm mb-4 outline-none focus:ring-2 focus:ring-brand-blue/20"
              placeholder="Nome da categoria"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddingCategory(false)}
                className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (newCategoryName) {
                    await addExpenseCategory({ nome: newCategoryName });
                    setNewCategoryName('');
                    setIsAddingCategory(false);
                  }
                }}
                className="flex-1 h-11 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
