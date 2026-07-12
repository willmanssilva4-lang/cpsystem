'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PDVErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PDVErrorBoundary] Capturado um erro não tratado no PDV:', error, errorInfo);
  }

  private handleRestore = () => {
    this.setState({ hasError: false, error: null });
    // Attempt to force-clean any corrupted local states or triggers if possible, but keep the user on the page
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4 md:p-6 text-white font-sans selection:bg-rose-500">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Alert Icon */}
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white mb-2 uppercase">
                Atenção no PDV
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Ocorreu uma instabilidade temporária ao renderizar ou processar a última ação no PDV. 
                Não se preocupe, você <span className="font-semibold text-rose-300">não precisa sair do PDV</span> nem perder sua sessão!
              </p>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3 mb-6">
                <button
                  onClick={this.handleRestore}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar e Continuar
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={this.handleReload}
                    className="py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Recarregar Tela
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Home className="w-3.5 h-3.5" />
                    Ir para o Início
                  </button>
                </div>
              </div>

              {/* Collapsible Error Info */}
              <details className="w-full group text-left border border-slate-700/40 rounded-xl bg-slate-900/30 overflow-hidden">
                <summary className="px-4 py-2 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-400 select-none flex justify-between items-center bg-slate-900/20">
                  <span>Detalhes Técnicos</span>
                  <span className="text-[10px] text-slate-600 transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="p-3 border-t border-slate-700/30 max-h-36 overflow-y-auto">
                  <p className="text-[11px] font-mono text-rose-300/80 break-words leading-relaxed whitespace-pre-wrap">
                    {this.state.error?.stack || this.state.error?.message || 'Erro indefinido'}
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
