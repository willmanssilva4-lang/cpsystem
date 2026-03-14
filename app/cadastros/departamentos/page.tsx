'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, LayoutGrid } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Departamento } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function DepartamentosPage() {
  const { departamentos, addDepartamento, updateDepartamento, deleteDepartamento } = useERP();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editingDept, setEditingDept] = useState<Departamento | null>(null);
  const [formData, setFormData] = useState({ nome: '', ativo: true, codigo: '' });

  const handleOpenModal = (dept?: Departamento) => {
    setIsConfirmingDelete(false);
    if (dept) {
      setEditingDept(dept);
      setFormData({ nome: dept.nome, ativo: dept.ativo, codigo: dept.codigo || '' });
    } else {
      // Auto-generate next code
      let nextCode = '01';
      if (departamentos && departamentos.length > 0) {
        const codes = departamentos
          .map(d => parseInt(d.codigo || '0', 10))
          .filter(n => !isNaN(n));
        const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
        nextCode = String(maxCode + 1).padStart(2, '0');
      }

      setEditingDept(null);
      setFormData({ nome: '', ativo: true, codigo: nextCode });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      alert('O nome do departamento é obrigatório.');
      return;
    }

    try {
      if (editingDept) {
        await updateDepartamento({
          ...editingDept,
          nome: formData.nome,
          ativo: formData.ativo,
          codigo: formData.codigo
        });
      } else {
        await addDepartamento({
          nome: formData.nome,
          ativo: formData.ativo,
          codigo: formData.codigo
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving departamento:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    const { success } = await deleteDepartamento(id);
    if (success) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/cadastros" className="p-2 hover:bg-white rounded-xl transition-colors text-brand-blue shadow-sm border border-transparent hover:border-brand-border">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Departamentos</h1>
            <p className="text-brand-blue/60 font-medium">Organize sua loja por grandes setores.</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
        >
          <Plus size={20} />
          Novo Departamento
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[32px] border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border bg-slate-50/50">
          <div className="flex items-center gap-2 text-brand-text-main/60">
            <LayoutGrid size={20} />
            <span className="font-bold uppercase tracking-wide text-xs">Lista de Departamentos</span>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {departamentos.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-medium">Nenhum departamento cadastrado.</p>
            </div>
          ) : (
            departamentos.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between p-6 hover:bg-slate-50/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/5 flex items-center justify-center text-brand-blue">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-text-main text-lg">
                      {dept.codigo && <span className="text-brand-blue mr-2">{dept.codigo}</span>}
                      {dept.nome}
                    </h3>
                    <span className={cn(
                      "text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full",
                      dept.ativo ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                    )}>
                      {dept.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(dept)}
                    className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">
                  {editingDept ? 'Editar Departamento' : 'Novo Departamento'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-brand-text-main hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Código</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-brand-border rounded-xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all"
                    placeholder="Ex: 01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-slate-50 border border-brand-border rounded-xl text-brand-text-main font-bold uppercase focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all"
                    placeholder="EX: MERCEARIA"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="w-5 h-5 rounded-md border-brand-border text-brand-blue focus:ring-brand-blue-hover"
                  />
                  <label htmlFor="ativo" className="text-sm font-bold text-brand-text-main cursor-pointer select-none">
                    Departamento Ativo
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-brand-border bg-slate-50 flex justify-between gap-3">
                {editingDept ? (
                  isConfirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-rose-500 font-bold">Tem certeza?</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const { success } = await deleteDepartamento(editingDept.id);
                          if (success) {
                            setIsModalOpen(false);
                            setIsConfirmingDelete(false);
                          }
                        }}
                        className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl transition-colors hover:bg-rose-600"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors hover:bg-slate-300"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="px-6 py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      Excluir
                    </button>
                  )
                ) : (
                  <div></div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all active:scale-95"
                  >
                    <Save size={18} />
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
