"use server";

import { createClient } from "@/lib/supabase/server";
import { createTransactionAction } from "@/features/finance/actions";

export interface SaleItemModel {
  id: string;
  sale_id: string;
  item_type: "product" | "service";
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  cost_price: number;
}

export interface SaleModel {
  id: string;
  company_id: string;
  client_id: string;
  sale_number: string;
  sale_type: "product" | "service" | "both";
  status: "pending" | "approved" | "invoiced" | "completed" | "canceled";
  payment_method: "pix" | "boleto" | "credit_card" | "transfer" | null;
  installments: number;
  due_date: string | null;
  notes: string | null;
  responsible: string;
  total_amount: number;
  created_at: string;
  client?: { name: string };
  items?: SaleItemModel[];
}

export interface ActionResult {
  success: boolean;
  data?: SaleModel;
  error?: string;
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

type RawOrder = Record<string, unknown> & {
  id: string;
  company_id: string;
  client_id: string;
  sale_number: string;
  sale_type: "product" | "service" | "both";
  status: "pending" | "approved" | "invoiced" | "completed" | "canceled";
  payment_method: "pix" | "boleto" | "credit_card" | "transfer" | null;
  installments: number;
  due_date: string | null;
  notes: string | null;
  responsible: string;
  total_amount: number;
  created_at: string;
  client: { name: string } | null;
  items: RawOrderItem[];
};

type RawOrderItem = Record<string, unknown> & {
  id: string;
  order_id: string;
  product_id: string;
  item_type: "product" | "service";
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  cost_price: number;
};

function mapOrderToSaleModel(order: RawOrder): SaleModel {
  return {
    id: order.id,
    company_id: order.company_id,
    client_id: order.client_id,
    sale_number: order.sale_number,
    sale_type: order.sale_type,
    status: order.status,
    payment_method: order.payment_method,
    installments: order.installments ?? 1,
    due_date: order.due_date,
    notes: order.notes,
    responsible: order.responsible,
    total_amount: Number(order.total_amount),
    created_at: order.created_at,
    client: order.client ? { name: order.client.name } : undefined,
    items: (order.items || []).map((item: RawOrderItem) => ({
      id: item.id,
      sale_id: item.order_id,
      item_type: item.item_type,
      item_id: item.product_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      discount: Number(item.discount),
      subtotal: Number(item.subtotal),
      cost_price: Number(item.cost_price || 0),
    })),
  };
}

export async function getSales(): Promise<SaleModel[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return [];

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, client:clients(name), items:order_items(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar vendas:", error);
    return [];
  }

  return (orders || []).map(mapOrderToSaleModel);
}

export async function getSaleById(saleId: string): Promise<SaleModel | null> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, client:clients(name), items:order_items(*)")
    .eq("id", saleId)
    .eq("company_id", companyId)
    .single();

  if (error || !order) {
    console.error("Erro ao carregar venda:", error);
    return null;
  }

  return mapOrderToSaleModel(order);
}

async function generateSaleNumber(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string): Promise<string> {
  const { data: lastOrder } = await supabase
    .from("orders")
    .select("sale_number")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNumber = lastOrder?.sale_number
    ? parseInt(lastOrder.sale_number.replace("VND-", ""), 10)
    : 0;

  return `VND-${String(lastNumber + 1).padStart(3, "0")}`;
}

