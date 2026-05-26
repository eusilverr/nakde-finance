"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart,
  Package, 
  Briefcase, 
  Receipt, 
  Settings, 
  LogOut,
  Sun,
  Moon,
  Building,
  FileText
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes e Fornecedores (CRM)", href: "/dashboard/clientes", icon: Users },
  { name: "Vendas", href: "/dashboard/vendas", icon: ShoppingCart },
  { name: "Produtos", href: "/dashboard/produtos", icon: Package },
  { name: "Serviços", href: "/dashboard/servicos", icon: Briefcase },
  { name: "Financeiro", href: "/dashboard/financeiro", icon: Receipt },
  { name: "Relatórios", href: "/dashboard/relatorios", icon: FileText },
  { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; company: string; initials: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);
    
    // Fetch user settings
    import("@/features/settings/actions").then(({ getUserSettings }) => {
      getUserSettings().then((data) => {
        if (data) {
          const name = data.profile.full_name || "Usuário";
          const company = data.company.name || "Empresa (Tenant)";
          
          // Get initials (first letter of first and last name, or just first 2 letters)
          const parts = name.trim().split(" ");
          let initials = "US";
          if (parts.length >= 2) {
            initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          } else if (name.length >= 2) {
            initials = name.substring(0, 2).toUpperCase();
          }
          
          setUserInfo({ name, company, initials });
        }
      });
    });
  }, []);

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border-color)] bg-[var(--panel-bg)] flex flex-col hidden md:flex backdrop-blur-md">
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-[var(--border-color)]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-brand-blue)] to-cyan-400 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center mr-3">
            <Building className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Nakde <span className="text-[var(--color-brand-blue)]">Finance</span>
          </h1>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]"
                    : "text-gray-500 hover:text-[var(--foreground)] hover:bg-white/5"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[var(--color-brand-blue)]" : "text-gray-400 group-hover:text-[var(--foreground)]"}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
              {userInfo?.initials || "..."}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userInfo?.name || "Carregando..."}</p>
              <p className="text-xs text-gray-500 truncate">{userInfo?.company || "..."}</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              await logoutAction();
            }}
            className="flex w-full items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Mobile / Topbar */}
        <header className="h-20 border-b border-[var(--border-color)] bg-[var(--panel-bg)]/80 backdrop-blur-md px-8 flex items-center justify-end sticky top-0 z-30">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-[var(--border-color)] transition-all duration-300 group"
            aria-label="Toggle Dark Mode"
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-500 group-hover:-rotate-12 transition-transform" />
            )}
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
