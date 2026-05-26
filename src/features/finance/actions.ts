"use server";

import { createClient } from "@/lib/supabase/server";

export type TransactionStatus = "pending" | "paid" | "completed" | "cancelled" | "overdue";

export interface TransactionModel {
  id: string;
  company_id: string;
  client_id?: string;
  order_id?: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  status: TransactionStatus;
  due_date: string;
  payment_date?: string;
  created_at: string;
}

async function getCompanyId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  return profile?.company_id ?? null;
}

export async function getTransactions(): Promise<TransactionModel[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("company_id", companyId)
    .order("due_date", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erro ao carregar financeiro:", error);
    return [];
  }

  return (data || []).map((tx: Record<string, unknown>) => ({
    ...tx,
    amount: Number(tx.amount),
  })) as TransactionModel[];
}

export async function createTransactionAction(
  txData: {
    type: "income" | "expense";
    description: string;
    amount: number;
    category: string;
    status: TransactionStatus;
    due_date: string;
    client_id?: string;
    reference_id?: string;
    payment_method?: string;
    payment_date?: string;
  }
): Promise<TransactionModel | null> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) return null;

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      company_id: profile.company_id,
      type: txData.type,
      description: txData.description,
      amount: txData.amount,
      category: txData.category,
      status: txData.status,
      due_date: txData.due_date,
      ...(txData.client_id && { client_id: txData.client_id }),
      ...(txData.reference_id && { reference_id: txData.reference_id }),
      ...(txData.payment_method && { payment_method: txData.payment_method }),
      ...(txData.payment_date && { payment_date: txData.payment_date }),
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar transação:", error);
    return null;
  }

  return { ...data, amount: Number(data.amount) } as TransactionModel;
}

export async function updateTransactionAction(
  txId: string,
  txData: {
    description?: string;
    amount?: number;
    category?: string;
    status?: TransactionStatus;
    due_date?: string;
    payment_method?: string;
  }
): Promise<TransactionModel | null> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("financial_transactions")
    .update(txData)
    .eq("id", txId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar transação:", error);
    return null;
  }

  return { ...data, amount: Number(data.amount) } as TransactionModel;
}

export async function deleteTransactionAction(txId: string): Promise<boolean> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return false;

  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", txId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Erro ao deletar transação:", error);
    return false;
  }

  return true;
}
