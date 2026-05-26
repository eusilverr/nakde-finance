"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthResponse {
  success: boolean;
  error?: string;
}

// 1. Entrar (Login)
export async function loginAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "E-mail e senha são obrigatórios." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// 2. Cadastrar Novo Workspace SaaS (Sign Up)
export async function signUpAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const companyName = formData.get("companyName") as string;

  if (!email || !password || !fullName || !companyName) {
    return { success: false, error: "Todos os campos são obrigatórios." };
  }

  const supabase = await createClient();

  // A. Cadastrar Usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  const userId = authData.user?.id;

  if (!userId) {
    return { 
      success: false, 
      error: "Este e-mail já está registrado ou aguarda confirmação. Tente fazer login ou verifique sua caixa de entrada." 
    };
  }

  try {
    // B. Criar a Empresa (Locatário / Tenant) no Banco Público
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .insert({ name: companyName })
      .select("id")
      .single();

    if (companyError) throw companyError;

    // C. Criar o Perfil Administrador vinculado à Empresa
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        company_id: companyData.id,
        full_name: fullName,
        role: "admin", // O criador da conta se torna Admin do Workspace
      });

    if (profileError) throw profileError;

    return { success: true };
  } catch (dbError: any) {
    console.error("Erro ao configurar banco de dados do tenant:", dbError);
    return { 
      success: false, 
      error: "Sua conta de login foi criada, mas houve um erro ao estruturar seu banco. Entre em contato com o suporte." 
    };
  }
}

// 3. Sair (Logout)
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
