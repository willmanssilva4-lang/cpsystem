import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Search, CheckCircle, AlertCircle, Receipt, Clock } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Sale } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InvoiceModalProps {
  onClose: () => void;
}

export function InvoiceModal({ onClose }: InvoiceModalProps) {
  const { sales } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [emittingId, setEmittingId] = useState<string | null>(null);
  const [emittedIds, setEmittedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Sort sales by date descending
  const sortedSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredSales = sortedSales.filter(sale => 
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    new Date(sale.date).toLocaleDateString().includes(searchTerm)
  ).slice(0, 20); // Limit to 20 recent sales

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  const handleEmit = (saleId: string, type: 'NFE' | 'NFCE') => {
    setEmittingId(saleId);
    
    // Simulate API call to emit invoice
    setTimeout(() => {
      setEmittingId(null);
      setEmittedIds(prev => {
        const newSet = new Set(prev);
        newSet.add(saleId);
        return newSet;
      });
    }, 1500);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100">Emissão de Notas Fiscais</h2>
              <p className="text-xs font-medium text-slate-500">Selecione uma venda recente para emitir NF-e ou NFC-e</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID da venda ou data..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-medium focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
          {filteredSales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Receipt size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhuma venda encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                        #{sale.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-slate-500 font-medium">
                        <Clock size={14} />
                        {formatDate(sale.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {formatCurrency(sale.total)}
                      </div>
                      <div className="text-sm text-slate-500 font-medium">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                      </div>
                      <div className="text-sm text-slate-500 font-medium capitalize">
                        Pagamento: {sale.paymentMethod}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {emittedIds.has(sale.id) ? (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg font-bold w-full sm:w-auto justify-center">
                        <CheckCircle size={18} />
                        <span>Emitida</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEmit(sale.id, 'NFCE')}
                          disabled={emittingId !== null}
                          className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {emittingId === sale.id ? 'Emitindo...' : 'NFC-e'}
                        </button>
                        <button
                          onClick={() => handleEmit(sale.id, 'NFE')}
                          disabled={emittingId !== null}
                          className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {emittingId === sale.id ? 'Emitindo...' : 'NF-e'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
