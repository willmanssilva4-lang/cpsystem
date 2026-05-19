'use client';

import React, { useState } from 'react';
import { X, Settings2, Check, Percent, Calculator, Edit3, Sparkles } from 'lucide-react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

interface PricingSettingsModalProps {
  onClose: () => void;
}

export default function PricingSettingsModal({ onClose }: PricingSettingsModalProps) {
  const { pricingSettings, updatePricingSettings } = useERP();
  const [formData, setFormData] = useState(pricingSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Small delay to show the "Saving" state
    setTimeout(() => {
      try {
        updatePricingSettings(formData);
        setIsSaving(false);
        setShowSuccess(true);
        
        // Show native alert as requested, but with a slight delay to ensure UI updates
        setTimeout(() => {
          alert('✅ Configurações de precificação salvas com sucesso!');
          onClose();
        }, 100);
      } catch (error) {
        console.error('Erro ao salvar:', error);
        setIsSaving(false);
        alert('❌ Erro ao salvar as configurações.');
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl border border-brand-border overflow-hidden flex flex-col animate-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-brand-blue px-8 py-6 flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Settings2 className="text-white" size={24} />
            </div>
            <h2 className="text-xl font-black text-white tracking-widest uppercase italic">Configurações de Precificação</h2>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Method Selection */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase italic text-brand-text-main/60 tracking-widest flex items-center gap-2">
              <Calculator size={12} />
              Sistema trabalha com:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, defaultMethod: 'margin' }))}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                  formData.defaultMethod === 'margin' 
                    ? "border-brand-blue-hover bg-slate-50 text-brand-text-main" 
                    : "border-brand-border bg-white text-brand-text-main/40 hover:border-brand-border"
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="font-black uppercase italic text-xs">Margem (%)</span>
                  <span className="text-[10px] opacity-60">Baseado no valor final</span>
                </div>
                {formData.defaultMethod === 'margin' && <Check size={16} className="text-brand-blue" />}
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, defaultMethod: 'markup' }))}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                  formData.defaultMethod === 'markup' 
                    ? "border-brand-blue-hover bg-slate-50 text-brand-text-main" 
                    : "border-brand-border bg-white text-brand-text-main/40 hover:border-brand-border"
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="font-black uppercase italic text-xs">Markup (%)</span>
                  <span className="text-[10px] opacity-60">Baseado no custo</span>
                </div>
                {formData.defaultMethod === 'markup' && <Check size={16} className="text-brand-blue" />}
              </button>
            </div>
          </div>

          {/* Default Values */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase italic text-brand-text-main/60 tracking-widest flex items-center gap-2">
                <Percent size={12} />
                Margem Padrão
              </label>
              <div className="relative">
                <input 
                  type="number"
                  value={formData.defaultMargin}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultMargin: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-brand-border px-4 py-3 rounded-2xl text-lg font-black text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 font-black">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase italic text-brand-text-main/60 tracking-widest flex items-center gap-2">
                <Percent size={12} />
                Markup Padrão
              </label>
              <div className="relative">
                <input 
                  type="number"
                  value={formData.defaultMarkup}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultMarkup: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-brand-border px-4 py-3 rounded-2xl text-lg font-black text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 font-black">%</span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-brand-border">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl text-brand-blue">
                  <Edit3 size={18} />
                </div>
                <div>
                  <p className="font-black uppercase italic text-xs text-brand-text-main">Permitir editar no produto?</p>
                  <p className="text-[10px] text-brand-text-main/60">Habilita/Desabilita edição manual</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, allowEditOnProduct: !prev.allowEditOnProduct }))}
                className={cn(
                  "w-14 h-8 rounded-full p-1 transition-all duration-300",
                  formData.allowEditOnProduct ? "bg-brand-blue" : "bg-brand-border"
                )}
              >
                <div className={cn(
                  "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 transform",
                  formData.allowEditOnProduct ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-brand-border">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl text-brand-blue">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="font-black uppercase italic text-xs text-brand-text-main">Arredondamento automático</p>
                  <p className="text-[10px] text-brand-text-main/60">Ex: Terminar preços em ,99</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, autoRounding: !prev.autoRounding }))}
                className={cn(
                  "w-14 h-8 rounded-full p-1 transition-all duration-300",
                  formData.autoRounding ? "bg-brand-blue" : "bg-brand-border"
                )}
              >
                <div className={cn(
                  "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 transform",
                  formData.autoRounding ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <div className={cn(
              "flex items-center justify-center gap-2 text-brand-blue font-black uppercase italic text-xs transition-all duration-500",
              showSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            )}>
              <Check size={16} className="bg-brand-border rounded-full p-0.5" />
              Configurações salvas com sucesso!
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "w-full text-white py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed",
                isSaving ? "bg-brand-text-sec" : "bg-brand-blue hover:bg-brand-blue-hover shadow-brand-blue/20"
              )}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configurações"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