export async function createSaleAction(
  saleData: {
    client_id: string;
    client_name: string;
    sale_type: "product" | "service" | "both";
    payment_method: "pix" | "boleto" | "credit_card" | "transfer" | null;
    installments: number;
    due_date: string | null;
    notes: string | null;
    responsible: string;
    items: Omit<SaleItemModel, "id" | "sale_id">[];
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return { success: false, error: "Perfil não encontrado." };
  }

  const companyId = profile.company_id;
  const saleNumber = await generateSaleNumber(supabase, companyId);

  const totalAmount = saleData.items.reduce((acc, item) => acc + item.subtotal, 0);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      company_id: companyId,
      client_id: saleData.client_id,
      sale_number: saleNumber,
      sale_type: saleData.sale_type,
      status: "pending",
      payment_method: saleData.payment_method,
      installments: saleData.installments,
      due_date: saleData.due_date,
      notes: saleData.notes,
      responsible: saleData.responsible,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error("Erro ao criar venda:", orderError);
    return { success: false, error: `Erro ao criar venda: ${orderError?.message || "erro desconhecido"}` };
  }

  const itemsToInsert = saleData.items.map((item) => ({
    order_id: order.id,
    product_id: item.item_id,
    item_type: item.item_type,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount: item.discount,
    subtotal: item.subtotal,
    cost_price: item.cost_price,
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    console.error("Erro ao criar itens da venda:", itemsError);
    await supabase.from("orders").delete().eq("id", order.id);
    return { success: false, error: "Erro ao registrar itens da venda." };
  }

  // Validar estoque para todos os itens antes de deduzir (evita rollback parcial)
  const stockDeductions: { productId: string; name: string; quantity: number }[] = [];

  for (const item of saleData.items) {
    if (item.item_type === "product") {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock_quantity, name")
        .eq("id", item.item_id)
        .single();

      if (productError || !product) {
        await supabase.from("orders").delete().eq("id", order.id);
        return { success: false, error: `Produto não encontrado: ${item.item_name}` };
      }

      stockDeductions.push({ productId: item.item_id, name: product.name, quantity: item.quantity });
    }
  }

  // Agrupar quantidades por produto (mesmo produto em múltiplos itens)
  const groupedDeductions: Record<string, { name: string; quantity: number }> = {};
  for (const d of stockDeductions) {
    if (!groupedDeductions[d.productId]) {
      groupedDeductions[d.productId] = { name: d.name, quantity: 0 };
    }
    groupedDeductions[d.productId].quantity += d.quantity;
  }

  // Validar estoque considerando o total agrupado
  for (const [productId, data] of Object.entries(groupedDeductions)) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      await supabase.from("orders").delete().eq("id", order.id);
      return { success: false, error: `Produto não encontrado: ${data.name}` };
    }

    if (product.stock_quantity < data.quantity) {
      await supabase.from("orders").delete().eq("id", order.id);
      return {
        success: false,
        error: `Estoque insuficiente para "${data.name}". Disponível: ${product.stock_quantity}, solicitado: ${data.quantity}`,
      };
    }
  }

  // Deduzir estoque (agora com validação garantida)
  for (const [productId, data] of Object.entries(groupedDeductions)) {
    const { data: product } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();

    if (product) {
      await supabase
        .from("products")
        .update({ stock_quantity: product.stock_quantity - data.quantity })
        .eq("id", productId);
    }
  }

  // Criar lançamento financeiro pendente para a nova venda
  await upsertFinanceForSale(
    {
      ...order,
      client: { name: saleData.client_name },
    },
    "pending"
  );

  return {
    success: true,
    data: mapOrderToSaleModel({
      ...order,
      client: { name: saleData.client_name },
      items: insertedItems,
    }),
  };
}

