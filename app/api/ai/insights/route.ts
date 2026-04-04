import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { data } = await req.json();

    // Busca a chave de forma inteligente varrendo todas as variáveis de ambiente
    const env = process.env as Record<string, string>;
    
    // Lista de nomes prováveis em ordem de prioridade
    const priorityKeys = [
      'CHAVE_MESTRA',
      'NEXT_PUBLIC_GEMINI_API_KEY',
      'GEMINI_API_KEY',
      'PRÓXIMA_CHAVE_API_PÚBLICA_GEMINI',
      'PROXIMA_CHAVE_API_PUBLICA_GEMINI'
    ];

    let apiKey = '';
    let usedKeyName = '';
    
    // 1. Tenta as chaves prioritárias
    for (const key of priorityKeys) {
      const val = env[key];
      if (val && val !== 'MY_GEMINI_API_KEY' && val.trim() !== '') {
        apiKey = val.trim();
        usedKeyName = key;
        break;
      }
    }

    // 2. Se não encontrou, procura por qualquer variável cujo VALOR comece com "AIza"
    // Isso é infalível, pois todas as chaves Gemini começam com esse prefixo.
    if (!apiKey) {
      const foundByValue = Object.keys(env).find(k => 
        env[k] && typeof env[k] === 'string' && env[k].trim().startsWith('AIza')
      );
      if (foundByValue) {
        apiKey = env[foundByValue].trim();
        usedKeyName = foundByValue;
      }
    }

    // 3. Fallback: procura por qualquer chave que contenha "GEMINI"
    if (!apiKey) {
      const foundKeyName = Object.keys(env).find(k => 
        k.toUpperCase().includes('GEMINI') && 
        env[k] && env[k] !== 'MY_GEMINI_API_KEY' && env[k].trim() !== ''
      );
      if (foundKeyName) {
        apiKey = env[foundKeyName].trim();
        usedKeyName = foundKeyName;
      }
    }

    if (!apiKey) {
      const diagnostics = Object.keys(env)
        .filter(k => k.includes('GEMINI') || k.includes('KEY') || k.includes('API'))
        .map(k => {
          const val = env[k] || '';
          let status = 'vazio';
          if (val === 'MY_GEMINI_API_KEY') status = 'valor_de_exemplo';
          else if (val.trim().startsWith('AIza')) status = 'valido_AIza';
          else if (val.length > 0) status = `preenchido_mas_invalido(${val.substring(0, 3)}...)`;
          return `${k}=${status}`;
        })
        .join(', ');
        
      return NextResponse.json(
        { error: `Chave não encontrada ou inválida. Diagnóstico: [${diagnostics || 'Nenhuma variável encontrada'}]. Certifique-se de que o valor nos Secrets começa com 'AIza' e não é o valor de exemplo.` },
        { status: 400 }
      );
    }

    // Validação básica do formato da chave Gemini (geralmente começa com AIza)
    if (!apiKey.startsWith('AIza')) {
      return NextResponse.json(
        { error: `A chave encontrada (${usedKeyName}) não parece ser uma chave válida do Google Gemini (deve começar com 'AIza'). Por favor, verifique o valor nos Secrets.` },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um consultor de negócios especializado em varejo. Analise os seguintes dados do ERP e forneça 3 insights estratégicos curtos, impactantes e acionáveis para o dono da loja. 
      Foque em:
      1. Tendências de vendas ou oportunidades de receita.
      2. Gestão de estoque ou produtos.
      3. Saúde financeira ou controle de despesas.

      Dados do ERP: ${JSON.stringify(data)}
      
      Responda em Português do Brasil de forma profissional e direta usando Markdown.`,
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar IA" },
      { status: 500 }
    );
  }
}
