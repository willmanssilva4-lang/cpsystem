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
import { cn } from '@/lib/utils';

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
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');
  const { login } = useERP();
  const router = useRouter();
  const [resetMode, setResetMode] = useState(false);

  // Load remembered email and check for reset token
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('erp_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check if we are in reset mode (from Supabase email link)
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      setResetMode(true);
      setSetupMessage('E-mail verificado! Por favor, defina sua nova senha abaixo.');
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(`Erro ao atualizar senha: ${error.message}`);
      } else {
        setSetupMessage('Senha atualizada com sucesso! Você já pode fazer login.');
        setResetMode(false);
        setPassword('');
      }
    } catch (err) {
      setError('Erro ao processar atualização de senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('erp_remembered_email', email);
        } else {
          localStorage.removeItem('erp_remembered_email');
        }

        router.push('/');
      } else {
        setError(result.error || 'Usuário ou senha incorretos.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);
    setError('');
    setSetupMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });

      if (error) {
        setError(`Erro ao enviar e-mail de recuperação: ${error.message}`);
      } else {
        setSetupMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (err) {
      setError('Erro ao processar solicitação de recuperação.');
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
                <h2 className="text-2xl font-bold text-black">
                  {resetMode ? 'Nova Senha' : 'Acesse sua Conta'}
                </h2>
              </div>

              <form onSubmit={resetMode ? handleUpdatePassword : handleSubmit} className="space-y-5">
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

                {!resetMode && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-text-main ml-1">
                      <User size={16} className="text-brand-text-sec" />
                      Usuário
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec" size={18} />
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
                )}

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-brand-text-main ml-1">
                    <Lock size={16} className="text-brand-text-sec" />
                    {resetMode ? 'Nova Senha' : 'Senha'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 bg-white border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all outline-none text-brand-text-main placeholder:text-brand-text-sec"
                      placeholder={resetMode ? "Digite sua nova senha" : "Digite sua senha"}
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

                {!resetMode && (
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="w-5 h-5 rounded border border-brand-border flex items-center justify-center group-hover:border-brand-blue transition-colors">
                        <input 
                          type="checkbox" 
                          className="opacity-0 absolute" 
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <div className={cn(
                          "w-3 h-3 rounded-sm bg-brand-blue transition-transform",
                          rememberMe ? "scale-100" : "scale-0"
                        )} />
                      </div>
                      <span className="text-sm text-brand-text-sec select-none">Lembrar-me</span>
                    </label>
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm font-medium text-brand-blue hover:underline bg-transparent border-none p-0 cursor-pointer"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl font-bold text-lg shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Lock size={20} />
                  {loading ? (resetMode ? 'Atualizando...' : 'Entrando...') : (resetMode ? 'Atualizar Senha' : 'Entrar no Sistema')}
                </button>
                
                {resetMode && (
                  <button
                    type="button"
                    onClick={() => setResetMode(false)}
                    className="w-full py-2 mt-2 text-xs text-brand-text-sec hover:text-brand-blue underline transition-colors"
                  >
                    Voltar para o Login
                  </button>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
