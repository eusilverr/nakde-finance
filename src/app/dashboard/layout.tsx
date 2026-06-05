"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  FileText,
  Menu,
  X
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

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

  const sidebarContent = (
    <>
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
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]"
                  : "text-gray-500 hover:text-[var(--foreground)] hover:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-[var(--color-brand-blue)]" : "text-gray-400 group-hover:text-[var(--foreground)]"}`} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">
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
          className="flex w-full items-center gap-3 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile as overlay */}
      <aside className={`
        w-64 border-r border-[var(--border-color)] bg-[var(--panel-bg)] flex flex-col backdrop-blur-md
        fixed md:sticky top-0 left-0 z-50 h-full
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:flex
      `}>
        {/* Close button (mobile only) */}
        <button
          onClick={closeSidebar}
          className="absolute top-5 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors md:hidden cursor-pointer"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>

        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Mobile / Topbar */}
        <header className="h-20 border-b border-[var(--border-color)] bg-[var(--panel-bg)]/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--color-brand-blue)] to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.4)] flex items-center justify-center">
                <Building className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Nakde <span className="text-[var(--color-brand-blue)]">Finance</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-[var(--border-color)] transition-all duration-300 group cursor-pointer"
              aria-label="Toggle Dark Mode"
            >
              {mounted && theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-500 group-hover:-rotate-12 transition-transform" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
