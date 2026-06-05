"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Settings, User, Building, Moon, Sun, Bell, Save } from "lucide-react";
import { getUserSettings, updateUserSettings, UserSettings as USettings } from "@/features/settings/actions";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"perfil" | "empresa" | "aparencia" | "preferencias">("perfil");

  const [settings, setSettings] = useState<USettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await getUserSettings();
      if (data) {
        setSettings(data);
        setFullName(data.profile.full_name || "");
        setCompanyName(data.company.name || "");
        setCompanyDocument(data.company.document || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateUserSettings({
        fullName,
        companyName,
        companyDocument,
      });
      setMessage({ text: "Configurações salvas com sucesso!", type: "success" });
      router.refresh();
      setTimeout(() => {
        setMessage(null);
        window.location.reload(); // Force hard reload to update Sidebar state
      }, 1500);
    } catch (err: any) {
      setMessage({ text: err.message || "Erro ao salvar", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "perfil", label: "Meu Perfil", icon: User },
    { id: "empresa", label: "Minha Empresa", icon: Building },
    { id: "aparencia", label: "Aparência", icon: Sun },
    { id: "preferencias", label: "Preferências", icon: Bell },
  ] as const;

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie seu perfil, os dados da sua empresa e preferências do sistema.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 sm:gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex md:flex-col gap-1 sm:gap-2 overflow-x-auto md:overflow-visible no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? "bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)] border border-[var(--color-brand-blue)]/20"
                    : "text-gray-500 hover:text-[var(--foreground)] hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[var(--color-brand-blue)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* PERFIL */}
              {activeTab === "perfil" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-xl font-bold border-b border-[var(--border-color)] pb-4">Informações do Perfil</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Nome Completo</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">E-mail</label>
                      <input
                        type="email"
                        disabled
                        value={settings?.profile.email || ""}
                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm text-gray-500 cursor-not-allowed opacity-70"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Função (Role)</label>
                      <input
                        type="text"
                        disabled
                        value={settings?.profile.role || ""}
                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm text-gray-500 cursor-not-allowed opacity-70 uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* EMPRESA */}
              {activeTab === "empresa" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-xl font-bold border-b border-[var(--border-color)] pb-4">Dados da Empresa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Nome da Empresa</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">CNPJ / Documento</label>
                      <input
                        type="text"
                        value={companyDocument}
                        onChange={(e) => setCompanyDocument(e.target.value)}
                        className="w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* APARÊNCIA */}
              {activeTab === "aparencia" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-xl font-bold border-b border-[var(--border-color)] pb-4">Aparência do Sistema</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-4 ${
                        theme === "dark" 
                        ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/5" 
                        : "border-[var(--border-color)] hover:border-gray-400"
                      }`}
                    >
                      <Moon className={`w-10 h-10 ${theme === "dark" ? "text-[var(--color-brand-blue)]" : "text-gray-400"}`} />
                      <span className="font-semibold">Modo Escuro</span>
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-4 ${
                        theme === "light" 
                        ? "border-amber-500 bg-amber-500/5" 
                        : "border-[var(--border-color)] hover:border-gray-400"
                      }`}
                    >
                      <Sun className={`w-10 h-10 ${theme === "light" ? "text-amber-500" : "text-gray-400"}`} />
                      <span className="font-semibold">Modo Claro</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PREFERÊNCIAS */}
              {activeTab === "preferencias" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-xl font-bold border-b border-[var(--border-color)] pb-4">Preferências de Notificação</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-color)] bg-white/5">
                      <div>
                        <h4 className="font-medium text-sm">Notificações por E-mail</h4>
                        <p className="text-xs text-gray-500 mt-1">Receber resumos diários de vendas e pendências.</p>
                      </div>
                      <div className="w-12 h-6 bg-[var(--color-brand-blue)] rounded-full relative cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-color)] bg-white/5">
                      <div>
                        <h4 className="font-medium text-sm">Notificações no Sistema</h4>
                        <p className="text-xs text-gray-500 mt-1">Alertas em tempo real sobre atualizações de status.</p>
                      </div>
                      <div className="w-12 h-6 bg-gray-600 rounded-full relative cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic mt-4">* As preferências de notificação ainda estão em desenvolvimento.</p>
                </div>
              )}

              {/* Save Button (Only for Perfil and Empresa) */}
              {(activeTab === "perfil" || activeTab === "empresa") && (
                <div className="pt-8 flex items-center justify-between">
                  {message ? (
                    <div className={`text-sm font-medium ${message.type === "success" ? "text-emerald-500" : "text-rose-500"}`}>
                      {message.text}
                    </div>
                  ) : (
                    <div></div>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 py-3 px-6 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
