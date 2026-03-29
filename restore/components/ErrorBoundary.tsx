'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-rose-600" size={40} />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 uppercase italic mb-2">Ops! Algo deu errado</h1>
            <p className="text-slate-600 mb-8">
              Ocorreu um erro inesperado na aplicação. Nossa equipe técnica já foi notificada.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-8 p-4 bg-slate-100 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-rose-700 whitespace-pre-wrap">
                  {this.state.error?.stack}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 w-full py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/20"
              >
                <RefreshCw size={20} />
                Recarregar Página
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                <Home size={20} />
                Voltar ao Início
              </button>
            </div>
            
            <p className="mt-8 text-xs text-slate-400">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
