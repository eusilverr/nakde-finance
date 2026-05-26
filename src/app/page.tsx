import { redirect } from "next/navigation";

export default function Home() {
  // Por enquanto, redirecionamos para o login público do SaaS.
  // Futuramente isso será protegido pela sessão do Supabase.
  redirect("/login");
}