export async function updateSaleStatusAction(
  saleId: string,
  newStatus: SaleModel["status"]
): Promise<ActionResult> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return { success: false, error: "Usuário não autenticado." };

  // Buscar status atual e itens da venda
  const { data: currentOrder, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", saleId)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !currentOrder) {
    console.error("Erro ao buscar venda:", fetchError);
    return { success: false, error: "Venda não encontrada." };
  }

  const oldStatus = currentOrder.status;

  // Se cancelando, restaurar estoque
  if (newStatus === "canceled" && oldStatus !== "canceled") {
    const { data: items } = await supabase
      .from("order_items")
      .select("item_type, product_id, quantity")
      .eq("order_id", saleId);

    for (const item of items || []) {
      if (item.item_type === "product" && item.product_id) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq("id", item.product_id);
        }
      }
    }
  }

  // Se reativando (estava cancelada), deduzir estoque novamente
  if (oldStatus === "canceled" && newStatus !== "canceled") {
    const { data: items } = await supabase
      .from("order_items")
      .select("item_type, product_id, quantity")
      .eq("order_id", saleId);

    for (const item of items || []) {
      if (item.item_type === "product" && item.product_id) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          if (product.stock_quantity < item.quantity) {
            return {
              success: false,
              error: `Estoque insuficiente para reativar a venda. Produto ID: ${item.product_id}`,
            };
          }

          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq("id", item.product_id);
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", saleId)
    .eq("company_id", companyId)
    .select("*, client:clients(name), items:order_items(*)")
    .single();

  if (error || !data) {
    console.error("Erro ao atualizar status:", error);
    return { success: false, error: "Venda não encontrada ou erro ao atualizar." };
  }

  // Criar/atualizar lançamento financeiro conforme o novo status
  if (newStatus !== oldStatus) {
    if (newStatus === "pending" && oldStatus !== "pending") {
      await upsertFinanceForSale(data, "pending");
    } else if (newStatus === "completed" && oldStatus !== "completed") {
      await upsertFinanceForSale(data, "completed");
    } else if (newStatus === "canceled" && oldStatus !== "canceled") {
      await upsertFinanceForSale(data, "canceled");
    }
  }

  return { success: true, data: mapOrderToSaleModel(data) };
}

async function upsertFinanceForSale(
  order: Record<string, unknown>,
  targetStatus: "pending" | "completed" | "canceled"
): Promise<void> {
  const supabase = await createClient();

  // Verificar se já existe transação para esta venda
  const { data: existing } = await supabase
    .from("financial_transactions")
    .select("id")
    .eq("reference_id", order.id)
    .maybeSingle();

  // Buscar itens com nome e quantidade para montar a descrição
  const { data: items } = await supabase
    .from("order_items")
    .select("item_name, quantity")
    .eq("order_id", order.id);

  const clientName = (order.client as { name?: string } | null)?.name || "Desconhecido";
  const itemsDesc = (items || [])
    .map((i) => `${i.quantity}x ${i.item_name}`)
    .join(", ");

  const description = `Venda ${order.sale_number} · Cliente: ${clientName} · ${itemsDesc}`;

  const dueDate = order.due_date
    ? (order.due_date as string).split("T")[0]
    : (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  const statusMap: Record<string, "pending" | "completed" | "cancelled"> = {
    pending: "pending",
    completed: "completed",
    canceled: "cancelled",
  };

  if (existing) {
    // Atualizar transação existente
    const updateData: Record<string, unknown> = {
      status: statusMap[targetStatus],
      amount: Number(order.total_amount),
      due_date: dueDate,
      description,
      payment_method: order.payment_method as string | undefined,
    };

    if (targetStatus === "completed") {
      const n = new Date();
      updateData.payment_date = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }

    await supabase
      .from("financial_transactions")
      .update(updateData)
      .eq("id", existing.id);
  } else {
    // Criar nova transação
    const n = new Date();
    const localToday = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const paymentDate = targetStatus === "completed"
      ? localToday
      : undefined;

    await createTransactionAction({
      type: "income",
      description,
      amount: Number(order.total_amount),
      category: "Vendas",
      status: statusMap[targetStatus],
      due_date: dueDate,
      client_id: order.client_id as string | undefined,
      reference_id: order.id as string,
      payment_method: order.payment_method as string | undefined,
      payment_date: paymentDate,
    });
  }
}

export async function deleteSaleAction(saleId: string): Promise<boolean> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return false;

  // Buscar itens da venda para restaurar estoque
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("item_type, product_id, quantity")
    .eq("order_id", saleId);

  if (itemsError) {
    console.error("Erro ao buscar itens da venda:", itemsError);
    return false;
  }

  // Restaurar estoque para itens do tipo produto
  for (const item of items || []) {
    if (item.item_type === "product" && item.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();

      if (product) {
        await supabase
          .from("products")
          .update({ stock_quantity: product.stock_quantity + item.quantity })
          .eq("id", item.product_id);
      }
    }
  }

  // Excluir transação financeira vinculada a esta venda
  await supabase
    .from("financial_transactions")
    .delete()
    .eq("reference_id", saleId)
    .eq("type", "income")
    .eq("company_id", companyId);

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", saleId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Erro ao deletar venda:", error);
    return false;
  }

  return true;
}

export async function getClientsForSales(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("company_id", companyId)
    .eq("type", "cliente")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar clientes para vendas:", error);
    return [];
  }

  return data || [];
}

export async function getProductsForSales(): Promise<{ id: string; name: string; sale_price: number; cost_price: number; type: string; stock_quantity: number }[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sale_price, cost_price, type, stock_quantity")
    .eq("company_id", companyId)
    .neq("type", "service")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos para vendas:", error);
    return [];
  }

  return data || [];
}

export async function getServicesForSales(): Promise<{ id: string; name: string; sale_price: number; cost_price: number }[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sale_price, cost_price")
    .eq("company_id", companyId)
    .eq("type", "service")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao carregar serviços para vendas:", error);
    return [];
  }

  return data || [];
}

export async function getOverallMargin(): Promise<{ totalRevenue: number; totalCost: number; marginPercent: number | null }> {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);
  if (!companyId) return { totalRevenue: 0, totalCost: 0, marginPercent: null };

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total_amount")
    .eq("company_id", companyId)
    .in("status", ["completed", "approved"]);

  if (ordersError || !orders || orders.length === 0) {
    return { totalRevenue: 0, totalCost: 0, marginPercent: null };
  }

  const orderIds = orders.map((o) => o.id);

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("quantity, cost_price")
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("Erro ao carregar itens para margem:", itemsError);
    return { totalRevenue: 0, totalCost: 0, marginPercent: null };
  }

  const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_amount), 0);
  const totalCost = (items || []).reduce(
    (acc, i) => acc + i.quantity * Number(i.cost_price || 0),
    0
  );

  const marginPercent =
    totalRevenue > 0
      ? ((totalRevenue - totalCost) / totalRevenue) * 100
      : null;

  return { totalRevenue, totalCost, marginPercent };
}
