"use client";

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Wallet, 
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getDashboardStats, DashboardData } from "@/features/dashboard/actions";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const initialData: DashboardData = {
  faturamentoMensal: 0,
  lucroLiquido: 0,
  contasAReceber: 0,
  contasAPagar: 0,
  subscriptionsPending: 0,
  contasAReceberList: [],
  alertasEstoque: 0,
  totalClientes: 0,
  totalFornecedores: 0,
  cashFlow: [],
  receitasPorCategoria: [],
  despesasPorCategoria: [],
  recentTasks: [],
  trends: { faturamento: 0, lucro: 0, receber: 0, pagar: 0 },
};

const COLORS_INCOME = ["#38bdf8", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#a3e635"];
const COLORS_EXPENSE = ["#ef4444", "#f97316", "#ec4899", "#a855f7", "#fb923c", "#e11d48"];

export default function DashboardEstrategico() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const stats = await getDashboardStats();
        setData(stats);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const kpis = [
    { 
      title: "Faturamento Mensal", 
      value: formatCurrency(data.faturamentoMensal), 
      trend: `${data.trends.faturamento >= 0 ? "+" : ""}${data.trends.faturamento}%`, 
      isPositive: data.trends.faturamento >= 0,
      icon: Wallet 
    },
    { 
      title: "Lucro Líquido (DRE)", 
      value: formatCurrency(data.lucroLiquido), 
      trend: `${data.trends.lucro >= 0 ? "+" : ""}${data.trends.lucro}%`, 
      isPositive: data.trends.lucro >= 0,
      icon: TrendingUp 
    },
    { 
      title: "Contas a Receber", 
      value: formatCurrency(data.contasAReceber), 
      trend: `${data.trends.receber >= 0 ? "+" : ""}${data.trends.receber}%`, 
      isPositive: data.trends.receber >= 0,
      icon: ArrowUpRight 
    },
    { 
      title: "Contas a Pagar", 
      value: formatCurrency(data.contasAPagar), 
      trend: `${data.trends.pagar >= 0 ? "+" : ""}${data.trends.pagar}%`, 
      isPositive: data.trends.pagar <= 0,
      icon: ArrowDownRight 
    },
    { 
      title: "Alertas de Estoque", 
      value: `${data.alertasEstoque} SKUs`, 
      trend: data.alertasEstoque > 0 ? "Ação necessária" : "Estoque ideal", 
      isPositive: data.alertasEstoque === 0,
      icon: Package 
    },
    { 
      title: "Clientes Ativos", 
      value: `${data.totalClientes} clientes`, 
      trend: `${data.totalFornecedores} fornecedores`, 
      isPositive: true,
      icon: Users 
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(15,17,21,0.95)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderPieDonut = (
    data: { name: string; value: number }[],
    colors: string[],
    title: string
  ) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
      <div className="glass-panel rounded-2xl p-5 flex flex-col items-center">
        <h4 className="text-sm font-bold mb-3 text-center">{title}</h4>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
            Sem dados
          </div>
        )}
        <div className="w-full mt-3 space-y-1.5 text-xs">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                <span className="text-gray-400 truncate max-w-[120px]">{d.name}</span>
              </div>
              <span className="font-medium">
                {formatCurrency(d.value)} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Visão Estratégica</h2>
        <p className="text-gray-500 mt-1">
          Acompanhe a saúde financeira e operacional da empresa em tempo real.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={index}
              className="glass-panel rounded-2xl p-5 group relative overflow-hidden"
            >
              <div className="absolute -inset-px bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-brand-blue)] rounded-2xl opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-medium text-gray-500">
                    {kpi.title}
                  </p>
                  <div className="p-2 rounded-lg bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)]">
                    <Icon size={16} />
                  </div>
                </div>
                <h3 className="text-lg font-bold tracking-tight">
                  {loading ? (
                    <span className="inline-block w-20 h-5 bg-white/10 rounded animate-pulse" />
                  ) : (
                    kpi.value
                  )}
                </h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                  {loading ? (
                    <span className="inline-block w-12 h-3 bg-white/10 rounded animate-pulse" />
                  ) : (
                    <span className={`flex items-center ${kpi.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {kpi.isPositive ? (
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      )}
                      {kpi.trend}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Cash Flow Area Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 min-h-[380px] flex flex-col">
          <h3 className="text-lg font-bold mb-4">Fluxo de Caixa Mensal</h3>
          {data.cashFlow.length > 0 ? (
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.cashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" name="Entradas" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name="Saídas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              {loading ? "Carregando..." : "Nenhum dado financeiro encontrado"}
            </div>
          )}
        </div>

        {/* Pie Charts Column */}
        <div className="flex flex-col gap-6">
          {renderPieDonut(data.receitasPorCategoria, COLORS_INCOME, "Receitas por Categoria")}
          {renderPieDonut(data.despesasPorCategoria, COLORS_EXPENSE, "Despesas por Categoria")}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">Atividade Recente</h3>
        <ul className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-start gap-4 p-3 rounded-xl bg-white/5 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/4" />
                </div>
              </li>
            ))
          ) : data.recentTasks.length > 0 ? (
            data.recentTasks.map((task, i) => (
              <li key={i} className="flex items-start gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-[var(--border-color)]">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-[var(--color-brand-blue)] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{task.text}</p>
                  <p className="text-xs text-gray-500">{task.time}</p>
                </div>
              </li>
            ))
          ) : (
            <li className="text-center text-gray-500 py-8 text-sm">
              Nenhuma atividade registrada
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
