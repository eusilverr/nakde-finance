"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Calendar,
  User,
  FileText,
  Clock,
  Package,
  Wrench
} from "lucide-react";
import {
  getSaleById,
  updateSaleStatusAction,
  SaleModel
} from "@/features/sales/actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  invoiced: "Faturada",
  completed: "Concluída",
  canceled: "Cancelada",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovada" },
  { value: "invoiced", label: "Faturada" },
  { value: "completed", label: "Concluída" },
  { value: "canceled", label: "Cancelada" },
];

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit_card: "Cartão de Crédito",
  transfer: "Transferência",
};

const formatBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export default function DetalhesVenda() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sale, setSale] = useState<SaleModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) loadSale();
  }, [id]);

  async function loadSale() {
    setLoading(true);
    try {
      const data = await getSaleById(id);
      setSale(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!sale) return;
    setUpdatingStatus(true);
    const result = await updateSaleStatusAction(sale.id, newStatus as any);
    if (result.success && result.data) {
      setSale(result.data);
    }
    setUpdatingStatus(false);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      approved: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      invoiced: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      canceled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
    return `inline-flex px-3 py-1.5 rounded-lg text-sm font-bold border ${map[status] || "bg-gray-500/10 text-gray-400"}`;
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-white/5 rounded w-48" />
        <div className="glass-panel rounded-3xl p-8">
          <div className="space-y-4">
            <div className="h-6 bg-white/5 rounded w-64" />
            <div className="h-4 bg-white/5 rounded w-96" />
            <div className="h-4 bg-white/5 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Venda não encontrada</h2>
        <p className="text-gray-500 mb-6">A venda que você está procurando não existe ou foi removida.</p>
        <button
          onClick={() => router.push("/dashboard/vendas")}
          className="px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] text-white text-sm hover:bg-blue-600 transition-colors"
        >
          Voltar para Vendas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/vendas")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Vendas
      </button>

      {/* Sale Header */}
      <div className="glass-panel rounded-3xl p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">
                #{sale.sale_number}
              </h2>
              <span className={getStatusBadge(sale.status)}>
                {STATUS_LABELS[sale.status] || sale.status}
              </span>
            </div>
            <p className="text-lg text-gray-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              {sale.client?.name || "Desconhecido"}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(sale.created_at).toLocaleDateString("pt-BR")}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {sale.responsible || "Não definido"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-3xl font-bold text-[var(--color-brand-blue)]">
                {formatBRL(sale.total_amount)}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 block">Alterar Status</label>
              <select
                value={sale.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                className="px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [&>option]:bg-gray-900 disabled:opacity-70"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Items Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Itens da Venda */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-[var(--color-brand-blue)]" />
              Itens da Venda
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500 border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-3 py-3">Item</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3 text-center">Qtd</th>
                    <th className="px-3 py-3 text-right">Valor Un.</th>
                    <th className="px-3 py-3 text-right">Desconto</th>
                    <th className="px-3 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(sale.items || []).map((item) => (
                    <tr key={item.id} className="border-b border-[var(--border-color)]/50">
                      <td className="px-3 py-4 font-semibold">{item.item_name}</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                          item.item_type === "product"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-sky-500/10 text-sky-400"
                        }`}>
                          {item.item_type === "product" ? <Package className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                          {item.item_type === "product" ? "Produto" : "Serviço"}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">{item.quantity}</td>
                      <td className="px-3 py-4 text-right">{formatBRL(item.unit_price)}</td>
                      <td className="px-3 py-4 text-right text-rose-400">
                        {item.discount > 0 ? `-${formatBRL(item.discount)}` : "—"}
                      </td>
                      <td className="px-3 py-4 text-right font-medium">{formatBRL(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border-color)]">
                    <td colSpan={5} className="px-3 py-4 text-right text-sm text-gray-400">Total</td>
                    <td className="px-3 py-4 text-right font-bold text-lg text-[var(--color-brand-blue)]">
                      {formatBRL(sale.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Observações */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[var(--color-brand-blue)]" />
              Observações
            </h3>
            {sale.notes ? (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{sale.notes}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">Nenhuma observação registrada.</p>
            )}
          </div>
        </div>

        {/* Right Column - Finance & History */}
        <div className="space-y-8">
          {/* Financeiro */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Financeiro
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]/50">
                <span className="text-sm text-gray-400">Forma de Pagamento</span>
                <span className="text-sm font-medium">
                  {sale.payment_method
                    ? PAYMENT_LABELS[sale.payment_method] || sale.payment_method
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]/50">
                <span className="text-sm text-gray-400">Parcelas</span>
                <span className="text-sm font-medium">{sale.installments}x</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]/50">
                <span className="text-sm text-gray-400">Vencimento</span>
                <span className="text-sm font-medium">
                  {sale.due_date
                    ? new Date(sale.due_date.includes("T") ? sale.due_date : sale.due_date + "T00:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Status do Pagamento</span>
                <span className={sale.status === "completed" ? "text-emerald-400 text-sm font-medium" : "text-amber-400 text-sm font-medium"}>
                  {sale.status === "completed" ? "Pago" : sale.status === "canceled" ? "Cancelado" : "Pendente"}
                </span>
              </div>
            </div>
          </div>

          {/* Histórico */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-indigo-500" />
              Histórico
            </h3>
            <div className="relative pl-6 border-l-2 border-[var(--border-color)] space-y-6">
              <div className="relative">
                <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-sm font-medium">Venda criada</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(sale.created_at).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-gray-500">Responsável: {sale.responsible}</p>
              </div>
              {sale.status !== "pending" && (
                <div className="relative">
                  <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-sky-500/20 border-2 border-sky-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  </div>
                  <p className="text-sm font-medium">Status alterado para: {STATUS_LABELS[sale.status]}</p>
                  <p className="text-xs text-gray-500">Atualização inline</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 italic mt-4">
              Histórico completo será integrado com client_events futuramente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
