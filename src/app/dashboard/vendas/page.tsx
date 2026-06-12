"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ShoppingCart,
  DollarSign,
  Clock,
  TrendingUp,
  Eye,
  Pencil,
  Trash2,
  X,
  Percent
} from "lucide-react";
import {
  getSales,
  getSaleById,
  createSaleAction,
  updateSaleStatusAction,
  deleteSaleAction,
  getClientsForSales,
  getProductsForSales,
  getServicesForSales,
  SaleModel,
  SaleItemModel
} from "@/features/sales/actions";
import { createClientAction } from "@/features/clients/actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  invoiced: "Faturada",
  completed: "Concluída",
  canceled: "Cancelada",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovada" },
  { value: "invoiced", label: "Faturada" },
  { value: "completed", label: "Concluída" },
  { value: "canceled", label: "Cancelada" },
];

const SALE_TYPE_LABELS: Record<string, string> = {
  product: "Produto",
  service: "Serviço",
  both: "Ambos",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit_card: "Cartão de Crédito",
  transfer: "Transferência",
};

const formatBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const now = new Date();
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
const todayStr = now.toISOString().split("T")[0];

export default function GestaoVendas() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterResponsible, setFilterResponsible] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sale_price: number; cost_price: number; type: string; stock_quantity: number }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; sale_price: number; cost_price: number }[]>([]);

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [saleType, setSaleType] = useState<"product" | "service" | "both">("product");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<{
    item_type: "product" | "service";
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    subtotal: number;
    cost_price: number;
  }[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<"pix" | "boleto" | "credit_card" | "transfer" | null>(null);
  const [installments, setInstallments] = useState(1);
  const [dueDate, setDueDate] = useState(todayStr);

  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientDoc, setNewClientDoc] = useState("");

  useEffect(() => {
    loadSales();
    loadFormData();
  }, []);

  async function loadSales() {
    setLoading(true);
    try {
      const data = await getSales();
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFormData() {
    const [c, p, s] = await Promise.all([
      getClientsForSales(),
      getProductsForSales(),
      getServicesForSales(),
    ]);
    setClients(c);
    setProducts(p);
    setServices(s);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta venda?")) return;
    const ok = await deleteSaleAction(id);
    if (ok) setSales(sales.filter((s) => s.id !== id));
  };

  const openCreateModal = () => {
    setClientId("");
    setClientName("");
    setSaleType("product");
    setResponsible("");
    setNotes("");
    setItems([]);
    setPaymentMethod(null);
    setInstallments(1);
    setDueDate(todayStr);
    setErrorMessage(null);
    setShowModal(true);
  };

  const addItem = () => {
    setItems([
      ...items,
      { item_type: "product", item_id: "", item_name: "", quantity: 1, unit_price: 0, discount: 0, subtotal: 0, cost_price: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== idx) return item;
        const newItem = { ...item, [field]: value };

        if (field === "item_id") {
          const found =
            newItem.item_type === "service"
              ? services.find((s) => s.id === value)
              : products.find((p) => p.id === value);
          if (found) {
            newItem.item_name = found.name;
            newItem.unit_price = found.sale_price;
            newItem.cost_price = found.cost_price || 0;
          } else {
            newItem.item_name = "";
            newItem.unit_price = 0;
            newItem.cost_price = 0;
          }
        }

        newItem.subtotal = newItem.quantity * newItem.unit_price - newItem.discount;
        if (newItem.subtotal < 0) newItem.subtotal = 0;

        return newItem;
      });
      return updated;
    });
  };

  const calcItemSubtotal = (item: typeof items[0]) => {
    return Math.max(0, item.quantity * item.unit_price - item.discount);
  };

  const totalAmount = items.reduce((acc, item) => acc + calcItemSubtotal(item), 0);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);

    const saleItems = items.map((item) => ({
      item_type: item.item_type,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      subtotal: calcItemSubtotal(item),
      cost_price: item.cost_price || 0,
    }));

    const result = await createSaleAction({
      client_id: clientId,
      client_name: clientName,
      sale_type: saleType,
      payment_method: paymentMethod,
      installments,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      notes: notes || null,
      responsible: responsible || "Não definido",
      items: saleItems,
    });

    if (result.success && result.data) {
      setSales([result.data, ...sales]);
      setShowModal(false);
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || "Erro desconhecido ao criar venda.");
    }
    setIsSubmitting(false);
  };

  const handleClientChange = (id: string) => {
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    setClientName(c?.name || "");
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const result = await createClientAction({
      name: newClientName.trim(),
      type: "cliente",
      status: "active",
      email: newClientEmail.trim() || "",
      document: newClientDoc.trim() || "",
    });

    if (result.success && result.data) {
      setClients([...clients, result.data]);
      handleClientChange(result.data.id);
      setShowClientModal(false);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientDoc("");
    } else {
      alert(result.error || "Erro ao cadastrar cliente.");
    }
  };

  // Derive unique responsible list for filter
  const responsibleList = [...new Set(sales.map((s) => s.responsible).filter(Boolean))];

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      (s.client?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      s.sale_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    const matchesResp = filterResponsible === "all" || s.responsible === filterResponsible;
    const saleDate = new Date(s.created_at);
    const matchesStart = !filterDateStart || saleDate >= new Date(filterDateStart);
    const matchesEnd = !filterDateEnd || saleDate <= new Date(filterDateEnd + "T23:59:59");
    return matchesSearch && matchesStatus && matchesResp && matchesStart && matchesEnd;
  });

  // KPIs
  const nowDate = new Date();
  const salesThisMonth = sales.filter(
    (s) =>
      new Date(s.created_at).getMonth() === nowDate.getMonth() &&
      new Date(s.created_at).getFullYear() === nowDate.getFullYear()
  );
  const vendasDoMes = salesThisMonth.length;
  const receitaTotal = sales
    .filter((s) => s.status === "completed" || s.status === "approved")
    .reduce((acc, s) => acc + s.total_amount, 0);
  const pedidosPendentes = sales.filter((s) => s.status === "pending").length;
  const ticketMedio = vendasDoMes > 0 ? receitaTotal / vendasDoMes : 0;

  // Média de Margem das Vendas
  const completedSales = sales.filter(
    (s) => s.status === "completed" || s.status === "approved"
  );
  const salesWithMargin = completedSales.filter(
    (s) => s.total_amount > 0 && s.items && s.items.length > 0
  );
  const avgMargin = salesWithMargin.length > 0
    ? salesWithMargin.reduce((acc, s) => {
        const saleRevenue = s.total_amount;
        const saleCost = s.items!.reduce(
          (sum, item) => sum + item.quantity * (item.cost_price || 0),
          0
        );
        const saleMargin = ((saleRevenue - saleCost) / saleRevenue) * 100;
        return acc + saleMargin;
      }, 0) / salesWithMargin.length
    : null;

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      approved: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      invoiced: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      canceled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
    return `inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${map[status] || "bg-gray-500/10 text-gray-400"}`;
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Gestão de Vendas</h2>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Gerencie vendas, acompanhe pedidos comerciais e monitore o desempenho financeiro da operação.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          Nova Venda
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-16 h-16" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Vendas do Mês</p>
          <h3 className="text-3xl font-bold">{vendasDoMes}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Receita Total</p>
          <h3 className="text-2xl font-bold text-emerald-500">{formatBRL(receitaTotal)}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Percent className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Margem Média</p>
          <h3 className={`text-3xl font-bold ${avgMargin !== null ? (avgMargin >= 30 ? "text-emerald-500" : "text-amber-500") : "text-gray-500"}`}>
            {avgMargin !== null ? `${avgMargin.toFixed(1)}%` : "—"}
          </h3>
        </div>
        <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Clock className="w-16 h-16 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Pedidos Pendentes</p>
          <h3 className="text-3xl font-bold text-amber-400">{pedidosPendentes}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-16 h-16 text-[var(--color-brand-blue)]" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Ticket Médio</p>
          <h3 className="text-2xl font-bold text-[var(--color-brand-blue)]">{formatBRL(ticketMedio)}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full">
            <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar venda ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 pl-3 pr-8 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="py-2 px-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark] w-[130px] sm:w-auto"
              title="Data início"
            />
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="py-2 px-3 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark] w-[130px] sm:w-auto"
              title="Data fim"
            />
            <select
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
              className="py-2 pl-3 pr-8 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
            >
              <option value="all">Responsável (todos)</option>
              {responsibleList.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]/50 animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-[var(--border-color)]/50 hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/dashboard/vendas/${sale.id}`)}
                  >
                    <td className="px-4 py-4 font-semibold">
                      {sale.client?.name || "Desconhecido"}
                      <div className="text-xs text-gray-500">{sale.sale_number}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs">
                      {SALE_TYPE_LABELS[sale.sale_type] || sale.sale_type}
                    </td>
                    <td className="px-4 py-4 font-medium">{formatBRL(sale.total_amount)}</td>
                    <td className="px-4 py-4">
                      <span className={getStatusBadge(sale.status)}>
                        {STATUS_LABELS[sale.status] || sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400">
                      {sale.payment_method
                        ? `${PAYMENT_LABELS[sale.payment_method] || sale.payment_method}${sale.installments > 1 ? ` ${sale.installments}x` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">{sale.responsible || "—"}</td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/vendas/${sale.id}`)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-sky-500/10 hover:text-sky-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Venda */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden my-4 sm:my-8">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Nova Venda</h3>

            <form onSubmit={handleCreateSale} className="space-y-4 sm:space-y-6">
              {/* Informações Gerais */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 sm:mb-4">Informações Gerais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Cliente</label>
                    <div className="flex gap-2">
                      <select
                        required
                        value={clientId}
                        onChange={(e) => handleClientChange(e.target.value)}
                        className="flex-1 w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                      >
                        <option value="" disabled>Selecione um cliente...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowClientModal(true)}
                        className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--foreground)] hover:bg-white/5 text-sm transition-all whitespace-nowrap"
                      >
                        + Novo
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Tipo da Venda</label>
                    <select
                      value={saleType}
                      onChange={(e) => setSaleType(e.target.value as any)}
                      className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    >
                      <option value="product">Produto</option>
                      <option value="service">Serviço</option>
                      <option value="both">Ambos</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Responsável</label>
                    <input
                      type="text"
                      value={responsible}
                      onChange={(e) => setResponsible(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Data de Vencimento</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark]"
                    />
                  </div>
                </div>
                <div className="space-y-1 mt-4">
                  <label className="text-sm font-medium text-gray-300">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    placeholder="Observações sobre a venda..."
                  />
                </div>
              </div>

              {/* Itens da Venda */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">Itens da Venda</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-brand-blue)] hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                {items.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-[var(--border-color)] rounded-xl">
                    Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                  </p>
                )}

                <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 sm:p-4 border border-[var(--border-color)] rounded-xl bg-white/5"
                  >
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3 w-full">
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-medium text-gray-500">Tipo</label>
                        <select
                          value={item.item_type}
                          onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                          className="w-full px-2 py-1.5 border border-[var(--border-color)] rounded-lg bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                        >
                          <option value="product">Produto</option>
                          <option value="service">Serviço</option>
                        </select>
                      </div>
                      <div className="col-span-1 sm:col-span-3 space-y-1">
                        <label className="text-[11px] font-medium text-gray-500">Item</label>
                        <select
                          value={item.item_id}
                          onChange={(e) => updateItem(idx, "item_id", e.target.value)}
                          className="w-full px-2 py-1.5 border border-[var(--border-color)] rounded-lg bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                        >
                          <option value="" disabled>Selecione</option>
                          {(item.item_type === "service" ? services : products).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}{"stock_quantity" in p ? ` (estoque: ${p.stock_quantity})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-medium text-gray-500">Qtd</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1.5 border border-[var(--border-color)] rounded-lg bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-medium text-gray-500">Valor Un.</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-[var(--border-color)] rounded-lg bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-medium text-gray-500">Desc.</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount}
                          onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-[var(--border-color)] rounded-lg bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-1 space-y-1">
                        <label className="text-[11px] font-medium text-gray-500">Sub.</label>
                        <div className="px-2 py-1.5 text-xs font-medium text-emerald-400">
                          {formatBRL(calcItemSubtotal(item))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors self-end sm:self-auto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                </div>

                {items.length > 0 && (
                  <div className="flex justify-end items-center gap-4 py-3 px-4 border-t border-[var(--border-color)] mt-2">
                    <span className="text-sm text-gray-400">Total Geral:</span>
                    <span className="text-xl font-bold text-[var(--color-brand-blue)]">{formatBRL(totalAmount)}</span>
                  </div>
                )}
              </div>

              {/* Financeiro */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">Financeiro</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Forma de Pagamento</label>
                    <select
                      value={paymentMethod || ""}
                      onChange={(e) => setPaymentMethod(e.target.value as any || null)}
                      className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    >
                      <option value="">Selecione...</option>
                      <option value="pix">PIX</option>
                      <option value="boleto">Boleto</option>
                      <option value="credit_card">Cartão de Crédito</option>
                      <option value="transfer">Transferência</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Parcelamento</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}x {n === 1 ? "(à vista)" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">
                  {errorMessage}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 sm:pt-6 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 sm:px-5 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-70"
                >
                  {isSubmitting ? "Registrando..." : "Registrar Venda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {showClientModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden animate-fadeIn">
            <h3 className="text-lg sm:text-xl font-bold mb-6">Novo Cliente</h3>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Nome</label>
                <input
                  type="text" required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">CPF/CNPJ</label>
                <input
                  type="text"
                  value={newClientDoc}
                  onChange={(e) => setNewClientDoc(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)] mt-6">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-5 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
