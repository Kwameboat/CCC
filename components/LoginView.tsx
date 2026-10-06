import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Zap, KeyRound } from 'lucide-react';
import { supabase, isDemoLoginEnabled } from '../lib/supabase';
import { showToast } from '../lib/toast';
import Logo from './Logo';
import type { Session } from '@supabase/supabase-js';

interface LoginViewProps {
  onLogin: (session: Session | { user: { email: string; id: string }; isDemo: true }) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const demoEnabled = isDemoLoginEnabled();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both administrative email and password.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResetSent(false);

    if (demoEnabled && email === 'admin@charis.org' && password === 'churchadmin') {
      setTimeout(() => {
        onLogin({ user: { email: 'admin@charis.org', id: 'demo-user' }, isDemo: true });
      }, 600);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsProcessing(false);
        return;
      }

      if (data.session) onLogin(data.session);
    } catch {
      setError('Unable to reach authentication service. Check your connection and try again.');
      setIsProcessing(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email above, then click Forgot Access.');
      return;
    }
    setIsProcessing(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setIsProcessing(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
    showToast('Password reset email sent.', 'success');
  };

  const handleDemoAccess = () => {
    if (!demoEnabled) return;
    setIsProcessing(true);
    setTimeout(() => {
      onLogin({ user: { email: 'demo@charis.org', id: 'demo-user' }, isDemo: true });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-gold-600 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-gold-900 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[3.5rem] sm:rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] overflow-hidden border border-white/20 animate-slideUp">
          <div className="bg-slate-950 p-8 sm:p-10 pt-10 sm:pt-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#c59235,transparent)] opacity-40"></div>
            <Logo size={120} className="relative z-10 mb-2" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter relative z-10 mt-4">Console Access</h1>
            <p className="text-gold-400 text-[10px] font-black uppercase tracking-[0.4em] relative z-10 mt-2">Charis Christian Center</p>
          </div>

          <div className="p-10 pt-12">
            <div className="mb-10 text-center">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Administrator Login</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Secure gateway for CCC authorized personnel only.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase leading-tight animate-shake">
                  <AlertCircle size={18} className="shrink-0" /> {error}
                </div>
              )}
              {resetSent && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-[10px] font-black uppercase leading-tight">
                  <KeyRound size={18} className="shrink-0" /> Check your inbox for a reset link.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gold-600 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@charis.org"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-gold-500 focus:bg-white font-bold transition-all text-sm text-slate-900"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[9px] font-black text-gold-600 uppercase tracking-widest hover:underline"
                  >
                    Forgot Access?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gold-600 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-14 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-gold-500 focus:bg-white font-bold transition-all text-sm text-slate-900"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-gold-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-5 bg-gold-500 text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-gold-100 hover:bg-gold-600 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Authorizing...
                    </>
                  ) : (
                    <>
                      Establish Session <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {demoEnabled && (
                  <>
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">dev only</span>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDemoAccess}
                      disabled={isProcessing}
                      className="w-full py-4 border-2 border-slate-100 text-slate-400 hover:text-gold-600 hover:border-gold-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
                    >
                      <Zap size={14} className="group-hover:fill-current" /> Quick Demo Access
                    </button>
                  </>
                )}
              </div>
            </form>

            <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
              <ShieldCheck size={16} className="text-gold-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">CCC Infrastructure v4.3.0 Production</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default LoginView;
