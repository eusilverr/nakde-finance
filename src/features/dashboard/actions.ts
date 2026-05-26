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

    // 1. Faturamento do mês atual (completed)
    const { data: fatData } = await supabase
      .from("financial_transactions")
      .select("amount, payment_date, due_date")
      .eq("company_id", companyId)
      .eq("type", "income")
      .eq("status", "completed")
      .or(`payment_date.gte.${startOfMonthStr},and(payment_date.is.null,due_date.gte.${startOfMonthStr})`);

    const faturamentoMensal = fatData?.reduce((acc, r) => acc + Number(r.amount), 0) || 0;

    // 2. Faturamento do mês anterior (para trend)
    const { data: fatAnterior } = await supabase
      .from("financial_transactions")
      .select("amount, payment_date, due_date")
      .eq("company_id", companyId)
      .eq("type", "income")
      .eq("status", "completed")
      .or(`and(payment_date.gte.${startOfLastMonthStr},payment_date.lte.${endOfLastMonthStr}),and(payment_date.is.null,due_date.gte.${startOfLastMonthStr},due_date.lte.${endOfLastMonthStr})`);

    const fatAnteriorVal = fatAnterior?.reduce((acc, r) => acc + Number(r.amount), 0) || 0;

    // 3. Despesas do mês atual
    const { data: despData } = await supabase
      .from("financial_transactions")
      .select("amount, payment_date, due_date")
      .eq("company_id", companyId)
      .eq("type", "expense")
      .eq("status", "completed")
      .or(`payment_date.gte.${startOfMonthStr},and(payment_date.is.null,due_date.gte.${startOfMonthStr})`);

    const despesasMensais = despData?.reduce((acc, r) => acc + Number(r.amount), 0) || 0;

    // 4. Despesas do mês anterior
    const { data: despAnterior } = await supabase
      .from("financial_transactions")
      .select("amount, payment_date, due_date")
      .eq("company_id", companyId)
      .eq("type", "expense")
      .eq("status", "completed")
      .or(`and(payment_date.gte.${startOfLastMonthStr},payment_date.lte.${endOfLastMonthStr}),and(payment_date.is.null,due_date.gte.${startOfLastMonthStr},due_date.lte.${endOfLastMonthStr})`);

    const despAnteriorVal = despAnterior?.reduce((acc, r) => acc + Number(r.amount), 0) || 0;

    const lucroLiquido = faturamentoMensal - despesasMensais;
    const lucroAnterior = fatAnteriorVal - despAnteriorVal;

    // 5. Contas a Receber (income pending) — com detalhes
    const { data: receberData } = await supabase
      .from("financial_transactions")
      .select("id, description, amount, due_date, category")
      .eq("company_id", companyId)
      .eq("type", "income")
      .eq("status", "pending")
      .order("due_date", { ascending: true });

    const contasAReceberList: ReceberItem[] = (receberData || []).map((r) => ({
      id: r.id,
      description: r.description,
      amount: Number(r.amount),
      due_date: r.due_date,
      category: r.category,
    }));

    const subscriptionsPending = await getPendingSubscriptionAmount();
    const contasAReceber =
      (receberData?.reduce((acc, r) => acc + Number(r.amount), 0) || 0) + subscriptionsPending;

    // 6. Contas a Pagar (expense pending)
    const { data: pagarData } = await supabase
      .from("financial_transactions")
      .select("amount")
      .eq("company_id", companyId)
      .eq("type", "expense")
      .eq("status", "pending");

    const contasAPagar = pagarData?.reduce((acc, r) => acc + Number(r.amount), 0) || 0;

    // 7. Alertas de Estoque
    const { data: products } = await supabase
      .from("products")
      .select("stock_quantity, min_stock")
      .eq("company_id", companyId);

    const estoqueBaixoCount = products?.filter(p => p.stock_quantity <= p.min_stock).length || 0;

    // 8. Total Clientes e Fornecedores
    const { count: totalClientes } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("type", "cliente");

    const { count: totalFornecedores } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("type", "fornecedor");

    // 9. Cash Flow real por mês — todos os meses com dados
    const { data: allCompleted } = await supabase
      .from("financial_transactions")
      .select("type, amount, payment_date, due_date")
      .eq("company_id", companyId)
      .eq("status", "completed")
      .order("payment_date", { ascending: true, nullsFirst: false });

    const cashFlowMap: Record<string, { income: number; expense: number }> = {};
    for (const tx of allCompleted || []) {
      const dateStr = tx.payment_date || tx.due_date;
      if (!dateStr) continue;
      const key = dateStr.slice(0, 7);
      if (!cashFlowMap[key]) cashFlowMap[key] = { income: 0, expense: 0 };
      if (tx.type === "income") cashFlowMap[key].income += Number(tx.amount);
      else cashFlowMap[key].expense += Number(tx.amount);
    }

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const cashFlow = Object.entries(cashFlowMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, val]) => {
        const monthIdx = parseInt(key.split("-")[1]) - 1;
        return { month: monthNames[monthIdx] || key, ...val };
      });

    // 10. Receitas e Despesas por Categoria
    const { data: catData } = await supabase
      .from("financial_transactions")
      .select("type, category, amount")
      .eq("company_id", companyId)
      .eq("status", "completed");

    const receitasPorCategoria: Record<string, number> = {};
    const despesasPorCategoria: Record<string, number> = {};

    for (const tx of catData || []) {
      const amount = Number(tx.amount);
      if (tx.type === "income") {
        receitasPorCategoria[tx.category] = (receitasPorCategoria[tx.category] || 0) + amount;
      } else {
        despesasPorCategoria[tx.category] = (despesasPorCategoria[tx.category] || 0) + amount;
      }
    }

    const receitasCategoria = Object.entries(receitasPorCategoria)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    const despesasCategoria = Object.entries(despesasPorCategoria)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    // 11. Tarefas Recentes (últimas transações)
    const { data: recentTxs } = await supabase
      .from("financial_transactions")
      .select("description, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(4);

    const recentTasks = recentTxs?.map(t => ({
      text: t.description || "Lançamento financeiro",
      time: new Date(t.created_at).toLocaleDateString("pt-BR")
    })) || [];

    // 12. Trends
    const calcTrend = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return Math.round(((atual - anterior) / anterior) * 100 * 10) / 10;
    };

    const receberAnterior = 0;
    const pagarAnterior = 0;

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
        receber: calcTrend(contasAReceber, receberAnterior),
        pagar: calcTrend(contasAPagar, pagarAnterior),
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
