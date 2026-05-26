"use server";

import { createClient } from "@/lib/supabase/server";
import { getPendingSubscriptionAmount } from "@/features/services/actions";

export interface ReceberItem {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  category: string;
}

export interface DashboardData {
  faturamentoMensal: number;
  lucroLiquido: number;
  contasAReceber: number;
  contasAPagar: number;
  subscriptionsPending: number;
  contasAReceberList: ReceberItem[];
  alertasEstoque: number;
  totalClientes: number;
  totalFornecedores: number;
  cashFlow: Array<{ month: string; income: number; expense: number }>;
  receitasPorCategoria: Array<{ name: string; value: number }>;
  despesasPorCategoria: Array<{ name: string; value: number }>;
  recentTasks: Array<{ text: string; time: string }>;
  trends: {
    faturamento: number;
    lucro: number;
    receber: number;
    pagar: number;
  };
}

export async function getDashboardStats(): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return fallbackData();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  const companyId = profile?.company_id;
  if (!companyId) {
    return fallbackData();
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfLastMonthStr = startOfLastMonth.toISOString().split("T")[0];
    const endOfLastMonthStr = endOfLastMonth.toISOString().split("T")[0];

    const [
      { data: completedTxs },
      { data: pendingTxs },
      { data: products },
      { count: totalClientes },
      { count: totalFornecedores },
      { data: recentTxs },
      subscriptionsPending,
    ] = await Promise.all([
      // Todas as transactions completed em 1 query (cash flow + categorias + mês atual/anterior)
      supabase
        .from("financial_transactions")
        .select("type, amount, payment_date, due_date, category")
        .eq("company_id", companyId)
        .eq("status", "completed"),

      // Income + Expense pending em 1 query
      supabase
        .from("financial_transactions")
        .select("id, description, amount, due_date, category, type")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("due_date", { ascending: true }),

      // Produtos para alerta de estoque
      supabase
        .from("products")
        .select("stock_quantity, min_stock")
        .eq("company_id", companyId),

      // Total clientes
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("type", "cliente"),

      // Total fornecedores
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("type", "fornecedor"),

      // Atividades recentes
      supabase
        .from("financial_transactions")
        .select("description, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(4),

      // Assinaturas pendentes
      getPendingSubscriptionAmount(),
    ]);

    // === Deriva tudo a partir dos datasets combinados ===

    let faturamentoMensal = 0;
    let fatAnteriorVal = 0;
    let despesasMensais = 0;
    let despAnteriorVal = 0;

    const cashFlowMap: Record<string, { income: number; expense: number }> = {};
    const receitasPorCategoria: Record<string, number> = {};
    const despesasPorCategoria: Record<string, number> = {};

    for (const tx of completedTxs || []) {
      const amount = Number(tx.amount);
      const dateStr = tx.payment_date || tx.due_date;
      const isIncome = tx.type === "income";

      if (dateStr) {
        if (dateStr >= startOfMonthStr) {
          if (isIncome) faturamentoMensal += amount;
          else despesasMensais += amount;
        } else if (dateStr >= startOfLastMonthStr && dateStr <= endOfLastMonthStr) {
          if (isIncome) fatAnteriorVal += amount;
          else despAnteriorVal += amount;
        }

        const key = dateStr.slice(0, 7);
        if (!cashFlowMap[key]) cashFlowMap[key] = { income: 0, expense: 0 };
        if (isIncome) cashFlowMap[key].income += amount;
        else cashFlowMap[key].expense += amount;
      }

      if (isIncome) {
        receitasPorCategoria[tx.category] = (receitasPorCategoria[tx.category] || 0) + amount;
      } else {
        despesasPorCategoria[tx.category] = (despesasPorCategoria[tx.category] || 0) + amount;
      }
    }

    const contasAReceberList: ReceberItem[] = [];
    let contasAReceber = 0;
    let contasAPagar = 0;

    for (const tx of pendingTxs || []) {
      const amount = Number(tx.amount);
      if (tx.type === "income") {
        contasAReceber += amount;
        contasAReceberList.push({
          id: tx.id,
          description: tx.description,
          amount,
          due_date: tx.due_date,
          category: tx.category,
        });
      } else {
        contasAPagar += amount;
      }
    }

    contasAReceber += subscriptionsPending;

    const estoqueBaixoCount = products?.filter(p => p.stock_quantity <= p.min_stock).length || 0;

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const cashFlow = Object.entries(cashFlowMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, val]) => ({
        month: monthNames[parseInt(key.split("-")[1]) - 1] || key,
        ...val,
      }));

    const receitasCategoria = Object.entries(receitasPorCategoria)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    const despesasCategoria = Object.entries(despesasPorCategoria)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    const recentTasks = recentTxs?.map(t => ({
      text: t.description || "Lançamento financeiro",
      time: new Date(t.created_at).toLocaleDateString("pt-BR"),
    })) || [];

    const lucroLiquido = faturamentoMensal - despesasMensais;
    const lucroAnterior = fatAnteriorVal - despAnteriorVal;

    const calcTrend = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return Math.round(((atual - anterior) / anterior) * 100 * 10) / 10;
    };

    return {
      faturamentoMensal,
      lucroLiquido,
      contasAReceber,
      contasAPagar,
      subscriptionsPending,
      contasAReceberList,
      alertasEstoque: estoqueBaixoCount,
      totalClientes: totalClientes || 0,
      totalFornecedores: totalFornecedores || 0,
      cashFlow,
      receitasPorCategoria: receitasCategoria,
      despesasPorCategoria: despesasCategoria,
      recentTasks,
      trends: {
        faturamento: calcTrend(faturamentoMensal, fatAnteriorVal),
        lucro: calcTrend(lucroLiquido, lucroAnterior),
        receber: calcTrend(contasAReceber, 0),
        pagar: calcTrend(contasAPagar, 0),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return fallbackData();
  }
}

function fallbackData(): DashboardData {
  return {
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
    recentTasks: [{ text: "Nenhum lançamento encontrado", time: "Hoje" }],
    trends: { faturamento: 0, lucro: 0, receber: 0, pagar: 0 },
  };
}
