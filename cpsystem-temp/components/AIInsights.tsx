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
    <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-brand-text-main shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-blue" size={20} />
          <h3 className="font-semibold text-brand-text-main">AI Business Insights</h3>
        </div>
        {!insight && !loading && (
          <button 
            onClick={generateInsight}
            className="bg-brand-blue hover:bg-brand-blue-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
          >
            Gerar Análise <Send size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="animate-spin text-brand-blue" size={32} />
          <p className="text-sm font-medium text-brand-text-sec">Analisando tendências e métricas...</p>
        </div>
      ) : insight ? (
        <div className="prose prose-sm max-w-none text-brand-text-sec">
          <Markdown>{insight}</Markdown>
          <button 
            onClick={() => setInsight(null)}
            className="mt-4 text-sm font-medium text-brand-blue hover:text-brand-blue-hover transition-colors"
          >
            Nova Análise
          </button>
        </div>
      ) : (
        <p className="text-sm font-medium text-brand-text-sec">
          Clique no botão acima para que a inteligência artificial analise suas vendas, estoque e financeiro para sugerir melhorias.
        </p>
      )}
    </div>
  );
}
