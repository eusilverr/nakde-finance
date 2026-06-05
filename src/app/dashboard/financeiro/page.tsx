"use client";

import React, { useEffect, useState } from "react";
import { 
  Receipt, 
  Search, 
  Plus, 
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  Trash2,
  Filter,
  TrendingUp,
  Pencil
} from "lucide-react";
import { 
  getTransactions, 
  createTransactionAction, 
  updateTransactionAction,
  deleteTransactionAction,
  TransactionModel,
  TransactionStatus,
} from "@/features/finance/actions";
import { getOverallMargin } from "@/features/sales/actions";
import { processSubscriptionBillings, getPendingSubscriptionAmount } from "@/features/services/actions";

export default function GestaoFinanceira() {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [marginData, setMarginData] = useState<{ totalRevenue: number; totalCost: number; marginPercent: number | null }>({ totalRevenue: 0, totalCost: 0, marginPercent: null });
  const [subscriptionsPending, setSubscriptionsPending] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Vendas");
  const [status, setStatus] = useState<"pending" | "completed" | "cancelled">("completed");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionModel | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("Vendas");
  const [editStatus, setEditStatus] = useState<TransactionStatus>("pending");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      await processSubscriptionBillings();
      const [data, margin, subsPending] = await Promise.all([
        getTransactions(),
        getOverallMargin(),
        getPendingSubscriptionAmount(),
      ]);
      setTransactions(data);
      setSubscriptionsPending(subsPending);
      if (margin) setMarginData(margin);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newTx = await createTransactionAction({
        type,
        description,
        amount: parseFloat(amount.replace(",", ".")),
        category,
        status,
        due_date: new Date(dueDate).toISOString()
      });

      if (newTx) {
        setTransactions([newTx, ...transactions].sort((a, b) => new Date(b.due_date + "T00:00:00").getTime() - new Date(a.due_date + "T00:00:00").getTime()));
        setShowModal(false);
        setDescription("");
        setAmount("");
        setCategory(type === "income" ? "Vendas" : "Operacional");
      } else {
        alert("Erro ao registrar lançamento. Verifique o console para mais detalhes.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro inesperado ao registrar lançamento.");
    }
    setIsSubmitting(false);
  };

  const openEditModal = (tx: TransactionModel) => {
    setEditingTx(tx);
    setEditDescription(tx.description);
    setEditAmount(tx.amount.toString());
    setEditCategory(tx.category);
    setEditStatus(tx.status);
    setEditDueDate(tx.due_date.split("T")[0]);
    setEditPaymentMethod((tx as any).payment_method || "");
    setShowEditModal(true);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setIsSubmitting(true);

    try {
      const updated = await updateTransactionAction(editingTx.id, {
        description: editDescription,
        amount: parseFloat(editAmount.replace(",", ".")),
        category: editCategory,
        status: editStatus,
        due_date: new Date(editDueDate).toISOString(),
        payment_method: editPaymentMethod || undefined,
      });

      if (updated) {
        setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
        setShowEditModal(false);
        setEditingTx(null);
      } else {
        alert("Erro ao atualizar lançamento.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro inesperado ao atualizar lançamento.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este lançamento?")) {
      const success = await deleteTransactionAction(id);
      if (success) {
        setTransactions(transactions.filter(t => t.id !== id));
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    const txDate = new Date(t.due_date + "T00:00:00");
    const matchesDate = (!filterDateStart || txDate >= new Date(filterDateStart + "T00:00:00")) &&
                        (!filterDateEnd || txDate <= new Date(filterDateEnd + "T23:59:59"));
    return matchesSearch && matchesType && matchesDate;
  });

  // Estatísticas Rápidas (DRE Simplificado do mês atual / pendentes)
  const totalReceitas = transactions.filter(t => t.type === "income" && t.status === "completed").reduce((acc, curr) => acc + curr.amount, 0);
  const totalDespesas = transactions.filter(t => t.type === "expense" && t.status === "completed").reduce((acc, curr) => acc + curr.amount, 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  
  const contasAReceber = transactions.filter(t => t.type === "income" && t.status === "pending").reduce((acc, curr) => acc + curr.amount, 0) + subscriptionsPending;
  const contasAPagar = transactions.filter(t => t.type === "expense" && t.status === "pending").reduce((acc, curr) => acc + curr.amount, 0);

  const formatBRL = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Financeiro (Contas e DRE)</h2>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Controle de fluxo de caixa, pagamentos pendentes e receitas.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
      </div>

      {/* KPI Cards DRE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        <div className="glass-panel rounded-2xl p-6 border-t-4 border-emerald-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Receitas Realizadas</p>
          <h3 className="text-2xl font-bold text-emerald-500">{formatBRL(totalReceitas)}</h3>
        </div>
        
        <div className="glass-panel rounded-2xl p-6 border-t-4 border-rose-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-16 h-16 text-rose-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Despesas Realizadas</p>
          <h3 className="text-2xl font-bold text-rose-500">{formatBRL(totalDespesas)}</h3>
        </div>

        <div className="glass-panel rounded-2xl p-6 border-t-4 border-[var(--color-brand-blue)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign className="w-16 h-16 text-[var(--color-brand-blue)]" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Lucro Líquido</p>
          <h3 className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-[var(--foreground)]" : "text-rose-500"}`}>
            {formatBRL(lucroLiquido)}
          </h3>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">A Receber</span>
            <span className="text-sm font-bold text-emerald-400">{formatBRL(contasAReceber)}</span>
          </div>
          <div className="h-px w-full bg-white/5 my-1" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">A Pagar</span>
            <span className="text-sm font-bold text-rose-400">{formatBRL(contasAPagar)}</span>
          </div>
        </div>

        {/* Margem Global */}
        <div className="glass-panel rounded-2xl p-6 border-t-4 relative overflow-hidden group"
          style={{ borderTopColor: marginData.marginPercent !== null && marginData.marginPercent >= 30 ? 'var(--color-emerald-500, #10b981)' : marginData.marginPercent !== null ? '#f59e0b' : 'var(--border-color)' }}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-16 h-16" style={{ color: marginData.marginPercent !== null && marginData.marginPercent >= 30 ? '#10b981' : marginData.marginPercent !== null ? '#f59e0b' : 'var(--border-color)' }} />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Margem Global</p>
          <h3 className={`text-2xl font-bold ${
            marginData.marginPercent !== null
              ? marginData.marginPercent >= 30
                ? "text-emerald-500"
                : "text-amber-500"
              : "text-gray-500"
          }`}>
            {marginData.marginPercent !== null
              ? `${marginData.marginPercent.toFixed(1)}%`
              : "—"}
          </h3>
          <div className="mt-2 text-[11px] text-gray-500 leading-tight">
            <div>Receita: {formatBRL(marginData.totalRevenue)}</div>
            <div>Custo: {formatBRL(marginData.totalCost)}</div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[var(--color-brand-blue)]" />
            Lançamentos
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48 lg:w-64 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar lançamento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="py-2 pl-3 pr-8 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
            >
              <option value="all">Todos</option>
              <option value="income">Entradas</option>
              <option value="expense">Saídas</option>
            </select>
            <input
              type="date"
              value={filterDateStart}
              onChange={e => setFilterDateStart(e.target.value)}
              className="w-[130px] sm:w-32 lg:w-36 px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark]"
            />
            <span className="text-gray-500 text-xs">até</span>
            <input
              type="date"
              value={filterDateEnd}
              onChange={e => setFilterDateEnd(e.target.value)}
              className="w-[130px] sm:w-32 lg:w-36 px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3">Descrição & Categoria</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor (R$)</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]/50 animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-48" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-white/5 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[var(--border-color)]/50 hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="font-semibold flex items-center gap-2">
                        {tx.type === "income" ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        )}
                        {tx.description}
                      </div>
                      <div className="text-xs text-gray-500 ml-6">{tx.category}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(tx.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        tx.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                        tx.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                        "bg-gray-500/10 text-gray-400"
                      }`}>
                        {tx.status === "completed" ? "Pago" : tx.status === "pending" ? "Pendente" : "Cancelado"}
                      </span>
                    </td>
                    <td className={`px-4 py-4 text-right font-medium ${
                      tx.type === "income" ? "text-emerald-500" : "text-[var(--foreground)]"
                    }`}>
                      {tx.type === "expense" ? "- " : "+ "}
                      {formatBRL(tx.amount)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openEditModal(tx)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-blue-500/10 hover:text-blue-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(tx.id)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Transação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden animate-fadeIn">
            <h3 className="text-xl font-bold mb-6">Novo Lançamento Financeiro</h3>
            
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              
              <div className="flex p-1 bg-black/20 dark:bg-white/5 rounded-xl border border-[var(--border-color)] mb-4">
                <button
                  type="button"
                  onClick={() => { setType("income"); setCategory("Vendas"); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    type === "income" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md" : "text-gray-500 hover:text-[var(--foreground)]"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Receita
                </button>
                <button
                  type="button"
                  onClick={() => { setType("expense"); setCategory("Operacional"); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    type === "expense" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-md" : "text-gray-500 hover:text-[var(--foreground)]"
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Despesa
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Descrição</label>
                <input 
                  type="text" required value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Ex: Venda de Mentoria ou Assinatura de Software"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Valor (R$)</label>
                  <input 
                    type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Data de Venc/Pagamento</label>
                  <input 
                    type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Categoria</label>
                  <select 
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  >
                    {type === "income" ? (
                      <>
                        <option value="Vendas">Vendas</option>
                        <option value="Serviços">Serviços</option>
                        <option value="Investimentos">Investimentos</option>
                      </>
                    ) : (
                      <>
                        <option value="Operacional">Operacional (SaaS, Hospedagem)</option>
                        <option value="Marketing">Marketing / Tráfego</option>
                        <option value="Folha de Pagamento">Folha de Pagamento</option>
                        <option value="Impostos">Impostos</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <select 
                    value={status} onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  >
                    <option value="completed">Efetuado (Pago/Recebido)</option>
                    <option value="pending">Pendente (A Pagar/A Receber)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)] mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-70"
                >
                  {isSubmitting ? "Lançando..." : "Registrar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Transação */}
      {showEditModal && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p6 lg:p-8 shadow-2xl relative overflow-hidden animate-fadeIn">
            <h3 className="text-xl font-bold mb-6">Editar Lançamento</h3>
            
            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Descrição</label>
                <input 
                  type="text" required value={editDescription} onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Valor (R$)</label>
                  <input 
                    type="number" step="0.01" required value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Data de Vencimento</label>
                  <input 
                    type="date" required value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Categoria</label>
                  <select 
                    value={editCategory} onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  >
                    <option value="Vendas">Vendas</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Operacional">Operacional (SaaS, Hospedagem)</option>
                    <option value="Marketing">Marketing / Tráfego</option>
                    <option value="Folha de Pagamento">Folha de Pagamento</option>
                    <option value="Impostos">Impostos</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <select 
                    value={editStatus} onChange={e => setEditStatus(e.target.value as TransactionStatus)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  >
                    <option value="completed">Efetuado (Pago/Recebido)</option>
                    <option value="pending">Pendente (A Pagar/A Receber)</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Forma de Pagamento</label>
                <select 
                  value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                >
                  <option value="">Selecione...</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="transfer">Transferência</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)] mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setEditingTx(null); }}
                  className="px-5 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-70"
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
