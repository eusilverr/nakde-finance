"use server";

import { createClient } from "@/lib/supabase/server";
import { createTransactionAction } from "@/features/finance/actions";

export interface ServiceOrderModel {
  id: string;
  company_id: string;
  client_id: string;
  product_id: string;
  status: "pendente" | "em_andamento" | "concluido" | "cancelado" | "ativo" | "pausado";
  value: number;
  cost: number;
  due_date: string | null;
  notes: string | null;
  is_subscription: boolean;
  billing_cycle: string | null;
  next_billing_date: string | null;
  created_at: string;
  // Joins
  client?: { name: string };
  product?: { name: string };
}

export interface ActionResult {
  success: boolean;
  data?: ServiceOrderModel;
  error?: string;
}

export async function getServiceOrders(): Promise<ServiceOrderModel[]> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      client:clients(name),
      product:products(name)
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar ordens de serviço:", error);
    return [];
  }

  return data as ServiceOrderModel[];
}

export async function createServiceOrderAction(
  orderData: Partial<ServiceOrderModel>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) {
    return { success: false, error: "Perfil não encontrado" };
  }

  const { data, error } = await supabase
    .from("service_orders")
    .insert({
      company_id: profile.company_id,
      client_id: orderData.client_id,
      product_id: orderData.product_id,
      status: orderData.status ?? "pendente",
      value: orderData.value ?? 0,
      cost: orderData.cost ?? 0,
      due_date: orderData.due_date,
      notes: orderData.notes,
      is_subscription: orderData.is_subscription ?? false,
      billing_cycle: orderData.billing_cycle,
      next_billing_date: orderData.next_billing_date,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar ordem de serviço:", error);
    return { success: false, error: `Erro no banco: ${error.message}` };
  }

  return { success: true, data: data as ServiceOrderModel };
}

export async function updateServiceOrderAction(
  orderId: string,
  orderData: Partial<ServiceOrderModel>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { success: false, error: "Usuário não autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) return { success: false, error: "Perfil não encontrado" };

  // Buscar estado atual antes de atualizar
  const { data: current } = await supabase
    .from("service_orders")
    .select("status, is_subscription, next_billing_date")
    .eq("id", orderId)
    .eq("company_id", profile.company_id)
    .single();

  const { data, error } = await supabase
    .from("service_orders")
    .update({
      client_id: orderData.client_id,
      product_id: orderData.product_id,
      status: orderData.status,
      value: orderData.value,
      cost: orderData.cost,
      due_date: orderData.due_date,
      notes: orderData.notes,
      is_subscription: orderData.is_subscription,
      billing_cycle: orderData.billing_cycle,
      next_billing_date: orderData.next_billing_date,
    })
    .eq("id", orderId)
    .eq("company_id", profile.company_id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar ordem de serviço:", error);
    return { success: false, error: `Erro no banco: ${error.message}` };
  }

  // Gerenciar lançamento financeiro para assinaturas
  if (data.is_subscription) {
    const newStatus = data.status;
    const oldStatus = current?.status;

    // Se foi cancelado/pausado e estava ativo, cancelar transação pendente
    if (oldStatus === "ativo" && (newStatus === "cancelado" || newStatus === "pausado")) {
      const { data: existing } = await supabase
        .from("financial_transactions")
        .select("id")
        .eq("reference_id", data.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("financial_transactions")
          .update({ status: "cancelled" })
          .eq("id", existing.id);
      }
    }
  }

  return { success: true, data: data as ServiceOrderModel };
}

export async function deleteServiceOrderAction(orderId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_orders")
    .delete()
    .eq("id", orderId);

  if (error) {
    console.error("Erro ao deletar ordem de serviço:", error);
    return false;
  }

  return true;
}

export async function getClientsForUser() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar clientes:", error);
    return [];
  }

  return data;
}

export async function processSubscriptionBillings(): Promise<void> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) return;

  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;

  const { data: orders } = await supabase
    .from("service_orders")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("is_subscription", true)
    .eq("status", "ativo")
    .lte("next_billing_date", today);

  if (!orders?.length) return;

  // Buscar transações existentes com esses reference_ids
  const referenceIds = orders.map((o) => o.id);
  const { data: existingTxs } = await supabase
    .from("financial_transactions")
    .select("reference_id")
    .in("reference_id", referenceIds);

  const existingRefIds = new Set(existingTxs?.map((tx) => tx.reference_id) ?? []);

  const pendingOrders = orders.filter((o) => !existingRefIds.has(o.id));

  for (const order of pendingOrders) {
    const [clientRes, productRes] = await Promise.all([
      supabase.from("clients").select("name").eq("id", order.client_id).single(),
      supabase.from("products").select("name").eq("id", order.product_id).single(),
    ]);
    await upsertFinanceForServiceOrder(
      order as ServiceOrderModel,
      clientRes.data?.name || "Desconhecido",
      productRes.data?.name || "Desconhecido"
    );
  }
}

export async function getPendingSubscriptionAmount(): Promise<number> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return 0;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) return 0;

  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;

  const { data: orders } = await supabase
    .from("service_orders")
    .select("id, value")
    .eq("company_id", profile.company_id)
    .eq("is_subscription", true)
    .eq("status", "ativo")
    .gt("next_billing_date", today);

  if (!orders?.length) return 0;

  // Excluir assinaturas que já têm transação pendente
  const referenceIds = orders.map((o) => o.id);
  const { data: existingTxs } = await supabase
    .from("financial_transactions")
    .select("reference_id")
    .in("reference_id", referenceIds)
    .eq("status", "pending");

  const existingRefIds = new Set(existingTxs?.map((tx) => tx.reference_id) ?? []);

  return orders
    .filter((o) => !existingRefIds.has(o.id))
    .reduce((sum, o) => sum + (o.value ?? 0), 0);
}

async function upsertFinanceForServiceOrder(
  order: ServiceOrderModel,
  clientName: string,
  productName: string
): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("financial_transactions")
    .select("id, status")
    .eq("reference_id", order.id)
    .maybeSingle();

  const description = `Assinatura · ${clientName} · ${productName}`;

  const dueDate = order.next_billing_date
    ? order.next_billing_date.split("T")[0]
    : (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  if (existing && existing.status === "pending") {
    await supabase
      .from("financial_transactions")
      .update({
        amount: order.value,
        due_date: dueDate,
        description,
      })
      .eq("id", existing.id);
  } else if (!existing) {
    await createTransactionAction({
      type: "income",
      description,
      amount: order.value,
      category: "Serviços",
      status: "pending",
      due_date: dueDate,
      client_id: order.client_id,
      reference_id: order.id,
    });
  }
}
