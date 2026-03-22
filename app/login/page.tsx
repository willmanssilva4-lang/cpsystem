'use client';

import React, { useState } from 'react';
import { useERP } from '@/lib/context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  BarChart2, 
  MonitorSmartphone, 
  ShoppingBag, 
  Users, 
  LayoutDashboard 
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

function LoginLogo({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-brand-blue';
  const dotColor = theme === 'dark' ? '#00E676' : '#1E5EFF';
  const checkColor = '#00E676';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-center">
        <span className={`${textColor} font-black text-5xl tracking-tight`}>Cps</span>
        <svg viewBox="0 0 40 40" className="w-12 h-12 -mx-3" style={{ overflow: 'visible' }}>
          {/* Checkmark 'y' */}
          <path d="M 12 16 L 20 28 L 36 4" fill="none" stroke={checkColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* Stem of 'y' */}
          <path d="M 20 28 L 12 42" fill="none" stroke={checkColor} strokeWidth="6" strokeLinecap="round" />
          {/* Dot */}
          <circle cx="20" cy="28" r="5" fill={dotColor} />
        </svg>
        <span className={`${textColor} font-black text-5xl tracking-tight`}>stem</span>
      </div>
      <span className={`${textColor} font-bold tracking-[0.2em] text-[10px] mt-1`}>
        GESTÃO FINANCEIRA INTELIGENTE
      </span>
    </div>
  );
}

const MODULES = [
  { icon: ShoppingCart, label: 'Vendas', color: 'text-brand-green', border: 'border-brand-green/30' },
  { icon: Package, label: 'Estoque', color: 'text-brand-warning', border: 'border-brand-warning/30' },
  { icon: DollarSign, label: 'Financeiro', color: 'text-brand-blue-support', border: 'border-brand-blue-support/30' },
  { icon: BarChart2, label: 'Relatórios', color: 'text-purple-400', border: 'border-purple-400/30' },
  { icon: MonitorSmartphone, label: 'PDV', color: 'text-brand-info', border: 'border-brand-info/30' },
  { icon: ShoppingBag, label: 'Compras', color: 'text-orange-400', border: 'border-orange-400/30' },
  { icon: Users, label: 'Clientes', color: 'text-brand-blue-support', border: 'border-brand-blue-support/30' },
  { icon: LayoutDashboard, label: 'Dashboard', color: 'text-brand-green', border: 'border-brand-green/30' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');
  const { login } = useERP();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/');
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    setLoading(true);
    setSetupMessage('');
    try {
      const email = 'suporte@cpsstem.com.br';
      const password = 'admin123';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setSetupMessage(`Erro ao criar admin: ${error.message}`);
      } else if (data.user) {
        // Tentar login automático
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!loginError) {
          setSetupMessage('Usuário criado e logado com sucesso! Redirecionando...');
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          setSetupMessage('Usuário criado! Senha: admin123. Faça login agora.');
        }
      }
    } catch (err) {
      setSetupMessage('Erro inesperado ao criar admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-blue relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1F3A] via-brand-blue to-brand-blue-hover opacity-90" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(43,182,115,0.15),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(30,90,168,0.4),transparent_50%)]" />
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
      </div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 p-4 lg:p-12 relative z-10 items-center">
        
        {/* Left Side - Marketing */}
        <div className="hidden lg:flex flex-col items-center text-center space-y-10">
          <LoginLogo theme="dark" />
          
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-white tracking-tight">
              Controle Total da Gestão
            </h1>
            <h2 className="text-5xl font-bold text-brand-green tracking-tight">
              do seu Negócio
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-4 w-full max-w-2xl mt-8">
            {MODULES.map((mod, idx) => (
              <motion.div
                key={mod.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border ${mod.border} backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default`}
              >
                <mod.icon className={`${mod.color}`} size={32} strokeWidth={1.5} />
                <span className="text-white font-medium text-sm">{mod.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex justify-center w-full">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[480px] bg-brand-card rounded-[32px] p-10 shadow-2xl relative overflow-hidden"
          >
            {/* Decorative corner accent */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-brand-blue/5 to-brand-green/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <LoginLogo theme="light" />
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">
                  <span className="text-brand-text-main">Acesse </span>
                  <span className="text-brand-text-sec">sua Conta</span>
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-xl text-brand-danger text-sm font-medium text-center">
                    {error}
                  </div>
                )}
                
                {setupMessage && (
                  <div className="p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl text-brand-green text-sm font-medium text-center">
                    {setupMessage}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-main ml-1">
                    <User size={16} className="text-brand-text-sec" />
                    Usuário
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec" size={18} />
                    <input 
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all outline-none text-brand-text-main placeholder:text-brand-text-sec"
                      placeholder="Digite seu usuário"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-main ml-1">
                    <Lock size={16} className="text-brand-text-sec" />
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 bg-white border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all outline-none text-brand-text-main placeholder:text-brand-text-sec"
                      placeholder="Digite sua senha"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-sec hover:text-brand-text-main transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="w-5 h-5 rounded border border-brand-border flex items-center justify-center group-hover:border-brand-blue transition-colors">
                      <input type="checkbox" className="opacity-0 absolute" />
                      <div className="w-3 h-3 rounded-sm bg-brand-blue scale-0 transition-transform" />
                    </div>
                    <span className="text-sm text-brand-text-sec select-none">Lembrar-me</span>
                  </label>
                  <a href="#" className="text-sm font-medium text-brand-blue hover:underline">
                    Esqueceu sua senha?
                  </a>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl font-bold text-lg shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Lock size={20} />
                  {loading ? 'Entrando...' : 'Entrar no Sistema'}
                </button>
                
                <button
                  type="button"
                  onClick={handleCreateAdmin}
                  disabled={loading}
                  className="w-full py-2 mt-2 text-xs text-brand-text-sec hover:text-brand-blue underline transition-colors"
                >
                  Primeiro acesso? Clique aqui para registrar o Admin
                </button>
              </form>

              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-brand-text-sec">Ou acesse com</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-2.5 border border-brand-border rounded-xl hover:bg-slate-50 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm font-medium text-brand-text-main">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 border border-brand-border rounded-xl hover:bg-slate-50 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 21 21">
                    <path fill="#f25022" d="M1 1h9v9H1z" />
                    <path fill="#00a4ef" d="M1 11h9v9H1z" />
                    <path fill="#7fba00" d="M11 1h9v9h-9z" />
                    <path fill="#ffb900" d="M11 11h9v9h-9z" />
                  </svg>
                  <span className="text-sm font-medium text-brand-text-main">Microsoft</span>
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-brand-green shadow-[0_0_8px_rgba(43,182,115,0.5)]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-brand-text-main">Suporte Online</span>
                  <span className="text-xs text-brand-text-sec">Ativo • 24/7</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
