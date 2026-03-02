'use client';

import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Search,
  ChevronRight,
  Database,
  Truck,
  Calendar,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

export default function ImportXmlPage() {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setStep(2);
    }, 2000);
  };

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Link href="/compras" className="flex items-center gap-2 text-emerald-600 font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
          <ArrowLeft size={14} />
          Voltar para Compras
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-emerald-950 italic uppercase">Importação de XML (NF-e)</h1>
        <p className="text-emerald-600/60 font-medium">Automatize a entrada de mercadorias e atualização de custos.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 max-w-2xl">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Conferência' },
          { num: 3, label: 'Finalização' }
        ].map((s) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-sm transition-all ${
                step >= s.num ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-emerald-50 text-emerald-900/30'
              }`}>
                {s.num}
              </div>
              <span className={`text-xs font-black uppercase italic tracking-tight ${
                step >= s.num ? 'text-emerald-950' : 'text-emerald-900/30'
              }`}>{s.label}</span>
            </div>
            {s.num < 3 && <div className="flex-1 h-px bg-emerald-100" />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl"
          >
            <div className="p-12 border-4 border-dashed border-emerald-100 rounded-[48px] bg-emerald-50/30 flex flex-col items-center justify-center text-center space-y-6 hover:border-emerald-200 transition-all">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-emerald-600">
                {isUploading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Upload size={48} />
                  </motion.div>
                ) : (
                  <Upload size={48} />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-emerald-950 uppercase italic tracking-tight">Arraste seu arquivo XML</h3>
                <p className="text-emerald-900/40 font-medium">Ou clique para selecionar no seu computador</p>
              </div>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase italic tracking-tight shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
              </button>
              <div className="flex items-center gap-4 text-[10px] font-black text-emerald-900/30 uppercase italic tracking-widest">
                <span>Formatos aceitos: .XML</span>
                <span>•</span>
                <span>Tamanho máx: 10MB</span>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Invoice Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: FileText, label: 'Número NF-e', value: '000.123.456' },
                { icon: Truck, label: 'Fornecedor', value: 'AMBEV S.A.' },
                { icon: Calendar, label: 'Emissão', value: '01/03/2024' },
                { icon: DollarSign, label: 'Valor Total', value: 'R$ 1.250,00' },
              ].map((info) => (
                <div key={info.label} className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                  <div className="text-emerald-600 mb-2"><info.icon size={20} /></div>
                  <div className="text-xs font-black text-emerald-900/40 uppercase italic tracking-tight">{info.label}</div>
                  <div className="text-lg font-black text-emerald-950 italic">{info.value}</div>
                </div>
              ))}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-[32px] border border-emerald-100 overflow-hidden">
              <div className="p-6 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/30">
                <h3 className="text-lg font-black text-emerald-950 uppercase italic tracking-tight">Produtos na Nota</h3>
                <span className="text-xs font-black text-emerald-600 uppercase italic bg-emerald-100 px-3 py-1 rounded-full">12 Itens Identificados</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-emerald-50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Cód. Fornecedor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Qtd.</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Un.</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Vlr. Unit</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Vlr. Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Vínculo Sistema</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {[
                    { id: '1020', name: 'Cerveja Skol 350ml Lata', qty: 240, un: 'UN', unit: 'R$ 2,50', total: 'R$ 600,00', linked: true },
                    { id: '1021', name: 'Cerveja Brahma 350ml Lata', qty: 240, un: 'UN', unit: 'R$ 2,70', total: 'R$ 648,00', linked: true },
                    { id: '9999', name: 'Novo Produto Teste', qty: 1, un: 'UN', unit: 'R$ 2,00', total: 'R$ 2,00', linked: false },
                  ].map((prod) => (
                    <tr key={prod.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-emerald-900">{prod.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-950">{prod.name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-900">{prod.qty}</td>
                      <td className="px-6 py-4 text-xs font-black text-emerald-900/40">{prod.un}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-950">{prod.unit}</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-950 italic">{prod.total}</td>
                      <td className="px-6 py-4">
                        {prod.linked ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black uppercase italic">Vinculado</span>
                          </div>
                        ) : (
                          <button className="flex items-center gap-2 text-rose-600 hover:text-rose-700 transition-colors">
                            <AlertCircle size={16} />
                            <span className="text-[10px] font-black uppercase italic underline">Vincular Agora</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-8 bg-emerald-950 rounded-[32px] text-white">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] font-black text-emerald-400 uppercase italic tracking-widest">Total da Nota</div>
                  <div className="text-2xl font-black italic tracking-tight">R$ 1.250,00</div>
                </div>
                <div className="w-px h-10 bg-emerald-800" />
                <div>
                  <div className="text-[10px] font-black text-emerald-400 uppercase italic tracking-widest">Itens Pendentes</div>
                  <div className="text-2xl font-black italic tracking-tight">01</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="px-8 py-4 bg-emerald-900 text-emerald-100 rounded-2xl font-black uppercase italic tracking-tight hover:bg-emerald-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase italic tracking-tight shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
                >
                  Confirmar Entrada
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-8"
          >
            <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-600/20">
              <CheckCircle2 size={64} />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-emerald-950 uppercase italic tracking-tight">Entrada Concluída!</h2>
              <p className="text-emerald-900/40 font-medium max-w-md mx-auto">
                A nota fiscal foi processada com sucesso. O estoque foi atualizado e o financeiro gerado.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
              <Link 
                href="/compras"
                className="px-8 py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-black uppercase italic tracking-tight hover:bg-emerald-100 transition-all"
              >
                Voltar para Compras
              </Link>
              <Link 
                href="/produtos"
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                Ver Estoque
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
