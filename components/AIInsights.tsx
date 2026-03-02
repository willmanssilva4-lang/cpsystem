'use client';

import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

export function AIInsights({ data }: { data: any }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um analista de negócios sênior. Analise os seguintes dados do ERP e forneça 3 insights estratégicos curtos e acionáveis para o gerente da loja.
        Dados: ${JSON.stringify(data)}
        Responda em Português do Brasil usando Markdown.`,
      });
      setInsight(response.text || "Não foi possível gerar insights no momento.");
    } catch (error) {
      console.error(error);
      setInsight("Erro ao conectar com a inteligência artificial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-emerald-100 rounded-3xl p-6 text-emerald-950 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-emerald-500" size={20} />
          <h3 className="font-black italic uppercase text-emerald-900">AI Business Insights</h3>
        </div>
        {!insight && !loading && (
          <button 
            onClick={generateInsight}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            Gerar Análise <Send size={12} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-sm font-black text-emerald-600/60 uppercase italic">Analisando tendências e métricas...</p>
        </div>
      ) : insight ? (
        <div className="prose prose-emerald prose-sm max-w-none">
          <Markdown>{insight}</Markdown>
          <button 
            onClick={() => setInsight(null)}
            className="mt-4 text-[10px] uppercase font-black italic tracking-widest text-emerald-600/40 hover:text-emerald-600 transition-colors"
          >
            Nova Análise
          </button>
        </div>
      ) : (
        <p className="text-sm font-medium text-emerald-900/60 italic">
          Clique no botão acima para que a inteligência artificial analise suas vendas, estoque e financeiro para sugerir melhorias.
        </p>
      )}
    </div>
  );
}
