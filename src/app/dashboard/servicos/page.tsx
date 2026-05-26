"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  Plus, 
  Briefcase,
  AlertTriangle,
  Trash2,
  Pencil,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Repeat,
  CalendarCheck,
  ChevronDown
} from "lucide-react";

import { 
  getServiceOrders, 
  createServiceOrderAction, 
  updateServiceOrderAction,
  deleteServiceOrderAction,
  ServiceOrderModel,
  getClientsForUser
} from "@/features/services/actions";

import { getProducts, createProductAction, deleteProductAction, ProductModel } from "@/features/products/actions";

export default function GestaoServicos() {
  const [orders, setOrders] = useState<ServiceOrderModel[]>([]);
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [products, setProducts] = useState<ProductModel[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrderModel | null>(null);

  // Form Fields
  const [clientId, setClientId] = useState("");
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState<"pendente" | "em_andamento" | "concluido" | "cancelado" | "ativo" | "pausado">("pendente");
  const [value, setValue] = useState("");
  const [cost, setCost] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Subscription Fields
  const [isSubscription, setIsSubscription] = useState(false);
  const [billingCycle, setBillingCycle] = useState("mensal");
  const [nextBillingDate, setNextBillingDate] = useState("");

  // Custom Dropdown State
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersData, clientsData, productsData] = await Promise.all([
        getServiceOrders(),
        getClientsForUser(),
        getProducts()
      ]);
      setOrders(ordersData);
      setClients(clientsData || []);
      // Filtrar apenas produtos do tipo serviço
      setProducts(productsData.filter(p => p.type === 'service'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Quando seleciona um serviço no modal, auto-preencher valor e custo base
  useEffect(() => {
    if (productId && !editingOrder) {
      const p = products.find(prod => prod.id === productId);
      if (p) {
        setValue(p.sale_price.toString());
        setCost(p.cost_price.toString());
      }
    }
  }, [productId, products, editingOrder]);

  const handleEdit = (order: ServiceOrderModel) => {
    setEditingOrder(order);
    setClientId(order.client_id);
    setProductId(order.product_id);
    setStatus(order.status);
    setValue(order.value.toString());
    setCost(order.cost.toString());
    setDueDate(order.due_date ? new Date(order.due_date.includes("T") ? order.due_date : order.due_date + "T00:00:00").toISOString().slice(0, 16) : "");
    setNotes(order.notes || "");
    setIsSubscription(order.is_subscription || false);
    setBillingCycle(order.billing_cycle || "mensal");
    setNextBillingDate(order.next_billing_date ? new Date(order.next_billing_date).toISOString().slice(0, 10) : "");
    setSaveError(null);
    setServiceDropdownOpen(false);
    setIsAddingService(false);
    setNewServiceName("");
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setClientId("");
    setProductId("");
    setStatus("pendente");
    setValue("");
    setCost("");
    setDueDate("");
    setNotes("");
    setIsSubscription(false);
    setBillingCycle("mensal");
    setNextBillingDate("");
    setSaveError(null);
    setServiceDropdownOpen(false);
    setIsAddingService(false);
    setNewServiceName("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveError(null);

    if (!productId) {
      setSaveError("Por favor, selecione ou crie um serviço.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      client_id: clientId,
      product_id: productId,
      status,
      value: parseFloat(value.replace(",", ".")),
      cost: parseFloat(cost.replace(",", ".")) || 0,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      notes,
      is_subscription: isSubscription,
      billing_cycle: isSubscription ? billingCycle : null,
      next_billing_date: isSubscription && nextBillingDate ? new Date(nextBillingDate).toISOString() : null
    };

    const result = editingOrder
      ? await updateServiceOrderAction(editingOrder.id, payload)
      : await createServiceOrderAction(payload);

    if (result.success && result.data) {
      // Recarregar os dados para pegar os joins (client name, product name)
      await loadData();
      setShowModal(false);
    } else {
      setSaveError(result.error || "Erro desconhecido ao salvar.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar esta ordem de serviço?")) {
      const success = await deleteServiceOrderAction(id);
      if (success) setOrders(orders.filter(o => o.id !== id));
    }
  };

  const handleAddService = async () => {
    if (!newServiceName.trim()) return;
    const sku = `SERV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const res = await createProductAction({
      sku,
      name: newServiceName.trim(),
      type: "service",
      sale_price: 0,
      cost_price: 0,
      stock_quantity: 0,
      min_stock: 0,
      description: "Serviço"
    });
    if (res.success && res.data) {
      setProducts([...products, res.data]);
      setProductId(res.data.id);
      setNewServiceName("");
      setIsAddingService(false);
      setServiceDropdownOpen(false);
    } else {
      setSaveError(res.error || "Erro ao adicionar serviço");
    }
  };

  const handleDeleteService = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este serviço do catálogo? Ele não aparecerá mais nas opções.")) {
      const ok = await deleteProductAction(id);
      if (ok) {
        setProducts(products.filter(p => p.id !== id));
        if (productId === id) setProductId("");
      }
    }
  };

  const filteredOrders = orders.filter(o =>
    (o.client?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.product?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const totalOrders = orders.length;
  const inProgress = orders.filter(o => o.status === "em_andamento" || o.status === "ativo").length;
  const completed = orders.filter(o => o.status === "concluido").length;
  
  // Calcular MRR
  const mrr = orders.filter(o => o.is_subscription && o.status === "ativo").reduce((acc, o) => {
    let monthlyValue = o.value;
    if (o.billing_cycle === 'anual') monthlyValue = o.value / 12;
    if (o.billing_cycle === 'semestral') monthlyValue = o.value / 6;
    if (o.billing_cycle === 'trimestral') monthlyValue = o.value / 3;
    return acc + monthlyValue;
  }, 0);

  const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const getStatusBadge = (s: string) => {
    switch(s) {
      case "pendente": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3" /> Pendente</span>;
      case "em_andamento": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-sky-500/10 text-sky-400 border-sky-500/20"><PlayCircle className="w-3 h-3" /> Em Andamento</span>;
      case "concluido": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Concluído</span>;
      case "cancelado": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20"><XCircle className="w-3 h-3" /> Cancelado</span>;
      case "ativo": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20"><CheckCircle2 className="w-3 h-3" /> Ativo</span>;
      case "pausado": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-orange-500/10 text-orange-400 border-orange-500/20"><Clock className="w-3 h-3" /> Pausado</span>;
      default: return null;
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h2>
          <p className="text-gray-500 mt-1">Gerencie os serviços prestados, prazos e faturamento.</p>
        </div>
        <button onClick={handleCreate}
          className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105">
          <Plus size={18} /> Nova Ordem (OS)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Briefcase className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total de OS</p>
          <h3 className="text-3xl font-bold">{totalOrders}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><PlayCircle className="w-16 h-16 text-sky-500" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Em Andamento</p>
          <h3 className="text-3xl font-bold text-sky-400">{inProgress}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle2 className="w-16 h-16 text-emerald-500" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Concluídas</p>
          <h3 className="text-3xl font-bold text-emerald-500">{completed}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Repeat className="w-16 h-16 text-indigo-500" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">MRR (Recorrente)</p>
          <h3 className="text-2xl font-bold text-indigo-400">{formatBRL(mrr)}</h3>
        </div>
      </div>

      {/* Tabela de OS */}
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[var(--color-brand-blue)]" /> Lista de Serviços
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar cliente ou serviço..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Assinatura</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prazo / Cobrança</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]/50 animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Nenhuma ordem de serviço encontrada.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border-color)]/50 hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-4 font-semibold">{order.client?.name || "Desconhecido"}</td>
                    <td className="px-4 py-4">{order.product?.name || "Desconhecido"}</td>
                    <td className="px-4 py-4">
                      {order.is_subscription ? (
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-medium capitalize">{order.billing_cycle}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-4 text-gray-400 text-xs">
                      {order.is_subscription && order.next_billing_date ? (
                        <div className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" /> {new Date(order.next_billing_date.includes("T") ? order.next_billing_date : order.next_billing_date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                      ) : order.due_date ? (
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.due_date.includes("T") ? order.due_date : order.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-4 font-medium text-[var(--color-brand-blue)]">{formatBRL(order.value)}</td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => handleEdit(order)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-sky-500/10 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(order.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
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

      {/* Modal Nova OS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-xl font-bold mb-6">{editingOrder ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {saveError && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Cliente</label>
                  <select required value={clientId} onChange={e => setClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [&>option]:bg-gray-900">
                    <option value="" disabled>Selecione um cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1 relative">
                  <label className="text-sm font-medium text-gray-300">Serviço</label>
                  <div 
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm cursor-pointer flex justify-between items-center hover:border-[var(--color-brand-blue)] transition-colors"
                    onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
                  >
                    <span className={productId ? "text-white" : "text-gray-400"}>
                      {productId ? products.find(p => p.id === productId)?.name : "Selecione um serviço..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  {serviceDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-[var(--border-color)] rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {products.map(p => (
                        <div key={p.id} className="flex justify-between items-center px-4 py-2 hover:bg-white/10 cursor-pointer group">
                          <div className="flex-1" onClick={() => { setProductId(p.id); setServiceDropdownOpen(false); }}>
                            {p.name}
                          </div>
                          <button type="button" onClick={(e) => handleDeleteService(e, p.id)} className="p-1 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      <div className="border-t border-[var(--border-color)] p-2">
                        {isAddingService ? (
                          <div className="flex items-center gap-2">
                            <input type="text" autoFocus value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                              placeholder="Nome do serviço..."
                              className="flex-1 px-3 py-1.5 bg-black/50 border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-brand-blue)]"
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddService(); } }}
                            />
                            <button type="button" onClick={handleAddService} className="p-1.5 bg-[var(--color-brand-blue)] text-white rounded-lg hover:bg-blue-600 transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setIsAddingService(false)} className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:text-white transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setIsAddingService(true)} className="flex items-center gap-2 w-full px-2 py-2 text-sm text-[var(--color-brand-blue)] hover:bg-blue-500/10 rounded-lg transition-colors font-medium">
                            <Plus className="w-4 h-4" /> Adicionar novo serviço
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border border-[var(--border-color)] rounded-xl bg-white/5">
                <input type="checkbox" id="isSub" checked={isSubscription} onChange={e => setIsSubscription(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-[var(--color-brand-blue)] focus:ring-[var(--color-brand-blue)] bg-gray-900" />
                <label htmlFor="isSub" className="text-sm font-medium text-gray-300 cursor-pointer">
                  Este serviço é uma assinatura recorrente
                </label>
              </div>

              {isSubscription && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/20">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Ciclo de Cobrança</label>
                    <select required={isSubscription} value={billingCycle} onChange={e => setBillingCycle(e.target.value)}
                      className="w-full px-4 py-2 border border-indigo-500/20 rounded-xl bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [&>option]:bg-gray-900">
                      <option value="mensal">Mensal</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Próxima Cobrança</label>
                    <input type="date" required={isSubscription} value={nextBillingDate} onChange={e => setNextBillingDate(e.target.value)}
                      className="w-full px-4 py-2 border border-indigo-500/20 rounded-xl bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <select required value={status} onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [&>option]:bg-gray-900">
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="ativo">Ativo (Assinatura)</option>
                    <option value="pausado">Pausado (Assinatura)</option>
                  </select>
                </div>
                {!isSubscription && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Prazo de Entrega</label>
                    <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:dark]" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Custo Estimado (R$)</label>
                  <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Valor Cobrado (R$)</label>
                  <input type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Observações</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Instruções para a equipe ou detalhes do contrato..." />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-70">
                  {isSubmitting ? "Salvando..." : editingOrder ? "Atualizar OS" : "Criar OS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
