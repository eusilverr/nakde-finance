"use server";

import { createClient } from "@/lib/supabase/server";
import { createTransactionAction } from "@/features/finance/actions";

export interface ProductModel {
  id: string;
  company_id: string;
  sku?: string;
  name: string;
  description: string;
  sale_price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock: number;
  type: "physical" | "digital" | "service";
  supplier_id?: string;
  updated_at?: string;
  created_at: string;
}

export interface ActionResult {
  success: boolean;
  data?: ProductModel;
  error?: string;
}

export async function getProducts(): Promise<ProductModel[]> {
  const supabase = await createClient();

  // O Supabase já puxa os dados do usuário logado via cookies
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  // Obter o company_id do usuário logado
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar produtos:", error);
    return [];
  }

  return data || [];
}

export async function createProductAction(productData: Partial<ProductModel>): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: `Usuário não autenticado: ${authError?.message || 'sessão inválida'}` };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return { success: false, error: `Perfil não encontrado: ${profileError?.message || 'company_id ausente'}` };
  }

  const now = new Date().toISOString();

  const insertData: Record<string, unknown> = {
    sku: productData.sku,
    name: productData.name,
    description: productData.description,
    sale_price: productData.sale_price,
    cost_price: productData.cost_price ?? 0,
    stock_quantity: productData.stock_quantity ?? 0,
    min_stock: productData.min_stock ?? 5,
    type: productData.type ?? 'physical',
    company_id: profile.company_id,
    updated_at: now,
  };

  if (productData.supplier_id && productData.type === "physical") {
    insertData.supplier_id = productData.supplier_id;
  }

  const { data, error } = await supabase
    .from("products")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar produto:", error);
    return { success: false, error: `Erro no banco: ${error.message}` };
  }

  const createdProduct = data;

  // Criar transação financeira automática se houver custo
  const costPrice = Number(createdProduct.cost_price) || 0;
  if (costPrice > 0) {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const productType = createdProduct.type;

    if (productType === "physical") {
      // Produto físico: compra de fornecedor
      let supplierName = "Fornecedor";
      if (createdProduct.supplier_id) {
        const { data: supplier } = await supabase
          .from("clients")
          .select("name")
          .eq("id", createdProduct.supplier_id)
          .single();
        if (supplier) supplierName = supplier.name;
      }

      const quantity = createdProduct.stock_quantity || 1;
      const totalCost = costPrice * quantity;

      await createTransactionAction({
        type: "expense",
        description: `Compra de ${createdProduct.name} x${quantity} - ${supplierName}`,
        amount: totalCost,
        category: "Custo de Produtos",
        status: "completed",
        due_date: today,
        payment_date: today,
        client_id: createdProduct.supplier_id || undefined,
        reference_id: createdProduct.id,
      });
    } else {
      // Digital ou serviço: custo operacional
      await createTransactionAction({
        type: "expense",
        description: `Custo de ${createdProduct.name}`,
        amount: costPrice,
        category: "Operacional",
        status: "completed",
        due_date: today,
        payment_date: today,
        reference_id: createdProduct.id,
      });
    }
  }

  return { success: true, data: createdProduct };
}

export async function updateProductAction(
  productId: string,
  productData: Partial<ProductModel>,
  options?: { replaceTransaction?: boolean }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: `Usuário não autenticado: ${authError?.message || 'sessão inválida'}` };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return { success: false, error: `Perfil não encontrado: ${profileError?.message || 'company_id ausente'}` };
  }

  // Buscar produto atual para comparar estoque
  const { data: currentProduct } = await supabase
    .from("products")
    .select("stock_quantity, cost_price, supplier_id, type, name")
    .eq("id", productId)
    .eq("company_id", profile.company_id)
    .single();

  const oldStock = (currentProduct as Record<string, unknown>)?.stock_quantity ?? 0;

  const updateData: Record<string, unknown> = {
    sku: productData.sku,
    name: productData.name,
    description: productData.description,
    sale_price: productData.sale_price,
    cost_price: productData.cost_price ?? 0,
    stock_quantity: productData.stock_quantity ?? 0,
    min_stock: productData.min_stock ?? 5,
    type: productData.type ?? 'physical',
    updated_at: new Date().toISOString(),
  };

  if (productData.type === "physical" && productData.supplier_id) {
    updateData.supplier_id = productData.supplier_id;
  }

  const { data, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId)
    .eq("company_id", profile.company_id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar produto:", error);
    return { success: false, error: `Erro no banco: ${error.message}` };
  }

  // Criar transação automática para alteração de estoque
  const newStock = Number(data.stock_quantity) || 0;
  const costPrice = Number(data.cost_price) || 0;
  const diff = newStock - Number(oldStock);

  if (diff < 0 && costPrice > 0 && options?.replaceTransaction) {
    // Excluir transação(ões) antiga(s) e criar nova com valor corrigido
    const { error: deleteError, count } = await supabase
      .from("financial_transactions")
      .delete({ count: "exact" })
      .eq("reference_id", data.id)
      .eq("type", "expense")
      .eq("company_id", profile.company_id);

    if (deleteError) {
      console.error("Erro ao excluir transação antiga:", deleteError);
    } else {
      console.log(`Transações excluídas: ${count}`);
    }

    const n = new Date();
    const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const productType = data.type;
    const totalCost = newStock * costPrice;

    if (productType === "physical") {
      let supplierName = "Fornecedor";
      if (data.supplier_id) {
        const { data: supplier } = await supabase
          .from("clients")
          .select("name")
          .eq("id", data.supplier_id)
          .single();
        if (supplier) supplierName = supplier.name;
      }

      await createTransactionAction({
        type: "expense",
        description: `Correção de estoque: ${data.name} x${newStock} - ${supplierName}`,
        amount: totalCost,
        category: "Custo de Produtos",
        status: "completed",
        due_date: today,
        payment_date: today,
        client_id: data.supplier_id || undefined,
        reference_id: data.id,
      });
    } else {
      await createTransactionAction({
        type: "expense",
        description: `Correção de estoque: ${data.name} x${newStock}`,
        amount: totalCost,
        category: "Operacional",
        status: "completed",
        due_date: today,
        payment_date: today,
        reference_id: data.id,
      });
    }
  }

  if (diff > 0 && costPrice > 0) {
    const n = new Date();
    const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const productType = data.type;
    const totalCost = diff * costPrice;

    if (productType === "physical") {
      let supplierName = "Fornecedor";
      if (data.supplier_id) {
        const { data: supplier } = await supabase
          .from("clients")
          .select("name")
          .eq("id", data.supplier_id)
          .single();
        if (supplier) supplierName = supplier.name;
      }

      await createTransactionAction({
        type: "expense",
        description: `Reposição de ${data.name} x${diff} - ${supplierName}`,
        amount: totalCost,
        category: "Custo de Produtos",
        status: "completed",
        due_date: today,
        payment_date: today,
        client_id: data.supplier_id || undefined,
        reference_id: data.id,
      });
    } else {
      await createTransactionAction({
        type: "expense",
        description: `Custo adicional de ${data.name}`,
        amount: totalCost,
        category: "Operacional",
        status: "completed",
        due_date: today,
        payment_date: today,
        reference_id: data.id,
      });
    }
  }

  return { success: true, data };
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    const msg = error.message?.includes("foreign key constraint")
      ? "Este produto não pode ser excluído pois está vinculado a vendas ou ordens de serviço."
      : `Erro no banco: ${error.message}`;
    return { success: false, error: msg };
  }

  return { success: true };
}
