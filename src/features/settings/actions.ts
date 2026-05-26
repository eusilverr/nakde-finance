"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserSettings {
  profile: {
    id: string;
    full_name: string;
    role: string;
    email?: string;
  };
  company: {
    id: string;
    name: string;
    document: string;
  };
}

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("id", authData.user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      email: authData.user.email,
    },
    company: {
      id: profile.companies?.id || "",
      name: profile.companies?.name || "",
      document: profile.companies?.document || "",
    },
  };
}

export async function updateUserSettings(data: {
  fullName: string;
  companyName: string;
  companyDocument: string;
}) {
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

  // Update Profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: data.fullName })
    .eq("id", authData.user.id);

  if (profileError) throw profileError;

  // Update Company
  const { error: companyError } = await supabase
    .from("companies")
    .update({ name: data.companyName, document: data.companyDocument })
    .eq("id", profile.company_id);

  if (companyError) throw companyError;

  return { success: true };
}
