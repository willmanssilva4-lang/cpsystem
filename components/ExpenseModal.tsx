import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Trash2 } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Expense } from '@/lib/types';

interface ExpenseModalProps {
  onClose: () => void;
  expenseToEdit?: Expense;
}

export function ExpenseModal({ onClose, expenseToEdit }: ExpenseModalProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { addExpense, updateExpense, deleteExpense, addExpenseCategory, expenseCategories } = useERP();
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
    description: '',
    category: '',
    supplier: '',
    amount: '',
    issueDate: getTodayDate(),
    dueDate: getTodayDate(),
    paymentMethod: '',
    financialAccount: '',
    observation: '',
    isRecurring: false,
    frequency: 'Mensal',
    status: 'Pendente' as 'Pago' | 'Pendente' | 'Vencido'
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        description: expenseToEdit.description,
        category: expenseToEdit.category,
        supplier: expenseToEdit.supplier || '',
        amount: expenseToEdit.amount.toString(),
        issueDate: expenseToEdit.issueDate || getTodayDate(),
        dueDate: expenseToEdit.dueDate || getTodayDate(),
        paymentMethod: expenseToEdit.paymentMethod || '',
        financialAccount: expenseToEdit.financialAccount || '',
        observation: expenseToEdit.observation || '',
        isRecurring: expenseToEdit.isRecurring || false,
        frequency: expenseToEdit.frequency || 'Mensal',
        status: expenseToEdit.status
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
      // Removed mandatory check for fields
      const amountNum = formData.amount ? parseFloat(formData.amount) : 0;
      if (formData.amount && (isNaN(amountNum) || amountNum < 0)) {
        throw new Error('Valor inválido.');
      }

      const expenseData = {
        description: formData.description,
        category: formData.category,
        supplier: formData.supplier,
        amount: amountNum,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        paymentMethod: formData.paymentMethod,
        financialAccount: formData.financialAccount,
        observation: formData.observation,
        isRecurring: formData.isRecurring,
        frequency: formData.frequency as 'Mensal' | 'Semanal' | 'Anual',
        status: formData.status
      };

      if (expenseToEdit) {
        await updateExpense({ ...expenseData, id: expenseToEdit.id });
      } else {
        await addExpense(expenseData);
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
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
            {expenseToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              placeholder="Ex: Conta de Luz"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
              {!isAddingCategory ? (
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="flex-1 h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setIsAddingCategory(true)} className="h-11 px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">+</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="flex-1 h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                    placeholder="Nova categoria"
                  />
                  <button type="button" onClick={async () => {
                    if (newCategoryName) {
                      await addExpenseCategory({ nome: newCategoryName });
                      setNewCategoryName('');
                      setIsAddingCategory(false);
                    }
                  }} className="h-11 px-3 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-hover">Salvar</button>
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="h-11 px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">X</button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                placeholder="Ex: Companhia de Energia"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conta Financeira</label>
              <select
                value={formData.financialAccount}
                onChange={e => setFormData(prev => ({ ...prev, financialAccount: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              >
                <option value="">Selecione...</option>
                <option value="Caixa">Caixa</option>
                <option value="Conta Bancária">Conta Bancária</option>
                <option value="Conta PIX">Conta PIX</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Emissão</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={e => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Vencimento</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
            <select
              value={formData.paymentMethod}
              onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
            >
              <option value="">Selecione...</option>
              <option value="Boleto">Boleto</option>
              <option value="Pix">Pix</option>
              <option value="Cartão">Cartão</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observação</label>
            <textarea
              value={formData.observation}
              onChange={e => setFormData(prev => ({ ...prev, observation: e.target.value }))}
              className="w-full h-20 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isRecurring}
              onChange={e => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              className="w-5 h-5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Conta recorrente</label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frequência</label>
              <select
                value={formData.frequency}
                onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as 'Mensal' | 'Semanal' | 'Anual' }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              >
                <option value="Mensal">Mensal</option>
                <option value="Semanal">Semanal</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            {expenseToEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isSubmitting}
                className="h-11 px-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50"
                title="Excluir lançamento"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1 h-11 bg-brand-blue-hover text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-blue transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {isSubmitting ? 'Salvando...' : 'Salvar'}
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
    </div>
  );
}
