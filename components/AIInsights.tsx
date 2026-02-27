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
        model: "gemini-2.0-flash-exp",
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
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-300" size={20} />
          <h3 className="font-bold text-lg">AI Business Insights</h3>
        </div>
        {!insight && !loading && (
          <button 
            onClick={generateInsight}
            className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-2"
          >
            Gerar Análise <Send size={12} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm font-medium opacity-80">Analisando tendências e métricas...</p>
        </div>
      ) : insight ? (
        <div className="prose prose-invert prose-sm max-w-none">
          <Markdown>{insight}</Markdown>
          <button 
            onClick={() => setInsight(null)}
            className="mt-4 text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100"
          >
            Nova Análise
          </button>
        </div>
      ) : (
        <p className="text-sm opacity-80">
          Clique no botão acima para que a inteligência artificial analise suas vendas, estoque e financeiro para sugerir melhorias.
        </p>
      )}
    </div>
  );
}
