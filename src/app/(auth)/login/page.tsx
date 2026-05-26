"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Building, User, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { loginAction, signUpAction } from "@/features/auth/actions";

export default function LoginPage() {
  const router = useRouter();
  
  // Tab State: 'signin' | 'signup'
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      if (activeTab === "signin") {
        const res = await loginAction(formData);
        if (res.success) {
          setMessage({ type: "success", text: "Login efetuado! Redirecionando..." });
          setTimeout(() => {
            router.push("/dashboard");
          }, 1000);
        } else {
          setMessage({ type: "error", text: res.error || "Ocorreu um erro no login." });
        }
      } else {
        formData.append("fullName", fullName);
        formData.append("companyName", companyName);

        const res = await signUpAction(formData);
        if (res.success) {
          setMessage({ 
            type: "success", 
            text: "Workspace criado com sucesso! Verifique seu e-mail de confirmação ou faça o login." 
          });
          // Alternar para o login
          setTimeout(() => {
            setActiveTab("signin");
            setMessage(null);
          }, 4000);
        } else {
          setMessage({ type: "error", text: res.error || "Erro ao criar conta." });
        }
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erro de conexão com o servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--background)] p-4">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-brand-blue)]/15 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-neon-blue)]/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Neon Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-brand-blue)] to-transparent opacity-60 animate-pulse" />
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Building className="w-8 h-8 text-[var(--color-brand-blue)]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Nakde <span className="text-[var(--color-brand-blue)]">Finance</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {activeTab === "signin" 
                ? "Acesse o workspace da sua empresa" 
                : "Crie um novo workspace SaaS para sua empresa"
              }
            </p>
          </div>

          {/* Custom Tabs Slider */}
          <div className="flex p-1.5 bg-black/10 dark:bg-white/5 rounded-xl border border-[var(--border-color)] mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab("signin"); setMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "signin" 
                  ? "bg-[var(--color-brand-blue)] text-white shadow-md" 
                  : "text-gray-500 hover:text-[var(--foreground)]"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("signup"); setMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "signup" 
                  ? "bg-[var(--color-brand-blue)] text-white shadow-md" 
                  : "text-gray-500 hover:text-[var(--foreground)]"
              }`}
            >
              Criar Workspace
            </button>
          </div>

          {/* Feedback Messages */}
          {message && (
            <div className={`p-4 rounded-xl flex items-start gap-3 text-sm mb-6 border animate-fadeIn ${
              message.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}>
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {activeTab === "signup" && (
              <>
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Seu Nome Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent transition-all sm:text-sm"
                      placeholder="Ex: Tony Stark"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome da Empresa
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Sparkles className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent transition-all sm:text-sm"
                      placeholder="Ex: Stark Industries Ltda"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email (Sempre necessário) */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent transition-all sm:text-sm"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            {/* Password (Sempre necessário) */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {activeTab === "signin" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-[var(--color-brand-blue)] focus:ring-[var(--color-brand-blue)] bg-white/5"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-500 dark:text-gray-400">
                    Lembrar-me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue-hover)] transition-colors">
                    Esqueceu a senha?
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] focus:outline-none transition-all disabled:opacity-70 group cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {activeTab === "signin" ? "Acessar Plataforma" : "Inicializar Workspace"}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Ao se registrar, você concorda com nossos{" "}
            <a href="#" className="font-medium text-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue-hover)] transition-colors">
              Termos de Uso
            </a>.
          </div>
        </div>
      </div>
    </div>
  );
}
