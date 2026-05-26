"use server";

import { createClient } from "@/lib/supabase/server";

export interface ClientModel {
  id: string;
  name: string;
  email: string;
  document: string;
  status: "prospect" | "active" | "inactive";
  type: "cliente" | "fornecedor";
  phone?: string;
  website?: string;
  city_state?: string;
  created_at: string;
}

export interface TimelineEventModel {
  id: string;
  event_type: string;
  description: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface ActionResult {
  success: boolean;
  data?: ClientModel;
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

// 1. Obter todos os clientes filtrados por Empresa (Tenant)
export async function getClients(): Promise<ClientModel[]> {
  const supabase = await createClient();

  const companyId = await getCompanyId(supabase);
  if (!companyId) {
    return [
      { id: "c1", name: "Acme Corporation", email: "contact@acme.com", document: "12.345.678/0001-90", status: "active", type: "cliente", phone: "(11) 99999-9999", city_state: "São Paulo, SP", created_at: new Date().toISOString() },
      { id: "c2", name: "Stark Industries", email: "tony@stark.com", document: "98.765.432/0001-10", status: "active", type: "cliente", website: "stark.com", city_state: "Rio de Janeiro, RJ", created_at: new Date().toISOString() },
      { id: "c3", name: "Wayne Enterprises", email: "bruce@wayne.com", document: "45.678.901/0001-20", status: "prospect", type: "cliente", created_at: new Date().toISOString() },
      { id: "c4", name: "Fornecedor XYZ", email: "contato@xyz.com", document: "11.222.333/0001-44", status: "active", type: "fornecedor", phone: "(31) 3333-3333", city_state: "Belo Horizonte, MG", created_at: new Date().toISOString() },
    ];
  }

  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as ClientModel[]) || [];
  } catch (err) {
    console.error("Erro ao obter clientes:", err);
    return [];
  }
}

// 2. Obter apenas fornecedores (type = 'fornecedor')
export async function getSuppliers(): Promise<ClientModel[]> {
  const supabase = await createClient();

  const companyId = await getCompanyId(supabase);
  if (!companyId) return [];

  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", companyId)
      .eq("type", "fornecedor")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as ClientModel[]) || [];
  } catch (err) {
    console.error("Erro ao obter fornecedores:", err);
    return [];
  }
}

// 3. Obter a Timeline de Eventos de um Cliente
export async function getClientTimeline(clientId: string): Promise<TimelineEventModel[]> {
  const supabase = await createClient();

  const companyId = await getCompanyId(supabase);
  if (!companyId) return [];

  try {
    const { data, error } = await supabase
      .from("client_events")
      .select("*")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as TimelineEventModel[]) || [];
  } catch (err) {
    console.error("Erro ao obter timeline:", err);
    return [];
  }
}

// 4. Criar Novo Cliente
export async function createClientAction(
  clientData: Omit<ClientModel, "id" | "created_at">
): Promise<ActionResult> {
  const supabase = await createClient();

  const companyId = await getCompanyId(supabase);
  if (!companyId) {
    return { success: false, error: "Usuário não autenticado ou perfil não encontrado." };
  }

  try {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        company_id: companyId,
        ...clientData
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("client_events").insert({
      company_id: companyId,
      client_id: data.id,
      event_type: "client_created",
      description: "Cadastro inicial realizado no Nakde Finance"
    });

    return { success: true, data: data as ClientModel };
  } catch (err) {
    console.error("Erro ao criar cliente:", err);
    return { success: false, error: "Erro ao cadastrar cliente. Verifique os dados e tente novamente." };
  }
}

// 5. Atualizar Cliente
export async function updateClientAction(
  clientId: string,
  clientData: Partial<Omit<ClientModel, "id" | "created_at">>
): Promise<ActionResult> {
  const supabase = await createClient();

  const companyId = await getCompanyId(supabase);
  if (!companyId) {
    return { success: false, error: "Usuário não autenticado ou perfil não encontrado." };
  }

  try {
    const { data, error } = await supabase
      .from("clients")
      .update(clientData)
      .eq("id", clientId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as ClientModel };
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err);
    return { success: false, error: "Erro ao atualizar cliente. Verifique os dados e tente novamente." };
  }
}
