"use server";

import { createClient } from "@/lib/supabase/server";

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: "all" | "income" | "expense";
  category?: string;
  saleType?: string;
  saleStatus?: string;
}

export async function getReportData(type: "clientes" | "vendas" | "financeiro", filters?: ReportFilters) {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    throw new Error("Não autenticado");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) {
    throw new Error("Empresa não encontrada");
  }

  const companyId = profile.company_id;

  if (type === "clientes") {
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    return clients || [];
  }

  if (type === "vendas") {
    let query = supabase
      .from("orders")
      .select("*, clients(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (filters) {
      if (filters.saleType && filters.saleType !== "all") {
        query = query.eq("sale_type", filters.saleType);
      }
      if (filters.saleStatus && filters.saleStatus !== "all") {
        query = query.eq("status", filters.saleStatus);
      }
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate + "T23:59:59Z");
      }
    }

    const { data: orders } = await query;
    return orders || [];
  }

  if (type === "financeiro") {
    let query = supabase
      .from("financial_transactions")
      .select("*, clients(name)")
      .eq("company_id", companyId)
      .order("due_date", { ascending: false });

    if (filters) {
      if (filters.transactionType && filters.transactionType !== "all") {
        query = query.eq("type", filters.transactionType);
      }
      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters.startDate) {
        query = query.gte("due_date", filters.startDate);
      }
      if (filters.endDate) {
        // use due_date, which is a DATE column, so just lte is fine without time
        query = query.lte("due_date", filters.endDate);
      }
    }

    const { data: transactions } = await query;
    return transactions || [];
  }

  return [];
}
