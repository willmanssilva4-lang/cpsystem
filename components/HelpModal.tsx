'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight, PlayCircle, Keyboard, HelpCircle, Book, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HELP_CATEGORIES, HELP_ARTICLES, SHORTCUTS, HelpArticle } from '@/lib/helpData';
import { cn } from '@/lib/utils';

export function HelpModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('pdv');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const filteredArticles = useMemo(() => {
    if (searchQuery) {
      return HELP_ARTICLES.filter(article => 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return HELP_ARTICLES.filter(article => article.category === selectedCategoryId);
  }, [searchQuery, selectedCategoryId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-blue-support/40 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl border-4 border-brand-blue overflow-hidden flex flex-col h-[85vh]"
          >
            {/* Header */}
            <div className="bg-brand-blue p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <HelpCircle size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Central de Ajuda</h2>
                  <p className="text-white/70 font-bold uppercase text-[10px] tracking-widest">Dicas e Guia de Utilização do Sistema</p>
                </div>
              </div>

              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                <input 
                  type="text"
                  placeholder="Buscar ajuda... (ex: como fazer venda)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border-2 border-white/20 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all font-bold text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowShortcuts(!showShortcuts)}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors"
                  title="Atalhos do Teclado"
                >
                  <Keyboard size={24} />
                </button>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar: Categories */}
              <div className="w-64 border-r border-brand-border bg-slate-50 overflow-y-auto p-4 space-y-2">
                <p className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest px-4 mb-4">Categorias</p>
                {HELP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSearchQuery('');
                      setSelectedArticle(null);
                      setShowShortcuts(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm",
                      selectedCategoryId === cat.id && !searchQuery && !showShortcuts
                        ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20"
                        : "text-brand-text-sec hover:bg-white hover:text-brand-blue"
                    )}
                  >
                    <cat.icon size={18} />
                    <span>{cat.label}</span>
                  </button>
                ))}
                
                <div className="pt-4 mt-4 border-t border-brand-border">
                  <button
                    onClick={() => setShowShortcuts(true)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm",
                      showShortcuts
                        ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20"
                        : "text-brand-text-sec hover:bg-white hover:text-brand-blue"
                    )}
                  >
                    <Keyboard size={18} />
                    <span>Atalhos do Sistema</span>
                  </button>
                </div>
              </div>

              {/* Right Side: Content */}
              <div className="flex-1 overflow-y-auto bg-white p-8 custom-scrollbar">
                {showShortcuts ? (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-brand-blue/10 rounded-3xl flex items-center justify-center text-brand-blue">
                        <Keyboard size={32} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black italic uppercase text-brand-text-main tracking-tight">Atalhos do Sistema</h3>
                        <p className="text-brand-text-sec font-bold uppercase text-xs tracking-widest">Agilize sua operação com o teclado</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {SHORTCUTS.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-brand-border rounded-2xl">
                          <span className="font-bold text-brand-text-main">{s.description}</span>
                          <kbd className="bg-brand-blue text-white px-3 py-1 rounded-lg font-black italic text-sm shadow-sm">{s.key}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedArticle ? (
                  <div className="space-y-8">
                    <button 
                      onClick={() => setSelectedArticle(null)}
                      className="text-brand-blue font-black italic uppercase text-xs flex items-center gap-2 hover:underline mb-4"
                    >
                      <ChevronRight className="rotate-180" size={16} />
                      Voltar para lista
                    </button>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-brand-blue/10 rounded-3xl flex items-center justify-center text-brand-blue">
                          <Book size={32} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black italic uppercase text-brand-text-main tracking-tight">{selectedArticle.title}</h3>
                          <p className="text-brand-text-sec font-bold uppercase text-xs tracking-widest">Passo a Passo Detalhado</p>
                        </div>
                      </div>
                      {selectedArticle.videoUrl && (
                        <button className="flex items-center gap-2 bg-brand-green/10 text-brand-green px-4 py-2 rounded-xl font-black italic uppercase text-xs hover:bg-brand-green hover:text-white transition-all">
                          <PlayCircle size={18} />
                          Ver Vídeo
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {selectedArticle.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 border-2 border-brand-border rounded-2xl group hover:border-brand-blue/30 transition-all">
                          <div className="w-8 h-8 bg-brand-blue text-white rounded-xl flex items-center justify-center font-black italic shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-brand-text-main font-bold pt-1">{step}</p>
                        </div>
                      ))}
                    </div>

                    {selectedArticle.tip && (
                      <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                          <Info size={24} />
                        </div>
                        <div>
                          <h4 className="font-black italic uppercase text-amber-900 text-sm mb-1">Dica Profissional</h4>
                          <p className="text-sm text-amber-800 font-medium">{selectedArticle.tip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-brand-blue/10 rounded-3xl flex items-center justify-center text-brand-blue">
                        {searchQuery ? <Search size={32} /> : React.createElement(HELP_CATEGORIES.find(c => c.id === selectedCategoryId)?.icon || Book, { size: 32 })}
                      </div>
                      <div>
                        <h3 className="text-3xl font-black italic uppercase text-brand-text-main tracking-tight">
                          {searchQuery ? `Resultados para "${searchQuery}"` : HELP_CATEGORIES.find(c => c.id === selectedCategoryId)?.label}
                        </h3>
                        <p className="text-brand-text-sec font-bold uppercase text-xs tracking-widest">Selecione um tópico para ver os detalhes</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {filteredArticles.length > 0 ? (
                        filteredArticles.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => setSelectedArticle(article)}
                            className="w-full flex items-center justify-between p-6 bg-white border-2 border-brand-border rounded-3xl hover:border-brand-blue hover:shadow-xl hover:shadow-brand-blue/10 transition-all group text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-brand-text-sec group-hover:bg-brand-blue group-hover:text-white transition-colors">
                                <Book size={20} />
                              </div>
                              <span className="font-black italic uppercase text-brand-text-main group-hover:text-brand-blue transition-colors">
                                {article.title}
                              </span>
                            </div>
                            <ChevronRight className="text-brand-border group-hover:text-brand-blue transition-colors" size={24} />
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-brand-text-sec font-bold">Nenhuma dica encontrada para sua busca.</p>
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-brand-blue font-black italic uppercase text-xs hover:underline"
                          >
                            Limpar busca
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-brand-border flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-brand-blue border-2 border-white flex items-center justify-center text-[10px] text-white font-black">
                      {i}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-brand-text-sec font-bold">Mais de 50 dicas prontas para você!</p>
              </div>
              
              <button 
                onClick={() => window.open('https://wa.me/5500000000000', '_blank')}
                className="bg-brand-blue text-white px-8 py-3 rounded-2xl font-black italic uppercase text-xs tracking-widest hover:bg-brand-blue-support transition-all active:scale-95 shadow-lg shadow-brand-blue/20"
              >
                Suporte via WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
